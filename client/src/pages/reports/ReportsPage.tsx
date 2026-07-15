import { ReportsView } from '../../components/reports/ReportsView';
import { useAppContext } from '../../context/AppContext';

export function ReportsPage() {
  const { overview } = useAppContext();
  return <ReportsView overview={overview} />;
}
