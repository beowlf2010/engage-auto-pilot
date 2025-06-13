import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  updateTwilioSettings, 
  testTwilioConnection, 
  validatePhoneNumber, 
  formatPhoneNumber,
  sendTestSMS
} from "@/services/settingsService";
import { 
  Settings as SettingsIcon, 
  Clock, 
  Key, 
  Users, 
  Bot,
  MessageSquare,
  Save,
  Plus,
  Trash2,
  Loader2,
  Send
} from "lucide-react";

interface SettingsProps {
  user: {
    role: string;
  };
}

const Settings = ({ user }: SettingsProps) => {
  const [activeTab, setActiveTab] = useState("cadence");
  const [isLoading, setIsLoading] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingSMS, setIsTestingSMS] = useState(false);
  const [testPhoneNumber, setTestPhoneNumber] = useState("");
  const [loadingStates, setLoadingStates] = useState({
    openai: false,
    twilioSid: false,
    twilioToken: false,
    twilioPhone: false
  });
  const [apiKeys, setApiKeys] = useState({
    openaiKey: "sk-1234567890abcdef...",
    twilioSid: "AC1234567890abcdef...",
    twilioToken: "1234567890abcdef...",
    twilioPhone: "+15551234567"
  });
  const { toast } = useToast();

  const tabs = [
    { id: "cadence", label: "AI Cadence", icon: Bot, roles: ["sales", "manager", "admin"] },
    { id: "business", label: "Business Hours", icon: Clock, roles: ["sales", "manager", "admin"] },
    { id: "api", label: "API Keys", icon: Key, roles: ["admin"] },
    { id: "users", label: "User Management", icon: Users, roles: ["manager", "admin"] }
  ];

  const filteredTabs = tabs.filter(tab => tab.roles.includes(user.role));

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your changes have been saved successfully"
    });
  };

  const handleApiKeyUpdate = async (settingType: string, value: string, keyType: keyof typeof loadingStates) => {
    setLoadingStates(prev => ({ ...prev, [keyType]: true }));
    try {
      if (settingType === 'TWILIO_PHONE_NUMBER') {
        const formattedPhone = formatPhoneNumber(value);
        if (!validatePhoneNumber(formattedPhone)) {
          toast({
            title: "Invalid Phone Number",
            description: "Please enter a valid US phone number (e.g., +1234567890 or 234-567-8900)",
            variant: "destructive"
          });
          return;
        }
        value = formattedPhone;
      }

      const result = await updateTwilioSettings(settingType, value);
      
      // Update local state
      if (settingType === 'TWILIO_PHONE_NUMBER') {
        setApiKeys(prev => ({ ...prev, twilioPhone: value }));
      }

      toast({
        title: "Settings Updated",
        description: result.message || "Settings updated successfully",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "Failed to update settings",
        variant: "destructive"
      });
    } finally {
      setLoadingStates(prev => ({ ...prev, [keyType]: false }));
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const result = await testTwilioConnection(apiKeys.twilioSid, apiKeys.twilioToken);
      toast({
        title: "Connection Test",
        description: result.message,
      });
    } catch (error) {
      toast({
        title: "Connection Test Failed",
        description: error instanceof Error ? error.message : "Failed to test connection",
        variant: "destructive"
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestSMS = async () => {
    if (!testPhoneNumber) {
      toast({
        title: "Phone Number Required",
        description: "Please enter a phone number to send the test SMS to",
        variant: "destructive"
      });
      return;
    }

    const formattedPhone = formatPhoneNumber(testPhoneNumber);
    if (!validatePhoneNumber(formattedPhone)) {
      toast({
        title: "Invalid Phone Number",
        description: "Please enter a valid US phone number (e.g., +1234567890 or 234-567-8900)",
        variant: "destructive"
      });
      return;
    }

    setIsTestingSMS(true);
    try {
      const result = await sendTestSMS(formattedPhone);
      toast({
        title: "Test SMS Sent!",
        description: `Test message sent successfully to ${formattedPhone}`,
      });
      setTestPhoneNumber("");
    } catch (error) {
      toast({
        title: "Test SMS Failed",
        description: error instanceof Error ? error.message : "Failed to send test SMS",
        variant: "destructive"
      });
    } finally {
      setIsTestingSMS(false);
    }
  };

  const renderCadenceSettings = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>AI Follow-up Cadence</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Message Templates</Label>
              <div className="space-y-3">
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-sm font-medium">Initial Contact</Label>
                    <Badge variant="secondary">Day 0</Badge>
                  </div>
                  <Textarea 
                    defaultValue="Hi {first_name}! Thanks for your interest in the {vehicle_interest}. I'd love to help you find the perfect vehicle. When would be a good time to chat?"
                    className="text-sm"
                    rows={3}
                    disabled={user.role === "sales"}
                  />
                </div>
                <div className="p-3 border border-slate-200 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <Label className="text-sm font-medium">Follow-up 1</Label>
                    <Badge variant="secondary">Day 2</Badge>
                  </div>
                  <Textarea 
                    defaultValue="Hi {first_name}, just wanted to follow up on your interest in the {vehicle_interest}. We have some great financing options available. Would you like to schedule a test drive?"
                    className="text-sm"
                    rows={3}
                    disabled={user.role === "sales"}
                  />
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <Label>Timing Settings</Label>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay1">Initial delay (hours)</Label>
                  <Input 
                    id="delay1" 
                    type="number" 
                    defaultValue="0" 
                    className="w-20"
                    disabled={user.role === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay2">Follow-up 1 delay (days)</Label>
                  <Input 
                    id="delay2" 
                    type="number" 
                    defaultValue="2" 
                    className="w-20"
                    disabled={user.role === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="delay3">Follow-up 2 delay (days)</Label>
                  <Input 
                    id="delay3" 
                    type="number" 
                    defaultValue="5" 
                    className="w-20"
                    disabled={user.role === "sales"}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="max_followups">Max follow-ups</Label>
                  <Input 
                    id="max_followups" 
                    type="number" 
                    defaultValue="3" 
                    className="w-20"
                    disabled={user.role === "sales"}
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBusinessHours = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Hours</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <Label>Operating Hours</Label>
              {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                <div key={day} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Switch defaultChecked={day !== "Sunday"} disabled={user.role === "sales"} />
                    <Label className="w-20">{day}</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Input 
                      type="time" 
                      defaultValue="09:00" 
                      className="w-24"
                      disabled={user.role === "sales"}
                    />
                    <span className="text-slate-500">to</span>
                    <Input 
                      type="time" 
                      defaultValue="18:00" 
                      className="w-24"
                      disabled={user.role === "sales"}
                    />
                  </div>
                </div>
              ))}
            </div>
            
            <div className="space-y-4">
              <Label>AI Behavior</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Send outside business hours</Label>
                  <Switch disabled={user.role === "sales"} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Weekend messaging</Label>
                  <Switch disabled={user.role === "sales"} />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Holiday pause</Label>
                  <Switch defaultChecked disabled={user.role === "sales"} />
                </div>
              </div>
              
              <div className="pt-4">
                <Label>Time Zone</Label>
                <select className="w-full mt-1 px-3 py-2 border border-slate-300 rounded-md" disabled={user.role === "sales"}>
                  <option>Eastern Time (ET)</option>
                  <option>Central Time (CT)</option>
                  <option>Mountain Time (MT)</option>
                  <option>Pacific Time (PT)</option>
                </select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderApiKeys = () => {
    if (user.role !== "admin") {
      return (
        <div className="text-center py-12">
          <Key className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Admin Access Required</h3>
          <p className="text-slate-600">Only administrators can manage API keys</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>API Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="openai_key">OpenAI API Key</Label>
                <div className="flex space-x-2 mt-1">
                  <Input 
                    id="openai_key"
                    type="password" 
                    placeholder="sk-..." 
                    value={apiKeys.openaiKey}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, openaiKey: e.target.value }))}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleApiKeyUpdate('OPENAI_API_KEY', apiKeys.openaiKey, 'openai')}
                    disabled={loadingStates.openai}
                  >
                    {loadingStates.openai ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">Used for AI message generation</p>
              </div>
              
              <div>
                <Label htmlFor="twilio_sid">Twilio Account SID</Label>
                <div className="flex space-x-2 mt-1">
                  <Input 
                    id="twilio_sid"
                    type="password" 
                    placeholder="AC..." 
                    value={apiKeys.twilioSid}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, twilioSid: e.target.value }))}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleApiKeyUpdate('TWILIO_ACCOUNT_SID', apiKeys.twilioSid, 'twilioSid')}
                    disabled={loadingStates.twilioSid}
                  >
                    {loadingStates.twilioSid ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>
              
              <div>
                <Label htmlFor="twilio_token">Twilio Auth Token</Label>
                <div className="flex space-x-2 mt-1">
                  <Input 
                    id="twilio_token"
                    type="password" 
                    placeholder="..." 
                    value={apiKeys.twilioToken}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, twilioToken: e.target.value }))}
                    className="flex-1"
                  />
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline"
                      onClick={() => handleApiKeyUpdate('TWILIO_AUTH_TOKEN', apiKeys.twilioToken, 'twilioToken')}
                      disabled={loadingStates.twilioToken}
                    >
                      {loadingStates.twilioToken ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={handleTestConnection}
                      disabled={isTesting}
                    >
                      {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Test"}
                    </Button>
                  </div>
                </div>
              </div>
              
              <div>
                <Label htmlFor="twilio_phone">Twilio Phone Number</Label>
                <div className="flex space-x-2 mt-1">
                  <Input 
                    id="twilio_phone"
                    placeholder="+1234567890" 
                    value={apiKeys.twilioPhone}
                    onChange={(e) => setApiKeys(prev => ({ ...prev, twilioPhone: e.target.value }))}
                    className="flex-1"
                  />
                  <Button 
                    variant="outline"
                    onClick={() => handleApiKeyUpdate('TWILIO_PHONE_NUMBER', apiKeys.twilioPhone, 'twilioPhone')}
                    disabled={loadingStates.twilioPhone}
                  >
                    {loadingStates.twilioPhone ? <Loader2 className="w-4 h-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Phone number for outbound SMS (toll-free numbers supported: +1800xxxxxxx)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test SMS Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="test_phone">Test Phone Number</Label>
                <div className="flex space-x-2 mt-1">
                  <Input 
                    id="test_phone"
                    placeholder="+1234567890" 
                    value={testPhoneNumber}
                    onChange={(e) => setTestPhoneNumber(e.target.value)}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleTestSMS}
                    disabled={isTestingSMS}
                  >
                    {isTestingSMS ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
                    Send Test SMS
                  </Button>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your phone number to test if your Twilio configuration is working
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderUserManagement = () => {
    const mockUsers = [
      { id: 1, name: "John Doe", email: "john@dealership.com", role: "manager", status: "active" },
      { id: 2, name: "Jane Smith", email: "jane@dealership.com", role: "sales", status: "active" },
      { id: 3, name: "Mike Johnson", email: "mike@dealership.com", role: "sales", status: "active" },
      { id: 4, name: "Sarah Wilson", email: "sarah@dealership.com", role: "sales", status: "disabled" }
    ];

    if (!["manager", "admin"].includes(user.role)) {
      return (
        <div className="text-center py-12">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">Manager Access Required</h3>
          <p className="text-slate-600">Only managers and admins can view user management</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Team Members</CardTitle>
            {user.role === "admin" && (
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1" />
                Add User
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockUsers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-800">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{member.name}</p>
                      <p className="text-sm text-slate-600">{member.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                      {member.role}
                    </Badge>
                    <Badge variant={member.status === "active" ? "default" : "destructive"}>
                      {member.status}
                    </Badge>
                    {user.role === "admin" && (
                      <Button variant="ghost" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case "cadence": return renderCadenceSettings();
      case "business": return renderBusinessHours();
      case "api": return renderApiKeys();
      case "users": return renderUserManagement();
      default: return renderCadenceSettings();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-800">Settings</h1>
          <p className="text-slate-600 mt-1">Configure your CRM system preferences</p>
        </div>
        {user.role !== "sales" && activeTab !== "users" && activeTab !== "api" && (
          <Button onClick={handleSave} className="mt-4 md:mt-0">
            <Save className="w-4 h-4 mr-2" />
            Save Changes
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <nav className="flex space-x-8">
          {filteredTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {renderContent()}
    </div>
  );
};

export default Settings;
