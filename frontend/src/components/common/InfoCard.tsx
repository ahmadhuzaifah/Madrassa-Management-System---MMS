import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

export function InfoCard({ title, description }: { title: string; description: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-400">{description}</p>
      </CardContent>
    </Card>
  );
}
