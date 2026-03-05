<p align="center">
  <img src="public/chai-logo.png" alt="CHAI Logo" width="80" />
</p>

<h1 align="center">CHAI Uganda — PMTCT Quality Improvement System</h1>

<p align="center">
  <strong>Digitising the end-to-end workflow of Prevention of Mother-to-Child Transmission quality improvement across Ugandan health facilities.</strong>
</p>

<p align="center">
  <a href="#getting-started">Getting Started</a> •
  <a href="#features">Features</a> •
  <a href="#assessment-engine">Assessment Engine</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#deployment">Deployment</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Prisma-7.4.2-2D3748?logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/PostgreSQL-18.x-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-4.x-06B6D4?logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-Proprietary-red" alt="License" />
</p>

---

## Why This Exists

PMTCT quality improvement in Uganda involves a complex chain: scheduling mentorship visits, conducting structured facility assessments, generating action plans, tracking trained personnel, and processing mobile money payments — all across dozens of facilities in multiple regions. This system replaces fragmented paper-based and spreadsheet workflows with a single platform that handles the entire lifecycle.

Built for the **Clinton Health Access Initiative (CHAI)** Uganda country team.

---

## Features

| Domain | What It Does |
|---|---|
| **Dashboard & Analytics** | KPI cards, score distribution heatmaps, live submission feeds, data quality flags |
| **Facility Management** | 30 pre-seeded facilities across 4 regions and 12 districts with level/ownership tracking |
| **Visit Management** | Create visits, record participants by role and cadre, auto-generate visit numbers, full lifecycle (Draft → Submitted → Reviewed → Archived) |
| **Assessment Engine** | 16 sections, 95 questions, 5 scoring paradigms, branching logic, auto-save, color-coded results |
| **Action Plans** | Auto-generated from findings, priority-ranked (Critical/High/Medium/Low), assignee and due-date tracking |
| **Names Registry** | Central database of trained/mentored personnel with verification and approval workflows, duplicate detection |
| **Payment Tracking** | Mobile money payments (MTN/Airtel) with multi-level approval: Draft → Submitted → Verified → Approved → Paid → Reconciled |
| **Exports** | 10 export types (Excel/CSV) scoped by geography and role |
| **Audit Trail** | Full action logging with before/after snapshots, IP tracking |
| **RBAC** | Two roles — Super Admin (full access) and Field Assessor (own visits/assessments) — with permission-filtered navigation |

---

## Assessment Engine

The core of the system. 16 structured sections map to the full PMTCT cascade:

| # | Section | Paradigm | Questions |
|--:|---------|----------|----------:|
| 1 | ANC / Maternity / PNC Registers | Maturity Ladder | 24 |
| 2 | Patient / Beneficiary Records | Maturity Ladder | 5 |
| 3 | Triple Elimination Testing | Percentage Based | 10 |
| 4 | Triple Elimination Linkage to Treatment | Percentage Based | 6 |
| 5 | ART in PMTCT Facilities | Maturity Ladder | 8 |
| 6 | Patient Tracking (HIV+ Pregnant Women) | Maturity Ladder | 5 |
| 7 | Adherence Support | Maturity Ladder | 4 |
| 8 | Facility Linkage to Community Care | Maturity Ladder | 3 |
| 9 | STI Screening & Management | Count Based | 4 |
| 10 | Early Infant Diagnosis (EID) | Composite | 8 |
| 11 | CTX for HIV-Exposed Infants | Count Based | 3 |
| 12 | Tracking HIV-Exposed Infants | Maturity Ladder | 5 |
| 13 | Enrolment of HIV-Infected Infants into ART | Count Based | 4 |
| 14 | HEI / EID Registers | Maturity Ladder | 6 |
| 15 | Supply Chain Reliability | Composite | 12 |
| 16 | Human Resources & Service Delivery Points | Descriptive | 7 |

### Scoring Paradigms

| Paradigm | Logic |
|----------|-------|
| **Maturity Ladder** | Depth of YES answers in branching chains (e.g., register available → current version → completely filled) |
| **Percentage Based** | Numerator / denominator calculations against target populations |
| **Count Based** | Achieved vs eligible counts with optional scoring weights |
| **Composite** | Weighted combination of sub-scores |
| **Descriptive** | Data capture only — no score generated (Section 16) |

### Color-Coded Results

