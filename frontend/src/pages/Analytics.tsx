import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar, Legend } from 'recharts';

export const AnalyticsPage = () => {
  const series = useQuery({ queryKey: ['ts-24'], queryFn: () => api.get('/analytics/timeseries?hours=24').then((r) => r.data), refetchInterval: 10000 });
  const util = useQuery({ queryKey: ['util'], queryFn: () => api.get('/analytics/worker-utilization').then((r) => r.data), refetchInterval: 10000 });

  return (
    <div className="space-y-6" data-testid="analytics-page">
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Analytics</div>
        <h1 className="font-heading text-3xl sm:text-4xl font-medium tracking-tight mt-1">Insights & Trends</h1>
        <p className="text-sm text-muted-foreground mt-2">Throughput, latency and worker utilization across the platform.</p>
      </div>
      <Card className="p-5">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Throughput timeline</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series.data?.series || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="ts" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => new Date(v).getHours() + 'h'} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="completed" stroke="#10B981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="failed" stroke="#EF4444" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="total" stroke="#FF5A00" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card className="p-5">
        <div className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Worker utilization</div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={util.data?.data || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="cpu" fill="#FF5A00" radius={[4, 4, 0, 0]} />
              <Bar dataKey="active" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
};
