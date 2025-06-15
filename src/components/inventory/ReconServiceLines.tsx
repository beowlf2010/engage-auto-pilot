import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useReconServiceLines from "@/hooks/useReconServiceLines";
import useReconApprovals from "@/hooks/useReconApprovals";
import { addReconServiceLine, upsertReconApproval } from "@/services/inventory/reconService";
import { useAuth } from "@/components/auth/AuthProvider";
import { toast } from "@/hooks/use-toast";
import ReconServiceLineAttachments from "./ReconServiceLineAttachments";

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
      toast({ title: `Marked as ${status}.` });
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

function ReconServiceLineItem({ line, currentUser, onApprove }: {
  line: any;
  currentUser: any;
  onApprove: (serviceLineId: string, status: "approved" | "declined", note: string) => void;
}) {
  const [note, setNote] = useState("");
  const { data: approvals, refetch: refetchApprovals } = useReconApprovals(line.id);

  const thisUserApproval = approvals?.find((a: any) => a.user_id === currentUser?.id);

  const handleDecision = async (status: "approved" | "declined") => {
    await onApprove(line.id, status, note);
    setNote("");
    refetchApprovals();
  };

  return (
    <li className="py-2">
      <div>
        <span className="font-medium">{line.description}</span>
        <span className="ml-2 text-xs bg-slate-200 text-slate-800 px-2 rounded-full">
          {line.status}
        </span>
        {line.cost && (
          <span className="ml-2 text-xs text-slate-600">${line.cost}</span>
        )}
      </div>
      <ReconServiceLineAttachments
        serviceLineId={line.id}
        currentUser={currentUser}
      />
      {/* Approvals */}
      <div className="flex flex-col gap-1 ml-4 mt-1">
        {approvals && approvals.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {approvals.map((app: any) => (
              <span key={app.id} className={`px-2 rounded text-xs ${app.approval_status === "approved" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                {app.profiles?.first_name || "User"}: {app.approval_status}
                {app.notes ? <span className="ml-1 italic text-gray-500">({app.notes})</span> : null}
              </span>
            ))}
          </div>
        )}

        {currentUser && (
          <div className="flex gap-2 items-center mt-1">
            <input
              type="text"
              className="flex-1 border px-2 py-1 rounded text-xs"
              placeholder="Add a note (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              disabled={!!thisUserApproval}
            />
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => handleDecision("approved")}
              disabled={!!thisUserApproval}
            >
              Approve
            </Button>
            <Button
              size="sm"
              variant="destructive"
              className="text-xs"
              onClick={() => handleDecision("declined")}
              disabled={!!thisUserApproval}
            >
              Decline
            </Button>
          </div>
        )}
        {thisUserApproval && (
          <div className="text-xs text-slate-500 mt-1">
            You marked this line as <b>{thisUserApproval.approval_status}</b>.
          </div>
        )}
      </div>
    </li>
  );
}

export default ReconServiceLines;
