import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./admin.module.css";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className={styles.appShell}>
    <aside className={styles.sidebar}>
      <Link href="/admin" className={styles.brand}><Image src="/brand/sri-sai-anu-mark.svg" width={56} height={44} unoptimized alt="Sri Sai Anu"/><span>School<br/>operations</span></Link>
      <nav aria-label="Admin navigation">
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/courses">Courses</Link>
        <Link href="/admin/customers/new">New enrollment</Link>
        <Link href="/admin/staff">Staff</Link>
        <Link href="/admin/vehicles">Vehicles</Link>
        <Link href="/admin/training">Training control</Link>
        <Link href="/admin/payments">Payments</Link>
        <Link href="/admin/complaints">Complaints</Link>
        <Link href="/admin/enquiries">Enquiries</Link>
        <Link href="/admin/reports">Reports</Link>
      </nav>
      <Link className={styles.exit} href="/login">Back to sign in</Link>
    </aside>
    <header className={styles.mobileHeader}><Image src="/brand/sri-sai-anu-mark.svg" width={48} height={38} unoptimized alt="Sri Sai Anu"/><nav><Link href="/admin">Dashboard</Link><Link href="/admin/training">Training</Link><Link href="/admin/payments">Payments</Link><Link href="/admin/complaints">Complaints</Link><Link href="/admin/enquiries">Enquiries</Link><Link href="/admin/reports">Reports</Link></nav></header>
    <main className={styles.workspace}>{children}</main>
  </div>;
}
