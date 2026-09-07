"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { WhatsappLogo } from "@phosphor-icons/react";
import { AnimatedCTA, CountUp, HeroScrollFade, Reveal, ScrollMedia, Stagger, StaggerCard, StaggerItem } from "@/components/motion-primitives";
import { publicApiFetch } from "@/lib/api";

const courses = [
  {name:"MANUAL DRIVING",desc:"Complete manual-car training from steering control through gears, reversing, and parking.",features:["10 days steering control","10 days clutch & gear practice","6 days reverse & parking","2 days mechanical basics"],price:"₹8,000",classes:"28 CLASSES",image:"/reference/ignition.jpg",popular:true},
  {name:"AUTOMATIC DRIVING",desc:"Learn confident city driving in an automatic vehicle without clutch and manual gear changes.",features:["10 days steering control","10 days road & traffic practice","6 days reverse & parking","2 days mechanical basics"],price:"₹9,000",classes:"28 CLASSES"},
  {name:"DRIVING + LICENCE",desc:"Complete driving training together with assistance for the driving licence process.",features:["Complete 28-class training","RTO paperwork assistance","Test preparation","Licence-process support"],price:"₹12,000",classes:"TRAINING + LICENCE"},
  {name:"EXTRA CLASS",desc:"Book an additional focused class after your regular training for more confidence or practice.",features:["Individual practice class","Parking or reverse practice","Flexible timing","Choose your focus area"],price:"₹400",classes:"PER CLASS",image:"/reference/refresher.jpg"},
];

const instructors = [
  {name:"MOHD. ARIF",specialty:"Highway & night driving",years:"15 YRS ON THE ROAD",image:"/reference/mohd-arif.jpg"},
  {name:"SANA BEGUM",specialty:"Nervous first-timers",years:"9 YRS TEACHING",image:"/reference/sana-begum.jpg"},
  {name:"K. VENKATESH",specialty:"RTO test preparation",years:"12 YRS TEACHING",image:"/reference/k-venkatesh.jpg"},
];

const nav = [["WHY US","#manifesto"],["COURSES","#courses"],["INSTRUCTORS","#instructors"],["REVIEWS","#testimonials"]];
const Arrow = () => <span aria-hidden="true">↗</span>;
const tickerItems = ["LEARN TO DRIVE","RTO ASSISTANCE","MANUAL & AUTOMATIC CARS","WOMEN INSTRUCTORS","REGISTRATION OPEN","LICENCE ASSISTANCE"];
const whatsappMessage = encodeURIComponent("Hi, I want to learn driving. Please share the course details and available timings.");
const whatsappHref = `https://wa.me/918106373266?text=${whatsappMessage}`;

