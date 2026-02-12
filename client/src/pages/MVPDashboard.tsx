import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/SimpleAuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Phone, Bot, BarChart3, LogOut, Plus } from 'lucide-react';

export default function MVPDashboard() {
  const { user, logout, token } = useAuth();
  const [agents, setAgents] = useState([]);
  const [calls, setCalls] = useState([]);
  const [stats, setStats] = useState({ totalCalls: 0, successRate: 0, avgDuration: 0 });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch agents
      const agentsRes = await fetch('/api/bolna/agents', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (agentsRes.ok) {
        const agentsData = await agentsRes.json();
        setAgents(agentsData);
      }

      // Fetch executions (calls)
      const callsRes = await fetch('/api/tenant/executions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (callsRes.ok) {
        const callsData = await callsRes.json();
        setCalls(callsData);
        
        // Calculate stats
        const total = callsData.length;
        const successful = callsData.filter((c: any) => c.execution.duration).length;
        const avgDur = callsData.reduce((acc: number, c: any) => 
          acc + (parseInt(c.execution.duration) || 0), 0) / total || 0;
        
        setStats({
          totalCalls: total,
          successRate: total ? Math.round((successful / total) * 100) : 0,
          avgDuration: Math.round(avgDur)
        });
      }
    } catch (error) {
      console.error('Failed to fetch data:', error);
    }
  };

  const createAgent = async () => {
    const agentConfig = {
      agent_name: `Agent ${agents.length + 1}`,
      agent_welcome_message: "Hello! How can I help you today?",
      tasks: [{
        task_type: "conversation",
        toolchain: {
          execution: "parallel",
          pipelines: [["transcriber", "llm", "synthesizer"]]
        },
        task_config: {
          transcriber: { model: "deepgram", language: "en" },
          llm: { model: "gpt-4o", max_tokens: 100, temperature: 0.7 },
          synthesizer: { model: "elevenlabs", voice: "rachel" }
        }
      }]
    };

    try {
      const response = await fetch('/api/bolna/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          agent_config: agentConfig,
          agent_prompts: {
            task_1: { system_prompt: "You are a helpful AI assistant." }
          }
        })
      });

      if (response.ok) {
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to create agent:', error);
    }
  };

  const makeCall = async (agentId: string) => {
    const phoneNumber = prompt('Enter phone number (e.g., +1234567890):');
    if (!phoneNumber) return;

    try {
      const response = await fetch('/api/bolna/calls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          agent_id: agentId,
          recipient_phone_number: phoneNumber,
          from_phone_number: '+1234567890' // Demo number
        })
      });

      if (response.ok) {
        alert('Call initiated successfully!');
        fetchData(); // Refresh data
      }
    } catch (error) {
      console.error('Failed to make call:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <Bot className="h-8 w-8 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">ThinkVoiceAI Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">Welcome, {user?.name}</span>
              <Button onClick={logout} variant="outline" size="sm">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Calls</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCalls}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.successRate}%</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
              <Phone className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgDuration}s</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="agents" className="space-y-4">
          <TabsList>
            <TabsTrigger value="agents">AI Agents</TabsTrigger>
            <TabsTrigger value="calls">Call Logs</TabsTrigger>
          </TabsList>
          
          <TabsContent value="agents">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>AI Voice Agents</CardTitle>
                    <CardDescription>Manage your AI voice agents</CardDescription>
                  </div>
                  <Button onClick={createAgent}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Agent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agents.map((agent: any) => (
                      <TableRow key={agent.id}>
                        <TableCell className="font-medium">{agent.agent_name}</TableCell>
                        <TableCell>
                          <Badge variant="default">{agent.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(agent.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            onClick={() => makeCall(agent.bolna_agent_id)}
                          >
                            Make Call
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="calls">
            <Card>
              <CardHeader>
                <CardTitle>Call Logs</CardTitle>
                <CardDescription>View all call executions and transcripts</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Agent</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Transcript</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Recording</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {calls.map((call: any) => (
                      <TableRow key={call.execution.id}>
                        <TableCell>{call.agent.agent_name}</TableCell>
                        <TableCell>{call.execution.duration || 'N/A'}</TableCell>
                        <TableCell className="max-w-xs truncate">
                          {call.execution.transcript || 'No transcript'}
                        </TableCell>
                        <TableCell>{new Date(call.execution.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {call.execution.recording_url ? (
                            <Button size="sm" variant="outline">
                              <a href={call.execution.recording_url} target="_blank" rel="noopener noreferrer">
                                Play
                              </a>
                            </Button>
                          ) : 'N/A'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}