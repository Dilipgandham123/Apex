# Sri Sai Anu Motor Driving School Platform

This is the canonical developer handbook and project source of truth. Read it before changing the application or continuing the work in a new chat. It consolidates the former product, design, architecture, decision, roadmap, and stage documents.

Last verified: **7 September 2026**.

## 1. What this project is

Sri Sai Anu Motor Driving School operates in Madhapur, Hyderabad from **6 AM to 7 PM**. This project converts the school's public website and paper lesson notebook into one full-stack management platform.

The system contains:

- a public marketing and registration website;
- an administrator application;
- a mobile-first staff/driver application;
- a customer application;
- an installable Progressive Web App (PWA);
- a REST API;
- a PostgreSQL operational database.

The application follows the school's real walk-in workflow. Customers do not reserve classes online. They arrive and take a lesson when a compatible driver and vehicle are available. Drivers are assigned vehicles, not permanent customers.

## 2. Current status

Development Stages 1–12 are implemented. Stage 13 repository readiness is implemented, but the external production rollout is not complete.

| Area | Status |
|---|---|
| Public website | Implemented |
| Admin application | Implemented |
| Staff application | Implemented |
| Customer application | Implemented |
| REST API and authorization | Implemented |
| PostgreSQL schema and migrations | Implemented |
| Demo data | Implemented |
| PWA manifest/service worker/icons | Implemented and automatically verified |
| Unit and integration test suites | Implemented |
| CI workflow | Implemented |
| Production hosting | **Not deployed from this repository** |
| Live provider credentials | **Not configured in source control** |
| Real-device acceptance | Pending |
| Staff training and working-day trial | Pending |

The repository's full local validation command passed on 7 September 2026:

```powershell
npm run check
```

This validates linting, TypeScript, unit tests, PWA assets, and production builds. The PostgreSQL integration suite is configured separately in CI and can also be run locally.

## 3. Repository and deployment truth

The project is an npm-workspaces monorepo coordinated by Turborepo.

```text
apps/web                 Next.js website and PWA
apps/api                 NestJS REST API
packages/database        Prisma schema, migrations, generated client
packages/contracts       Shared framework-neutral contracts
packages/config          Shared TypeScript configuration
scripts                  PWA, backup, restore, and import-validation tools
docs                     Notebook import CSV template only
.github/workflows/ci.yml Continuous integration
compose.yaml             Local PostgreSQL 17
```

Confirmed source-code remote:

```text
https://github.com/Dilipgandham123/Apex.git
```

There is currently no checked-in Vercel, Railway, Render, AWS, or other production deployment configuration. Do not claim that the application is live unless deployment is independently verified later.

The intended production topology is:

```text
Next.js web/PWA (recommended: Vercel)
             |
             | HTTPS REST
             v
NestJS API (Railway, Render, AWS, or equivalent)
             |
             v
Managed PostgreSQL 17

External providers:
Razorpay + Meta WhatsApp Cloud API + Resend + Cloudinary
```

This topology is a recommendation, not an existing deployment.

## 4. Technology stack

- Next.js 16.3.3 with React 19 and the App Router
- NestJS 11 REST API
- TypeScript
- Prisma 6 with PostgreSQL 17
- npm workspaces and Turborepo
- Tailwind CSS 4 plus CSS Modules/global CSS
- Zod and class-validator
- Razorpay, Cloudinary, Meta WhatsApp Cloud API, and Resend
- GitHub Actions CI

Before changing Next.js code, read the relevant installed documentation under `apps/web/node_modules/next/dist/docs/`. The repository's `AGENTS.md` files require this because installed APIs may differ from remembered APIs.

## 5. Local setup

Requirements: Node.js 20.19+, npm, and PostgreSQL 17 (local or Docker).

```powershell
npm install
Copy-Item .env.example .env
Copy-Item apps/web/.env.example apps/web/.env.local
Copy-Item apps/api/.env.example apps/api/.env
```

Do not commit real secrets.

### Existing local PostgreSQL

The developer-provided local connection is:

```dotenv
DATABASE_URL="postgresql://postgres:<local-password>@localhost:5432/driving_school?schema=public"
```

The role, password, database, and port must already exist locally. Keep the real password only in ignored `.env` files.

### Docker PostgreSQL

```powershell
docker compose up -d postgres
```

Docker is optional when local PostgreSQL is already running. The Compose connection is:

```dotenv
DATABASE_URL="postgresql://driving_school:local_development_only@localhost:5432/driving_school?schema=public"
```

### Migrate, seed, and run

Run commands from the repository root:

```powershell
npm run db:migrate
npm run seed:madhapur
npm run dev
```