export default function Home(){
  const [menuOpen,setMenuOpen]=useState(false);
  const [formState,setFormState]=useState<"idle"|"saving"|"error">("idle");
  const [formMessage,setFormMessage]=useState("We save your enquiry so the school can follow up, then open WhatsApp for you to send the message.");
  const menuButtonRef=useRef<HTMLButtonElement>(null);
  const mobileMenuRef=useRef<HTMLElement>(null);
  const close=()=>setMenuOpen(false);

  useEffect(()=>{
    if(!menuOpen) return;
    const previousOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    const onKeyDown=(event:KeyboardEvent)=>{
      if(event.key==="Escape"){
        close();
        menuButtonRef.current?.focus();
      }
      if(event.key==="Tab" && mobileMenuRef.current){
        const links=Array.from(mobileMenuRef.current.querySelectorAll<HTMLElement>("a[href]"));
        if(!links.length) return;
        const first=links[0];
        const last=links[links.length-1];
        if(event.shiftKey && document.activeElement===first){event.preventDefault();last.focus()}
        else if(!event.shiftKey && document.activeElement===last){event.preventDefault();first.focus()}
      }
    };
    document.addEventListener("keydown",onKeyDown);
    mobileMenuRef.current?.querySelector<HTMLElement>("a[href]")?.focus();
    return ()=>{
      document.body.style.overflow=previousOverflow;
      document.removeEventListener("keydown",onKeyDown);
    };
  },[menuOpen]);

  const submitRegistration=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const form=event.currentTarget;
    const data=new FormData(form);
    setFormState("saving");
    setFormMessage("Saving your enquiry…");
    const details=[
      `Hi, I am ${data.get("name")} and I want to learn driving.`,
      `I am interested in the ${data.get("course")} course.`,
      `My preferred time is ${data.get("slot")}.`,
      `You can contact me on ${data.get("phone")}.`,
      data.get("notes") ? `Additional message: ${data.get("notes")}` : "",
      "Please share the registration details. Thank you.",
    ].filter(Boolean).join("\n");
    try {
      await publicApiFetch("/enquiries",{method:"POST",body:JSON.stringify({schoolSlug:"sri-sai-anu",name:data.get("name"),phone:data.get("phone"),course:data.get("course"),preferredSlot:data.get("slot"),notes:data.get("notes"),website:data.get("website")})});
      window.location.assign(`https://wa.me/918106373266?text=${encodeURIComponent(details)}`);
    } catch(error) {
      setFormState("error");
      setFormMessage(error instanceof Error?`${error.message}. Please check the form and try again.`:"Your enquiry could not be saved. Please try again.");
    }
  };
  return <main id="main-content">
    <a className="skip-link" href="#top">SKIP TO CONTENT</a>
    <section className="preload" aria-hidden="true"/>
    <header className="header">
      <a className="logo" href="#top" onClick={close} aria-label="Sri Sai Anu Motor Driving School home">
        <Image src="/brand/sri-sai-anu-logo.svg" alt="Sri Sai Anu Motor Driving School" width={190} height={55} unoptimized priority/>
      </a>
      <nav className="desktop-nav" aria-label="Primary navigation">{nav.map(([label,href])=><a key={label} href={href}>{label}</a>)}<a className="primary-link" href="#booking">REGISTER</a></nav>
      <button ref={menuButtonRef} className="menu-button" onClick={()=>setMenuOpen(v=>!v)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen?"Close menu":"Open menu"}><i/><i/><i/></button>
      <nav ref={mobileMenuRef} id="mobile-menu" aria-label="Mobile navigation" aria-hidden={!menuOpen} className={menuOpen?"mobile-nav open":"mobile-nav"}>{nav.map(([label,href])=><a onClick={close} key={label} href={href}>{label}</a>)}<a onClick={close} className="primary-link" href="#booking">REGISTER</a></nav>
    </header>

    <section id="top" className="hero">
      <div className="hero-media"><Image className="hero-image" src="/reference/pexels-photo-15549900.jpeg" alt="Training car driving through Hyderabad" fill priority quality={86} sizes="100vw"/><div className="hero-overlay"/></div>
      <HeroScrollFade className="hero-inner"><Stagger className="hero-sequence" delay={0.08} interval={0.07} amount={0.05}>
        <StaggerItem><p className="kicker">MADHAPUR — HYDERABAD, TELANGANA</p></StaggerItem>
        <StaggerItem><h1><span>LEARN TO</span><span><em>DRIVE</em> LIKE YOU</span><span>OWN THIS CITY.</span></h1></StaggerItem>
        <StaggerItem className="hero-lower">
          <p className="hero-description">Manual and automatic driving courses. Calm instructors, structured training, parking practice, mechanical basics, and complete licence-process assistance.</p>
          <div className="actions"><AnimatedCTA className="button" href="#booking">REGISTER</AnimatedCTA><AnimatedCTA className="button ghost" href="#courses">SEE COURSES</AnimatedCTA></div>
        </StaggerItem>
        <StaggerItem className="stats"><div><strong><CountUp value={4.3} decimals={1}/></strong><span>GOOGLE RATING</span></div><div><strong>6 AM–7 PM</strong><span>OPEN DAILY</span></div><div><strong>VEHICLE MODELS</strong><span>SELTOS · BREZZA · SWIFT · DZIRE</span></div></StaggerItem>
        <span className="hero-scroll" aria-hidden="true">&darr;</span>
      </Stagger></HeroScrollFade>
    </section>

    <section className="ticker" aria-label="Services">
      <div className="ticker-band">
        <div className="ticker-track">
          {[0,1].map(group=><div className="ticker-group" aria-hidden={group===1} key={group}>{tickerItems.map(item=><span key={item}>{item}<b aria-hidden="true">✦</b></span>)}</div>)}
        </div>
      </div>
    </section>

    <section id="manifesto" className="section manifesto">
      <div className="shell"><Reveal><p className="kicker">WHY CHOOSE US</p><h2>THREE REASONS<br/>HYDERABAD LEARNS WITH<br/>US.</h2></Reveal>
        <Stagger className="manifesto-list" interval={0.08}>
          <StaggerItem><article><span>01</span><div><h3>FIRST GEAR,<br/>NO FEAR.</h3><p>Everyone stalls on day one. Everyone. Our dual-control cars mean your instructor can take over in a split second — so you can make every mistake safely, and never repeat it.</p></div></article></StaggerItem>
          <StaggerItem><article><span>02</span><div><h3>TRAINED ON REAL<br/>HYDERABAD.</h3><p>Not empty parking lots. Secunderabad signals, Gachibowli flyovers, Old City lanes, monsoon puddles. When you pass with us, the city holds no surprises.</p></div></article></StaggerItem>
          <StaggerItem><article><span>03</span><div><h3>LICENCE,<br/>HANDLED.</h3><p>Slot booking, forms, fees, test-day practice runs on the actual RTO track. You just show up and drive — hundreds of Madhapur licences and counting.</p></div></article></StaggerItem>
        </Stagger>
      </div>
    </section>

    <section id="how-training-works" className="section training-model">
      <div className="shell"><Reveal><h2>ARRIVE. DRIVE.<br/>SEE EVERY RECORD.</h2><p className="intro">Training follows the school’s real daily flow—no online booking and no digital waiting list.</p></Reveal>
        <Stagger className="training-steps" interval={0.08} amount={0.12}>
          <StaggerItem><article><strong>01</strong><h3>COME TO THE SCHOOL</h3><p>Customers arrive during operating hours. The customer who is ready first trains when a compatible driver and vehicle are available.</p></article></StaggerItem>
          <StaggerItem><article><strong>02</strong><h3>COMPLETE THE CLASS</h3><p>Your 60-day completion window begins after the first completed class—not when you register. A standard course contains 28 classes.</p></article></StaggerItem>
          <StaggerItem><article><strong>03</strong><h3>CHECK YOUR RECORD</h3><p>Sign in to see every class date, instructor, vehicle, kilometres covered, pending kilometres, payment balance and complaint history.</p><Link href="/login">OPEN CUSTOMER RECORD <Arrow/></Link></article></StaggerItem>
        </Stagger>
      </div>
    </section>

    <section id="courses" className="section courses">
      <div className="shell"><Reveal><p className="kicker">COURSES &amp; PRICING</p><h2>PICK YOUR PACE.</h2><p className="intro">The full program includes 10 days of steering, 10 days of gears or road practice, 6 days of reverse and parking, and 2 days of mechanical basics.</p><p className="vehicle-line"><strong>AVAILABLE VEHICLE MODELS</strong><span>KIA SELTOS · VITARA BREZZA · SWIFT · SWIFT DZIRE</span></p></Reveal>
        <Stagger className="course-grid" interval={0.1} amount={0.12}>{courses.map(c=><StaggerCard className={c.popular?"course-card popular":"course-card"} key={c.name}>
          {c.image&&<Image src={c.image} alt={c.name==="MANUAL DRIVING"?"Student beginning a manual driving lesson":"Licensed driver taking an extra practice class"} fill quality={82} sizes="(max-width: 767px) 100vw, 58vw"/>}<div className="course-content">{c.popular&&<span className="popular-label">MOST POPULAR</span>}<h3>{c.name}</h3><p>{c.desc}</p><ul>{c.features.map(f=><li key={f}>✓ {f}</li>)}</ul><div className="price"><strong>{c.price}</strong><span>{c.classes}</span></div><a href="#booking">CHOOSE <Arrow/></a></div>
        </StaggerCard>)}</Stagger>
      </div>
    </section>

    <section id="instructors" className="section instructors">
      <div className="shell"><Reveal><p className="kicker">THE CREW</p><h2>CALM VOICES,<br/>STEADY HANDS.</h2></Reveal><div className="instructor-grid">{instructors.map((i,index)=><Reveal key={i.name} delay={index*.06}><article><ScrollMedia distance={20}><Image src={i.image} alt={`${i.name}, ${i.specialty.toLowerCase()} instructor`} width={640} height={800} quality={82} sizes="(max-width: 767px) 100vw, (max-width: 1023px) 50vw, 33vw"/></ScrollMedia><h3>{i.name}</h3><p>{i.specialty}</p><span>{i.years}</span></article></Reveal>)}</div></div>
    </section>

    <section id="testimonials" className="section testimonials">
      <div className="shell"><Reveal><p className="kicker">STREET TALK</p><h2>RATED BY REAL<br/>STUDENTS.</h2><p className="intro">No screenshots, no made-up quotes — tap through and read every review on the platforms themselves.</p></Reveal>
        <Stagger className="review-grid" interval={0.1} amount={0.16}><StaggerItem><a href="https://maps.app.goo.gl/Pd3zQ4Q6145z1KoQ7" className="review-card"><span>GOOGLE</span><strong>4.3/5</strong><div className="stars">★★★★☆</div><p>Verified Google Maps rating</p><b>READ ALL REVIEWS <Arrow/></b></a></StaggerItem><StaggerItem><a href="https://www.justdial.com/Hyderabad/Sri-Sai-Anu-Motor-Driving-School-Opposite-Petrol-Bunk-Beside-Sbi-Bank-Ayyappa-Society-Madhapur/040PXX40-XX40-170626145307-V5I5_BZDET" className="review-card"><span>JUSTDIAL</span><strong>4.2/5</strong><div className="stars">★★★★☆</div><p>475+ customer reviews</p><b>READ ALL REVIEWS <Arrow/></b></a></StaggerItem></Stagger>
      </div>
    </section>

    <section id="booking" className="section booking">
      <div className="shell booking-grid"><Reveal><div><p className="kicker">REGISTRATION</p><h2>START YOUR<br/>TRAINING.</h2><p className="intro">Choose your course and preferred time. The school will contact you with registration details and availability.</p><a className="contact" href="tel:+918106373266">+91 81063 73266</a><p className="address">2-72/1, Indian Oil petrol pump line, opp. State Bank of India, Megha Hills, Sri Sai Nagar, Madhapur, Hyderabad 500081</p><a className="direction" href="https://maps.app.goo.gl/Pd3zQ4Q6145z1KoQ7">GET DIRECTIONS <Arrow/></a></div></Reveal>
        <Reveal delay={.08}><form aria-label="Register your interest on WhatsApp" onSubmit={submitRegistration}><label htmlFor="trial-name"><span>FULL NAME</span><input id="trial-name" name="name" autoComplete="name" placeholder="Full name" required/></label><label htmlFor="trial-phone"><span>MOBILE NUMBER</span><input id="trial-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" pattern="[0-9+() -]{10,18}" placeholder="Mobile number (10 digits)" required/></label><div className="form-row"><label htmlFor="trial-course"><span>COURSE</span><select id="trial-course" name="course">{courses.map(c=><option key={c.name}>{c.name[0]+c.name.slice(1).toLowerCase()} — {c.price}</option>)}</select></label><label htmlFor="trial-slot"><span>PREFERRED SLOT</span><select id="trial-slot" name="slot"><option>Morning (6-9 AM)</option><option>Afternoon (12-4 PM)</option><option>Evening (4-7 PM)</option></select></label></div><label htmlFor="trial-notes"><span>NOTES <small>(OPTIONAL)</small></span><textarea id="trial-notes" name="notes" placeholder="Anything we should know?"/></label><label className="website-field" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label><button className="button whatsapp-submit" type="submit" disabled={formState==="saving"}><WhatsappLogo size={22} weight="bold" aria-hidden="true"/><span>{formState==="saving"?"SAVING ENQUIRY…":"REGISTER ON WHATSAPP"}</span></button><small id="trial-status" className={`form-status ${formState}`} role="status" aria-live="polite">{formMessage}</small></form></Reveal>
      </div>
    </section>

    <footer><div className="shell"><div className="footer-word">SRI SAI ANU</div><div className="footer-grid"><div><h3>REACH US</h3><a href="tel:+918106373266">+91 81063 73266</a><p>2-72/1, Indian Oil petrol pump line, opp. State Bank of India, Megha Hills, Sri Sai Nagar, Madhapur, Hyderabad 500081</p><a href="https://maps.app.goo.gl/Pd3zQ4Q6145z1KoQ7">GET DIRECTIONS <Arrow/></a></div><div><h3>HOURS</h3><p>Open daily: 6 AM – 7 PM</p><p>Training is arrival-based and subject to a compatible driver and vehicle being available.</p></div><div><h3>INFORMATION</h3><Link href="/login">Sign in</Link><Link href="/policies/privacy">Privacy</Link><Link href="/policies/terms">Terms</Link><Link href="/policies/payments-refunds">Payments &amp; refunds</Link><Link href="/policies/complaints">Complaint policy</Link></div></div><div className="copyright"><span>© 2026 SRI SAI ANU MOTOR DRIVING SCHOOL, MADHAPUR, HYDERABAD</span><span>BUILT FOR THE ROAD.</span></div></div></footer>
    <a className="whatsapp" href={whatsappHref} aria-label="Chat with Sri Sai Anu Motor Driving School on WhatsApp"><WhatsappLogo size={32} weight="bold" aria-hidden="true"/></a>
  </main>
}
