# ONEPASS — Event Operations Platform

> **"One QR. Every interaction."**
> Primary URL: [https://aws.ddu.ac.in/onepass](https://aws.ddu.ac.in/onepass)

---

## 1. Executive Summary & Philosophy

**OnePass** is a high-performance, reusable event check-in, access control, attendee management, and capacity operations platform built for student developer organizations and conferences.

### Core Philosophy:
$$\text{ONE ATTENDEE} \longrightarrow \text{ONEPASS QR TOKEN} \longrightarrow \begin{cases} \text{CHECK-IN (Atomic Track Selection)} \\ \text{GATE ACCESS (Track 1/2/3 Security)} \\ \text{WORKSHOP (Hands-on Labs)} \\ \text{FOOD & MEALS (Breakfast, Lunch, Hi-Tea)} \\ \text{SWAG DISTRIBUTION (Kit claim)} \\ \text{REAL-TIME ANALYTICS & AUDIT TRAIL} \end{cases}$$

---

## 2. Multi-Event Architecture & Total Isolation

OnePass is strictly decoupled from the public website and existing `/admin` routes. It is designed to run indefinitely across years and event types:
- AWS Students Community Day Nadiad 2026
- AWS Students Community Day 2027 / 2028
- Hackathons, Tech Summits, and Hands-on Workshops

Every piece of operational data (attendees, tracks, workshops, food services, swag inventory, access scans, and logs) is strictly scoped by `event_id`.

---

## 3. Concurrency Protection & Race Condition Prevention

OnePass implements an async mutex locking mechanism (`OnePassDB.withLock(key, fn)`) to ensure zero over-allocation:

```
                  Concurrent Scan Attempts (A & B)
                                |
               +----------------+----------------+
               |                                 |
         [Mutex Lock: event_X_checkin]      (Waits in queue)
               |
      Evaluate Current Occupancy:
          occupancy = 150 / 150
               |
         Attempt A: SUCCESS (150/150)
               |
         [Release Mutex Lock]
                                                 |
                                    [Mutex Lock: event_X_checkin]
                                                 |
                                           occupancy >= 150
                                                 |
                                          Attempt B: REJECTED
                                          (Code: "TRACK_FULL")
```

---

## 4. Default Seed & Demo Credentials

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Platform Super Admin** | `admin@onepass.local` | `admin123` | Full access to all events, overrides, and reports |
| **Check-in Volunteer** | `rahul@onepass.local` | `volunteer123` | `CHECK_IN`, `VIEW_DASHBOARD` |
| **Track Marshal** | `amit@onepass.local` | `volunteer123` | `TRACK_ACCESS`, `WORKSHOP_ACCESS` |
| **Food & Swag Lead** | `neha@onepass.local` | `volunteer123` | `FOOD`, `SWAG` |
| **Demo Attendee** | `krish@example.com` | — | QR Token: `DEMO-SCD26-001` (Booking: `DEMO-001`) |

---

## 5. Directory Structure & Key Modules

```
src/
├── app/
│   ├── onepass/
│   │   ├── layout.js                     # Root OnePass Shell (Navy theme)
│   │   ├── page.js                       # Public Launch Hub & Specs
│   │   ├── login/page.js                 # 1-Click Fast Scan Auth
│   │   ├── dashboard/page.js             # Multi-Event Manager & Clone Engine
│   │   ├── settings/page.js              # Concurrency Stress Test Suite
│   │   └── events/[eventId]/
│   │       ├── overview/page.js          # Live Operations Dashboard
│   │       ├── attendees/page.js         # Directory, Profiles & Admin Overrides
│   │       ├── import/page.js            # KonfHub 8-Step Import Wizard
│   │       ├── checkin/page.js           # Atomic Track Check-In Station
│   │       ├── tracks/page.js            # Gate Access Verification (Green/Red)
│   │       ├── workshops/page.js         # Hands-on Lab Entrance Gate
│   │       ├── food/page.js              # Duplicate-Safe Meal Claim Scanner
│   │       ├── swag/page.js              # 1-Click Swag Kit Distribution
│   │       ├── volunteers/page.js        # Granular RBAC Permissions Matrix
│   │       ├── reports/page.js           # 8-in-1 CSV/XLSX Export Center
│   │       └── audit/page.js             # Immutable Operations Audit Ledger
│   └── api/onepass/                      # REST API Endpoints
└── lib/onepass/
    ├── db.js                             # In-memory + JSON persistence engine with Mutexes
    ├── auth.js                           # PBKDF2 Hashing & RBAC Verification
    ├── qr.js                             # Cryptographic QR Generator & Parser
    ├── seed.js                           # 400 Realistic Seed Attendees & SCD 2026
    └── migrations/
        └── 001_onepass_schema.sql        # Production PostgreSQL Schema
```

---

## 6. Color Palette & Visual System

OnePass uses the deep-navy color palette identical to the AWS Community public portal:
- **Background**: `#0C111D` (Deep Navy)
- **Cards & Surfaces**: `#151c2e` (Elevated Container)
- **Borders & Dividers**: `#1a2540`
- **Primary Brand Accent**: `#0073BB` / `#4F8EF7` (AWS Blue)
- **Secondary Accent**: `#FF9900` (AWS Amber)
- **Success State**: `#10B981` (Emerald Green)
- **Error / Denied State**: `#EF4444` (Crimson Red)

---

## 7. Automated Testing & Verification

1. **Visit Hub**: `http://localhost:3000/onepass`
2. **Sign In**: Use 1-click superuser login (`admin@onepass.local`)
3. **Execute Concurrency Stress Test**:
   - Navigate to `/onepass/settings`
   - Set capacity = 1, attempts = 10
   - Click **Execute Concurrency Stress Test**
   - Result: Exactly 1 assigned, 9 rejected with `TRACK_FULL`.
