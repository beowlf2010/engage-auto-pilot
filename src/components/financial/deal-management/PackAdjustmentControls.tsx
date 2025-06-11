
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";

interface PackAdjustmentControlsProps {
  packAdjustmentEnabled: boolean;
  setPackAdjustmentEnabled: (enabled: boolean) => void;
  localPackAdjustment: number;
  setLocalPackAdjustment: (value: number) => void;
}

const PackAdjustmentControls = ({
  packAdjustmentEnabled,
  setPackAdjustmentEnabled,
  localPackAdjustment,
  setLocalPackAdjustment
}: PackAdjustmentControlsProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="w-5 h-5" />
          <span>Pack Adjustment Settings</span>
        </CardTitle>
        <CardDescription>
          Configure pack adjustment to be added to used vehicle gross profit
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={packAdjustmentEnabled}
              onChange={(e) => setPackAdjustmentEnabled(e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm font-medium text-slate-700">Enable Used Car Pack Adjustment</span>
          </label>
          {packAdjustmentEnabled && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-slate-600">$</span>
              <input
                type="number"
                value={localPackAdjustment}
                onChange={(e) => setLocalPackAdjustment(Number(e.target.value))}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="0"
              />
              <span className="text-xs text-slate-500">added per used vehicle</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default PackAdjustmentControls;
