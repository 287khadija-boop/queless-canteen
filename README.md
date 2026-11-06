# Quesless Campus — Canteen Pre-Order & Peak-Hour Queue Management System
## Malla Reddy Engineering College for Women (MRECW)

An enterprise-grade, queue-free canteen pre-ordering ecosystem engineered specifically for **Malla Reddy Engineering College for Women**, designed to eliminate physical lunch queues, provide deterministic digital token management, real-time kitchen tracking, and intelligent peak-hour capacity control.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+ LTS (Tested on Node.js v24.22.1)
- **npm**: v10+ (Tested on npm v11.19.1)
- **Supabase Account** (or local Supabase CLI instance)

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Copy the sample environment file and configure your keys:
```bash
cp .env.example .env
```
*(On Windows PowerShell: `Copy-Item .env.example .env`)*

Configure your `.env` values:
```env
PORT=3000
NODE_ENV=development
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-public-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-secret-service-role-key
```

### 4. Running the Application
Start the server in development mode (with file watching):
```bash
npm run dev
```

Or run standard production start:
```bash
npm start
```
Access the application at: [http://localhost:3000](http://localhost:3000)

### 5. Running Automated Tests
Run the automated test suite using Node's native test runner:
```bash
npm test
```

---

## 🏛️ System Architecture

### Technology Stack
- **Frontend**: Plain semantic HTML5, modern CSS3 (Custom Properties & Responsive Design System), vanilla JavaScript (ES modules).
- **Backend**: Node.js with Express.js (ES modules).
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & Supabase Auth.
- **Realtime**: Supabase Realtime (PostgreSQL replication).
- **Deployment**: Render (Node.js Express application) + Supabase (Database, Auth, Realtime).

### Key Architectural Characteristics
1. **Single-Service Delivery**: The Express backend serves both static frontend assets (`public/`) and versioned RESTful APIs (`/api/v1/`), eliminating CORS complexity and simplifying deployment on Render.
2. **Authoritative Server Pricing**: Prices, totals, discounts, and inventory balances are calculated strictly on the backend from authoritative database records in integer **paise** (₹1 = 100 paise).
3. **Atomic Token Generation**: Digital tokens are assigned atomically using PostgreSQL sequences/functions to guarantee zero collisions under peak concurrencies.
4. **Least-Privilege Security**: Service role keys are kept strictly on the backend. Browser clients access only public configuration and user-scoped endpoints protected by Supabase JWT and RLS.

---

## 📋 Implementation Roadmap

- [x] **Phase 1: Planning and Scaffolding** (Architecture blueprint, Express server, secure headers, health check endpoint, design system, landing page, auth shells, automated tests).
- [ ] **Phase 2: Database and Authentication** (PostgreSQL migrations, RLS policies, seed data for MRECW canteen, Supabase Auth integration, role verification).
- [ ] **Phase 3: Student Ordering Engine** (Live menu filtering, cart, ASAP & scheduled pickup slots, server-side validation).
- [ ] **Phase 4: Queue & Staff Kitchen Portal** (Atomic token allocation, live kitchen dashboard, status transitions, wait time estimation).
- [ ] **Phase 5: Payments & In-App Notifications** (Counter payment, Sandbox payment adapter, webhooks, order cancellations).
- [ ] **Phase 6: Admin Management & Analytics** (Menu CRUD, inventory movements, staff provisioning, peak-hour analytics, CSV export).
- [ ] **Phase 7: Quality Assurance & Security Hardening** (Concurrency stress tests, IDOR checks, RLS audits).
- [ ] **Phase 8: Production Deployment** (Render setup, Supabase migration verification, deployment smoke tests).
