"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import styles from "./login.module.css";

const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4010/api/v1";
type ApiError = { message?: string | string[] };

const demoAccounts = [
  { label: "Admin", identifier: "admin@madhapur.demo", password: "Demo@3010" },
  { label: "Staff", identifier: "ramesh.driver@madhapur.demo", password: "Demo@3010" },
  { label: "Customer", identifier: "9000001201", password: "" },
] as const;

async function post<T>(path: string, body: object): Promise<T> {
  const response = await fetch(`${apiUrl}/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const result = await response.json() as T & ApiError;
  if (!response.ok) throw new Error(Array.isArray(result.message) ? result.message.join(". ") : result.message ?? "The request could not be completed");
  return result;
}

export default function LoginPage() {
  const router = useRouter();
  const [challengeId, setChallengeId] = useState("");
  const [developmentCode, setDevelopmentCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const phone = identifier.replace(/\D/g, "");
  const isMobile = /^[6-9][0-9]{9}$/.test(phone) && /^\d+$/.test(identifier);
  const expectsPassword = identifier.length > 0 && !/^\d*$/.test(identifier);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setMessage("");
    try { await action(); } catch (error) { setMessage(error instanceof Error ? error.message : "The request could not be completed"); }
    finally { setBusy(false); }
  };

  const signIn = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void run(async () => {
      if (/^\d*$/.test(identifier) && !isMobile) throw new Error("Enter a valid 10-digit mobile number");
      if (isMobile) {
        const result = await post<{ challengeId: string; developmentCode?: string }>("customer/request-otp", { phone });
        setChallengeId(result.challengeId);
        setDevelopmentCode(result.developmentCode ?? "");
        setMessage("Verification code sent to the registered mobile number.");
        return;
      }
      const result = await post<{ accessToken: string; user: { displayName: string; role: string } }>("password/login", {
        identifier: identifier.trim(), password: data.get("password"),
      });
      sessionStorage.setItem("accessToken", result.accessToken);
      setMessage(`Signed in as ${result.user.displayName}.`);
      if (["SUPER_ADMIN", "SCHOOL_ADMIN"].includes(result.user.role)) router.push("/admin/courses");
      if (result.user.role === "STAFF") router.push("/staff/vehicle");
    });
  };

  const verifyOtp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const code = new FormData(event.currentTarget).get("code");
    void run(async () => {
      const result = await post<{ accessToken: string; user: { displayName: string } }>("customer/verify-otp", { challengeId, code });
      sessionStorage.setItem("accessToken", result.accessToken);
      setMessage(`Welcome, ${result.user.displayName}. Your account is ready.`);
      router.push("/customer");
    });
  };

  return <main className={styles.page}>
    <section className={styles.brand} aria-label="Sri Sai Anu Motor Driving School">
      <Image src="/brand/sri-sai-anu-logo.svg" width={380} height={110} unoptimized priority alt="Sri Sai Anu Motor Driving School"/>
      <div><p>Madhapur, Hyderabad</p><h1>Training records, lessons and school operations in one place.</h1><span>Open daily · 6 AM to 7 PM</span></div>
    </section>
    <section className={styles.auth}>
      <div className={styles.panel}>
        <Image className={styles.mobileLogo} src="/brand/sri-sai-anu-mark.svg" width={72} height={55} unoptimized priority alt=""/>
        <h2>{challengeId ? "Enter verification code" : "Welcome back"}</h2>
        <p>{challengeId ? `Code sent to +91 ${phone.slice(0, 2)}••• ••${phone.slice(-3)}` : "Enter your registered email address or mobile number."}</p>
        {!challengeId && <>
          {process.env.NODE_ENV === "development" && <div className={styles.demoAccounts}>
            <span>Fill a demo account</span>
            <div>
              {demoAccounts.map(account => <button key={account.label} type="button" onClick={() => {
                setIdentifier(account.identifier);
                setPassword(account.password);
                setMessage("");
              }}>{account.label}</button>)}
            </div>
          </div>}
          <form onSubmit={signIn}>
          <label>Email address or mobile number<input name="identifier" value={identifier} onChange={event=>{setIdentifier(event.target.value.trimStart());setMessage("");}} autoComplete="username" inputMode="email" required/></label>
          {expectsPassword&&<label>Password<input name="password" type="password" value={password} onChange={event=>setPassword(event.target.value)} autoComplete="current-password" minLength={8} required/></label>}
          <button className={styles.primary} disabled={busy}>{busy ? "Checking…" : expectsPassword ? "Sign in" : "Continue"}</button>
          </form>
        </>}

        {challengeId && <form onSubmit={verifyOtp}>
          <label>Six-digit code<input name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required/></label>
          {developmentCode && <small>Local development code: <strong>{developmentCode}</strong></small>}
          <button className={styles.primary} disabled={busy}>{busy ? "Verifying…" : "Verify and continue"}</button>
          <button className={styles.textButton} type="button" onClick={() => { setChallengeId(""); setDevelopmentCode(""); setMessage(""); }}>Use a different sign-in</button>
        </form>}
        <p className={styles.status} role="status" aria-live="polite">{message}</p>
      </div>
    </section>
  </main>;
}