`npm run dev` starts both applications:

- Web: <http://localhost:3010>
- Login: <http://localhost:3010/login>
- API: <http://localhost:4010/api/v1>
- Health: <http://localhost:4010/api/v1/health>
- Database readiness: <http://localhost:4010/api/v1/health/ready>

Individual commands are `npm run dev:web` and `npm run dev:api`.

## 6. Demo accounts

Run `npm run seed:madhapur` first. The seed is non-destructive and does not duplicate data.

All password accounts use `Demo@3010`:

| Role | Login |
|---|---|
| Super Admin | `superadmin@madhapur.demo` |
| School Admin | `admin@madhapur.demo` |
| Staff | `ramesh.driver@madhapur.demo` |
| Staff | `farheen.driver@madhapur.demo` |

Customer OTP accounts:

- `9000001201`
- `9000001202`
- `9000001203`

Keep `OTP_EXPOSE_IN_RESPONSE=true` only locally. The login page has development-only buttons that fill an Admin, Staff, or Customer account; they are excluded from production.

Demo data includes courses, customers, enrollments, assigned vehicles, lessons, KM shortfall/recovery, payments, complaints, enquiries, a vehicle issue, audit records, and notification attempts.

## 7. Business rules that must not drift

1. School hours are 6 AM to 7 PM.
2. A standard course has 28 classes, but course rules are configurable.
3. The normal target is 6 km per class, configurable and snapshotted at enrollment.
4. Registration does not start the 60-day timer.
5. Completing class 1 sets the first-class date and 60-day deadline.
6. There is no online booking and no digital waiting list.
7. Customers are handled according to physical arrival and availability.
8. Drivers have an assigned vehicle; customers do not have a permanent driver.
9. A lesson links its customer, driver, and vehicle only for that lesson.
10. One customer, driver, or vehicle cannot have two active lessons simultaneously.
11. The server calculates distance from odometer readings.
12. A short class consumes a class and creates an attributable KM shortfall.
13. Later excess distance recovers the oldest pending shortfall first.
14. Staff cannot edit calculated kilometres.
15. KM corrections and deadline extensions are admin-only, reasoned, and audited.
16. Expired enrollments cannot start lessons until extended by an admin.
17. Course price, class count, KM target, and duration are snapshotted at enrollment.
18. Verified payments minus processed refunds determine balances.
19. Customers may access only their own records.
20. Every school-owned operation is isolated by `schoolId`.

```text
Class 2 target:          6 km
Class 2 covered:         5 km
Shortfall created:       1 km

Class 3 normal target:   6 km
Previous shortfall:      1 km
Class 3 total target:    7 km
Class 3 covered:         7 km
Shortfall recovered:     1 km
```

## 8. Roles and access

| Capability | Super Admin | School Admin | Staff/Driver | Customer |
|---|---:|---:|---:|---:|
| Manage school operations | Yes | Own school | No | No |
| Manage courses/customers | Yes | Yes | No | No |
| Manage staff/vehicles | Yes | Yes | No | No |
| Assign vehicles | Yes | Yes | No | No |
| Start/end lessons | Administrative | Administrative | Own assignment | No |
| Correct KM/deadlines | Audited | Audited | No | No |
| Record/refund payments | Yes | Yes | No | No |
| Handle complaints | Yes | Yes | No | Own only |
| View reports | Platform | Own school | Own activity | Own progress |

Admin and staff use email/password. Customers use a registered 10-digit Indian mobile number and OTP. Access tokens expire after 15 minutes; refresh tokens are opaque, hashed, cookie-bound, rotated, and protected against reuse.

## 9. User workflows

### Administrator

- Configure courses and register customers with enrollment snapshots.
- Record discounts, initial payments, and pending amounts.
- Manage staff, vehicles, assignments, maintenance, and issues.
- Review active lessons and operational exceptions.
- Record payments/refunds and reconcile balances.
- Review training history and immutable KM events.
- Apply audited deadline extensions and KM corrections.
- Triage complaints, send public replies, and retain private notes.
- Review enquiries, reports, and notification failures.

### Staff/driver

- See only the assigned vehicle and own activity.
- Report an assigned-vehicle issue.
- Search an arriving customer by ID, name, or mobile.
- Start a lesson only when all entities are eligible.
- Record starting/ending odometer values and optional evidence.
- Record skills, a customer-visible summary, and a private note.
- Receive server-calculated covered and pending KM.
- Recover an interrupted active-lesson screen.

### Customer

