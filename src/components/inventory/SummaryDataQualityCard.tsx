
import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SummaryDataQualityCardProps {
  stats: { total: number; complete: number; incomplete: number };
  dataQuality: "all" | "complete" | "incomplete";
  onFilterChange: (quality: "all" | "complete" | "incomplete") => void;
}

const SummaryDataQualityCard: React.FC<SummaryDataQualityCardProps> = ({
  stats,
  dataQuality,
  onFilterChange,
}) => {
  return (
    <Card className="p-5 flex items-center justify-between mb-4 border-2 border-blue-100 bg-blue-50/70">
      <div className="flex gap-6 items-center flex-wrap">
        <div>
          <span className="font-bold text-2xl text-blue-900">{stats.total}</span>
          <span className="ml-2 text-slate-700 font-medium">vehicles</span>
        </div>
        <div>
          <span className="font-bold text-green-700 text-lg">{stats.complete}</span>
          <span className="ml-1 text-slate-600 text-sm">complete</span>
        </div>
        <div>
          <span className="font-bold text-red-700 text-lg">{stats.incomplete}</span>
          <span className="ml-1 text-slate-600 text-sm">incomplete</span>
        </div>
      </div>
      <div className="flex gap-2">
        <Button
          size="sm"
          className={`rounded-full ${dataQuality === "all" ? "bg-blue-600 text-white" : "bg-blue-100 text-blue-700"}`}
          variant="ghost"
          onClick={() => onFilterChange("all")}
        >
          All
        </Button>
        <Button
          size="sm"
          className={`rounded-full ${dataQuality === "complete" ? "bg-green-600 text-white" : "bg-green-100 text-green-700"}`}
          variant="ghost"
          onClick={() => onFilterChange("complete")}
        >
          Complete
        </Button>
        <Button
          size="sm"
          className={`rounded-full ${dataQuality === "incomplete" ? "bg-red-600 text-white" : "bg-red-100 text-red-700"}`}
          variant="ghost"
          onClick={() => onFilterChange("incomplete")}
        >
          Incomplete
        </Button>
      </div>
    </Card>
  );
};

export default SummaryDataQualityCard;
