"use client";

import type { Course, CustomerEnrollmentResult } from "@hyd/contracts";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import { customerEnrollmentInputSchema } from "@/lib/registration-schema";
import styles from "../../admin.module.css";

const money = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export default function NewCustomerPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paid, setPaid] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("Loading active courses…");
  const [created, setCreated] = useState<CustomerEnrollmentResult | null>(null);
  const course = useMemo(() => courses.find(item => item.id === courseId), [courses, courseId]);
  const total = Math.max(0, Number(course?.price ?? 0) - discount);

  useEffect(() => { void apiFetch<Course[]>("/courses").then(result => { const active = result.filter(item => item.active); setCourses(active); setCourseId(active[0]?.id ?? ""); setMessage(active.length ? "" : "Create an active course before registering a customer."); }).catch(error => setMessage(error instanceof Error ? error.message : "Courses could not be loaded")); }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setMessage(""); setCreated(null);
    const parsed = customerEnrollmentInputSchema.safeParse({
      displayName: data.get("displayName"), phone: data.get("phone"), email: data.get("email") || undefined,
      dateOfBirth: data.get("dateOfBirth") || undefined, address: data.get("address") || undefined,
      courseId, discountAmount: discount, initialPaid: paid,
    });
    if (!parsed.success) { setBusy(false); setMessage(parsed.error.issues[0]?.message ?? "Check the customer details"); return; }
    void apiFetch<CustomerEnrollmentResult>("/customers", { method: "POST", body: JSON.stringify(parsed.data) }).then(result => { setCreated(result); setMessage("Customer and enrollment created successfully."); form.reset(); setDiscount(0); setPaid(0); }).catch(error => setMessage(error instanceof Error ? error.message : "Enrollment could not be created")).finally(() => setBusy(false));
  };

  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><span>Customer registration</span><h1>New enrollment</h1><p>Capture the agreement now. The 60-day clock begins only after class one is completed.</p></div><div className={styles.notStarted}><i/>Not started</div></header>
    <form className={styles.dossier} onSubmit={submit}>
      <nav className={styles.stageRail} aria-label="Registration sections"><a href="#identity"><b>01</b>Customer</a><a href="#course"><b>02</b>Course</a><a href="#payment"><b>03</b>Payment</a><a href="#review"><b>04</b>Review</a></nav>
      <div className={styles.document}>
        <fieldset id="identity"><legend><b>01</b><span>Customer details<small>Identity and contact information</small></span></legend>
          <div className={styles.twoFields}><label>Full name<input name="displayName" autoComplete="name" maxLength={100} required/></label><label>Mobile number<span className={styles.phoneField}><b>+91</b><input name="phone" inputMode="numeric" autoComplete="tel-national" pattern="[6-9][0-9]{9}" maxLength={10} required/></span></label></div>
          <div className={styles.twoFields}><label>Email address <small>Optional</small><input name="email" type="email" autoComplete="email"/></label><label>Date of birth <small>Optional</small><input name="dateOfBirth" type="date"/></label></div>
          <label>Address <small>Optional</small><textarea name="address" rows={3} maxLength={500}/></label>
        </fieldset>
        <fieldset id="course"><legend><b>02</b><span>Course selection<small>Rules are snapshotted at enrollment</small></span></legend>
          <label>Active course<select value={courseId} onChange={event => setCourseId(event.target.value)} required><option value="">Select a course</option>{courses.map(item => <option key={item.id} value={item.id}>{item.name} · {item.transmission.toLowerCase()}</option>)}</select></label>
          {course && <dl className={styles.ruleStrip}><div><dt>Classes</dt><dd>{course.classCount}</dd></div><div><dt>Per class</dt><dd>{course.targetKmPerClass} km</dd></div><div><dt>Window</dt><dd>{course.durationDays} days</dd></div><div><dt>Starts</dt><dd>Class 1</dd></div></dl>}
        </fieldset>
        <fieldset id="payment"><legend><b>03</b><span>Opening payment<small>Initial paid and pending amounts</small></span></legend>
          <div className={styles.twoFields}><label>Discount (₹)<input type="number" min="0" max={Number(course?.price ?? 0)} step="0.01" value={discount} onChange={event => setDiscount(Number(event.target.value))} required/></label><label>Paid now (₹)<input type="number" min="0" max={total} step="0.01" value={paid} onChange={event => setPaid(Number(event.target.value))} required/></label></div>
        </fieldset>
      </div>
      <aside className={styles.summary} id="review"><span>Enrollment summary</span><h2>{course?.name ?? "Choose a course"}</h2>
        <dl><div><dt>Course price</dt><dd>{money.format(Number(course?.price ?? 0))}</dd></div><div><dt>Discount</dt><dd>− {money.format(discount)}</dd></div><div className={styles.total}><dt>Total payable</dt><dd>{money.format(total)}</dd></div><div><dt>Paid now</dt><dd>{money.format(paid)}</dd></div><div className={styles.pending}><dt>Pending</dt><dd>{money.format(Math.max(0, total - paid))}</dd></div></dl>
        <p><strong>Training clock is inactive.</strong> Registration will not set the first-class date or deadline.</p>
        <button className={styles.primaryButton} disabled={busy || !course}>{busy ? "Creating enrollment…" : "Create enrollment"}</button>
        <div className={styles.status} role="status" aria-live="polite">{message}</div>
        {created && <div className={styles.receipt}><span>Customer ID</span><strong>{created.customer.customerCode}</strong><small>Enrollment remains NOT STARTED</small></div>}
      </aside>
    </form>
  </div>;
}
