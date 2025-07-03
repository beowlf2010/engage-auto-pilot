import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = "https://tevtajmaofvnffzcsiuu.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Helper: Get most recent N upload_history_ids
async function getMostRecentUploads(n = 2) {
  const { data, error } = await supabase
    .from("inventory")
    .select("upload_history_id, created_at")
    .not("upload_history_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) throw new Error("Failed to get uploads: " + error.message);

  const uniqueUploadIds = [];
  for (const row of data) {
    if (row.upload_history_id && !uniqueUploadIds.includes(row.upload_history_id)) {
      uniqueUploadIds.push(row.upload_history_id);
    }
    if (uniqueUploadIds.length >= n) break;
  }
  return uniqueUploadIds;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[InventoryCleanup] Starting cleanup process");

    // Step 1: Find most recent uploads
    const mostRecentUploads = await getMostRecentUploads(2);
    if (!mostRecentUploads.length) {
      console.log("[InventoryCleanup] No recent uploads found.");
      return new Response(JSON.stringify({ message: "No recent uploads found." }), { headers: corsHeaders, status: 200 });
    }
    console.log("[InventoryCleanup] Most recent upload IDs:", mostRecentUploads);

    // Step 2: Deduplicate VINs (all non-sold records)
    const { data: dupes, error: dupesError } = await supabase
      .from("inventory")
      .select("id, vin, created_at, updated_at, status")
      .neq("status", "sold")
      .not("vin", "is", null);

    if (dupesError) throw new Error("Fetch error: " + dupesError.message);

    const vinMap = {};
    for (const row of dupes ?? []) {
      if (!vinMap[row.vin]) vinMap[row.vin] = [];
      vinMap[row.vin].push(row);
    }

    let toMarkSold = [];
    for (const vin in vinMap) {
      const records = vinMap[vin];
      if (records.length > 1) {
        // Sort to keep the most recent (updated_at, then created_at)
        const sorted = [...records].sort(
          (a, b) =>
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
        );
        toMarkSold = toMarkSold.concat(sorted.slice(1).map((r) => r.id));
      }
    }
    if (toMarkSold.length) {
      console.log(`[InventoryCleanup] Marking ${toMarkSold.length} duplicate VIN records as sold.`);
      const { error: updateDupesError } = await supabase
        .from("inventory")
        .update({
          status: "sold",
          sold_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .in("id", toMarkSold);
      if (updateDupesError) throw new Error("Error marking VINs as sold: " + updateDupesError.message);
    } else {
      console.log("[InventoryCleanup] No duplicate VIN groups needing cleanup.");
    }

    // Step 3: Keep only recent upload vehicles; mark others as sold
    const { data: vehiclesToKeep, error: keepError } = await supabase
      .from("inventory")
      .select("id")
      .in("upload_history_id", mostRecentUploads);

    if (keepError) throw new Error("Error fetching vehicles to keep: " + keepError.message);

    const keepIds = vehiclesToKeep.map((v) => v.id);

    const { data: vehiclesToUpdate, error: fetchError } = await supabase
      .from("inventory")
      .select("id, upload_history_id, status")
      .neq("status", "sold")
      .not("id", "in", keepIds);

    if (fetchError) throw new Error("Error fetching vehicles to update: " + fetchError.message);

    if (!vehiclesToUpdate || vehiclesToUpdate.length === 0) {
      console.log("[InventoryCleanup] No vehicles need to be marked as sold.");
      return new Response(JSON.stringify({ totalProcessed: toMarkSold.length, mostRecentUploads }), {
        headers: corsHeaders,
        status: 200,
      });
    }

    const vehicleIds = vehiclesToUpdate.map((v) => v.id);
    const { data: updatedVehicles, error: updateError } = await supabase
      .from("inventory")
      .update({
        status: "sold",
        sold_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .in("id", vehicleIds)
      .select("id");

    if (updateError) throw new Error("Error marking as sold: " + updateError.message);

    const totalProcessed = (updatedVehicles?.length || 0) + toMarkSold.length;
    console.log(`[InventoryCleanup] Cleanup completed. Total processed: ${totalProcessed}`);

    return new Response(
      JSON.stringify({
        status: "success",
        totalProcessed,
        mostRecentUploads,
        extraVinUpdated: toMarkSold.length,
      }),
      { headers: corsHeaders, status: 200 }
    );
  } catch (err) {
    console.error("[InventoryCleanup] Error:", err);
    return new Response(
      JSON.stringify({ status: "error", error: err.message }),
      { headers: corsHeaders, status: 500 }
    );
  }
});