| Color | Meaning | Threshold |
|-------|---------|-----------|
| 🟢 **Dark Green** | Excellent | ≥ 90% |
| 🟩 **Light Green** | Good — minor gaps | 75%–89% |
| 🟡 **Yellow** | Moderate gaps | 50%–74% |
| 🔴 **Red** | Critical — urgent action needed | < 50% |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.1.6 (App Router) |
| Language | TypeScript 5.x |
| UI | React 19 + Tailwind CSS 4 + shadcn/ui (43 components) |
| Charts | Recharts 3.7 |
| Animations | Framer Motion 12 |
| ORM | Prisma 7.4.2 with `@prisma/adapter-pg` |
| Database | PostgreSQL 18 |
| Auth | NextAuth.js v5 (beta) with Credentials provider |
| Validation | Zod 4 |
| Data Fetching | TanStack React Query 5 |
| Forms | React Hook Form 7 + @hookform/resolvers |
| Exports | SheetJS (xlsx) + jsPDF + html2canvas |

---

## Project Structure

```
CHAI/
├── prisma/
│   ├── schema.prisma          # 28 models, 25 enums
│   └── seed/index.ts          # Regions, districts, facilities, users, sample data
├── src/
│   ├── app/
│   │   ├── (dashboard)/       # Protected route group
│   │   │   ├── overview/      # KPI dashboard
│   │   │   ├── facilities/    # Facility CRUD + detail views
│   │   │   ├── visits/        # Visit lifecycle management
│   │   │   ├── assessments/   # Assessment form engine
│   │   │   ├── actions/       # Action plan tracking
│   │   │   ├── names-registry/# Trained personnel database
│   │   │   ├── payments/      # Mobile money payments
│   │   │   ├── downloads/     # Export center (10 types)
│   │   │   └── ...            # analytics, audit-logs, settings, etc.
│   │   ├── api/               # 12 API route groups
│   │   └── auth/login/        # Login page
│   ├── components/
│   │   ├── assessment/        # Section form, question renderer, scoring summary
│   │   ├── common/            # DataTable, KPI cards, filters, status badges
│   │   ├── layout/            # AppShell, sidebar, topbar
│   │   └── ui/                # 43 shadcn/ui primitives
│   ├── config/
│   │   └── assessment-sections.ts  # 16 sections × 95 questions definition
│   ├── lib/
│   │   ├── auth/              # NextAuth config + session helpers
│   │   ├── db/                # Prisma client, audit, data quality, derived computations
│   │   ├── rbac/              # 50+ permissions, role matrix, helpers
│   │   ├── scoring/           # 5-paradigm scoring engine
│   │   ├── exports/           # Scope-aware data generators + Excel/CSV output
│   │   └── validation/        # Zod schemas
│   └── types/index.ts         # Shared TypeScript definitions
├── render.yaml                # One-click Render deployment blueprint
└── package.json
```

---

## Getting Started

### Prerequisites

- **Node.js** ≥ 18
- **PostgreSQL** instance (local or hosted)

### Install & Run

```bash
# 1. Clone
git clone https://github.com/Isaac25-lgtm/CHAI.git
cd CHAI

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env → set DATABASE_URL to your PostgreSQL connection string

# 4. Set up database
npx prisma generate      # Generate Prisma client
npx prisma db push        # Create tables
npx prisma db seed        # Seed sample data

# 5. Start dev server
npm run dev               # → http://localhost:3000
```

---

## Deployment

### Render (Recommended)

A `render.yaml` Blueprint is included for one-click deployment.

1. Go to **Render → New → Blueprint**
2. Connect the `Isaac25-lgtm/CHAI` repository
3. Render auto-provisions a **PostgreSQL database** and **Web Service**
4. Set `NEXTAUTH_URL` to your Render URL (e.g., `https://chai-pmtct.onrender.com`)
5. Deploy

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/chai_pmtct` |
| `NEXTAUTH_URL` | Public app URL | `https://chai-pmtct.onrender.com` |
| `NEXTAUTH_SECRET` | JWT encryption secret | Auto-generated on Render |
| `NODE_ENV` | Environment | `production` |

---

## API Reference

All endpoints live under `/api/`. Authentication is handled via NextAuth.js session cookies.

