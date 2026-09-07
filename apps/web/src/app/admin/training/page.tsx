"use client";
import { useCallback, useEffect, useState } from "react";
import type { TrainingEnrollment } from "@hyd/contracts";
import { apiFetch } from "../../../lib/api";
import styles from "../admin.module.css";

export default function TrainingPage() {
  const [rows, setRows] = useState<TrainingEnrollment[]>([]), [selected, setSelected] = useState<string | null>(null), [status, setStatus] = useState("Loading training records…"), [busy, setBusy] = useState(false);
  const load = useCallback(async () => { try { const data = await apiFetch<TrainingEnrollment[]>("/training/enrollments"); setRows(data); setSelected(current => current ?? data[0]?.id ?? null); setStatus(data.length ? "" : "No active training windows."); } catch (error) { setStatus(error instanceof Error ? error.message : "Could not load training records."); } }, []);
  useEffect(() => { void apiFetch<TrainingEnrollment[]>("/training/enrollments").then(data => { setRows(data); setSelected(data[0]?.id ?? null); setStatus(data.length ? "" : "No active training windows."); }).catch(error => setStatus(error instanceof Error ? error.message : "Could not load training records.")); }, []);
  const active = rows.find(row => row.id === selected);
  async function submit(path: string, body: object, success: string) { setBusy(true); try { await apiFetch(path, { method: "POST", body: JSON.stringify(body) }); setStatus(success); await load(); } catch (error) { setStatus(error instanceof Error ? error.message : "The change could not be saved."); } finally { setBusy(false); } }
  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><span>Training control</span><h1>Kilometres and deadlines</h1><p>Resolve exceptions without changing lesson history. Every recovery, adjustment and deadline extension remains traceable.</p></div><div className={styles.countBadge}>{rows.filter(row => row.status === "EXPIRED").length} expired · {rows.filter(row => Number(row.pendingKm) > 0).length} pending KM</div></header>
    <div className={styles.trainingLayout}>
      <section className={styles.trainingList} aria-label="Training enrollments">{rows.map(row => <button key={row.id} onClick={() => setSelected(row.id)} aria-pressed={selected === row.id}><span><b>{row.customer.customerCode}</b><strong>{row.customer.user.displayName}</strong><small>{row.courseNameSnapshot} · {row.lessons.length}/{row.classCountSnapshot} classes</small></span><span><strong>{row.pendingKm} km</strong><small>{row.status === "EXPIRED" ? "Expired" : row.daysRemaining <= 7 ? `${row.daysRemaining} days left` : new Date(row.deadlineAt).toLocaleDateString("en-IN")}</small></span></button>)}</section>
      {active && <section className={styles.trainingDetail}>
        <div className={styles.trainingSummary}><div><span>Pending</span><strong>{active.pendingKm} km</strong></div><div><span>Covered</span><strong>{active.completedKm} km</strong></div><div><span>Deadline</span><strong>{new Date(active.deadlineAt).toLocaleDateString("en-IN")}</strong></div></div>
        <h2>{active.customer.user.displayName}</h2><p>{active.customer.customerCode} · {active.customer.user.phone}</p>
        <div className={styles.ledger}><h3>Kilometre ledger</h3>{active.kilometreEntries.map(entry => <div key={entry.id}><span>{entry.type === "SHORTFALL" ? "Shortfall created" : entry.type === "RECOVERY" ? "Recovered later" : "Admin correction"}<small>{entry.reason ?? new Date(entry.createdAt).toLocaleDateString("en-IN")}</small></span><b>{entry.type === "RECOVERY" ? "−" : entry.type === "ADJUSTMENT" && Number(entry.adjustmentKm) < 0 ? "−" : "+"}{entry.type === "ADJUSTMENT" ? Math.abs(Number(entry.adjustmentKm)) : entry.amountKm} km</b></div>)}{!active.kilometreEntries.length && <p>No kilometre exceptions.</p>}</div>
        <div className={styles.trainingForms}>
          <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit(`/training/enrollments/${active.id}/deadline-extensions`, { newDeadline: data.get("newDeadline"), reason: data.get("reason") }, "Deadline extended and audited."); }}><h3>Extend deadline</h3><label>New deadline<input required name="newDeadline" type="date" min={active.deadlineAt.slice(0,10)} /></label><label>Reason<textarea required minLength={5} name="reason" rows={3}/></label><button disabled={busy}>Save extension</button></form>
          <form onSubmit={event => { event.preventDefault(); const data = new FormData(event.currentTarget); void submit(`/training/enrollments/${active.id}/kilometre-adjustments`, { adjustmentKm: Number(data.get("adjustmentKm")), reason: data.get("reason") }, "Kilometre correction recorded."); }}><h3>Correct pending KM</h3><label>Adjustment in KM<input required name="adjustmentKm" type="number" step="0.1" placeholder="-1 or 1" /></label><label>Reason<textarea required minLength={5} name="reason" rows={3}/></label><button disabled={busy}>Record correction</button></form>
        </div>
      </section>}
    </div><p className={styles.status} role="status">{status}</p>
  </div>;
}
