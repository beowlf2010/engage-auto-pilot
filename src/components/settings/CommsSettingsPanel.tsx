
import React from "react";
import BusinessHoursAdmin from "./BusinessHoursAdmin";
import DisclaimerTemplatesAdmin from "./DisclaimerTemplatesAdmin";
import { AggressiveCadenceMonitor } from "../ai/AggressiveCadenceMonitor";

export default function CommsSettingsPanel() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Communication/Compliance Settings</h1>
      <BusinessHoursAdmin />
      <DisclaimerTemplatesAdmin />
      <AggressiveCadenceMonitor />
    </div>
  );
}
