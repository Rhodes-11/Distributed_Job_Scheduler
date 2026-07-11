import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ExternalLink, Moon, Sun, LogOut, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage = () => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  return (
    <div className="space-y-6" data-testid="settings-page">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Settings</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Preferences & Profile</h1>
        <p className="text-sm text-muted-foreground mt-2">Configure your workspace and account.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 text-primary font-heading text-base font-semibold">{user?.name?.[0]}</div>
            <div><div className="font-heading text-base font-medium">{user?.name}</div><div className="text-xs text-muted-foreground">{user?.email}</div></div>
          </div>
          <dl className="text-sm space-y-2">
            <div className="flex justify-between"><dt className="text-muted-foreground">Role</dt><dd>{user?.role}</dd></div>
            <div className="flex justify-between"><dt className="text-muted-foreground">User ID</dt><dd className="font-mono text-xs">{user?.id.slice(0, 8)}…</dd></div>
          </dl>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={async () => { await logout(); nav('/login'); }} data-testid="settings-logout-btn"><LogOut className="h-4 w-4" /> Sign out</Button>
          </div>
        </Card>
        <Card className="p-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Appearance</div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div className="flex items-center gap-3">{theme === 'dark' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}<div><div className="text-sm font-medium">Theme</div><div className="text-xs text-muted-foreground">{theme === 'dark' ? 'Dark' : 'Light'} mode</div></div></div>
            <Button variant="outline" onClick={toggle} data-testid="settings-theme-toggle">Toggle</Button>
          </div>
          <div className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-3">Resources</div>
          <a href="/api/docs" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-md border border-border p-3 hover:bg-secondary/50">
            <div><div className="text-sm font-medium">API Documentation</div><div className="text-xs text-muted-foreground">Interactive Swagger / OpenAPI</div></div>
            <ExternalLink className="h-4 w-4 text-muted-foreground" />
          </a>
        </Card>
      </div>
    </div>
  );
};
