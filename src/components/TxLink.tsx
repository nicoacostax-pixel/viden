"use client";

import { EXPLORER_BASE } from "@/config/contracts";

export function TxLink({ hash }: { hash: string }) {
  return (
    <a
      href={`${EXPLORER_BASE}/tx/${hash}`}
      target="_blank"
      rel="noopener noreferrer"
      className="text-accent-light text-xs underline hover:text-accent transition-colors"
    >
      Ver en PolygonScan ↗
    </a>
  );
}
