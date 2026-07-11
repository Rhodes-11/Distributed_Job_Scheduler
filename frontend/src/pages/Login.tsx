import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Zap, ArrowRight, Cpu, Boxes, Activity } from 'lucide-react';
import { useAuth } from '@/providers/AuthProvider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const LoginPage = () => {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('demo@pulsequeue.dev');
  const [password, setPassword] = useState('demo1234');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      toast.success('Welcome back');
      nav('/dashboard');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="relative hidden lg:flex flex-col justify-between bg-[#0A0A0A] text-white p-10 overflow-hidden">
        <div className="pointer-events-none absolute inset-0 grid-bg opacity-25" />
        <div className="relative flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/20 text-primary"><Zap className="h-5 w-5" /></div>
          <span className="font-heading text-lg font-semibold">PulseQueue</span>
          <span className="text-[10px] uppercase tracking-[0.2em] text-white/50 ml-1">Scheduler</span>
        </div>
        <div className="relative space-y-6">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-white/70">Enterprise · Distributed · Reliable</div>
          <h1 className="font-heading text-4xl xl:text-5xl font-medium tracking-tight leading-tight">Ship jobs like a<br /><span className="text-primary">distributed system</span> team.</h1>
          <p className="max-w-md text-white/60 leading-relaxed">Atomic claiming, worker heartbeats, exponential backoff, dead-letter queues, cron schedules, and realtime dashboards — all in one platform.</p>
          <div className="grid grid-cols-3 gap-3 max-w-md pt-4">
            {[{ i: Boxes, l: 'Queues' }, { i: Cpu, l: 'Workers' }, { i: Activity, l: 'Realtime' }].map((f) => (
              <div key={f.l} className="rounded-md border border-white/10 bg-white/5 p-3">
                <f.i className="h-4 w-4 text-primary mb-2" />
                <div className="text-xs text-white/80">{f.l}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="relative text-[11px] text-white/40">© PulseQueue Scheduler · Built for reliability</div>
      </div>

      <div className="flex items-center justify-center p-6 lg:p-10">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/15 text-primary"><Zap className="h-4 w-4" /></div>
            <span className="font-heading text-lg font-semibold">PulseQueue</span>
          </div>
          <div className="mb-6">
            <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-2">Sign in</div>
            <h2 className="font-heading text-3xl font-medium tracking-tight">Welcome back</h2>
            <p className="text-sm text-muted-foreground mt-2">Enter your credentials to access your workspace.</p>
          </div>
          <form onSubmit={submit} className="space-y-4" data-testid="login-form">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="login-email" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} data-testid="login-password" required />
            </div>
            <Button type="submit" className="w-full" size="lg" disabled={loading} data-testid="login-submit">
              {loading ? 'Signing in…' : (<>Sign in <ArrowRight className="h-4 w-4" /></>)}
            </Button>
          </form>
          <div className="mt-6 rounded-md border border-dashed border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
            <div className="font-medium text-foreground mb-1">Demo credentials</div>
            <div className="font-mono">demo@pulsequeue.dev · demo1234</div>
          </div>
          <p className="mt-6 text-sm text-muted-foreground">
            No account? <Link to="/register" className="text-primary underline-offset-4 hover:underline" data-testid="link-register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};
