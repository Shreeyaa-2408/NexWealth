# NexWealth API

## Run locally
1. Create and activate a Python virtual environment.
2. Install dependencies: `pip install -r requirements.txt`
3. Copy `.env.example` to `.env` and set a strong `SECRET_KEY`.
4. Start the API from this `backend` folder: `uvicorn app.main:app --reload`
5. Open API docs at http://localhost:8000/docs

SQLite database is created automatically as `nexwealth.db` in this folder.

## CSV format
Required headers: `date,description,amount`. Optional: `category,type`.
Dates must be `YYYY-MM-DD`. Positive amount plus `type=income` or `type=expense` is preferred. If type is omitted, positive values are treated as income and negative values as expenses.

## Gemini API key (optional)
Put `GEMINI_API_KEY=your_key` in `backend/.env`. The key is read only by the backend `/api/chat` endpoint. Never put a provider key in React code or a `VITE_` variable. Restart the API after changing `.env`.

This is a hackathon MVP, not a production financial service. It does not connect to banks. Forecast and health score calculations are simplified and should be validated before real-world use.
