import { useEffect, useState } from 'react';
import { api } from '../../services/api';

export function AnalyticsPage({ title, endpoint }: { title: string; endpoint: string }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => {
    void api.get(endpoint).then(setData).catch(() => setData({ error: 'Unable to load analytics' }));
  }, [endpoint]);
  return <section className="panel"><p className="eyebrow">Analytics</p><h3>{title}</h3><pre className="code-block">{JSON.stringify(data, null, 2)}</pre></section>;
}

export function AnalyticsDashboardPage() { return <AnalyticsPage title="Executive Dashboard" endpoint="/api/reports/dashboard" />; }
export function AnalyticsStudentsPage() { return <AnalyticsPage title="Student Analytics" endpoint="/api/reports/students/overview" />; }
export function AnalyticsAttendancePage() { return <AnalyticsPage title="Attendance Analytics" endpoint="/api/reports/attendance/summary" />; }
export function AnalyticsFinancePage() { return <AnalyticsPage title="Finance Analytics" endpoint="/api/reports/finance/summary" />; }
export function AnalyticsAcademicPage() { return <AnalyticsPage title="Academic Analytics" endpoint="/api/reports/academic/performance" />; }
export function AnalyticsHrPage() { return <AnalyticsPage title="HR Analytics" endpoint="/api/reports/hr/overview" />; }
export function AnalyticsInventoryPage() { return <AnalyticsPage title="Inventory Analytics" endpoint="/api/reports/inventory/assets" />; }
export function AnalyticsLibraryPage() { return <AnalyticsPage title="Library Analytics" endpoint="/api/reports/library/overview" />; }
export function AnalyticsCustomReportsPage() { return <AnalyticsPage title="Custom Reports" endpoint="/api/reports/export?type=overview&format=csv" />; }
export function AnalyticsScheduledPage() { return <AnalyticsPage title="Scheduled Reports" endpoint="/api/reports/dashboard" />; }
export function AnalyticsExportsPage() { return <AnalyticsPage title="Exports" endpoint="/api/reports/export?type=overview&format=csv" />; }
