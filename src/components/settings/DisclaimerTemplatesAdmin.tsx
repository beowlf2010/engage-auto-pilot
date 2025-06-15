
import React, { useEffect, useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

/**
 * NOTE: disclaimer_templates table is new and types might not be available in supabase types yet.
 * We cast supabase.from("disclaimer_templates") as any to avoid type errors until regenerated.
 */
export default function DisclaimerTemplatesAdmin() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<any[]>([]);
  const [editing, setEditing] = useState<any | null>(null);

  useEffect(() => { fetchTemplates(); }, []);
  const fetchTemplates = async () => {
    // @ts-expect-error workaround until disclaimer_templates is typed
    const res = await (supabase.from("disclaimer_templates") as any).select("*").order("channel");
    setTemplates(res.data ?? []);
  };

  const onEdit = (tpl: any) => setEditing({ ...tpl });
  const onNew = () => setEditing({ channel: "sms", template: "" });

  const save = async () => {
    let res;
    if (editing.id) {
      // @ts-expect-error workaround
      res = await (supabase.from("disclaimer_templates") as any).update(editing).eq("id", editing.id);
    } else {
      // @ts-expect-error workaround
      res = await (supabase.from("disclaimer_templates") as any).insert(editing);
    }
    fetchTemplates();
    toast({ title: "Saved!" });
    setEditing(null);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Message Disclaimers</CardTitle>
        <Button onClick={onNew} size="sm">Add Disclaimer</Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {templates.map((tpl: any) => (
          <div key={tpl.id} className="flex gap-4 items-center">
            <div>{tpl.channel}</div>
            <div className="flex-1">{tpl.template}</div>
            <Button size="sm" onClick={() => onEdit(tpl)}>Edit</Button>
          </div>
        ))}
        {editing && (
          <div className="space-y-2 mt-4 border-t pt-4">
            <Select value={editing.channel} onValueChange={v => setEditing({ ...editing, channel: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
            <Input value={editing.template} onChange={e => setEditing({ ...editing, template: e.target.value })} placeholder="Enter footer text..." />
            <Button onClick={save} size="sm">Save</Button>
            <Button onClick={() => setEditing(null)} size="sm" variant="ghost">Cancel</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
