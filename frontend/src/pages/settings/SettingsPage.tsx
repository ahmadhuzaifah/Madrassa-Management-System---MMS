import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';

export function SettingsPage() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Workspace settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Input placeholder="Workspace name" />
            <Input placeholder="Primary contact" />
          </div>
          <Button className="mt-4">Save</Button>
        </CardContent>
      </Card>
    </div>
  );
}
