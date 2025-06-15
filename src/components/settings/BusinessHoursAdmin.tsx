
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

/**
 * NOTE: business_hours table is new and types might not be available in supabase types yet.
 * We cast supabase.from("business_hours") as any to avoid type errors until regenerated.
 */
export default function BusinessHoursAdmin() {
  const { toast } = useToast();
  const [bh, setBh] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      // @ts-expect-error business_hours might be missing from generated types
      const { data } = (supabase.from("business_hours") as any).select("*").limit(1);
      (await data)?.then?.(d => { if (d && d.length > 0) setBh(d[0]); setLoading(false); }); // supports both promise and value (for safety)
    };
    fetch();
  }, []);

  const handleChange = (k: string, v: any) => setBh((b: any) => ({ ...b, [k]: v }));

  const save = async () => {
    setLoading(true);
    if (bh.id) {
      // @ts-expect-error types may not include business_hours yet
      await (supabase.from("business_hours") as any).update(bh).eq("id", bh.id);
    } else {
      // @ts-expect-error types may not include business_hours yet
      await (supabase.from("business_hours") as any).insert(bh);
    }
    toast({ title: "Business hours updated." });
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label>Weekday Start</label>
          <Input type="time" value={bh.weekday_start || ''} onChange={e => handleChange("weekday_start", e.target.value)} />
        </div>
        <div>
          <label>Weekday End</label>
          <Input type="time" value={bh.weekday_end || ''} onChange={e => handleChange("weekday_end", e.target.value)} />
        </div>
        <div>
          <label>Timezone</label>
          <Input value={bh.timezone || ''} onChange={e => handleChange("timezone", e.target.value)} />
        </div>
        <Button onClick={save} disabled={loading}>Save</Button>
      </CardContent>
    </Card>
  );
}
