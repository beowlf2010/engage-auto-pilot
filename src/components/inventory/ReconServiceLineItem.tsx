
import React, { useState } from "react";
import useReconApprovals from "@/hooks/useReconApprovals";
import { Button } from "@/components/ui/button";
import ReconServiceLineAttachments from "./ReconServiceLineAttachments";
import { toast } from "@/hooks/use-toast";

interface ReconServiceLineItemProps {
  line: any;
  currentUser: any;
  onApprove: (serviceLineId: string, status: "approved" | "declined", note: string) => void;
}

const ReconServiceLineItem: React.FC<ReconServiceLineItemProps> = ({
  line,
  currentUser,
  onApprove,
}) => {
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
};

export default ReconServiceLineItem;

