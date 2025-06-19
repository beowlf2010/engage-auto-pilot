
import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ApiKeysSettings from '@/components/settings/ApiKeysSettings';
import EmailSettings from '@/components/settings/EmailSettings';
import AISettingsPanel from '@/components/settings/AISettingsPanel';
import NotificationSettings from '@/components/settings/NotificationSettings';
import { Settings as SettingsIcon, Key, Mail, Bot, Bell } from 'lucide-react';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('api-keys');

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="flex items-center space-x-3 mb-6">
        <SettingsIcon className="h-6 w-6" />
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="api-keys" className="flex items-center space-x-2">
            <Key className="h-4 w-4" />
            <span>API Keys</span>
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center space-x-2">
            <Mail className="h-4 w-4" />
            <span>Email</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center space-x-2">
            <Bot className="h-4 w-4" />
            <span>AI Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="mt-6">
          <ApiKeysSettings userRole="user" />
        </TabsContent>

        <TabsContent value="email" className="mt-6">
          <EmailSettings userRole="user" />
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="ai" className="mt-6">
          <AISettingsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Settings;
