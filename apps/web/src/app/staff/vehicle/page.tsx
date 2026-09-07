"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { vehicleIssueInputSchema } from "@/lib/fleet-schema";
import styles from "./vehicle.module.css";

type AssignedVehicle = { id: string; registrationNumber: string; make: string; model: string; transmission: string; status: string; odometerKm: string; issues: Array<{ id: string; severity: string; description: string }> };
type StaffVehicle = { staffCode: string; status: string; licenceExpiresAt: string; vehicleAssignments: Array<{ vehicle: AssignedVehicle }> };

export default function StaffVehiclePage() {
  const [profile, setProfile] = useState<StaffVehicle | null>(null);
  const [message, setMessage] = useState("Loading your assigned vehicle…");
  const [busy, setBusy] = useState(false);
  const vehicle = profile?.vehicleAssignments[0]?.vehicle;
  const load = () => apiFetch<StaffVehicle>("/staff/me").then(result => { setProfile(result); setMessage(""); }).catch(error => setMessage(error instanceof Error ? error.message : "Assignment could not be loaded"));
  useEffect(() => { void load(); }, []);

  const report = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!vehicle) return; const form = event.currentTarget; const data = new FormData(form);
    const parsed = vehicleIssueInputSchema.safeParse({ severity: data.get("severity"), description: data.get("description") });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Describe the issue"); return; }
    setBusy(true); setMessage("");
    void apiFetch(`/vehicles/${vehicle.id}/issues`, { method: "POST", body: JSON.stringify(parsed.data) }).then(() => { form.reset(); setMessage("Issue reported to the school office."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Issue could not be reported")).finally(() => setBusy(false));
  };

  return <main className={styles.page}>
    <header><Image src="/brand/sri-sai-anu-mark.svg" width={52} height={42} unoptimized alt="Sri Sai Anu"/><div><span>{profile?.staffCode ?? "Staff"}</span><Link href="/staff/lessons">Lessons</Link><Link href="/login">Sign out</Link></div></header>
    <section className={styles.intro}><span>Today&apos;s vehicle</span><h1>{vehicle ? vehicle.registrationNumber : "No vehicle assigned"}</h1><p>{vehicle ? `${vehicle.make} ${vehicle.model} · ${vehicle.transmission.toLowerCase()}` : "Ask the school administrator to assign an available vehicle before starting lessons."}</p></section>
    {vehicle && <div className={styles.grid}>
      <section className={styles.vehiclePanel}><div className={styles.status}><i/>{vehicle.status.toLowerCase()}</div><dl><div><dt>Current odometer</dt><dd>{vehicle.odometerKm} <small>km</small></dd></div><div><dt>Licence valid until</dt><dd>{new Date(profile!.licenceExpiresAt).toLocaleDateString("en-IN")}</dd></div><div><dt>Open issues</dt><dd>{vehicle.issues.length}</dd></div></dl>{vehicle.issues.length > 0 && <div className={styles.issues}>{vehicle.issues.map(issue => <p key={issue.id}><b>{issue.severity}</b>{issue.description}</p>)}</div>}</section>
      <section className={styles.report}><span>Vehicle condition</span><h2>Report an issue</h2><p>Tell the office about a warning light, damage, tyre, control or mechanical concern before the next class.</p><form onSubmit={report}><label>Severity<select name="severity" defaultValue="MEDIUM"><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option></select></label><label>What happened?<textarea name="description" rows={5} minLength={5} maxLength={500} required/></label><button disabled={busy}>{busy ? "Reporting…" : "Report issue"}</button></form></section>
    </div>}
    <p className={styles.message} role="status" aria-live="polite">{message}</p>
  </main>;
}
