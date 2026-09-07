"use client";

import type { Vehicle, VehicleStatus } from "@hyd/contracts";
import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { vehicleInputSchema } from "@/lib/fleet-schema";
import styles from "../admin.module.css";

export default function VehiclesPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [message, setMessage] = useState("Loading vehicles…");
  const [busy, setBusy] = useState(false);
  const load = () => apiFetch<Vehicle[]>("/vehicles").then(result => { setVehicles(result); setMessage(""); }).catch(error => setMessage(error instanceof Error ? error.message : "Vehicles could not be loaded"));
  useEffect(() => { void load(); }, []);

  const create = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const form = event.currentTarget; const data = new FormData(form);
    const parsed = vehicleInputSchema.safeParse({ registrationNumber: data.get("registrationNumber"), make: data.get("make"), model: data.get("model"), transmission: data.get("transmission"), odometerKm: Number(data.get("odometerKm")), insuranceExpiresAt: data.get("insuranceExpiresAt") || undefined, pucExpiresAt: data.get("pucExpiresAt") || undefined });
    if (!parsed.success) { setMessage(parsed.error.issues[0]?.message ?? "Check the vehicle details"); return; }
    setBusy(true); setMessage("");
    void apiFetch("/vehicles", { method: "POST", body: JSON.stringify(parsed.data) }).then(() => { form.reset(); setMessage("Vehicle added as available."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Vehicle could not be created")).finally(() => setBusy(false));
  };

  const status = (vehicleId: string, next: VehicleStatus) => void apiFetch(`/vehicles/${vehicleId}/status`, { method: "PATCH", body: JSON.stringify({ status: next }) }).then(() => { setMessage(next === "AVAILABLE" ? "Vehicle returned to service." : "Vehicle removed from active assignments."); return load(); }).catch(error => setMessage(error instanceof Error ? error.message : "Vehicle status could not be changed"));

  return <div className={styles.page}>
    <header className={styles.pageHeader}><div><span>Fleet control</span><h1>Vehicles</h1><p>Only available vehicles can be assigned. Maintenance and inactive states immediately remove the current driver assignment.</p></div><div className={styles.countBadge}>{vehicles.filter(item => item.status === "AVAILABLE").length} available</div></header>
    <div className={styles.managementLayout}>
      <section className={styles.listSection}><div className={styles.sectionTitle}><h2>Fleet register</h2><span>{vehicles.length} vehicles</span></div><div className={styles.recordList}>
        {vehicles.map(vehicle => <article key={vehicle.id}>
          <div className={styles.recordIdentity}><b>{vehicle.status}</b><strong>{vehicle.registrationNumber}</strong><span>{vehicle.make} {vehicle.model} · {vehicle.transmission.toLowerCase()}</span></div>
          <dl><div><dt>Odometer</dt><dd>{vehicle.odometerKm} km</dd></div><div><dt>Assigned driver</dt><dd>{vehicle.driverAssignments[0]?.staff.user.displayName ?? "None"}</dd></div><div><dt>Open issues</dt><dd>{vehicle.issues.length}</dd>{vehicle.issues[0] && <small>{vehicle.issues[0].severity}: {vehicle.issues[0].description}</small>}</div></dl>
          <div className={styles.recordActions}><select aria-label={`Status for ${vehicle.registrationNumber}`} value={vehicle.status} onChange={event => status(vehicle.id, event.target.value as VehicleStatus)}><option value="AVAILABLE">Available</option><option value="MAINTENANCE">Maintenance</option><option value="INACTIVE">Inactive</option></select></div>
        </article>)}
        {!vehicles.length && <p className={styles.empty}>No vehicles registered yet.</p>}
      </div></section>
      <section className={styles.formPanel}><span>Fleet record</span><h2>Add a vehicle</h2><form onSubmit={create}>
        <label>Registration number<input name="registrationNumber" placeholder="TS 09 AB 1234" required/></label><div className={styles.twoFields}><label>Make<input name="make" placeholder="Maruti Suzuki" required/></label><label>Model<input name="model" placeholder="Swift" required/></label></div>
        <div className={styles.twoFields}><label>Transmission<select name="transmission"><option value="MANUAL">Manual</option><option value="AUTOMATIC">Automatic</option></select></label><label>Current odometer<input name="odometerKm" type="number" min="0" step="0.1" required/></label></div>
        <div className={styles.twoFields}><label>Insurance expiry <small>Optional</small><input name="insuranceExpiresAt" type="date"/></label><label>PUC expiry <small>Optional</small><input name="pucExpiresAt" type="date"/></label></div>
        <button className={styles.primaryButton} disabled={busy}>{busy ? "Adding…" : "Add vehicle"}</button>
      </form><p className={styles.status} role="status">{message}</p></section>
    </div>
  </div>;
}
