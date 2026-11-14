# NexWealth — full-stack hackathon MVP

A responsive personal-finance prototype with a React frontend and FastAPI backend. The backend owns the calculations and keeps any Gemini API key server-side.

## Project structure

- `frontend/` — React + Vite UI, charts, pages, API client
- `backend/` — FastAPI, SQLite models, authentication, CSV import, analytics and optional Gemini chat
- `sample_transactions.csv` — example file for the CSV importer

## Requirements
- Python 3.10+
- Node.js 18+
- npm

## 1) Start the backend (Windows PowerShell)

Open a terminal in the `nexwealth` folder:

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
```

Open `backend/.env` and change `SECRET_KEY` to a long random value. Leave `GEMINI_API_KEY` blank initially if you don't want AI chat enabled. Then run:

```powershell
uvicorn app.main:app --reload
```

API docs: http://localhost:8000/docs

## 2) Start the frontend

Open a second terminal in the `nexwealth` folder:

```powershell
cd frontend
npm install
Copy-Item .env.example .env
npm run dev
```

Open http://localhost:5173. Register an account, then use **Load demo data** on the dashboard or upload `sample_transactions.csv` from the Transactions page.

## macOS / Linux quick start

Backend:
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```
Frontend in another terminal:
```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

## API key: where it goes

Only the optional Gemini chat feature needs a provider API key. Create a Gemini API key in [Google AI Studio](https://aistudio.google.com/app/apikey), then paste it into **`backend/.env`**:

```env
GEMINI_API_KEY=your_real_key_here
GEMINI_MODEL=gemini-3.8-flash
```

Restart the backend after editing `.env`. The `/api/chat` route calls Gemini from Python. The React app calls only your own `/api/chat` endpoint. **Never put the Gemini key in `frontend/.env`, React code, a `VITE_...` variable, GitHub, or a screenshot.** If the key is exposed, revoke it and create a new one. Google recommends server-side secret handling and currently recommends the Interactions API for new Gemini projects; this code uses the Google GenAI Python SDK's Interactions API.

Official references:
- https://ai.google.dev/gemini-api/docs/api-key
- https://ai.google.dev/gemini-api/docs/get-started

Without a Gemini key, chat uses a small local fallback so the rest of the prototype still works. No API key is needed for login, transactions, forecasting, categorisation, spending analytics, challenges or purchase simulation.

## Main API routes

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `GET/POST /api/transactions`, `DELETE /api/transactions/{id}`, `POST /api/transactions/upload`
- `GET /api/dashboard`, `GET /api/analytics`, `GET /api/forecast?days=7|15|30`
- `GET /api/health-score`, `GET /api/alerts`, `GET /api/recommendations`
- `GET/POST /api/goals`
- `GET/POST /api/challenges`, `POST /api/challenges/{id}/contributions`
- `POST /api/simulate`, `POST /api/chat`
- `POST /api/demo/seed`

## CSV format

Required columns: `date,description,amount`. Optional: `category,type`. Dates use `YYYY-MM-DD`. The sample file in the project root is ready to upload. Duplicates are skipped.

## Important prototype limitations

- There is no live bank/UPI connection. Users add transactions manually or import CSV.
- Forecasting uses a transparent simple baseline based on recorded net movement; it is not a trained time-series forecasting model and is not guaranteed.
- The Financial Health Score is an illustrative rules-based score, not a credit score or financial assessment.
- Anomaly detection needs at least five expenses and is a simple Isolation Forest baseline.
- The prototype includes basic JWT authentication and password hashing. Before public deployment, add HTTPS, stronger secret management, rate limiting, password reset, audit logging, database backups, tests, and security review.
- Demo figures in the Figma reference are illustrative. Real dashboard totals come from the signed-in user's transactions.
