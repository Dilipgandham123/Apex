"use client";

import type { StaffProfile, Vehicle } from "@hyd/contracts";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { staffInputSchema } from "@/lib/fleet-schema";
import styles from "../admin.module.css";

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffProfile[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [message, setMessage] = useState("Loading staff…");
  const [busy, setBusy] = useState(false);

  const load = () => Promise.all([apiFetch<StaffProfile[]>("/staff"), apiFetch<Vehicle[]>("/vehicles")]).then(([staffResult, vehicleResult]) => { setStaff(staffResult); setVehicles(vehicleResult); setMessage(""); }).catch(error => setMessage(error instanceof Error ? error.message : "Staff could not be loaded"));
  useEffect(() => { void load(); }, []);

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const parsed = staffInputSchema.safeParse({ displayName: data.get("displayName"), email: data.get("email"), password: data.get("password"), licenceNumber: data.get("licenceNumber"), licenceExpiresAt: data.get("licenceExpiresAt"), canDriveManual: data.get("canDriveManual") === "on", canDriveAutomatic: data.get("canDriveAutomatic") === "on" });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the staff details"); return; }
    setBusy(true); setMessage("");
    void apiFetch("/staff", { method: "POST", body: JSON.stringify(parsed.data) }).then(() => { form.reset(); setMessage("Driver profile and staff login created."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Staff could not be created")).finally(() => setBusy(false));
  };

  const assign = (staffId: string, vehicleId: string) => {
    if (!vehicleId) return; setMessage("");
    void apiFetch(`/staff/${staffId}/vehicle-assignment`, { method: "POST", body: JSON.stringify({ vehicleId }) }).then(() => { setMessage("Vehicle assignment updated."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Vehicle could not be assigned"));
  };

  const toggle = (profile: StaffProfile) => {
    const status = profile.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    void apiFetch(`/staff/${profile.id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }).then(() => { setMessage(`Staff access changed to ${status.toLowerCase()}.`); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Staff status could not be changed"));
  };

  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><span>People & access</span><h1>Drivers</h1><p>Licence validity and transmission permissions decide which available vehicle a driver can receive.</p></div><div className={styles.countBadge}>{staff.length} staff</div></header>
    <div className={styles.managementLayout}>
      <section className={styles.listSection}><div className={styles.sectionTitle}><h2>Driver roster</h2><span>Active assignment shown</span></div><div className={styles.recordList}>
        {staff.map(profile => { const assigned = profile.vehicleAssignments[0]?.vehicle; return <article key={profile.id}>
          <div className={styles.recordIdentity}><b>{profile.staffCode}</b><strong>{profile.user.displayName}</strong><span>{profile.user.email}</span></div>
          <dl><div><dt>Licence</dt><dd>{profile.licenceNumber}</dd><small>Expires {new Date(profile.licenceExpiresAt).toLocaleDateString("en-IN")}</small></div><div><dt>Can drive</dt><dd>{[profile.canDriveManual && "Manual", profile.canDriveAutomatic && "Automatic"].filter(Boolean).join(" + ")}</dd></div><div><dt>Assigned vehicle</dt><dd>{assigned ? assigned.registrationNumber : "None"}</dd></div></dl>
          <div className={styles.recordActions}><select aria-label={`Assign vehicle to ${profile.user.displayName}`} value={assigned?.id ?? ""} onChange={event => assign(profile.id, event.target.value)} disabled={profile.status !== "ACTIVE"}><option value="">Assign vehicle</option>{vehicles.filter(vehicle => vehicle.status === "AVAILABLE" && (!vehicle.driverAssignments.length || vehicle.id === assigned?.id)).map(vehicle => <option key={vehicle.id} value={vehicle.id}>{vehicle.registrationNumber} · {vehicle.transmission.toLowerCase()}</option>)}</select><button type="button" onClick={() => toggle(profile)}>{profile.status === "ACTIVE" ? "Deactivate" : "Activate"}</button></div>
        </article>; })}
        {!staff.length && <p className={styles.empty}>No drivers registered yet.</p>}
      </div></section>
      <section className={styles.formPanel}><span>New staff login</span><h2>Add a driver</h2><form onSubmit={create}>
        <label>Full name<input name="displayName" autoComplete="name" required/></label><label>Email address<input name="email" type="email" autoComplete="email" required/></label><label>Temporary password<input name="password" type="password" minLength={12} autoComplete="new-password" required/></label>
        <div className={styles.twoFields}><label>Licence number<input name="licenceNumber" required/></label><label>Licence expiry<input name="licenceExpiresAt" type="date" required/></label></div>
        <fieldset className={styles.checkGroup}><legend>Transmission permissions</legend><label><input name="canDriveManual" type="checkbox" defaultChecked/>Manual</label><label><input name="canDriveAutomatic" type="checkbox"/>Automatic</label></fieldset>
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Creating…" : "Create driver"}</button>
      </form><p className={styles.status} role="status">{message}</p></section>
    </div>
  </div>;
}
