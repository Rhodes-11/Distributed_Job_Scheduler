import { useRef, type ReactNode } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

// Magnetic tilt card — cursor-follow with 3D perspective. Anti-gravity vibe.
export const MagneticCard = ({ children, className, glow = 'purple' }: { children: ReactNode; className?: string; glow?: 'purple' | 'blue' | 'amber' }) => {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 150, damping: 15 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-8, 8]), { stiffness: 150, damping: 15 });
  const glare = useTransform(mx, [-0.5, 0.5], ['0%', '100%']);

  const glowClass = glow === 'blue' ? 'neon-glow-blue' : glow === 'amber' ? 'neon-glow-amber' : 'neon-glow-purple';

  return (
    <motion.div
      ref={ref}
      className={cn('relative rounded-xl bg-card/60 backdrop-blur-xl border border-border overflow-hidden will-change-transform', glowClass, className)}
      style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
      onMouseMove={(e) => {
        const r = ref.current!.getBoundingClientRect();
        mx.set((e.clientX - r.left) / r.width - 0.5);
        my.set((e.clientY - r.top) / r.height - 0.5);
      }}
      onMouseLeave={() => { mx.set(0); my.set(0); }}
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: useTransform(
            glare,
            (g) => `radial-gradient(400px circle at ${g} 50%, rgba(147,197,253,0.14), transparent 60%)`,
          ),
        }}
      />
      <div style={{ transform: 'translateZ(30px)' }}>{children}</div>
    </motion.div>
  );
};
