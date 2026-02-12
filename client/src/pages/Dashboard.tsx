import { Layout } from "@/components/Layout";
import { useApiKey } from "@/hooks/use-api-keys";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, PhoneCall, Activity, AlertCircle, TrendingUp, Users, Clock, ArrowUpRight, Database, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export default function Dashboard() {
  const { hasKey } = useApiKey();
  const { token, isLoading: authLoading } = useAuth();
  
  const { data: agents, isLoading: agentsLoading } = useQuery<any[]>({
    queryKey: ["/api/bolna/agents"],
    enabled: hasKey && !!token && !authLoading,
  });

  const { data: phoneNumbers } = useQuery<any[]>({
    queryKey: ["/api/bolna/phone-numbers"],
    enabled: hasKey && !!token && !authLoading,
  });

  const { data: knowledgebases } = useQuery<any[]>({
    queryKey: ["/api/bolna/knowledgebase"],
    enabled: hasKey && !!token && !authLoading,
  });

  const agentCount = Array.isArray(agents) ? agents.length : 0;
  const phoneCount = Array.isArray(phoneNumbers) ? phoneNumbers.length : 0;
  const kbCount = Array.isArray(knowledgebases) ? knowledgebases.length : 0;

  const stats = [
    { 
      label: "Total Agents", 
      value: agentsLoading ? "..." : agentCount, 
      icon: Bot, 
      color: "purple",
      subtext: "Voice agents configured"
    },
    { 
      label: "Phone Numbers", 
      value: phoneCount, 
      icon: PhoneCall, 
      color: "blue",
      subtext: "Numbers available"
    },
    { 
      label: "Knowledge Bases", 
      value: kbCount, 
      icon: Database, 
      color: "slate",
      subtext: "Data sources"
    },
    { 
      label: "Active Calls", 
      value: 0, 
      icon: Activity, 
      color: "emerald",
      subtext: "In progress"
    },
  ];

  const quickActions = [
    { 
      label: "Create Agent", 
      href: "/agents", 
      icon: Bot, 
      className: "bg-[#F3E8FF] border-[#E9D5FF] hover:border-[#D8B4FE]",
      iconClassName: "bg-white text-[#9333EA]"
    },
    { 
      label: "Make Call", 
      href: "/calls", 
      icon: PhoneCall, 
      className: "bg-[#E0F2FE] border-[#BAE6FD] hover:border-[#7DD3FC]",
      iconClassName: "bg-white text-[#0284C7]"
    },
    { 
      label: "View History", 
      href: "/executions", 
      icon: Clock, 
      className: "bg-[#FEF3C7] border-[#FDE68A] hover:border-[#FCD34D]",
      iconClassName: "bg-white text-[#D97706]"
    },
    { 
      label: "Manage Batches", 
      href: "/batches", 
      icon: Layers, 
      className: "bg-[#FCE7F3] border-[#FBCFE8] hover:border-[#F9A8D4]",
      iconClassName: "bg-white text-[#DB2777]"
    },
  ];

  if (!hasKey) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh]">
          <div className="bg-red-50 p-6 rounded-2xl mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold mb-2">API Key Required</h2>
          <p className="text-muted-foreground max-w-md text-center mb-8">
            Configure your ThinkVoiceAPI key to start managing agents and making calls.
          </p>
          <Link href="/settings">
            <Button size="lg">Go to Settings</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Real-time overview of your voice AI platform</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="relative overflow-hidden">
                <CardContent className="p-7">
                  <div className="flex justify-between items-start mb-6">
                    <p className="text-[15px] font-medium text-slate-600 pt-1">{stat.label}</p>
                    <div className="p-3 bg-slate-100 rounded-[14px]">
                      <stat.icon className="w-5 h-5 text-slate-700" />
                    </div>
                  </div>
                  <div>
                    <p className="text-4xl font-bold text-slate-900 tracking-tight">{stat.value}</p>
                    <p className="text-sm text-slate-500 mt-2 font-medium">{stat.subtext}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action, i) => (
              <motion.div
                key={action.label}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.05 }}
              >
                <Link href={action.href}>
                  <Card className={`group cursor-pointer hover:shadow-lg transition-all border ${action.className}`}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl transition-colors ${action.iconClassName}`}>
                            <action.icon className="w-5 h-5" />
                          </div>
                          <span className="font-medium text-slate-900">{action.label}</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                Recent Agents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {agentsLoading ? (
                  <p className="text-sm text-muted-foreground">Loading agents...</p>
                ) : agentCount > 0 ? (
                  agents?.slice(0, 5).map((agent: any, i: number) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <div>
                          <p className="text-sm font-medium">{agent.agent_name || agent.name || 'Unnamed Agent'}</p>
                          <p className="text-xs text-muted-foreground">ID: {agent.agent_id?.slice(0, 8) || agent.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                      <Link href={`/agents`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No agents yet</p>
                    <Link href="/agents">
                      <Button variant="link" size="sm" className="mt-2">Create your first agent</Button>
                    </Link>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                System Resources
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Bot className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">Voice Agents</span>
                  </div>
                  <span className="text-sm font-medium">{agentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <PhoneCall className="w-4 h-4 text-green-600" />
                    <span className="text-sm">Phone Numbers</span>
                  </div>
                  <span className="text-sm font-medium">{phoneCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Database className="w-4 h-4 text-purple-600" />
                    <span className="text-sm">Knowledge Bases</span>
                  </div>
                  <span className="text-sm font-medium">{kbCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4 text-orange-600" />
                    <span className="text-sm">Active Calls</span>
                  </div>
                  <span className="text-sm font-medium">0</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
