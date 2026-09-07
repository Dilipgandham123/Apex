"use client";

import type { Course } from "@hyd/contracts";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { courseInputSchema } from "@/lib/registration-schema";
import styles from "../admin.module.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [message, setMessage] = useState("Loading courses…");
  const [busy, setBusy] = useState(false);

  const load = () => apiFetch<Course[]>("/courses").then(result => { setCourses(result); setMessage(result.length ? "" : "No courses yet. Add the first course to begin enrollment."); }).catch(error => setMessage(error instanceof Error ? error.message : "Courses could not be loaded"));
  useEffect(() => { void load(); }, []);

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setMessage("");
    const parsed = courseInputSchema.safeParse({
      code: data.get("code"), name: data.get("name"), transmission: data.get("transmission"),
      price: Number(data.get("price")), classCount: Number(data.get("classCount")),
      targetKmPerClass: Number(data.get("targetKmPerClass")), durationDays: Number(data.get("durationDays")),
    });
    if (!parsed.success) { setBusy(false); setMessage(parsed.error.issues[0]?.message ?? "Check the course details"); return; }
    void apiFetch<Course>("/courses", { method: "POST", body: JSON.stringify(parsed.data) }).then(() => { form.reset(); setMessage("Course created and ready for enrollment."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Course could not be created")).finally(() => setBusy(false));
  };

  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><span>Course setup</span><h1>Training programs</h1><p>These rules are copied into each enrollment, so later course changes never rewrite a customer&apos;s agreement.</p></div><Link className={styles.primaryLink} href="/admin/customers/new">Enroll customer</Link></header>
    <div className={styles.courseLayout}>
      <section className={styles.listSection} aria-labelledby="course-list-title"><div className={styles.sectionTitle}><h2 id="course-list-title">Current courses</h2><span>{courses.length} total</span></div>
        <div className={styles.courseList}>{courses.map(course => <article key={course.id}>
          <div><strong>{course.name}</strong><span>{course.code} · {course.transmission.toLowerCase()}</span></div>
          <dl><div><dt>Classes</dt><dd>{course.classCount}</dd></div><div><dt>Target</dt><dd>{course.targetKmPerClass} km</dd></div><div><dt>Window</dt><dd>{course.durationDays} days</dd></div><div><dt>Price</dt><dd>{money.format(Number(course.price))}</dd></div></dl>
        </article>)}</div>
        {!courses.length && <p className={styles.empty}>{message}</p>}
      </section>
      <section className={styles.formPanel} aria-labelledby="new-course-title"><span>New definition</span><h2 id="new-course-title">Add a course</h2>
        <form onSubmit={create}>
          <label>Course name<input name="name" placeholder="Manual driving" maxLength={80} required/></label>
          <div className={styles.twoFields}><label>Course code<input name="code" placeholder="MAN-28" pattern="[A-Za-z0-9-]{2,20}" required/></label><label>Transmission<select name="transmission" defaultValue="MANUAL"><option value="MANUAL">Manual</option><option value="AUTOMATIC">Automatic</option></select></label></div>
          <div className={styles.twoFields}><label>Course price (₹)<input name="price" type="number" min="0" step="0.01" required/></label><label>Classes<input name="classCount" type="number" min="1" max="200" defaultValue="28" required/></label></div>
          <div className={styles.twoFields}><label>KM per class<input name="targetKmPerClass" type="number" min="0.1" max="100" step="0.1" defaultValue="6" required/></label><label>Completion window<input name="durationDays" type="number" min="1" max="365" defaultValue="60" required/></label></div>
          <button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create course"}</button>
        </form><p className={styles.status} role="status">{message}</p>
      </section>
    </div>
  </div>;
}
