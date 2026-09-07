import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import styles from "./policy.module.css";

const policies={
  privacy:{title:"Privacy notice",intro:"How information is used when you enquire, enroll or use your customer record.",sections:[
    ["Information we collect","Website enquiries include your name, mobile number, selected course, preferred time and any note you provide. Enrolled customers also have identity, course, lesson, kilometre, payment and complaint records."],
    ["Why we use it","We use enquiry information to respond about training. Operational records are used to deliver the course, maintain accurate accounts, support complaints and protect the integrity of the school notebook."],
    ["Who can see it","Access is limited by role. Customers see only their own records. Staff see the information required to conduct lessons. School administrators manage school records. We do not sell personal information."],
    ["Retention and requests","Records are retained while needed for school operations, accounting, dispute handling and legal obligations. Contact the school to request access or correction of your information."],
  ]},
  terms:{title:"Training terms",intro:"The operating rules customers should understand before training begins.",sections:[
    ["Arrival-based training","The school does not operate online lesson booking or a digital waiting list. Customers arrive during operating hours and train when a compatible driver and vehicle are available."],
    ["Course window","The standard course contains 28 classes. The 60-day completion window starts after the first completed class, not on registration. An approved extension is required after the recorded deadline."],
    ["Lesson records","Each completed lesson records its date, instructor, vehicle and kilometres. If a class covers less than its kilometre target, the difference remains pending and can be recovered in a later lesson."],
    ["Safety and availability","Training may be delayed, changed or stopped when road, weather, driver, vehicle or safety conditions require it. Customers must follow the instructor’s safety directions."],
  ]},
  "payments-refunds":{title:"Payments & refunds",intro:"How course balances, receipts and refund requests are recorded.",sections:[
    ["Payment record","Verified cash, UPI and supported online payments are added to the customer’s course ledger. Customers can see paid, refunded and pending amounts in their account."],
    ["Receipts","A receipt number is attached to every verified payment. Please keep the receipt and report any discrepancy through the customer complaint area or directly to the school."],
    ["Refund requests","Refund eligibility depends on the course agreement, training already delivered and the reason for the request. The school reviews each request before approval; submitting a request does not guarantee a refund."],
    ["Approved refunds","Approved refunds are recorded against the original payment. Processing time can depend on the payment provider or bank. Contact the school for the status of a specific refund."],
  ]},
  complaints:{title:"Complaint policy",intro:"A traceable way to raise and resolve a concern about training or payment records.",sections:[
    ["How to complain","Enrolled customers can sign in and submit a complaint linked to a lesson, instructor, vehicle or payment. Supporting JPG, PNG, WebP or PDF files may be attached within the displayed limits."],
    ["What happens next","School administrators review the complaint, may ask for more information and provide updates in the complaint conversation. Customers can reply while the complaint remains open."],
    ["Privacy","Customers see the public conversation and final outcome. Internal administrative notes are private and are never included in the customer complaint response."],
    ["Resolution","A resolved complaint includes a recorded outcome. If the concern remains unresolved, contact the school by phone or visit during operating hours with the complaint reference."],
  ]},
} as const;

export function generateStaticParams(){return Object.keys(policies).map(slug=>({slug}));}

export default async function PolicyPage({params}:{params:Promise<{slug:string}>}){
  const{slug}=await params,policy=policies[slug as keyof typeof policies];
  if(!policy)notFound();
  return <main className={styles.page}><header><Link href="/" aria-label="Sri Sai Anu home"><Image src="/brand/sri-sai-anu-logo.svg" alt="Sri Sai Anu Motor Driving School" width={190} height={55} unoptimized priority/></Link><Link href="/">BACK TO WEBSITE</Link></header><article><p>PUBLIC INFORMATION</p><h1>{policy.title}</h1><strong>{policy.intro}</strong><div className={styles.sections}>{policy.sections.map(([title,body])=><section key={title}><h2>{title}</h2><p>{body}</p></section>)}</div><aside>This page explains the school’s current operating policy in plain language. For a question about your own agreement or record, call <a href="tel:+918106373266">+91 81063 73266</a>.</aside></article><footer><nav aria-label="Policy pages">{Object.entries(policies).map(([key,value])=><Link key={key} href={`/policies/${key}`} aria-current={key===slug?"page":undefined}>{value.title}</Link>)}</nav><span>© 2026 Sri Sai Anu Motor Driving School</span></footer></main>;
}
