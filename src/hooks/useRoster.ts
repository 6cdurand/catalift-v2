"use client";

import { useEffect, useState } from "react";
import { fetchRoster } from "@/lib/roster";
import type { RosterClient } from "@/types/roster";

export function useRoster(enabled: boolean = true) {
  const [roster, setRoster] = useState<RosterClient[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    fetchRoster()
      .then((data: RosterClient[]) => {
        if (!cancelled) {
          setRoster(data);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setError(err);
          setRoster([]);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { roster, loading, error };
}
