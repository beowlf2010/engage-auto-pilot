
import React from 'react';
import { useAutomationData } from './automation/useAutomationData';
import AutomationControls from './automation/AutomationControls';
import AutomationStatsCards from './automation/AutomationStatsCards';
import RecentRunsList from './automation/RecentRunsList';
import SystemInfoCard from './automation/SystemInfoCard';
import HealthMonitorCard from './HealthMonitorCard';

const AutomationControlPanel = () => {
  const {
    stats,
    recentRuns,
    loading,
    triggering,
    toggleAutomation,
    triggerManualRun,
    systemHealth
  } = useAutomationData();

  if (loading) {
    return <div className="flex items-center justify-center p-8">Loading automation status...</div>;
  }

  return (
    <div className="space-y-6">
      <AutomationControls
        automationEnabled={stats.automationEnabled}
        triggering={triggering}
        onToggleAutomation={toggleAutomation}
        onTriggerManualRun={triggerManualRun}
      />

      <AutomationStatsCards
        totalLeadsInQueue={stats.totalLeadsInQueue}
        messagesLastHour={stats.messagesLastHour}
        successRate={stats.successRate}
        automationEnabled={stats.automationEnabled}
      />

      {systemHealth && <HealthMonitorCard health={systemHealth} />}

      <RecentRunsList runs={recentRuns} />

      <SystemInfoCard />
    </div>
  );
};

export default AutomationControlPanel;
