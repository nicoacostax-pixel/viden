'use client';
import { useState, useCallback } from 'react';

function load(): number[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem('viden_watchlist') ?? '[]'); } catch { return []; }
}

export function useWatchlist() {
  const [ids, setIds] = useState<number[]>(load);

  const toggle = useCallback((id: number) => {
    setIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      localStorage.setItem('viden_watchlist', JSON.stringify(next));
      return next;
    });
  }, []);

  return { ids, toggle, has: (id: number) => ids.includes(id) };
}
