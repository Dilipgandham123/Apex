"use client";

import type { Lesson } from "@hyd/contracts";
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { endLessonSchema } from "@/lib/lesson-schema";
import styles from "../lessons.module.css";

const skillOptions = ["Steering", "Gear changes", "Braking", "Traffic observation", "Parking", "Reversing"];

export default function ActiveLessonPage() {
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [receipt, setReceipt] = useState<Lesson | null>(null);
  const [ending, setEnding] = useState(0);
  const [message, setMessage] = useState("Recovering active lesson…");
  const [busy, setBusy] = useState(false);
  useEffect(() => { void apiFetch<Lesson | null>("/lessons/active").then(result => { setLesson(result); setEnding(Number(result?.startOdometerKm ?? 0)); setMessage(result ? "" : "No active lesson."); }).catch(error => setMessage(error instanceof Error ? error.message : "Active lesson could not be loaded")); }, []);

  const end = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!lesson) return; const data = new FormData(event.currentTarget);
    const parsed = endLessonSchema.safeParse({ endOdometerKm: ending, endEvidenceUrl: data.get("endEvidenceUrl") || undefined, customerSummary: data.get("customerSummary") || undefined, privateNote: data.get("privateNote") || undefined, skills: data.getAll("skills") });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the lesson details"); return; }
    setBusy(true); setMessage("");
    void apiFetch<Lesson>(`/lessons/${lesson.id}/end`, { method: "POST", body: JSON.stringify(parsed.data) }).then(result => { setReceipt(result); setLesson(null); setMessage("Lesson saved to the digital notebook."); }).catch(error => setMessage(error instanceof Error ? error.message : "Lesson could not be completed")).finally(() => setBusy(false));
  };

  const previewCovered = Math.max(0, ending - Number(lesson?.startOdometerKm ?? ending));
  const previewPending = Math.max(0, Number(lesson?.totalTargetKm ?? 0) - previewCovered);
  return <main className={styles.page}>
    <header><Image src="/brand/sri-sai-anu-mark.svg" width={52} height={42} unoptimized alt="Sri Sai Anu"/><nav><Link href="/staff/vehicle">Vehicle</Link><Link href="/login">Sign out</Link></nav></header>
    {lesson && <><section className={styles.activeHero}><div><span>Lesson in progress</span><h1>{lesson.customer.user.displayName}</h1><p>{lesson.customer.customerCode} · Class {lesson.classNumber} · {lesson.vehicle.registrationNumber}</p></div><time>Started {new Date(lesson.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</time></section>
      <form className={styles.endLayout} onSubmit={end}><section className={styles.odometer}><span>Authoritative distance</span><h2>End odometer</h2><label>Ending reading<input type="number" min={lesson.startOdometerKm} step="0.1" value={ending} onChange={event => setEnding(Number(event.target.value))} required/></label><dl><div><dt>Started at</dt><dd>{lesson.startOdometerKm}</dd></div><div><dt>Covered</dt><dd>{previewCovered.toFixed(1)} km</dd></div><div><dt>Normal + recovery target</dt><dd>{lesson.totalTargetKm} km</dd></div><div><dt>Pending brought forward</dt><dd>{lesson.pendingKmBefore} km</dd></div><div><dt>Pending after lesson</dt><dd>{previewPending.toFixed(1)} km</dd></div></dl><label>Odometer evidence URL <small>Optional</small><input name="endEvidenceUrl" type="url" placeholder="https://…"/></label></section>
        <section className={styles.notes}><span>Lesson record</span><h2>Skills and summary</h2><fieldset><legend>Skills practised</legend>{skillOptions.map(skill => <label key={skill}><input type="checkbox" name="skills" value={skill}/>{skill}</label>)}</fieldset><label>Customer-visible summary<textarea name="customerSummary" rows={4} maxLength={500}/></label><label>Private staff note<textarea name="privateNote" rows={3} maxLength={1000}/></label><button disabled={busy}>{busy ? "Saving lesson…" : "End and save lesson"}</button></section></form></>}
    {receipt && <section className={styles.receipt}><span>Lesson complete</span><h1>{receipt.coveredKm} km recorded</h1><p>Class {receipt.classNumber} · {receipt.status === "COMPLETED_WITH_SHORTFALL" ? `${receipt.shortfallKm} km remains pending for this class.` : "Distance target met."}</p><Link href="/staff/lessons">Select next customer</Link></section>}
    {!lesson && !receipt && <section className={styles.receipt}><span>Digital notebook</span><h1>No active lesson</h1><Link href="/staff/lessons">Select a customer</Link></section>}
    <p className={styles.message} role="status" aria-live="polite">{message}</p>
  </main>;
}
