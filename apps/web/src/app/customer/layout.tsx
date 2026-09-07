"use client";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { apiFetch } from "@/lib/api";
import { CustomerDataProvider, useCustomerData } from "./customer-data";
import styles from "./customer.module.css";

const links = [["/customer", "Home"], ["/customer/history", "Classes"], ["/customer/kilometres", "Kilometres"], ["/customer/payments", "Payments"], ["/customer/complaints", "Complaints"]] as const;
function Shell({ children }: { children: ReactNode }) {
  const pathname = usePathname(), router = useRouter(), { data } = useCustomerData();
  const signOut = async () => { try { await apiFetch("/auth/logout", { method: "POST" }); } finally { sessionStorage.removeItem("accessToken"); router.push("/login"); } };
  return <div className={styles.shell}><header><Link href="/customer" className={styles.brand}><Image src="/brand/sri-sai-anu-mark.svg" width={52} height={42} unoptimized alt="Sri Sai Anu"/><span>{data?.customer.customerCode ?? "Customer record"}</span></Link><nav aria-label="Customer navigation">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav><button onClick={() => void signOut()}>Sign out</button></header><main>{children}</main><nav className={styles.bottomNav} aria-label="Mobile customer navigation">{links.map(([href,label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav></div>;
}
export default function CustomerLayout({ children }: { children: ReactNode }) { return <CustomerDataProvider><Shell>{children}</Shell></CustomerDataProvider>; }
