import { AuthView } from '../../components/auth/AuthView';
import { useAppContext } from '../../context/AppContext';

export function AuthPage() {
  const { authMode, setAuthMode, authForm, setAuthForm, handleAuth } = useAppContext();
  return <AuthView authMode={authMode} setAuthMode={setAuthMode} authForm={authForm} setAuthForm={setAuthForm} onSubmit={handleAuth} />;
}
