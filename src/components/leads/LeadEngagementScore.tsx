
import React from "react";
import { Star } from "lucide-react";

interface LeadEngagementScoreProps {
  score: number;
}

const getScoreColor = (score: number) => {
  if (score >= 80) return 'text-green-600';
  if (score >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

const LeadEngagementScore: React.FC<LeadEngagementScoreProps> = ({ score }) => (
  <div className="flex items-center gap-2">
    <span className={`font-bold ${getScoreColor(score)}`}>{score}</span>
    <div className="flex">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3 w-3 ${score >= star * 20 ? "text-yellow-400 fill-current" : "text-gray-300"}`}
        />
      ))}
    </div>
  </div>
);

export default LeadEngagementScore;
