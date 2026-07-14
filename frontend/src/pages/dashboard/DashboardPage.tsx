import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';

export function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">3</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">12</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Billing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">Healthy</p>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Workspace overview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-400">This dashboard scaffold is ready for future SaaS modules.</p>
        </CardContent>
      </Card>
    </div>
  );
}
