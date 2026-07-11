import * as React from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';

export const AnimatedNumber = ({ value, decimals = 0, prefix = '', suffix = '' }: { value: number; decimals?: number; prefix?: string; suffix?: string }) => {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => `${prefix}${v.toFixed(decimals)}${suffix}`);
  React.useEffect(() => {
    const c = animate(mv, value, { duration: 0.8, ease: 'easeOut' });
    return c.stop;
  }, [value, mv]);
  return <motion.span>{rounded}</motion.span>;
};
