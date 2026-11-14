from datetime import date, timedelta
from collections import defaultdict
import numpy as np
from sklearn.ensemble import IsolationForest
from sqlalchemy.orm import Session
from .models import Transaction, SavingsGoal

KEYWORDS = {
 "Food": ["food", "restaurant", "lunch", "dinner", "cafe", "bowl", "swiggy", "zomato"],
 "Travel": ["uber", "ola", "ride", "metro", "bus", "train", "fuel"],
 "Shopping": ["amazon", "flipkart", "shopping", "store", "headphone", "clothes"],
 "Bills": ["electricity", "internet", "rent", "water", "bill", "bescom"],
 "Entertainment": ["netflix", "spotify", "movie", "game", "subscription"]
}
def categorize(description: str) -> str:
    text = description.lower()
    for category, words in KEYWORDS.items():
        if any(w in text for w in words): return category
    return "Other"
def txs(db: Session, user_id: int):
    return db.query(Transaction).filter(Transaction.user_id == user_id).order_by(Transaction.date.desc(), Transaction.id.desc()).all()
def totals(items):
    income = sum(x.amount for x in items if x.type == "income")
    expenses = sum(x.amount for x in items if x.type == "expense")
    return income, expenses


def forecast(items, days=30):
    today = date.today()
    start = today - timedelta(days=29)

    # Use transactions from the last 30 days
    history = [
        x for x in items
        if start <= x.date <= today
    ]

    income, expenses = totals(history)

    # Current net balance for the forecasting period
    balance = income - expenses

    # Average daily income and expenses
    daily_income = income / 30 if history else 0
    daily_expenses = expenses / 30 if history else 0

    daily_net = daily_income - daily_expenses

    result = []
    running = balance

    for i in range(1, days + 1):
        running += daily_net

        result.append({
            "date": (today + timedelta(days=i)).isoformat(),
            "predicted_balance": round(running, 2),
            "estimated_income": round(daily_income, 2),
            "estimated_expenses": round(daily_expenses, 2)
        })

    return result, round(balance, 2), round(daily_net, 2)


def health_score(items):
    income, expense = totals([x for x in items if x.date.month == date.today().month and x.date.year == date.today().year])
    savings_rate = max(0, min(1, (income-expense)/income)) if income else 0
    # Simple explainable MVP score, not a credit score.
    score = round(40 + savings_rate*40 + (10 if income > 0 else 0) + (10 if len(items) >= 5 else 0))
    score = max(0, min(100, score))
    return {"score": score, "label": "Good Financial Health" if score >= 75 else "Building healthy habits" if score >= 50 else "Room to improve", "breakdown": {"savings_habit": round(savings_rate*100), "spending_pattern": 75 if income and expense <= income else 40, "bill_management": 70, "emergency_savings": 50}, "explanation": "This prototype score is based on current-month savings rate, income availability and transaction history. It is an educational indicator, not a credit score."}

def safe_to_spend(items, goals, reserve_buffer=0):
    income, expenses = totals(items)
    current_net = income-expenses
    upcoming_goal_reserve = sum(max(0, g.target_amount-g.saved_amount) for g in goals)
    # Conservative heuristic: don't treat all historical net cash as available.
    return round(max(0, current_net - upcoming_goal_reserve - reserve_buffer),2)

def anomalies(items):
    expenses=[x for x in items if x.type=="expense"]
    if len(expenses)<5: return []
    values=np.array([[x.amount] for x in expenses])
    model=IsolationForest(contamination=0.15, random_state=42)
    labels=model.fit_predict(values)
    return [{"id":x.id,"description":x.description,"category":x.category,"amount":x.amount,"date":x.date.isoformat(),"message":"This expense is higher or less typical than your recent transactions."} for x,label in zip(expenses,labels) if label==-1]
