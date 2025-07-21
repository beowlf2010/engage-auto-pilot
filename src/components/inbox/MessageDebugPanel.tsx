
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Bug, RefreshCw, Trash2, ChevronDown } from 'lucide-react';

interface MessageDebugPanelProps {
  debugInfo: any;
  onForceReload: () => void;
  onClearLogs: () => void;
  leadId?: string;
}

const MessageDebugPanel: React.FC<MessageDebugPanelProps> = ({
  debugInfo,
  onForceReload,
  onClearLogs,
  leadId
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { debugState, robustLoadingState, messageCount, debugLogs } = debugInfo;

  const hasErrors = debugState.error || debugState.validationResult?.validationErrors?.length > 0;
  const hasMismatch = debugState.validationResult?.hasMismatch;

  return (
    <Card className="border-orange-200 bg-orange-50">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-orange-100 transition-colors">
            <CardTitle className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Panel
                {hasErrors && <AlertTriangle className="h-4 w-4 text-red-500" />}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={hasMismatch ? "destructive" : "secondary"}>
                  {messageCount} messages
                </Badge>
                <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
              </div>
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="space-y-4">
            {/* Quick Actions */}
            <div className="flex gap-2">
              <Button
                onClick={onForceReload}
                size="sm"
                variant="outline"
                disabled={debugState.isLoading}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Force Reload
              </Button>
              <Button
                onClick={onClearLogs}
                size="sm"
                variant="outline"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear Logs
              </Button>
            </div>

            {/* Validation Results */}
            {debugState.validationResult && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Message Validation</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Expected Unread: {debugState.validationResult.expectedUnreadCount}</div>
                  <div>Actual Unread: {debugState.validationResult.actualUnreadCount}</div>
                  <div>Total Messages: {debugState.validationResult.actualMessageCount}</div>
                  <div>Cache Status: {debugState.cacheStatus}</div>
                </div>
                
                {debugState.validationResult.validationErrors?.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium text-red-600">Validation Errors:</div>
                    {debugState.validationResult.validationErrors.map((error: string, index: number) => (
                      <div key={index} className="text-xs text-red-600 bg-red-50 p-1 rounded">
                        {error}
                      </div>
                    ))}
                  </div>
                )}

                {debugState.validationResult.lastMessage && (
                  <div className="space-y-1">
                    <div className="text-xs font-medium">Last Message:</div>
                    <div className="text-xs bg-gray-50 p-2 rounded">
                      <div>Direction: {debugState.validationResult.lastMessage.direction}</div>
                      <div>Content: {debugState.validationResult.lastMessage.body?.substring(0, 100)}...</div>
                      <div>Sent: {new Date(debugState.validationResult.lastMessage.sent_at).toLocaleString()}</div>
                      <div>Read: {debugState.validationResult.lastMessage.read_at ? 'Yes' : 'No'}</div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Loading State */}
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Loading State</h4>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Method: {debugState.loadingMethod}</div>
                <div>Loading: {debugState.isLoading ? 'Yes' : 'No'}</div>
                <div>Robust Loading: {robustLoadingState.isLoading ? 'Yes' : 'No'}</div>
                <div>Retry Count: {robustLoadingState.retryCount}</div>
              </div>
            </div>

            {/* Recent Debug Logs */}
            {debugLogs.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-sm">Recent Debug Logs</h4>
                <div className="max-h-32 overflow-y-auto bg-gray-50 p-2 rounded text-xs space-y-1">
                  {debugLogs.slice(0, 10).map((log: string, index: number) => (
                    <div key={index} className="font-mono">
                      {log}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Error Display */}
            {debugState.error && (
              <div className="p-2 bg-red-50 border border-red-200 rounded">
                <div className="text-xs font-medium text-red-600 mb-1">Error:</div>
                <div className="text-xs text-red-600">{debugState.error}</div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
};

export default MessageDebugPanel;
