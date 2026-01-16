import { Layout } from "@/components/Layout";
import { PageHeader } from "@/components/PageHeader";
import { useApiKey } from "@/hooks/use-api-keys";
import { useAgents } from "@/hooks/use-bolna";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Bot, PhoneCall, Activity, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { motion } from "framer-motion";

export default function Dashboard() {
  const { hasKey } = useApiKey();
  const { data: agents, isLoading, error } = useAgents();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  if (!hasKey) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-[60vh] text-center">
          <div className="bg-red-50 p-6 rounded-full mb-6">
            <AlertCircle className="w-12 h-12 text-red-500" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">API Key Required</h2>
          <p className="text-slate-500 max-w-md mb-8">
            You need to configure your Bolna API key before you can start managing agents and making calls.
          </p>
          <Link href="/settings">
            <Button size="lg" className="gap-2">
              Go to Settings <span aria-hidden="true">&rarr;</span>
            </Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageHeader 
        title="Dashboard" 
        description="Overview of your Bolna.ai integration"
      />

      <motion.div 
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-primary">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {isLoading ? "..." : (Array.isArray(agents) ? agents.length : 0)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Active voice agents
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-indigo-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Calls</CardTitle>
              <PhoneCall className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">-</div>
              <p className="text-xs text-muted-foreground mt-1">
                Check history for details
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="hover:shadow-lg transition-shadow border-t-4 border-t-emerald-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Status</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-600">Operational</div>
              <p className="text-xs text-muted-foreground mt-1">
                API Connection Active
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Quick Actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-8"
      >
        <h3 className="text-lg font-semibold mb-4 text-slate-900">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/agents">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2 hover:border-primary hover:text-primary transition-all">
              <Bot className="w-6 h-6" />
              <span>Manage Agents</span>
            </Button>
          </Link>
          <Link href="/calls">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2 hover:border-indigo-500 hover:text-indigo-500 transition-all">
              <PhoneCall className="w-6 h-6" />
              <span>Make a Call</span>
            </Button>
          </Link>
          <Link href="/executions">
            <Button variant="outline" className="w-full h-auto py-6 flex flex-col items-center gap-2 hover:border-emerald-500 hover:text-emerald-500 transition-all">
              <Activity className="w-6 h-6" />
              <span>View History</span>
            </Button>
          </Link>
        </div>
      </motion.div>
    </Layout>
  );
}
