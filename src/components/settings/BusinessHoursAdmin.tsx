
import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export default function BusinessHoursAdmin() {
  const { toast } = useToast();
  const [bh, setBh] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase.from("business_hours").select("*").limit(1);
      if (data && data.length > 0) setBh(data[0]);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleChange = (k: string, v: any) => setBh((b: any) => ({ ...b, [k]: v }));

  const save = async () => {
    setLoading(true);
    if (bh.id) {
      await supabase.from("business_hours").update(bh).eq("id", bh.id);
    } else {
      await supabase.from("business_hours").insert(bh);
    }
    toast({ title: "Business hours updated." });
    setLoading(false);
  };

  if (loading) return <div>Loading...</div>;
  return (
    <Card>
      <CardHeader><CardTitle>Business Hours</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label>Weekday Start</label>
          <Input type="time" value={bh.weekday_start} onChange={e => handleChange("weekday_start", e.target.value)} />
        </div>
        <div>
          <label>Weekday End</label>
          <Input type="time" value={bh.weekday_end} onChange={e => handleChange("weekday_end", e.target.value)} />
        </div>
        <div>
          <label>Timezone</label>
          <Input value={bh.timezone} onChange={e => handleChange("timezone", e.target.value)} />
        </div>
        <Button onClick={save} disabled={loading}>Save</Button>
      </CardContent>
    </Card>
  );
}