- Sign in by OTP.
- See course, first class, deadline, remaining days, classes, KM, and payment totals.
- Review every class's date, driver, vehicle, target, distance, skills, and summary.
- Trace which class created and recovered each KM shortfall.
- Review receipts, refunds, and pending balance.
- Submit and follow complaints linked to owned records.
- Install the PWA on a supported phone or tablet.

## 10. Web routes

Public:

- `/` — marketing site and registration enquiry
- `/login` — unified login
- `/policies/privacy`
- `/policies/terms`
- `/policies/payments-refunds`
- `/policies/complaints`

There is no free trial. Registration/enquiry data is persisted before WhatsApp opens.

Admin:

- `/admin`
- `/admin/courses`
- `/admin/customers/new`
- `/admin/staff`
- `/admin/vehicles`
- `/admin/training`
- `/admin/payments`
- `/admin/complaints`
- `/admin/enquiries`
- `/admin/reports`

Staff: `/staff`, `/staff/vehicle`, `/staff/lessons`, `/staff/lessons/active`.

Customer: `/customer`, `/customer/history`, `/customer/kilometres`, `/customer/payments`, `/customer/complaints`.

## 11. API organization

NestJS is authoritative. The frontend must never connect directly to PostgreSQL or calculate authoritative balances, deadlines, class numbers, or lesson distance.

Modules under `apps/api/src`:

- `auth` — password login, OTP, sessions, refresh, logout
- `registration` — courses, customers, enrollment snapshots
- `fleet` — staff, vehicles, assignments, issues
- `lessons` — arrival search and lesson start/end
- `training` — KM ledger, deadlines, corrections/extensions
- `customer` — customer-owned overview/history
- `payments` — manual payments, Razorpay, webhooks, refunds
- `complaints` — complaint lifecycle and attachments
- `enquiries` — public registration and admin follow-up
- `reports` — reconciled dashboards/reports
- `notifications` — encrypted outbox, providers, retries

All routes use the `/api/v1` prefix. Controllers are the definitive endpoint reference.

## 12. Database model

Prisma schema: `packages/database/prisma/schema.prisma`. Migrations: `packages/database/prisma/migrations`.

Identity/tenancy: `DrivingSchool`, `User`, `Role`, `Permission`, `RolePermission`, `SchoolMembership`, `RefreshToken`, `OtpChallenge`, `AuditLog`.

Training: `Course`, `CustomerProfile`, `CourseEnrollment`, `StaffProfile`, `Vehicle`, `DriverVehicleAssignment`, `VehicleIssue`, `Lesson`, `LessonSkill`, `KilometreLedgerEntry`, `DeadlineExtension`.

Finance/support: `Payment`, `PaymentRefund`, `PaymentWebhookEvent`, `Complaint`, `ComplaintMessage`, `ComplaintAttachment`, `PublicEnquiry`, `Notification`, `NotificationAttempt`.

Database constraints and transactions enforce active-lesson uniqueness, assignment exclusivity, payment/webhook idempotency, valid KM entries, and ownership. Do not replace these guarantees with frontend-only checks.

## 13. Payments, files, and notifications

### Payments

- Admins record partial cash/UPI receipts.
- Customers can create partial/full Razorpay orders.
- The API verifies signatures and captured provider payments.
- Webhooks use raw request bodies and unique event IDs.
- Refunds remain linked to source payments.

Variables: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`.

### Complaint attachments

- Up to three JPG, PNG, WebP, or PDF files, maximum 5 MB each.
- The API creates short-lived Cloudinary signatures.
- Files upload directly; PostgreSQL stores URLs and metadata.
- Private admin notes are excluded by the customer query.

Variables: `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

### Notifications

- OTP, payment confirmation/reminder, deadline warning, course completion, complaint reply.
- Encrypted tenant-scoped PostgreSQL outbox and attempt history.
- Event/channel idempotency and bounded five-attempt retry.
- Local default: `NOTIFICATION_DELIVERY_MODE=log`.

Live delivery requires Meta WhatsApp templates and/or `RESEND_API_KEY` with a verified sender.

## 14. Environment variables

Use `.env.example`, `apps/api/.env.example`, and `apps/web/.env.example` as the current lists.

```dotenv
API_PORT=4010
WEB_ORIGIN="http://localhost:3010"
NEXT_PUBLIC_API_URL="http://localhost:4010/api/v1"
```

Secret groups:

- Database: `DATABASE_URL`
- Auth: `JWT_SECRET`, `OTP_HMAC_SECRET`, `OTP_EXPOSE_IN_RESPONSE`
- Payments: Razorpay variables
- Attachments: Cloudinary variables
- Notifications: `NOTIFICATION_ENCRYPTION_KEY`, delivery mode
- WhatsApp: Meta Graph token, phone ID, language, templates
- Email: `RESEND_API_KEY`, `RESEND_FROM_EMAIL`

