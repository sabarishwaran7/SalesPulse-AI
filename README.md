# SalesPulse AI

## Self-Correcting Sales Call & Meeting Intelligence Platform

**SalesPulse AI** is a production-grade sales conversation intelligence platform designed for sales managers, revenue operations, and executive leadership. It provides deep visibility into sales calls and meetings, detects incomplete records, flags uncertain AI classifications for human sign-off, safely previews incoming datasets via field-level diffs, and guarantees data integrity.

---

## 🌟 Core Differentiating Features

### 1. Smart Import Diff
*Before* writing any uploaded CSV or Excel record to the PostgreSQL database, SalesPulse AI performs a complete differential analysis:
- **Record Categorization**: Distinguishes **New**, **Updated**, **Unchanged**, **Duplicate Rows within File**, **Conflicts**, and **Invalid Rows**.
- **Field-Level Diff Inspector**: Displays exact side-by-side comparisons of changed fields (`Old Value` vs `Proposed New Value`).
- **Conflict Resolution**: Flagged conflicts (e.g. date discrepancies > 7 days, manual correction collisions, or transcript truncations) can be reviewed individually with options to *Keep Existing* or *Overwrite*.
- **Transactional Commit & Rollback**: Safe database writes wrapped in transactions with audit events.
- **Exportable Validation Logs**: Row-level errors can be exported directly as CSV or Excel.

### 2. Conversation Completeness Score
A transparent, explainable scoring engine evaluated on every conversation:
- **Valid Identity (25%)**: Valid external Call ID, customer name, sales representative, and timestamp.
- **Call Transcript (25%)**: Ingested transcript (non-empty &ge; 20 characters) with status `completed`.
- **Purpose Classification (20%)**: At least one active purpose tag.
- **AI Executive Summary (20%)**: Generated intelligence summary and structured extracts.
- **Follow-up Status (10%)**: Explicit follow-up state assigned (`Pending`, `Overdue`, `Completed`).
- **Late Transcript Pipeline**: Calls imported without transcripts enter the `Pending Transcripts` queue with an incomplete score. When transcripts arrive later, existing records update smoothly without duplication, triggering Groq AI analysis and recalculating completeness.

### 3. Self-Correcting AI Review Center
- **Groq AI Integration**: Employs `llama-3.3-70b-versatile` (or `mixtral-8x7b-32768`) with structured JSON schema enforcement.
- **Multi-Purpose Classification**: Detects multiple purposes per conversation (*Sales*, *Product Demo*, *Pricing*, *Negotiation*, *Customer Support*, *Objection Handling*, *Follow-up*, *Renewal*).
- **Supporting Evidence Snippets**: Extracts verbatim quotes proving why each label was assigned.
- **Human Review Routing**: Predictions with confidence below the configurable threshold (default `0.75`) or conflicting purposes are routed to the Review Center.
- **Side-by-Side Audit Workspace**: Sales managers can approve predictions, add missing labels, remove incorrect labels, and edit summaries.
- **Immutable Audit Trail**: Preserves original model predictions alongside manager corrections and timestamps. Corrections do not pretend to retrain the model on-the-fly; they serve as a compliant audit log and evaluation dataset.

---

## 🏗️ Architecture & Tech Stack

```
salespulse-ai/
├── backend/
│   ├── app/
│   │   ├── api/v1/         # REST API endpoints (Analytics, Conversations, Imports, AI Review, Actions, Reports, Settings)
│   │   ├── core/           # Configuration, Database engine, and settings
│   │   ├── models/         # SQLAlchemy models (Conversations, Purposes, AIAnalyses, ImportJobs, AuditEvents)
│   │   ├── schemas/        # Pydantic schemas and validation models
│   │   ├── services/       # Smart Import diff engine, Groq AI, Completeness, Action recommendations, Exports
│   │   └── utils/          # Date parsers, text hashers, diff engine
│   ├── alembic/            # Database schema migration versions
│   ├── tests/              # Pytest automated test suite (12 passing tests)
│   └── requirements.txt    # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/     # Reusable UI widgets (KpiCard, CompletenessBadge, StatusBadge, Sidebar, Navbar)
│   │   ├── pages/          # 9 SaaS pages (Dashboard, Conversations, Details, Import, AI Review, Actions, Reports, History, Settings)
│   │   ├── services/       # Typed API client
│   │   └── types/          # TypeScript interfaces
│   ├── package.json        # Frontend dependencies (React, Vite, Tailwind CSS, Recharts, Lucide)
│   └── tailwind.config.js  # Styling tokens
├── salespulse_api_collection.json # Postman API collection
├── render.yaml             # Render backend deployment config
├── pytest.ini              # Pytest configuration
├── .env.example            # Environment variables template
└── README.md
```

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite, TypeScript, Tailwind CSS, Recharts, Lucide Icons, React Router 7 |
| **Backend** | Python 3.13, FastAPI, Pydantic v2, SQLAlchemy 2, Alembic, Pandas, OpenPyXL |
| **Database** | PostgreSQL on Supabase (with automatic SQLite fallback for local development) |
| **AI Engine** | Groq Cloud API (`llama-3.3-70b-versatile`) with heuristic offline fallback |
| **Testing** | Pytest, FastAPI TestClient, in-memory SQLite isolation |

