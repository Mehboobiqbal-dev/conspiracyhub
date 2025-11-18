'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

interface RelativeTimeProps {
  date: string | number | Date;
  refreshIntervalMs?: number | null;
  className?: string;
}

export function RelativeTime({ date, refreshIntervalMs = 60000, className }: RelativeTimeProps) {
  const [value, setValue] = useState('');

  useEffect(() => {
    const compute = () => {
      setValue(formatDistanceToNow(new Date(date), { addSuffix: true }));
    };

    compute();

    if (!refreshIntervalMs) {
      return;
    }

    const interval = window.setInterval(compute, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [date, refreshIntervalMs]);

  return (
    <span className={className} suppressHydrationWarning>
      {value || ''}
    </span>
  );
}


