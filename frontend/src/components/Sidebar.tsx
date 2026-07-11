import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, FolderKanban, ListChecks, Cpu, Boxes, LineChart, Skull, Terminal, Settings, LogOut, Command, Sun, Moon, Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { Button } from './ui/button';

const nav = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, shortcut: '⌘1' },
  { to: '/projects', label: 'Projects', icon: FolderKanban, shortcut: '⌘2' },
  { to: '/queues', label: 'Queues', icon: Boxes, shortcut: '⌘3' },
  { to: '/jobs', label: 'Jobs', icon: ListChecks, shortcut: '⌘4' },
  { to: '/workers', label: 'Workers', icon: Cpu, shortcut: '⌘5' },
  { to: '/analytics', label: 'Analytics', icon: LineChart, shortcut: '⌘6' },
  { to: '/logs', label: 'Execution Logs', icon: Terminal, shortcut: '⌘7' },
  { to: '/dlq', label: 'Dead Letter', icon: Skull, shortcut: '⌘8' },
];

export const Sidebar = ({ onOpenCommand }: { onOpenCommand: () => void }) => {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav2 = useNavigate();

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-background/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary">
          <Zap className="h-5 w-5" strokeWidth={2.2} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-heading text-sm font-semibold tracking-tight">PulseQueue</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Scheduler</span>
        </div>
      </div>

      <button
        data-testid="sidebar-command-btn"
        onClick={onOpenCommand}
        className="mx-3 mt-3 flex items-center justify-between rounded-md border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground hover:bg-secondary/70 transition-colors"
      >
        <span className="flex items-center gap-2"><Command className="h-3.5 w-3.5" /> Command palette</span>
        <kbd className="rounded border border-border bg-background/70 px-1.5 py-0.5 font-mono text-[10px]">⌘K</kbd>
      </button>

      <nav className="mt-4 flex-1 overflow-y-auto no-scrollbar px-2 pb-4">
        <div className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Operate</div>
        {nav.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
            className={({ isActive }) =>
              cn(
                'group relative mx-1 flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className="flex items-center gap-3">
                  <item.icon className="h-4 w-4" strokeWidth={1.75} />
                  {item.label}
                </span>
                <kbd className={cn('rounded border border-border bg-background/60 px-1.5 py-0.5 font-mono text-[9px]', isActive ? 'text-primary' : 'text-muted-foreground')}>{item.shortcut}</kbd>
                {isActive && <span className="absolute right-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-l bg-primary" />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <NavLink to="/settings" data-testid="nav-settings" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground">
            <Settings className="h-3.5 w-3.5" /> Settings
          </NavLink>
          <Button size="icon" variant="ghost" onClick={toggle} data-testid="theme-toggle-btn" className="h-7 w-7">
            {theme === 'dark' ? <Sun className="h-3.5 w-3.5" /> : <Moon className="h-3.5 w-3.5" />}
          </Button>
        </div>
        <div className="flex items-center gap-2 rounded-md border border-border bg-secondary/30 p-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary font-heading text-sm font-semibold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-xs font-medium">{user?.name}</div>
            <div className="truncate text-[10px] text-muted-foreground">{user?.email}</div>
          </div>
          <Button size="icon" variant="ghost" onClick={async () => { await logout(); nav2('/login'); }} data-testid="logout-btn" className="h-7 w-7">
            <LogOut className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </aside>
  );
};
