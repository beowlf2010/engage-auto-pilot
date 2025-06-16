
import React from 'react';
import { useBehavioralTriggers } from '@/hooks/useBehavioralTriggers';
import TriggerStatsCards from './behavioral-triggers/TriggerStatsCards';
import TriggersList from './behavioral-triggers/TriggersList';

const BehavioralTriggersPanel = () => {
  const { triggers, processing, stats, handleProcessTriggers } = useBehavioralTriggers();

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <TriggerStatsCards stats={stats} />

      {/* Triggers List */}
      <TriggersList 
        triggers={triggers}
        processing={processing}
        onProcessTriggers={handleProcessTriggers}
      />
    </div>
  );
};

export default BehavioralTriggersPanel;
