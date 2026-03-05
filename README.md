# CHAI Uganda PMTCT Quality Improvement System

A comprehensive full-stack web application for managing **Prevention of Mother-to-Child Transmission (PMTCT)** quality improvement activities across healthcare facilities in Uganda. Built for the **Clinton Health Access Initiative (CHAI)** to streamline facility assessments, mentorship visits, action planning, personnel tracking, and mobile money payments.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Features](#features)
- [Assessment Engine](#assessment-engine)
- [Role-Based Access Control (RBAC)](#role-based-access-control-rbac)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Getting Started](#getting-started)
- [Deployment on Render](#deployment-on-render)
- [Environment Variables](#environment-variables)
- [Test Accounts](#test-accounts)
- [Scripts](#scripts)

---

## Overview

The CHAI PMTCT system digitises the end-to-end workflow of PMTCT quality improvement in Uganda:

1. **Plan** - Schedule mentorship visits to health facilities
2. **Assess** - Conduct structured 16-section assessments with automated scoring
3. **Act** - Generate action plans from assessment findings with priority tracking
4. **Track** - Monitor personnel (Names Registry), mobile money payments, and data quality
5. **Report** - Export data in Excel/CSV across 10 export types with geographic scoping

The platform supports **2 user roles** for simplified operation:
- **Super Admin** - Full system access (manage users, facilities, reports, settings)
- **Field Assessor** - Visit facilities, conduct assessments, enter mobile money details

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.1.6 |
| **Language** | TypeScript | 5.x |
| **UI Library** | React | 19.2.3 |
| **Styling** | Tailwind CSS | 4.x |
| **UI Components** | shadcn/ui (Radix primitives) | 43 components |
| **Charts** | Recharts | 3.7.0 |
| **Animations** | Framer Motion | 12.x |
| **ORM** | Prisma | 7.4.2 |
| **Database** | PostgreSQL | 18.x |
| **DB Adapter** | @prisma/adapter-pg | 7.4.2 |
| **Authentication** | NextAuth.js v5 (beta) | 5.0.0-beta.30 |
| **Validation** | Zod | 4.x |
| **Data Fetching** | TanStack React Query | 5.x |
| **Forms** | React Hook Form + @hookform/resolvers | 7.x |
| **Icons** | Lucide React | 0.577.0 |
| **Exports** | SheetJS (xlsx) | 0.18.5 |
| **PDF** | jsPDF + html2canvas | 4.x / 1.4.x |
| **Toasts** | Sonner | 2.x |
| **Password Hashing** | bcryptjs | 3.x |

---

## Project Structure

```
chai-pmtct-system/
├── prisma/
│   ├── schema.prisma              # Database schema (28 models, 25 enums)
│   └── seed/
│       └── index.ts               # Seed script (regions, districts, facilities, users, visits, assessments)
├── src/
│   ├── app/
│   │   ├── (dashboard)/           # Protected dashboard route group
│   │   │   ├── layout.tsx         # AppShell layout (sidebar + topbar)
│   │   │   ├── overview/          # Dashboard home with KPIs
│   │   │   ├── facilities/        # Facility management (list + [id] detail)
│   │   │   ├── visits/            # Visit management (list + new + [id] + edit + assess)
│   │   │   ├── assessments/       # Assessment management (list + new + [id] form)
│   │   │   ├── actions/           # Action plan management (list + new + [id])
│   │   │   ├── users/             # User management (list + new + [id])
│   │   │   ├── names-registry/    # Trained personnel database
│   │   │   ├── payments/          # Mobile money payment tracking
│   │   │   ├── assessment-analytics/ # Assessment analytics & charts
│   │   │   ├── live-submissions/  # Real-time submission feed
│   │   │   ├── data-quality/      # Data quality flags & issues
│   │   │   ├── audit-logs/        # System audit trail
│   │   │   ├── downloads/         # Export/download center
│   │   │   └── settings/          # System settings (admin)
│   │   ├── api/                   # API route handlers
│   │   │   ├── auth/[...nextauth]/ # NextAuth endpoints
│   │   │   ├── visits/            # Visit CRUD + submit
│   │   │   ├── assessments/       # Assessment CRUD + submit
│   │   │   ├── facilities/        # Facility CRUD + regions/districts lookups
│   │   │   ├── users/             # User CRUD
│   │   │   ├── actions/           # Action plan CRUD
│   │   │   ├── names-registry/    # Names registry CRUD + import from visit
│   │   │   ├── payments/          # Payment lifecycle management
│   │   │   ├── dashboard/         # Overview, analytics, submissions, data-quality APIs
│   │   │   ├── exports/[type]/    # Dynamic export endpoint (10 export types)
│   │   │   └── audit-logs/        # Audit log listing
│   │   ├── auth/
│   │   │   └── login/             # Login page (role selector cards)
│   │   ├── layout.tsx             # Root layout (providers, fonts, metadata)
│   │   ├── page.tsx               # Root redirect to /overview
│   │   ├── providers.tsx          # SessionProvider + QueryClientProvider
│   │   └── globals.css            # Tailwind CSS imports
│   ├── components/
│   │   ├── assessment/            # Assessment-specific components
│   │   │   ├── assessment-summary.tsx  # Score summary with color badges
│   │   │   ├── question-renderer.tsx   # Multi-type question renderer
│   │   │   ├── section-form.tsx        # Section form with auto-save
│   │   │   └── section-nav.tsx         # Section navigation sidebar
│   │   ├── common/                # Shared business components
│   │   │   ├── data-table.tsx     # Generic sortable/paginated table
│   │   │   ├── kpi-card.tsx       # KPI display card
│   │   │   ├── chart-container.tsx # Recharts wrapper
│   │   │   ├── filter-bar.tsx     # Filter controls (date, status, facility)
│   │   │   ├── page-header.tsx    # Page title + action buttons
│   │   │   ├── status-badge.tsx   # Status display badge
│   │   │   ├── payment-status-badge.tsx # Payment status badge
│   │   │   ├── empty-state.tsx    # Empty list placeholder
│   │   │   └── loading-skeleton.tsx # Skeleton loaders (table, chart, KPI)
│   │   ├── layout/                # Layout components
│   │   │   ├── app-shell.tsx      # Main layout wrapper
│   │   │   ├── sidebar.tsx        # Permission-filtered navigation
│   │   │   └── topbar.tsx         # Header with user menu
│   │   └── ui/                    # 43 shadcn/ui primitives
│   ├── config/
│   │   ├── assessment-sections.ts # 16 PMTCT assessment section definitions (95 questions)
│   │   └── constants.ts           # App-wide constants
│   ├── hooks/
│   │   └── use-session.ts         # useCurrentUser hook (session + RBAC)
│   ├── lib/
│   │   ├── auth/                  # Authentication configuration
│   │   │   ├── config.ts          # NextAuth config (Edge-safe)
│   │   │   ├── index.ts           # Full auth with Credentials provider
│   │   │   └── session.ts         # Session helpers
│   │   ├── db/
│   │   │   ├── index.ts           # Prisma client singleton (PostgreSQL adapter)
│   │   │   ├── audit.ts           # Audit logging utility
│   │   │   ├── data-quality.ts    # Data quality flag operations
│   │   │   ├── derived.ts         # Derived data computations
│   │   │   └── visit-number.ts    # Auto-incrementing visit number generator
│   │   ├── rbac/
│   │   │   ├── permissions.ts     # 50+ permission constants + role matrix
│   │   │   ├── helpers.ts         # hasPermission(), requirePermission() helpers
│   │   │   └── index.ts           # Barrel export
│   │   ├── scoring/
│   │   │   ├── engine.ts          # Scoring engine (5 paradigms)
│   │   │   └── index.ts           # Barrel export
│   │   ├── exports/
│   │   │   ├── generators.ts      # 10 export data generators (scope-aware)
│   │   │   ├── excel.ts           # Excel/CSV generation via SheetJS
│   │   │   └── index.ts           # Barrel export
│   │   ├── validation/
│   │   │   ├── schemas.ts         # Zod schemas (login, user, facility, visit, payment, etc.)
│   │   │   └── index.ts           # Barrel export
│   │   └── utils.ts               # cn() utility (clsx + tailwind-merge)
│   ├── generated/
│   │   └── prisma/                # Auto-generated Prisma client (gitignored)
│   ├── middleware.ts              # NextAuth route protection
│   └── types/
│       └── index.ts               # TypeScript type definitions
├── render.yaml                    # Render deployment config (web + PostgreSQL)
├── next.config.ts                 # Next.js config (standalone output)
├── prisma.config.ts               # Prisma v7 config
├── package.json                   # Dependencies & scripts
└── tsconfig.json                  # TypeScript config
```

---

## Features

### Dashboard & Analytics
- **Overview** - KPI cards (total visits, assessments, compliance rate, open actions), trending charts, recent activity feed
- **Assessment Analytics** - Score distribution by section, facility performance comparison, color-coded heatmaps
- **Live Submissions** - Real-time feed of submitted visits and assessments
- **Data Quality** - Flagged issues (missing values, impossible values, duplicates, incomplete sections) with severity levels

### Facility Management
- 30 pre-seeded health facilities across 12 districts and 4 regions of Uganda
- Facility levels: HC II, HC III, HC IV, General Hospital, Regional Referral, National Referral
- Ownership types: Government, PNFP (Private Not-for-Profit), Private
- Contact details, geographic hierarchy, and active status tracking

### Visit Management
- Create mentorship visits with facility selection, date, activity name, and mentorship cycle
- Add visit participants with full details (name, role, cadre, team type, organization, phone)
- Team types: Central, District, Facility, Partner, Other
- Visit lifecycle: DRAFT -> SUBMITTED -> REVIEWED -> ARCHIVED
- Auto-generated visit numbers (VIS-2026-000001)

### Assessment Engine
- **16 structured assessment sections** covering the full PMTCT cascade
- **95 questions** with 7 response types (YES/NO, Numeric, Text, Dropdown, Multi-select, Sampled Data, Date)
- **5 scoring paradigms** with automated color-coded results (RED / YELLOW / LIGHT_GREEN / DARK_GREEN)
- Branching logic (conditional questions based on parent answers)
- Evidence requirements for critical indicators
- Auto-save with completion percentage tracking
- Section-by-section navigation with completion indicators

### Action Plans
- Generated from assessment findings with priority levels (Critical, High, Medium, Low)
- Linked to specific assessment sections and color-coded findings
- Assignee tracking with due dates
- Status lifecycle: OPEN -> IN_PROGRESS -> COMPLETED (or OVERDUE / CANCELLED)
- Progress notes and evidence URL support

### Names Registry
- Database of all trained/mentored personnel
- Auto-import from visit participants
- Verification workflow: UNVERIFIED -> VERIFIED -> FLAGGED/REJECTED
- Approval workflow: PENDING -> APPROVED -> REJECTED
- Eligibility assessment: ELIGIBLE / INELIGIBLE / PENDING_REVIEW
- Mobile network tracking (MTN/Airtel) for payment processing
- Duplicate detection

### Payment Tracking
- Mobile money payment management for field participants
- Payment categories: Transport, Per Diem, Facilitation, Other
- Currency: UGX (Ugandan Shillings)
- Payment lifecycle: DRAFT -> SUBMITTED -> VERIFIED -> APPROVED -> PAID -> RECONCILED
- Transaction reference tracking
- Multi-level approval (verified by supervisor, approved by finance, paid by finance)

### Export & Reporting
10 export types available in Excel (.xlsx) and CSV formats:
1. Raw Assessment Data
2. Analyzed Assessment Data (with scores)
3. Facility Summary
4. District Summary
5. National Summary
6. Action Plans
7. Names Registry
8. Payment Records
9. Data Quality Flags
10. Audit Logs

All exports are **scope-aware** - data is filtered based on the user's geographic permissions.

### Audit Trail
- Comprehensive logging of all system actions
- Actions tracked: CREATE, UPDATE, DELETE, SUBMIT, APPROVE, REJECT, VERIFY, MARK_PAID, RECONCILE, EXPORT, LOGIN, LOGOUT, ROLE_CHANGE, STATUS_CHANGE, UNLOCK, REOPEN
- Before/after snapshots for data changes
- IP address and user agent tracking

---

## Assessment Engine

### 16 PMTCT Assessment Sections

| # | Section | Scoring Paradigm | Questions |
|---|---------|-----------------|-----------|
| 1 | ANC / Maternity / PNC Registers | Maturity Ladder | 24 |
| 2 | Patient / Beneficiary Records | Maturity Ladder | 5 |
| 3 | Triple Elimination Testing | Percentage Based | 10 |
| 4 | Triple Elimination Linkage to Treatment | Percentage Based | 6 |
| 5 | ART in PMTCT Facilities / Quality of Services | Maturity Ladder | 8 |
| 6 | Patient Tracking (HIV+ Pregnant Women) | Maturity Ladder | 5 |
| 7 | Adherence Support | Maturity Ladder | 4 |
| 8 | Facility Linkage to Community Care & Support | Maturity Ladder | 3 |
| 9 | STI Screening & Management | Count Based | 4 |
| 10 | Early Infant Diagnosis (EID) | Composite | 8 |
| 11 | CTX for HIV-Exposed Infants | Count Based | 3 |
| 12 | Tracking HIV-Exposed Infants | Maturity Ladder | 5 |
| 13 | Enrolment of HIV-Infected Infants into ART | Count Based | 4 |
| 14 | HEI / EID Registers | Maturity Ladder | 6 |
| 15 | Supply Chain Reliability | Composite | 12 |
| 16 | Human Resources & Service Delivery Points | Descriptive | 7 |

### Scoring Paradigms

| Paradigm | Description | Color Thresholds |
|----------|-------------|-----------------|
| **Maturity Ladder** | Depth of YES answers in branching chains (e.g., register available -> current version -> completely filled) | <50% RED, <75% YELLOW, <90% LIGHT_GREEN, >=90% DARK_GREEN |
| **Percentage Based** | Numerator/denominator calculations (e.g., clients tested / ANC1 clients) | <50% RED, <75% YELLOW, <90% LIGHT_GREEN, >=90% DARK_GREEN |
| **Count Based** | Achieved vs eligible counts with optional scoring weights | Same thresholds |
| **Composite** | Weighted combination of sub-scores (e.g., EID on-site + referral) | Same thresholds |
| **Descriptive** | Data capture only, no score generated | N/A (Section 16) |

### Color Status Legend

| Color | Meaning | Score Range |
|-------|---------|------------|
| DARK_GREEN | Excellent performance | >= 90% |
| LIGHT_GREEN | Good performance, minor gaps | 75% - 89% |
| YELLOW | Moderate gaps, needs improvement | 50% - 74% |
| RED | Critical gaps, urgent action needed | < 50% |

---

## Role-Based Access Control (RBAC)

### Roles & Permissions

| Permission | Super Admin | Field Assessor |
|-----------|:-----------:|:--------------:|
| **Users** - List, Create, Update, Delete, Manage Roles | All | - |
| **Facilities** - List | Yes | Yes |
| **Facilities** - Create, Update | Yes | - |
| **Visits** - List, Create, Update, Submit | Yes | Yes (own only) |
| **Assessments** - List, Create, Update, Submit | Yes | Yes (own only) |
| **Action Plans** - List, Create, Update | Yes | List, Create |
| **Names Registry** - List, Create, Verify, Approve | Yes | List, Create |
| **Payments** - Full lifecycle | Yes | - |
| **Dashboard** - Overview | Yes | Yes |
| **Dashboard** - Analytics, Live Submissions | Yes | - |
| **Exports** - All types | Yes | Facility-level only |
| **Audit Logs** | Yes | - |
| **Data Quality** - View, Resolve | Yes | - |
| **Settings** | Yes | - |

The sidebar navigation automatically filters menu items based on the logged-in user's role permissions.

---

## API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth.js authentication endpoints |

### Visits
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/visits` | List visits (filterable by status, facility, date range) |
| POST | `/api/visits` | Create visit with participants |
| GET | `/api/visits/[id]` | Get visit details |
| PATCH | `/api/visits/[id]` | Update visit |
| POST | `/api/visits/[id]/submit` | Submit visit |

### Assessments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/assessments` | List assessments (scope-filtered) |
| POST | `/api/assessments` | Create assessment for a visit |
| GET | `/api/assessments/[id]` | Get assessment with responses |
| PATCH | `/api/assessments/[id]` | Save assessment progress |
| POST | `/api/assessments/[id]/submit` | Submit and trigger scoring |

### Facilities
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/facilities` | List facilities (filter by level, ownership, search) |
| POST | `/api/facilities` | Create facility |
| GET | `/api/facilities/[id]` | Get facility details |
| PATCH | `/api/facilities/[id]` | Update facility |
| GET | `/api/facilities/regions` | List all regions |
| GET | `/api/facilities/districts` | List districts (filter by region) |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List users (RBAC scope-filtered) |
| POST | `/api/users` | Create user (password hashed with bcrypt) |
| GET | `/api/users/[id]` | Get user details |
| PATCH | `/api/users/[id]` | Update user |

### Action Plans
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/actions` | List action plans (filter by status, priority) |
| POST | `/api/actions` | Create action plan |
| GET | `/api/actions/[id]` | Get action plan details |
| PATCH | `/api/actions/[id]` | Update action plan |

### Names Registry
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/names-registry` | List personnel entries |
| POST | `/api/names-registry` | Add person to registry |
| GET | `/api/names-registry/[id]` | Get person details |
| PATCH | `/api/names-registry/[id]` | Update person / verify / approve |
| POST | `/api/names-registry/import-from-visit` | Import participants from visit |

### Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/payments` | List payment records |
| POST | `/api/payments` | Create payment request |
| GET | `/api/payments/[id]` | Get payment details |
| PATCH | `/api/payments/[id]` | Update payment status |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/overview` | KPIs and summary stats |
| GET | `/api/dashboard/analytics` | Assessment analytics data |
| GET | `/api/dashboard/submissions` | Live submission feed |
| GET | `/api/dashboard/data-quality` | Data quality metrics |

### Exports
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/exports/[type]` | Export data (type: raw-assessment, analyzed-assessment, facility-summary, district-summary, national-summary, action-plan, names-registry, payment, data-quality, audit-log). Query params: `format=excel|csv` |

### Audit Logs
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/audit-logs` | List audit trail entries |

---

## Database Schema

### Core Models (28 total)

**User & Auth:**
- `User` - System users with role, geographic scope (region/district), and status
- `Session` - Active user sessions

**Geography:**
- `Region` - 4 regions (Central, Eastern, Northern, Western)
- `District` - 12 districts mapped to regions
- `Facility` - 30 health facilities with level, ownership, and contact details

**Visits & Assessments:**
- `Visit` - Mentorship visits to facilities
- `VisitParticipant` - People who attended the visit
- `Assessment` - Structured assessment linked to a visit
- `AssessmentSection` - 16 defined assessment sections
- `AssessmentQuestion` - 95 questions with branching logic
- `AssessmentResponse` - Individual question answers

**Scoring:**
- `DomainScore` - Section-level scores with color status
- `VisitSummary` - Aggregated visit-level scores
- `DistrictAggregate` - District-level quarterly aggregates

**Action Plans:**
- `ActionPlan` - Corrective actions from assessment findings

**Names & Payments:**
- `NamesRegistryEntry` - Trained personnel with verification/approval workflow
- `PaymentRecord` - Mobile money payment lifecycle tracking

**Governance:**
- `AuditLog` - System action audit trail
- `DataQualityFlag` - Data quality issues and resolution tracking
- `Attachment` - File attachments (evidence photos, documents)
- `ExportLog` - Export activity tracking

### Enums (25 total)
UserRole, UserStatus, FacilityLevel, OwnershipType, VisitStatus, AttendanceStatus, TeamType, AssessmentStatus, ResponseType, ScoringParadigm, ColorStatus, ActionPriority, ActionStatus, PaymentCategory, MobileNetwork, EligibilityStatus, VerificationStatus, ApprovalStatus, PaymentStatus, AuditAction, AuditEntity, DataQualitySeverity, DataQualityType, ExportFormat, ExportType

---

## Getting Started

### Prerequisites
- **Node.js** >= 18
- **PostgreSQL** (for production) or connection to a hosted PostgreSQL instance
- **npm** (comes with Node.js)

### Installation

```bash
# Clone the repository
git clone https://github.com/Isaac25-lgtm/CHAI.git
cd CHAI

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your PostgreSQL connection string
```

### Database Setup

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database (creates tables)
npx prisma db push

# Seed with sample data (regions, districts, facilities, users, visits, assessments)
npx prisma db seed
```

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production (includes prisma generate + db push + seed + next build)
npm run build

# Start production server
npm start
```

---

## Deployment on Render

This project includes a `render.yaml` Blueprint for one-click deployment on Render.

### Automatic Setup (Blueprint)

1. Go to [render.com](https://render.com) -> **New** -> **Blueprint**
2. Connect the GitHub repository `Isaac25-lgtm/CHAI`
3. Render auto-creates:
   - **PostgreSQL database** (free tier) - `chai-pmtct-db`
   - **Web Service** (free tier) - `chai-pmtct`
4. Set the **NEXTAUTH_URL** environment variable to your Render URL (e.g., `https://chai-pmtct.onrender.com`)
5. Deploy!

### Manual Setup

1. Create a **PostgreSQL** database on Render
2. Create a **Web Service** with:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `node .next/standalone/server.js`
3. Set environment variables (see below)

---

## Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/chai_pmtct` |
| `NEXTAUTH_URL` | Public URL of the application | `https://chai-pmtct.onrender.com` |
| `NEXTAUTH_SECRET` | Random string for JWT encryption | Auto-generated on Render |
| `NODE_ENV` | Environment mode | `production` |

---

## Test Accounts

The seed script creates two test accounts:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Super Admin** | `admin@chai.org` | `ChaiAdmin2026!` | Full system access |
| **Field Assessor** | `assessor@chai.org` | `ChaiUser2026!` | Visits, assessments, names registry |

---

## Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev Server | `npm run dev` | Start Next.js development server |
| Build | `npm run build` | Generate Prisma client + push schema + seed + build Next.js |
| Start | `npm start` | Start production server |
| Lint | `npm run lint` | Run ESLint |
| Type Check | `npm run typecheck` | Run TypeScript compiler check |
| DB Generate | `npm run db:generate` | Regenerate Prisma client |
| DB Push | `npm run db:push` | Push schema changes to database |
| DB Seed | `npm run db:seed` | Seed database with sample data |
| DB Migrate | `npm run db:migrate` | Run Prisma migrations |
| DB Studio | `npm run db:studio` | Open Prisma Studio (visual DB editor) |

---

## Seed Data Summary

The seed script populates the database with realistic Uganda-specific data:

| Entity | Count | Details |
|--------|-------|---------|
| Regions | 4 | Central, Eastern, Northern, Western |
| Districts | 12 | Kampala, Wakiso, Mukono, Jinja, Mbale, Soroti, Gulu, Lira, Arua, Mbarara, Kabarole, Kabale |
| Facilities | 30 | Across all 12 districts, all facility levels |
| Users | 2 | Super Admin + Field Assessor |
| Assessment Sections | 16 | Full PMTCT assessment framework |
| Assessment Questions | 95 | All response types with branching |
| Visits | 10 | 6 submitted + 4 draft |
| Assessments | 6 | With domain scores and sample responses |
| Action Plans | 19 | Mixed statuses and priorities |
| Names Registry | 30 | With verification/approval statuses |
| Payment Records | 15 | Across all payment statuses |
| Data Quality Flags | 10 | Mixed severities and resolution states |
| District Aggregates | 12 | Quarterly rollups for all districts |

---

## License

This project is proprietary software developed for the Clinton Health Access Initiative (CHAI) Uganda.
