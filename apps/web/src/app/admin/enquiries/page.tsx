"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api";
import styles from "../admin.module.css";

type Status="NEW"|"CONTACTED"|"ENROLLED"|"CLOSED";
type Enquiry={id:string;name:string;phone:string;course:string;preferredSlot:string;notes:string|null;status:Status;source:string;createdAt:string};
const statuses:Status[]=["NEW","CONTACTED","ENROLLED","CLOSED"];

export default function EnquiriesPage(){
  const[rows,setRows]=useState<Enquiry[]>([]),[filter,setFilter]=useState<Status|"ALL">("NEW"),[message,setMessage]=useState("Loading enquiries…");
  const load=useCallback(()=>apiFetch<Enquiry[]>("/enquiries").then(data=>{setRows(data);setMessage("");}).catch(error=>setMessage(error instanceof Error?error.message:"Enquiries could not be loaded.")),[]);
  useEffect(()=>{void load();},[load]);
  const visible=useMemo(()=>filter==="ALL"?rows:rows.filter(row=>row.status===filter),[filter,rows]);
  const update=(id:string,status:Status)=>{setMessage("Saving status…");void apiFetch(`/enquiries/${id}`,{method:"PATCH",body:JSON.stringify({status})}).then(load).catch(error=>setMessage(error instanceof Error?error.message:"Status could not be saved."));};
  return <div className={styles.page}><header className={styles.pageHeader}><div><span>Website enquiries</span><h1>Trial follow-up</h1><p>Every form is saved before WhatsApp opens. Contact the newest arrivals first and keep their outcome visible.</p></div><div className={styles.countBadge}>{rows.filter(row=>row.status==="NEW").length} new</div></header>
    <div className={styles.enquiryFilters} role="group" aria-label="Filter enquiries">{(["ALL",...statuses] as const).map(status=><button key={status} aria-pressed={filter===status} onClick={()=>setFilter(status)}>{status.toLowerCase()}</button>)}</div>
    {message&&<p className={styles.status}>{message}</p>}
    <section className={styles.enquiryList} aria-label="Public enquiries">{visible.map(row=><article key={row.id}><div><b>{row.status}</b><strong>{row.name}</strong><a href={`tel:${row.phone}`}>{row.phone}</a></div><dl><div><dt>Course</dt><dd>{row.course}</dd></div><div><dt>Preferred time</dt><dd>{row.preferredSlot}</dd></div><div><dt>Received</dt><dd>{new Date(row.createdAt).toLocaleString("en-IN",{dateStyle:"medium",timeStyle:"short"})}</dd></div></dl><p>{row.notes||"No additional note."}</p><label>Follow-up status<select value={row.status} onChange={event=>update(row.id,event.target.value as Status)}>{statuses.map(status=><option key={status}>{status}</option>)}</select></label></article>)}{!message&&!visible.length&&<p className={styles.emptyState}>No {filter==="ALL"?"":filter.toLowerCase()} enquiries.</p>}</section>
  </div>;
}
