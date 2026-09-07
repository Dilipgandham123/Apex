"use client";
import type { CustomerOverview } from "@hyd/contracts";
import { createContext, useContext, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

const CustomerData = createContext<{ data: CustomerOverview | null; message: string }>({ data: null, message: "Loading your training record…" });
export function CustomerDataProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<CustomerOverview | null>(null), [message, setMessage] = useState("Loading your training record…");
  useEffect(() => { void apiFetch<CustomerOverview>("/customer/me/overview").then(result => { setData(result); setMessage(""); }).catch(error => setMessage(error instanceof Error ? error.message : "Your record could not be loaded.")); }, []);
  return <CustomerData.Provider value={{ data, message }}>{children}</CustomerData.Provider>;
}
export function useCustomerData() { return useContext(CustomerData); }
