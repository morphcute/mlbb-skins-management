"use client";

import useSWR from "swr";

const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url, {
    cache: "no-store",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ message: "Request failed" }));
    throw new Error(payload.message ?? "Request failed");
  }

  return response.json();
};

export function useLiveQuery<T>(key: string | null, refreshInterval = 5000) {
  return useSWR<T>(key, fetcher, {
    refreshInterval,
    revalidateOnFocus: true,
    dedupingInterval: 1500,
  });
}
