"use client";

import type { Lesson, LessonCustomerSearchResult } from "@hyd/contracts";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { startLessonSchema } from "@/lib/lesson-schema";
import styles from "./lessons.module.css";

type MyVehicle = { vehicleAssignments: Array<{ vehicle: { registrationNumber: string; odometerKm: string } }> };

export default function LessonsPage() {
  const router = useRouter();
  const [results, setResults] = useState<LessonCustomerSearchResult[]>([]);
  const [selected, setSelected] = useState<LessonCustomerSearchResult | null>(null);
  const [vehicle, setVehicle] = useState<MyVehicle | null>(null);
  const [history, setHistory] = useState<Lesson[]>([]);
  const [message, setMessage] = useState("Loading today’s work…");
  const [busy, setBusy] = useState(false);

  useEffect(() => { void Promise.all([apiFetch<Lesson | null>("/lessons/active"), apiFetch<MyVehicle>("/staff/me"), apiFetch<Lesson[]>("/lessons/history")]).then(([active, vehicleResult, historyResult]) => { if (active) router.replace("/staff/lessons/active"); setVehicle(vehicleResult); setHistory(historyResult); setMessage(""); }).catch(error => setMessage(error instanceof Error ? error.message : "Lesson workspace could not be loaded")); }, [router]);

  const search = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const query = String(new FormData(event.currentTarget).get("query") ?? "").trim(); if (query.length < 2) return;
    setMessage("Searching…"); setSelected(null);
    void apiFetch<LessonCustomerSearchResult[]>(`/lessons/customers/search?query=${encodeURIComponent(query)}`).then(items => { setResults(items); setMessage(items.length ? "" : "No eligible customer found."); }).catch(error => setMessage(error instanceof Error ? error.message : "Search failed"));
  };

  const start = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!selected) return; const data = new FormData(event.currentTarget);
    const parsed = startLessonSchema.safeParse({ enrollmentId: selected.enrollmentId, startOdometerKm: Number(data.get("startOdometerKm")), startEvidenceUrl: data.get("startEvidenceUrl") || undefined });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the odometer"); return; }
    setBusy(true); setMessage("");
    void apiFetch<Lesson>("/lessons/start", { method: "POST", body: JSON.stringify(parsed.data) }).then(() => router.push("/staff/lessons/active")).catch(error => setMessage(error instanceof Error ? error.message : "Lesson could not be started")).finally(() => setBusy(false));
  };

  const assigned = vehicle?.vehicleAssignments[0]?.vehicle;
  return <main className={styles.page}>
    <header><Image src="/brand/sri-sai-anu-mark.svg" width={52} height={42} unoptimized alt="Sri Sai Anu"/><nav><Link href="/staff">Dashboard</Link><Link href="/staff/vehicle">Vehicle</Link><Link href="/login">Sign out</Link></nav></header>
    <section className={styles.intro}><span>Digital notebook</span><h1>Start a lesson</h1><p>Search the customer who arrived first. There is no booking or digital waiting list.</p></section>
    <div className={styles.workspace}>
      <section className={styles.searchPanel}><form className={styles.search} onSubmit={search}><label htmlFor="customer-search">Customer ID, name or mobile</label><div><input id="customer-search" name="query" minLength={2} placeholder="SSA-12AB34 or customer name" required/><button>Search</button></div></form>
        <div className={styles.results}>{results.map(result => <button type="button" aria-pressed={selected?.enrollmentId === result.enrollmentId} onClick={() => setSelected(result)} key={result.enrollmentId}><span><b>{result.customerCode}</b><strong>{result.displayName}</strong><small>{result.phone}</small></span><span><strong>{result.courseName}</strong><small>{result.classesCompleted} of {result.classesTotal} classes · {result.pendingKm} km pending</small></span></button>)}</div>
        {!results.length && <p className={styles.empty}>Search results will show only customers eligible to start a class.</p>}
      </section>
      <aside className={styles.startPanel}><span>Lesson check</span><h2>{selected ? selected.displayName : "Select a customer"}</h2>{selected && <><dl><div><dt>Next class</dt><dd>{selected.classesCompleted + 1}</dd></div><div><dt>Today’s target</dt><dd>{Number(selected.targetKm) + Number(selected.pendingKm)} km</dd></div><div><dt>Pending brought forward</dt><dd>{selected.pendingKm} km</dd></div><div><dt>Vehicle</dt><dd>{assigned?.registrationNumber ?? "Not assigned"}</dd></div></dl><form onSubmit={start}><label>Starting odometer<input name="startOdometerKm" type="number" min={assigned?.odometerKm ?? 0} step="0.1" defaultValue={assigned?.odometerKm ?? ""} required/></label><label>Odometer evidence URL <small>Optional</small><input name="startEvidenceUrl" type="url" placeholder="https://…"/></label><button disabled={busy || !assigned}>{busy ? "Starting…" : "Start lesson"}</button></form></>}</aside>
    </div>
    <section className={styles.history}><div><span>Recent notebook entries</span><h2>Your lesson history</h2></div><div className={styles.historyList}>{history.slice(0, 8).map(lesson => <article key={lesson.id}><b>Class {lesson.classNumber}</b><span>{lesson.customer.user.displayName}<small>{lesson.customer.customerCode} · {lesson.vehicle.registrationNumber}</small></span><span>{lesson.coveredKm} km<small>{lesson.status === "COMPLETED_WITH_SHORTFALL" ? `${lesson.shortfallKm} km pending` : "Target met"}</small></span><time>{new Date(lesson.endedAt!).toLocaleDateString("en-IN")}</time></article>)}{!history.length && <p className={styles.empty}>Completed lessons will appear here.</p>}</div></section>
    <p className={styles.message} role="status" aria-live="polite">{message}</p>
  </main>;
}