---

## 🚀 Quick Start Guide

### 1. Prerequisites
- **Python 3.10+** (tested on 3.13)
- **Node.js 18+** & **npm**

### 2. Backend Setup
```bash
# 1. Navigate to project root
cd "sales project"

# 2. Activate virtual environment
# Windows:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

# 3. Install backend dependencies
pip install -r backend/requirements.txt

# 4. Run database migrations
alembic upgrade head

# 5. Start FastAPI development server
uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation (Swagger UI): `http://127.0.0.1:8000/docs`

### 3. Frontend Setup
```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install dependencies
npm install

# 3. Start Vite dev server
npm run dev
```
Open browser at: `http://127.0.0.1:5173/`

### 4. Seed Demonstration Data
On initial launch, the system automatically seeds sample calls. You can also trigger a re-seed at any time:
- Via UI: Click the **"Reset Sample Data"** button in the top navigation bar.
- Via API: `POST http://127.0.0.1:8000/api/v1/settings/seed-sample-data`

---

## 🧪 Automated Testing

SalesPulse AI includes a comprehensive automated test suite testing all critical business logic:
- New conversation imports & duplicate detection inside files
- Repeated identical imports (idempotency, 0 duplicate records created)
- Field-level diff calculation on existing record updates
- Safe transaction rollback on import cancellation
- Late transcript arrival workflow (updates existing record, triggers AI, recalculates completeness)
- Groq AI structured outputs with multiple purposes
- AI review queue & manager approvals
- Label corrections with before/after state audit persistence
- Dashboard KPI metrics agreement with database records
- CSV and Excel report exports

To execute the test suite:
```bash
.\venv\Scripts\pytest.exe -v
```
**Result: 12 passed in 1.07s.**

---

## 🌐 Production Deployment

### 1. Database (Supabase PostgreSQL)
1. Create a project at [supabase.com](https://supabase.com).
2. Navigate to **Project Settings** &rarr; **Database** &rarr; **Connection string** (URI).
3. Copy the pooled connection string:
   ```
   postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
4. Set `DATABASE_URL` in your backend environment variables.
5. Run migrations: `alembic upgrade head`.

### 2. Backend (Render)
1. Create a new Web Service on [Render](https://render.com).
2. Connect your Git repository.
3. Configure the service:
   - **Environment**: `Python`
   - **Build Command**: `pip install -r backend/requirements.txt && alembic upgrade head`
   - **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
4. Set Environment Variables:
   - `DATABASE_URL`: Your Supabase connection string.
   - `GROQ_API_KEY`: Your Groq API key (`gsk_...`).
   - `GROQ_MODEL`: `llama-3.3-70b-versatile`
   - `CONFIDENCE_THRESHOLD`: `0.75`

### 3. Frontend (Vercel)
1. Import the repository into [Vercel](https://vercel.com).
2. Set **Root Directory** to `frontend`.
3. Set **Framework Preset** to `Vite`.
4. Environment Variables:
   - `VITE_API_BASE_URL`: `https://your-render-backend.onrender.com/api/v1`
5. Deploy.

---

## 📑 Postman API Collection

A complete Postman collection is included in [`salespulse_api_collection.json`](./salespulse_api_collection.json).
Import this file into Postman or Insomnia to test:
- Health check & Analytics endpoints
- Conversations pagination & filtering
- Late transcript upload
- Smart Import preview and commit
- AI review approvals and corrections
- Action item status updates
- CSV/Excel report generation

---

## 🔒 Security Best Practices
- **Credentials Protection**: All API keys and secrets reside strictly in backend environment variables.
- **Untrusted Input Sanitation**: Transcripts are treated as untrusted text to prevent prompt injection overrides.
- **CORS Protection**: Restricted to authorized origins.
- **SQL Injection Prevention**: SQLAlchemy parameterized ORM queries across all endpoints.
- **Upload Restrictions**: Configurable upload file size limit (default 25MB) and mime-type enforcement.

---

## 📄 License
MIT License. Built for enterprise sales performance and continuous intelligence.
