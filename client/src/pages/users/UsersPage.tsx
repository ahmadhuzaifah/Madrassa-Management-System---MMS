import { UsersView } from '../../components/users/UsersView';
import { useAppContext } from '../../context/AppContext';

export function UsersPage() {
  const { users } = useAppContext();
  return <UsersView users={users} />;
}
