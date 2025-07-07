import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { 
  GraduationCap, 
  Target, 
  Zap, 
  Brain, 
  MessageSquare,
  TestTube,
  Settings,
  TrendingUp,
  Users,
  BookOpen,
  Play,
  Pause,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Plus,
  Save
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TrainingScenario {
  id: string;
  name: string;
  description: string;
  customerMessage: string;
  expectedResponse: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  category: 'objection_handling' | 'product_inquiry' | 'pricing' | 'scheduling';
  isActive: boolean;
}

interface ABTestResult {
  id: string;
  name: string;
  variantA: string;
  variantB: string;
  aSuccessRate: number;
  bSuccessRate: number;
  status: 'running' | 'completed' | 'paused';
  sampleSize: number;
}

const AITrainingCenterPage = () => {
  const [trainingScenarios, setTrainingScenarios] = useState<TrainingScenario[]>([]);
  const [abTests, setABTests] = useState<ABTestResult[]>([]);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingProgress, setTrainingProgress] = useState(0);
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario | null>(null);
  const [newScenario, setNewScenario] = useState({
    name: '',
    description: '',
    customerMessage: '',
    expectedResponse: '',
    difficulty: 'intermediate' as const,
    category: 'objection_handling' as const
  });

  useEffect(() => {
    loadTrainingData();
  }, []);

  const loadTrainingData = async () => {
    try {
      // Load existing scenarios from database (if any exist)
      const { data: templates } = await supabase
        .from('ai_message_templates')
        .select('*')
        .order('created_at', { ascending: false });

      // Mock training scenarios for demonstration
      const mockScenarios: TrainingScenario[] = [
        {
          id: '1',
          name: 'Price Objection - Too Expensive',
          description: 'Customer says the vehicle is too expensive',
          customerMessage: 'This car is way too expensive for my budget',
          expectedResponse: 'I understand budget is important. Let me show you some financing options that could make this more affordable, or we can look at similar vehicles in a different price range.',
          difficulty: 'intermediate',
          category: 'objection_handling',
          isActive: true
        },
        {
          id: '2',
          name: 'Vehicle Availability Inquiry',
          description: 'Customer asking about specific vehicle availability',
          customerMessage: 'Do you have the 2024 Honda Accord in white?',
          expectedResponse: 'Let me check our current inventory for the 2024 Honda Accord in white. I\'ll get you the availability and can schedule a time for you to see it if we have one.',
          difficulty: 'beginner',
          category: 'product_inquiry',
          isActive: true
        },
        {
          id: '3',
          name: 'Appointment Scheduling',
          description: 'Customer wants to schedule a test drive',
          customerMessage: 'Can I schedule a test drive for this weekend?',
          expectedResponse: 'Absolutely! I\'d be happy to schedule a test drive for you this weekend. What day works better - Saturday or Sunday? And what time would be most convenient?',
          difficulty: 'beginner',
          category: 'scheduling',
          isActive: true
        }
      ];

      setTrainingScenarios(mockScenarios);

      // Mock A/B test results
      const mockABTests: ABTestResult[] = [
        {
          id: '1',
          name: 'Greeting Message Test',
          variantA: 'Hi! How can I help you today?',
          variantB: 'Hello! Thanks for your interest. What can I help you with?',
          aSuccessRate: 72,
          bSuccessRate: 84,
          status: 'completed',
          sampleSize: 150
        },
        {
          id: '2',
          name: 'Price Inquiry Response',
          variantA: 'I\'d be happy to discuss pricing with you.',
          variantB: 'Let me get you the most current pricing information.',
          aSuccessRate: 68,
          bSuccessRate: 71,
          status: 'running',
          sampleSize: 89
        }
      ];

      setABTests(mockABTests);

    } catch (error) {
      console.error('Error loading training data:', error);
    }
  };

  const startTrainingSession = async () => {
    setIsTraining(true);
    setTrainingProgress(0);

    // Simulate training progress
    const interval = setInterval(() => {
      setTrainingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsTraining(false);
          toast({
            title: "Training Complete!",
            description: "Finn has been updated with new scenarios and optimizations.",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 500);
  };

  const createNewScenario = async () => {
    if (!newScenario.name || !newScenario.customerMessage || !newScenario.expectedResponse) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const scenario: TrainingScenario = {
      id: Date.now().toString(),
      ...newScenario,
      isActive: true
    };

    setTrainingScenarios(prev => [scenario, ...prev]);
    setNewScenario({
      name: '',
      description: '',
      customerMessage: '',
      expectedResponse: '',
      difficulty: 'intermediate',
      category: 'objection_handling'
    });

    toast({
      title: "Scenario Created",
      description: "New training scenario has been added to Finn's learning.",
    });
  };

  const toggleScenarioStatus = (id: string) => {
    setTrainingScenarios(prev => 
      prev.map(scenario => 
        scenario.id === id 
          ? { ...scenario, isActive: !scenario.isActive }
          : scenario
      )
    );
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'objection_handling': return <Target className="w-4 h-4" />;
      case 'product_inquiry': return <MessageSquare className="w-4 h-4" />;
      case 'pricing': return <TrendingUp className="w-4 h-4" />;
      case 'scheduling': return <Users className="w-4 h-4" />;
      default: return <BookOpen className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <GraduationCap className="w-8 h-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              AI Training & Optimization Center
            </h1>
            <p className="text-muted-foreground">Train Finn to be even smarter and more effective</p>
          </div>
        </div>
        <div className="flex space-x-2">
          <Button 
            onClick={startTrainingSession} 
            disabled={isTraining}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {isTraining ? (
              <>
                <Pause className="w-4 h-4 mr-2" />
                Training...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                Start Training
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Training Progress */}
      {isTraining && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Brain className="w-5 h-5 text-primary animate-pulse" />
                <span className="font-medium">Training Finn's Intelligence...</span>
              </div>
              <span className="text-sm text-muted-foreground">{trainingProgress}%</span>
            </div>
            <Progress value={trainingProgress} className="h-2" />
            <p className="text-sm text-muted-foreground mt-2">
              Processing scenarios, optimizing responses, and updating intelligence patterns
            </p>
          </CardContent>
        </Card>
      )}

      {/* Main Training Tabs */}
      <Tabs defaultValue="scenarios" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scenarios">Training Scenarios</TabsTrigger>
          <TabsTrigger value="abtesting">A/B Testing</TabsTrigger>
          <TabsTrigger value="optimization">Optimization Settings</TabsTrigger>
          <TabsTrigger value="analytics">Training Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="scenarios" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Create New Scenario */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Create New Scenario
                </CardTitle>
                <CardDescription>Add custom training scenarios for Finn</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="scenario-name">Scenario Name</Label>
                  <Input
                    id="scenario-name"
                    value={newScenario.name}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Price Objection Handling"
                  />
                </div>
                
                <div>
                  <Label htmlFor="customer-message">Customer Message</Label>
                  <Textarea
                    id="customer-message"
                    value={newScenario.customerMessage}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, customerMessage: e.target.value }))}
                    placeholder="What the customer might say..."
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="expected-response">Expected Response</Label>
                  <Textarea
                    id="expected-response"
                    value={newScenario.expectedResponse}
                    onChange={(e) => setNewScenario(prev => ({ ...prev, expectedResponse: e.target.value }))}
                    placeholder="How Finn should respond..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Difficulty</Label>
                    <select 
                      className="w-full p-2 border rounded-md text-sm"
                      value={newScenario.difficulty}
                      onChange={(e) => setNewScenario(prev => ({ ...prev, difficulty: e.target.value as any }))}
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  
                  <div>
                    <Label>Category</Label>
                    <select 
                      className="w-full p-2 border rounded-md text-sm"
                      value={newScenario.category}
                      onChange={(e) => setNewScenario(prev => ({ ...prev, category: e.target.value as any }))}
                    >
                      <option value="objection_handling">Objection Handling</option>
                      <option value="product_inquiry">Product Inquiry</option>
                      <option value="pricing">Pricing</option>
                      <option value="scheduling">Scheduling</option>
                    </select>
                  </div>
                </div>

                <Button onClick={createNewScenario} className="w-full">
                  <Save className="w-4 h-4 mr-2" />
                  Add Scenario
                </Button>
              </CardContent>
            </Card>

            {/* Existing Scenarios */}
            <div className="lg:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Training Scenarios</h3>
                <Badge variant="secondary">{trainingScenarios.length} scenarios</Badge>
              </div>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {trainingScenarios.map((scenario) => (
                  <Card key={scenario.id} className="hover-scale">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            {getCategoryIcon(scenario.category)}
                            <h4 className="font-medium">{scenario.name}</h4>
                            <Badge className={getDifficultyColor(scenario.difficulty)}>
                              {scenario.difficulty}
                            </Badge>
                            {scenario.isActive && (
                              <Badge className="bg-green-100 text-green-800">Active</Badge>
                            )}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-2">
                            {scenario.description}
                          </p>
                          
                          <div className="space-y-2">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Customer:</span>
                              <p className="text-sm bg-muted/50 p-2 rounded mt-1">
                                "{scenario.customerMessage}"
                              </p>
                            </div>
                            
                            <div>
                              <span className="text-xs font-medium text-muted-foreground">Expected Response:</span>
                              <p className="text-sm bg-primary/5 p-2 rounded mt-1">
                                "{scenario.expectedResponse}"
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="ml-4">
                          <Switch
                            checked={scenario.isActive}
                            onCheckedChange={() => toggleScenarioStatus(scenario.id)}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="abtesting" className="space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">A/B Test Results</h3>
                <p className="text-sm text-muted-foreground">Compare different response strategies</p>
              </div>
              <Button>
                <TestTube className="w-4 h-4 mr-2" />
                Create New Test
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {abTests.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{test.name}</CardTitle>
                      <Badge className={
                        test.status === 'running' ? 'bg-blue-100 text-blue-800' :
                        test.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {test.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Variant A</Label>
                          <span className="text-xs font-medium">{test.aSuccessRate}%</span>
                        </div>
                        <div className="p-2 bg-muted/50 rounded text-sm">
                          "{test.variantA}"
                        </div>
                        <Progress value={test.aSuccessRate} className="h-1" />
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs">Variant B</Label>
                          <span className="text-xs font-medium">{test.bSuccessRate}%</span>
                        </div>
                        <div className="p-2 bg-primary/5 rounded text-sm">
                          "{test.variantB}"
                        </div>
                        <Progress value={test.bSuccessRate} className="h-1" />
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Sample Size: {test.sampleSize}</span>
                      {test.bSuccessRate > test.aSuccessRate && (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          B Winner
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="optimization" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  AI Response Settings
                </CardTitle>
                <CardDescription>Configure how Finn generates responses</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Aggressive Messaging</Label>
                    <p className="text-sm text-muted-foreground">More direct sales approach</p>
                  </div>
                  <Switch />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Personalization</Label>
                    <p className="text-sm text-muted-foreground">Use customer data for tailored responses</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Inventory Integration</Label>
                    <p className="text-sm text-muted-foreground">Include available inventory in responses</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Learning Mode</Label>
                    <p className="text-sm text-muted-foreground">Continuously learn from interactions</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Performance Tuning
                </CardTitle>
                <CardDescription>Optimize AI performance parameters</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Response Confidence Threshold</Label>
                  <p className="text-sm text-muted-foreground mb-2">Minimum confidence for auto-send</p>
                  <Progress value={75} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Conservative (50%)</span>
                    <span>Current (75%)</span>
                    <span>Aggressive (90%)</span>
                  </div>
                </div>
                
                <div>
                  <Label>Learning Aggressiveness</Label>
                  <p className="text-sm text-muted-foreground mb-2">How quickly AI adapts to new patterns</p>
                  <Progress value={60} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Slow</span>
                    <span>Balanced</span>
                    <span>Fast</span>
                  </div>
                </div>
                
                <div>
                  <Label>Response Length</Label>
                  <p className="text-sm text-muted-foreground mb-2">Target message length</p>
                  <Progress value={40} className="h-2" />
                  <div className="flex justify-between text-xs text-muted-foreground mt-1">
                    <span>Concise</span>
                    <span>Balanced</span>
                    <span>Detailed</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Training Effectiveness</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-primary">94%</div>
                  <p className="text-sm text-muted-foreground">Scenarios learned successfully</p>
                </div>
                <Progress value={94} className="mt-4" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Improvement Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">+18%</div>
                  <p className="text-sm text-muted-foreground">Response quality improvement</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>This Week</span>
                    <span className="font-medium">87%</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Last Week</span>
                    <span className="font-medium">74%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Active Learning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">156</div>
                  <p className="text-sm text-muted-foreground">Learning events this week</p>
                </div>
                <div className="mt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>New Patterns</span>
                    <span className="font-medium">23</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Optimizations</span>
                    <span className="font-medium">41</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AITrainingCenterPage;
