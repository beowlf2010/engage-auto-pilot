import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useReconServiceLines from "@/hooks/useReconServiceLines";
import useReconApprovals from "@/hooks/useReconApprovals";
import { addReconServiceLine, upsertReconApproval } from "@/services/inventory/reconService";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import ReconServiceLineAttachments from "./ReconServiceLineAttachments";
import ReconServiceLineItem from "./ReconServiceLineItem";

interface ReconServiceLinesProps {
  inventoryId: string;
}

const ReconServiceLines: React.FC<ReconServiceLinesProps> = ({ inventoryId }) => {
  const { data: lines, refetch, isLoading } = useReconServiceLines(inventoryId);
  const [desc, setDesc] = useState("");
  const [adding, setAdding] = useState(false);
  const { profile } = useAuth();

  const handleAdd = async () => {
    if (!desc) return;
    setAdding(true);
    try {
      await addReconServiceLine(inventoryId, desc);
      setDesc("");
      refetch();
      toast({ title: "Recon item added!" });
    } catch (err) {
      toast({ title: "Could not add recon item.", variant: "destructive" });
    }
    setAdding(false);
  };

  const handleApproval = async (serviceLineId: string, status: "approved" | "declined", noteInput: string) => {
    if (!profile) {
      toast({ title: "Login required.", description: "You must be authenticated to approve/decline.", variant: "destructive" });
      return;
    }
    try {
      await upsertReconApproval({
        serviceLineId,
        userId: profile.id,
        status,
        notes: noteInput,
      });
      toast({
        title: `Marked as ${status}.`,
        description: `You ${status === "approved" ? "approved" : "declined"} this recon line.`,
        variant: status === "approved" ? "default" : "destructive"
      });
    } catch (err) {
      toast({ title: "Error saving decision.", variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 my-6">
      <h2 className="font-semibold text-lg mb-4">Recon Service Lines</h2>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="border px-2 py-1 rounded flex-1"
          placeholder="Add new recon work (e.g., Replace Air Filter)"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          disabled={adding}
        />
        <Button onClick={handleAdd} disabled={adding || !desc}>
          Add
        </Button>
      </div>
      {isLoading ? (
        <div className="text-slate-500">Loading...</div>
      ) : (
        <ul className="divide-y">
          {lines?.map((line: any) => (
            <ReconServiceLineItem
              key={line.id}
              line={line}
              currentUser={profile}
              onApprove={handleApproval}
            />
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ReconServiceLines;
