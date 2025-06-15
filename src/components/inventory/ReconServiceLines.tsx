
import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import useReconServiceLines from "@/hooks/useReconServiceLines";
import { addReconServiceLine } from "@/services/inventory/reconService";

interface ReconServiceLinesProps {
  inventoryId: string;
}

const ReconServiceLines: React.FC<ReconServiceLinesProps> = ({ inventoryId }) => {
  const { data: lines, refetch, isLoading } = useReconServiceLines(inventoryId);
  const [desc, setDesc] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!desc) return;
    setAdding(true);
    try {
      await addReconServiceLine(inventoryId, desc);
      setDesc("");
      refetch();
    } catch (err) {
      alert("Could not add recon item.");
    }
    setAdding(false);
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
            <li key={line.id} className="py-2">
              <span className="font-medium">{line.description}</span>
              <span className="ml-2 text-xs bg-slate-200 text-slate-800 px-2 rounded-full">
                {line.status}
              </span>
              {line.cost && (
                <span className="ml-2 text-xs text-slate-600">${line.cost}</span>
              )}
              {/* Add simple UX for editing/updating as needed */}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
};

export default ReconServiceLines;