<details>
<summary><strong>Visits</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/visits` | List visits (filter by status, facility, date range) |
| `POST` | `/api/visits` | Create visit with participants |
| `GET` | `/api/visits/[id]` | Get visit details |
| `PATCH` | `/api/visits/[id]` | Update visit |
| `POST` | `/api/visits/[id]/submit` | Submit visit |
| `POST` | `/api/visits/quick-assess` | One-click: create visit + assessment |

</details>

<details>
<summary><strong>Assessments</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/assessments` | List assessments (scope-filtered) |
| `POST` | `/api/assessments` | Create assessment for a visit |
| `GET` | `/api/assessments/[id]` | Get assessment with responses |
| `PATCH` | `/api/assessments/[id]` | Save progress |
| `POST` | `/api/assessments/[id]/submit` | Submit and trigger scoring |

</details>

<details>
<summary><strong>Facilities</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/facilities` | List facilities (filter by level, ownership, search) |
| `POST` | `/api/facilities` | Create facility |
| `GET` | `/api/facilities/[id]` | Get facility details |
| `PATCH` | `/api/facilities/[id]` | Update facility |
| `GET` | `/api/facilities/regions` | List all regions |
| `GET` | `/api/facilities/districts` | List districts (filter by region) |

</details>

<details>
<summary><strong>Users</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/users` | List users (RBAC-scoped) |
| `POST` | `/api/users` | Create user |
| `GET` | `/api/users/[id]` | Get user details |
| `PATCH` | `/api/users/[id]` | Update user |

</details>

<details>
<summary><strong>Action Plans</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/actions` | List (filter by status, priority) |
| `POST` | `/api/actions` | Create action plan |
| `GET` | `/api/actions/[id]` | Get details |
| `PATCH` | `/api/actions/[id]` | Update |

</details>

<details>
<summary><strong>Names Registry</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/names-registry` | List personnel |
| `POST` | `/api/names-registry` | Add person |
| `GET` | `/api/names-registry/[id]` | Get details |
| `PATCH` | `/api/names-registry/[id]` | Update / verify / approve |
| `POST` | `/api/names-registry/import-from-visit` | Import visit participants |

</details>

<details>
<summary><strong>Payments</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/payments` | List payments |
| `POST` | `/api/payments` | Create payment request |
| `GET` | `/api/payments/[id]` | Get details |
| `PATCH` | `/api/payments/[id]` | Update status |

</details>

<details>
<summary><strong>Dashboard & Exports</strong></summary>

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/dashboard/overview` | KPIs and summary stats |
| `GET` | `/api/dashboard/analytics` | Assessment analytics |
| `GET` | `/api/dashboard/submissions` | Live submission feed |
| `GET` | `/api/dashboard/data-quality` | Data quality metrics |
| `GET` | `/api/exports/[type]` | Export data (`format=excel\|csv`) |
| `GET` | `/api/audit-logs` | Audit trail |

**Export types:** `raw-assessment`, `analyzed-assessment`, `facility-summary`, `district-summary`, `national-summary`, `action-plan`, `names-registry`, `payment`, `data-quality`, `audit-log`

</details>

---

## Database Overview

**28 models** across 6 domains:

| Domain | Models |
|--------|--------|
| Auth & Users | User, Session |
| Geography | Region (4), District (12), Facility (30) |
| Visits & Assessments | Visit, VisitParticipant, Assessment, AssessmentSection, AssessmentQuestion, AssessmentResponse |
| Scoring | DomainScore, VisitSummary, DistrictAggregate |
| Operations | ActionPlan, NamesRegistryEntry, PaymentRecord |
| Governance | AuditLog, DataQualityFlag, Attachment, ExportLog |

**25 enums** covering roles, statuses, facility levels, scoring paradigms, payment lifecycles, and more.

---

## Seed Data

The seed script populates the database with realistic Uganda-specific data for immediate testing:

| Entity | Count |
|--------|------:|
| Regions | 4 |
| Districts | 12 |
| Facilities | 30 |
| Users | 2 |
| Assessment Sections | 16 |
| Assessment Questions | 95 |
| Visits | 10 (6 submitted, 4 draft) |
| Assessments | 6 (with domain scores) |
| Action Plans | 19 |
| Names Registry Entries | 30 |
| Payment Records | 15 |
| Data Quality Flags | 10 |
| District Aggregates | 12 |

---

## Scripts

| Command | What It Does |
|---------|--------------|
| `npm run dev` | Start dev server |
| `npm run build` | Full production build (generate + push + build) |
| `npm start` | Start production server |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript compiler check |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:seed` | Seed sample data |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:studio` | Open Prisma Studio (visual DB editor) |

---

## License

Proprietary software developed for the **Clinton Health Access Initiative (CHAI)** Uganda.

---

<p align="center">
  <sub>Built for PMTCT quality improvement in Uganda</sub>
</p>
