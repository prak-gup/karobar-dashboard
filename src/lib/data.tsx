"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import type { DashboardData } from "./types";

interface DataContextType {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
}

const DataContext = createContext<DataContextType>({ data: null, loading: true, error: null });

export function DataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/dashboard_data.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load data");
        return res.json();
      })
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  }, []);

  return <DataContext.Provider value={{ data, loading, error }}>{children}</DataContext.Provider>;
}

export function useData(): DashboardData {
  const { data } = useContext(DataContext);
  if (!data) throw new Error("Data not loaded yet");
  return data;
}

export function useDataContext(): DataContextType {
  return useContext(DataContext);
}
