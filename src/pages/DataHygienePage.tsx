import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const toIsoCutoff = (days: number) => {
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
};

const downloadJson = (data: any, filename = "purge-report.json") => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const DataHygienePage: React.FC = () => {
  const [cutoffDays, setCutoffDays] = useState<number>(90);
  const [cron, setCron] = useState<string>("0 3 * * 0"); // Sundays at 3am
  const [running, setRunning] = useState<boolean>(false);
  const [scheduling, setScheduling] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);

  useEffect(() => {
    document.title = "Data Hygiene | Admin Tools";
    // Meta description for SEO
    const metaDesc = document.querySelector('meta[name="description"]');
    const content = `Admin data hygiene: dry-run purge, live purge, and scheduling for stale leads with ${cutoffDays}-day cutoff`;
    if (metaDesc) {
      metaDesc.setAttribute("content", content);
    } else {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = content;
      document.head.appendChild(m);
    }
  }, [cutoffDays]);

  const handleDryRun = async () => {
    try {
      setRunning(true);
      const { data, error } = await supabase.rpc("purge_old_leads", {
        p_cutoff: toIsoCutoff(cutoffDays),
        p_dry_run: true,
      });
      if (error) throw error;
      setResult(data);
      toast.success("Dry run completed");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Dry run failed");
    } finally {
      setRunning(false);
    }
  };

  const handleLivePurge = async () => {
    const confirmed = window.confirm(
      `This will purge leads older than ${cutoffDays} days and reassign conversations. Proceed?`
    );
    if (!confirmed) return;

    try {
      setRunning(true);
      const { data, error } = await supabase.rpc("purge_old_leads", {
        p_cutoff: toIsoCutoff(cutoffDays),
        p_dry_run: false,
      });
      if (error) throw error;
      setResult(data);
      toast.success("Live purge executed");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Live purge failed");
    } finally {
      setRunning(false);
    }
  };

  const handleSaveSchedule = async () => {
    try {
      setScheduling(true);
      const { data, error } = await supabase.rpc("upsert_purge_schedule", {
        p_jobname: "purge_old_leads_recurring",
        p_schedule: cron,
        p_cutoff_days: cutoffDays,
        p_dry_run: false,
      });
      if (error) throw error;
      toast.success("Schedule saved");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to save schedule");
    } finally {
      setScheduling(false);
    }
  };

  const handleRemoveSchedule = async () => {
    try {
      setScheduling(true);
      const { data, error } = await supabase.rpc("remove_purge_schedule", {
        p_jobname: "purge_old_leads_recurring",
      });
      if (error) throw error;
      toast.success("Schedule removed (if existed)");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Failed to remove schedule");
    } finally {
      setScheduling(false);
    }
  };

  return (
    <>
      <header className="sr-only">
        <h1>Data Hygiene - Admin Purge Tools</h1>
      </header>
      <main className="container mx-auto max-w-4xl space-y-6 p-4">
        <section>
          <Card>
            <CardHeader>
              <CardTitle>Lead Purge Controls</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div className="sm:col-span-1">
                  <Label htmlFor="cutoffDays">Cutoff (days)</Label>
                  <Input
                    id="cutoffDays"
                    type="number"
                    min={1}
                    value={cutoffDays}
                    onChange={(e) => setCutoffDays(parseInt(e.target.value || "0", 10))}
                  />
                </div>
                <div className="flex gap-2 sm:col-span-2">
                  <Button onClick={handleDryRun} disabled={running} variant="secondary">
                    {running ? "Running..." : "Run Dry-Run"}
                  </Button>
                  <Button onClick={handleLivePurge} disabled={running} variant="destructive">
                    {running ? "Processing..." : "Run Live Purge"}
                  </Button>
                </div>
              </div>

              {result && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-medium">Last Result</h2>
                    <Button size="sm" variant="outline" onClick={() => downloadJson(result)}>
                      Download JSON
                    </Button>
                  </div>
                  <pre className="rounded-md border p-3 text-sm overflow-auto max-h-80 bg-background">
{JSON.stringify(result, null, 2)}
                  </pre>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader>
              <CardTitle>Recurring Schedule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                <div>
                  <Label htmlFor="cron">Cron Expression</Label>
                  <Input
                    id="cron"
                    placeholder="0 3 * * 0"
                    value={cron}
                    onChange={(e) => setCron(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="cutoffDays2">Cutoff (days)</Label>
                  <Input
                    id="cutoffDays2"
                    type="number"
                    min={1}
                    value={cutoffDays}
                    onChange={(e) => setCutoffDays(parseInt(e.target.value || "0", 10))}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveSchedule} disabled={scheduling} variant="secondary">
                    {scheduling ? "Saving..." : "Save Schedule"}
                  </Button>
                  <Button onClick={handleRemoveSchedule} disabled={scheduling} variant="outline">
                    {scheduling ? "Removing..." : "Remove"}
                  </Button>
                </div>
              </div>
              <p className="text-sm text-muted-foreground">Example: "0 3 * * 0" runs every Sunday at 03:00.</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </>
  );
};

export default DataHygienePage;