Production requires unique strong secrets, HTTPS, secure cookies, SSL database access, `OTP_EXPOSE_IN_RESPONSE=false`, and no payment test bypasses.

## 15. Design system

- Near-black background, white primary text, muted-gray supporting text, and one acid-lime accent.
- Display/brand font: Clash Display. Application/body font: Satoshi.
- Use tabular numerals for money, classes, dates, odometers, and KM.
- Use flat surfaces, hairline dividers, and deliberate negative space.
- No gradients, glassmorphism, colorful dashboard mosaics, or decorative shadows.
- Lime is for primary actions, selection, focus, and important states.
- Keep persistent labels, keyboard focus, accessible contrast, 44 px controls, and reduced-motion support.
- Public pages are brand-led; authenticated pages are task-led.
- Existing public/login pages and `apps/web/public/brand` assets are the visual authority.

## 16. Verification and CI

```powershell
npm run check
```

This runs lint, type checks, unit tests, PWA verification, and production builds.

Other commands:

```powershell
npm run db:validate
npm run db:migrate
npm run seed:madhapur
npm run test:integration --workspace=@hyd/api
```

Integration tests require a migrated PostgreSQL database and running API. GitHub Actions runs repository validation plus PostgreSQL 17 migrations and the complete API integration suite covering authentication, registration, fleet, lessons/KM/deadlines, payments/complaints, enquiries, and notifications.

## 17. Operations tools

PWA:

```powershell
npm run verify:pwa
```

Backup:

```powershell
npm run backup:database -- stage13-test.dump
```

Restore only into a disposable database:

```powershell
$env:RESTORE_DATABASE_URL="postgresql://.../driving_school_restore_test"
$env:ALLOW_DATABASE_RESTORE="true"
npm run restore:database -- stage13-test.dump
```

Notebook validation:

```powershell
npm run validate:migration -- path/to/import.csv
```

Copy `docs/notebook-import-template.csv` first. Validation is read-only and checks columns, phones, classes, KM, and duplicates.

## 18. Security baseline

- Salted `scrypt` password hashes and rate-limited HMAC-protected OTPs.
- Short-lived access tokens and rotating refresh sessions.
- Server-side RBAC, active membership, ownership, and tenant checks.
- CSP, anti-framing, MIME-sniffing prevention, referrer, and permissions headers.
- Development CSP allowances are excluded from production.
- Server-side payment/webhook signature verification.
- Encrypted notification payloads and sensitive-log redaction.
- Audit records for lesson, KM, deadline, payment, complaint, and admin mutations.

## 19. Deliberately excluded scope

Do not add without a new approved decision:

- CMS
- online lesson booking
- digital waiting list
- permanent customer-instructor assignment
- native Flutter/React Native applications
- GPS route tracking
- payroll
- advanced fleet telematics
- self-service multi-school SaaS billing/onboarding

The responsive installable PWA is the current mobile application.

## 20. Production rollout still required

- [ ] Deploy web, API, and PostgreSQL over HTTPS.
- [ ] Configure live Razorpay, Cloudinary, WhatsApp, and Resend credentials.
- [ ] Send real test notifications and payments.
- [ ] Restore a production backup into a disposable managed database.
- [ ] Test PWA installation/login on Android and iPhone.
- [ ] Verify every role with production-like accounts.
- [ ] Double-check and reconcile active notebook data.
- [ ] Train administrators/drivers and retain sign-off.
- [ ] Run one reconciled 6 AM–7 PM working-day trial.
- [ ] Configure web/API/database/payment/notification monitoring.
- [ ] Name school, technical, and provider escalation contacts.

If financial reconciliation, tenant isolation, or lesson integrity fails during rollout, stop writes, preserve logs, and roll back the immutable web/API release. Restore the database only when forward repair is unsafe and the school owner approves a verified backup.

## 21. Guidance for future developers and AI chats

1. Read this entire file before planning or editing.
2. Inspect current code and migrations; this handbook explains intent, but code may advance.
3. Never infer production deployment from implementation guidance.
4. Preserve Section 7 business rules unless the owner explicitly changes them.
5. Update this handbook whenever architecture, workflows, routes, providers, ports, deployment status, or rules change.
6. Update tests for every changed business rule.
7. Keep server-side enforcement authoritative.
8. Preserve unrelated working-tree changes.
9. Never commit environments, dumps, provider credentials, or customer data.
10. Before declaring completion, run `npm run check`, run integration tests where possible, and distinguish code completion from rollout acceptance.
