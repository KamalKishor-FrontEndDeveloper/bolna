import { useState } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2 } from "lucide-react";
import AccountInfo from "@/components/workspace/AccountInfo";
import TeamMembers from "@/components/workspace/TeamMembers";
import Compliance from "@/components/workspace/Compliance";
import Invoices from "@/components/workspace/Invoices";
import Violations from "@/components/workspace/Violations";
import SubAccounts from "@/components/workspace/SubAccounts";

export default function Workspace() {
  const { tenant } = useAuth();
  const [activeTab, setActiveTab] = useState("team");

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{tenant?.name || 'Workspace'}</h1>
            <p className="text-sm text-muted-foreground">Manage your organization settings and team</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="account">Account Info</TabsTrigger>
            <TabsTrigger value="team">Team Members</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="violations">Violations</TabsTrigger>
            <TabsTrigger value="subaccounts">Sub Accounts</TabsTrigger>
          </TabsList>

          <TabsContent value="account">
            <AccountInfo />
          </TabsContent>

          <TabsContent value="team">
            <TeamMembers />
          </TabsContent>

          <TabsContent value="compliance">
            <Compliance />
          </TabsContent>

          <TabsContent value="invoices">
            <Invoices />
          </TabsContent>

          <TabsContent value="violations">
            <Violations />
          </TabsContent>

          <TabsContent value="subaccounts">
            <SubAccounts />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
