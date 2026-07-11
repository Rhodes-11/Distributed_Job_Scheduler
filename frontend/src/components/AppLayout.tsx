import { Outlet, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/AuthProvider';
import { Sidebar } from './Sidebar';
import { CommandPalette } from './CommandPalette';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from './ui/skeleton';

export const AppLayout = () => {
  const { user } = useAuth();
  const loc = useLocation();
  const [cmdOpen, setCmdOpen] = useState(false);

  useEffect(() => {
    // number shortcuts
    const h = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '8') {
        e.preventDefault();
        const paths = ['/dashboard', '/projects', '/queues', '/jobs', '/workers', '/analytics', '/logs', '/dlq'];
        window.history.pushState({}, '', paths[Number(e.key) - 1]);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, []);

  if (user === undefined) {
    return (
      <div className="min-h-screen grid place-items-center p-8">
        <div className="w-full max-w-md space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-8 w-2/3" />
        </div>
      </div>
    );
  }
  if (user === null) return <Navigate to="/login" state={{ from: loc }} replace />;

  return (
    <div className="min-h-screen bg-background">
      <div className="pointer-events-none fixed inset-0 grid-bg opacity-30 dark:opacity-40" />
      <Sidebar onOpenCommand={() => setCmdOpen(true)} />
      <CommandPalette open={cmdOpen} setOpen={setCmdOpen} />
      <main className="relative ml-64 min-h-screen">
        <AnimatePresence mode="wait">
          <motion.div
            key={loc.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="p-6 lg:p-8 xl:p-10 max-w-[1600px] mx-auto"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
};
