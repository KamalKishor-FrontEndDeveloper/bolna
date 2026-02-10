import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Building } from "lucide-react";

export default function SubAccounts() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="w-5 h-5" />
          Sub Accounts
        </CardTitle>
        <CardDescription>Manage sub-accounts and organizations</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12 text-muted-foreground">
          <Building className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Sub-accounts will be displayed here</p>
        </div>
      </CardContent>
    </Card>
  );
}
