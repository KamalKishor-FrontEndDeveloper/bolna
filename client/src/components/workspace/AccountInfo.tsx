import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";

export default function AccountInfo() {
  const { tenant, user } = useAuth();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Organization Details</CardTitle>
          <CardDescription>Your organization information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Organization Name</Label>
              <Input value={tenant?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input value={tenant?.slug || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Plan</Label>
              <Input value={tenant?.plan || ''} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Input value={tenant?.status || ''} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>ThinkVoiceSub Account ID</Label>
              <Input value={tenant?.bolna_sub_account_id || ''} disabled className="font-mono text-xs" />
            </div>
            <div className="space-y-2">
              <Label>Created</Label>
              <Input value={tenant?.created_at ? format(new Date(tenant.created_at), 'dd MMM yyyy, HH:mm') : ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your Account</CardTitle>
          <CardDescription>Your personal account information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={user?.name || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={user?.email || ''} disabled className="font-mono" />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={user?.role || ''} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Input value={user?.status || ''} disabled className="capitalize" />
            </div>
            <div className="space-y-2">
              <Label>User ID</Label>
              <Input value={user?.id?.toString() || ''} disabled />
            </div>
            <div className="space-y-2">
              <Label>Joined</Label>
              <Input value={user?.created_at ? format(new Date(user.created_at), 'dd MMM yyyy, HH:mm') : ''} disabled />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
