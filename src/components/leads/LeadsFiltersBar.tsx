
import React from "react";
import { Button } from "@/components/ui/button";

interface Props {
  filter: string;
  setFilter: (val: string) => void;
}

export default function LeadFiltersBar({ filter, setFilter }: Props) {
  return (
    <div className="flex gap-2 mb-4">
      <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>All</Button>
      <Button variant={filter === "ai_paused" ? "default" : "outline"} onClick={() => setFilter("ai_paused")}>AI Paused</Button>
      <Button variant={filter === "replied_not_opted_in" ? "default" : "outline"} onClick={() => setFilter("replied_not_opted_in")}>Replied not Opted-in</Button>
      {/* add more filter buttons as desired */}
    </div>
  );
}
