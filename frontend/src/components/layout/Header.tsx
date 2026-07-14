import { Bell, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from '../ui/button';

export function Header() {
  const [dark, setDark] = useState(true);

  return (
    <header className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 px-6 py-4">
      <div>
        <p className="text-sm text-slate-400">Operations workspace</p>
        <h1 className="text-xl font-semibold">Welcome back</h1>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setDark((value) => !value)}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="sm">
          <Bell className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
