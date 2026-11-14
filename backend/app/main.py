import csv, io, os, asyncio
from dotenv import load_dotenv

load_dotenv()
from datetime import date, timedelta
from collections import defaultdict
from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from .database import Base, engine, get_db
from .models import User, Transaction, SavingsGoal, Challenge, ChallengeContribution
from .schemas import RegisterIn, LoginIn, TokenOut, TransactionIn, GoalIn, ChallengeIn, ContributionIn, SimulateIn, ChatIn
from .security import hash_password, verify_password, make_token, current_user
from .logic import categorize, txs, totals, forecast, health_score, safe_to_spend, anomalies

Base.metadata.create_all(bind=engine)
app = FastAPI(title="NexWealth API", version="1.0.0", description="Personal finance prototype API")
origin = os.getenv("FRONTEND_ORIGIN", "http://localhost:5174")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin,
        "http://localhost:5174",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/api/health")
def health(): return {"status":"ok", "service":"NexWealth API"}

@app.post("/api/auth/register", response_model=TokenOut)
def register(payload: RegisterIn, db: Session=Depends(get_db)):
    if db.query(User).filter(func.lower(User.email)==payload.email.lower()).first(): raise HTTPException(409,"Email already registered")
    user=User(name=payload.name.strip(), email=payload.email.lower(), password_hash=hash_password(payload.password))
    db.add(user); db.commit(); db.refresh(user)
    return {"access_token":make_token(user.id),"user":{"id":user.id,"name":user.name,"email":user.email}}

@app.post("/api/auth/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session=Depends(get_db)):
    user=db.query(User).filter(func.lower(User.email)==payload.email.lower()).first()
    if not user or not verify_password(payload.password,user.password_hash): raise HTTPException(401,"Incorrect email or password")
    return {"access_token":make_token(user.id),"user":{"id":user.id,"name":user.name,"email":user.email}}

@app.get("/api/auth/me")
def me(user: User=Depends(current_user)): return {"id":user.id,"name":user.name,"email":user.email}

@app.get("/api/transactions")
def list_transactions(user: User=Depends(current_user), db: Session=Depends(get_db), search: str="", category: str="", tx_type: str=""):
    q=db.query(Transaction).filter(Transaction.user_id==user.id)
    if search: q=q.filter(Transaction.description.ilike(f"%{search}%"))
    if category: q=q.filter(Transaction.category==category)
    if tx_type: q=q.filter(Transaction.type==tx_type)
    return [{"id":x.id,"date":x.date.isoformat(),"description":x.description,"category":x.category,"amount":x.amount,"type":x.type} for x in q.order_by(Transaction.date.desc(),Transaction.id.desc()).all()]

@app.post("/api/transactions")
def create_transaction(payload: TransactionIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if payload.type not in ("income","expense"): raise HTTPException(422,"type must be income or expense")
    category=payload.category if payload.category and payload.category!="Auto" else categorize(payload.description)
    item=Transaction(user_id=user.id, date=payload.date, description=payload.description, category=category, amount=payload.amount, type=payload.type)
    db.add(item); db.commit(); db.refresh(item)
    return {"id":item.id,"date":item.date.isoformat(),"description":item.description,"category":item.category,"amount":item.amount,"type":item.type}

@app.delete("/api/transactions/{transaction_id}")
def delete_transaction(transaction_id: int, user: User=Depends(current_user), db: Session=Depends(get_db)):
    item=db.query(Transaction).filter(Transaction.id==transaction_id,Transaction.user_id==user.id).first()
    if not item: raise HTTPException(404,"Transaction not found")
    db.delete(item); db.commit(); return {"deleted":True}

@app.post("/api/transactions/upload")
async def upload_csv(file: UploadFile=File(...), user: User=Depends(current_user), db: Session=Depends(get_db)):
    if not file.filename.lower().endswith(".csv"): raise HTTPException(400,"Please upload a CSV file")
    raw=await file.read()
    if len(raw)>10*1024*1024: raise HTTPException(413,"CSV must be under 10 MB")
    try:
        text=raw.decode("utf-8-sig"); reader=csv.DictReader(io.StringIO(text))
        if not reader.fieldnames: raise ValueError("Missing header row")
        normalized={h.strip().lower():h for h in reader.fieldnames}
        required={"date","description","amount"}
        if not required.issubset(normalized): raise ValueError("Required columns: date, description, amount; optional: category, type")
        imported=0; skipped=0; errors=[]
        for line,row in enumerate(reader,start=2):
            try:
                d=date.fromisoformat(row[normalized["date"]].strip())
                desc=row[normalized["description"]].strip()
                amount=abs(float(row[normalized["amount"]].replace(",","").replace("₹","")))
                if not desc or amount<=0: raise ValueError("description and positive amount are required")
                typ=row.get(normalized.get("type",""),"").strip().lower() if "type" in normalized else ""
                if typ not in ("income","expense"):
                    raw_amount=float(row[normalized["amount"]].replace(",","").replace("₹","")); typ="income" if raw_amount>0 else "expense"
                cat=row.get(normalized.get("category",""),"").strip() if "category" in normalized else ""
                exists=db.query(Transaction).filter(Transaction.user_id==user.id,Transaction.date==d,Transaction.description==desc,Transaction.amount==amount,Transaction.type==typ).first()
                if exists: skipped+=1; continue
                db.add(Transaction(user_id=user.id,date=d,description=desc,amount=amount,type=typ,category=cat or categorize(desc))); imported+=1
            except Exception as exc: errors.append({"line":line,"error":str(exc)})
        db.commit()
        return {"imported":imported,"duplicates_skipped":skipped,"errors":errors[:20]}
    except UnicodeDecodeError: raise HTTPException(400,"CSV must be UTF-8 encoded")
    except ValueError as exc: raise HTTPException(400,str(exc))

@app.get("/api/dashboard")
def dashboard(user: User=Depends(current_user), db: Session=Depends(get_db)):
    items=txs(db,user.id); today=date.today(); month=[x for x in items if x.date.month==today.month and x.date.year==today.year]
    income,expenses=totals(month); all_income,all_expenses=totals(items)
    goals=db.query(SavingsGoal).filter(SavingsGoal.user_id==user.id).all()
    safe=safe_to_spend(items,goals)
    recent=[{"id":x.id,"date":x.date.isoformat(),"description":x.description,"category":x.category,"amount":x.amount,"type":x.type} for x in items[:6]]
    fc,bal,net=forecast(items)
    return {"name":user.name,"balance":round(all_income-all_expenses,2),"monthly_income":round(income,2),"monthly_expenses":round(expenses,2),"safe_to_spend":safe,"health":health_score(items),"forecast":fc,"recent_transactions":recent,"income_this_month":round(income,2),"expenses_this_month":round(expenses,2)}

@app.get("/api/analytics")
def analytics(user: User=Depends(current_user), db: Session=Depends(get_db)):
    items=txs(db,user.id); cats=defaultdict(float); months=defaultdict(lambda:{"income":0.0,"expenses":0.0})
    for x in items:
        if x.type=="expense": cats[x.category]+=x.amount
        key=x.date.strftime("%b %Y"); months[key]["income" if x.type=="income" else "expenses"]+=x.amount
    return {"categories":[{"category":k,"amount":round(v,2)} for k,v in sorted(cats.items(),key=lambda z:-z[1])],"monthly":[{"month":k,**{a:round(b,2) for a,b in v.items()}} for k,v in sorted(months.items())]}

@app.get("/api/forecast")
def get_forecast(days: int=30, user: User=Depends(current_user), db: Session=Depends(get_db)):
    if days not in (7,15,30): raise HTTPException(400,"days must be 7, 15 or 30")
    data,balance,daily=forecast(txs(db,user.id),days)
    return {"current_balance":balance,"estimated_daily_net_change":daily,"forecast":data,"disclaimer":"Forecasts are estimates based on available transaction history, not guaranteed balances or financial advice."}

@app.get("/api/health-score")
def get_health(user: User=Depends(current_user), db: Session=Depends(get_db)): return health_score(txs(db,user.id))

@app.get("/api/alerts")
def get_alerts(user: User=Depends(current_user), db: Session=Depends(get_db)):
    items=txs(db,user.id); alerts=anomalies(items)
    if not alerts: return {"alerts":[],"message":"Add at least five expenses to build a useful spending baseline."}
    return {"alerts":alerts}

@app.get("/api/recommendations")
def recommendations(user: User=Depends(current_user), db: Session=Depends(get_db)):
    items=txs(db,user.id); inc,exp=totals([x for x in items if x.date.month==date.today().month and x.date.year==date.today().year])
    cats=defaultdict(float)
    for x in items:
        if x.type=="expense" and x.date.month==date.today().month: cats[x.category]+=x.amount
    rec=[]
    if inc and exp>inc*.8: rec.append("Your spending is close to your income. Review non-essential expenses before your next payday.")
    if cats: 
        cat=max(cats,key=cats.get); rec.append(f"Your largest tracked spending category this month is {cat}. Consider setting a weekly budget for it.")
    if not rec: rec.append("Add a few transactions to unlock recommendations based on your spending patterns.")
    return {"recommendations":rec}

@app.post("/api/goals")
def create_goal(payload: GoalIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    g=SavingsGoal(user_id=user.id,**payload.model_dump()); db.add(g); db.commit(); db.refresh(g)
    return {"id":g.id,"title":g.title,"target_amount":g.target_amount,"saved_amount":g.saved_amount,"progress":min(100,round(g.saved_amount/g.target_amount*100))}
@app.get("/api/goals")
def get_goals(user: User=Depends(current_user), db: Session=Depends(get_db)):
    return [{"id":g.id,"title":g.title,"target_amount":g.target_amount,"saved_amount":g.saved_amount,"target_date":g.target_date.isoformat() if g.target_date else None,"progress":min(100,round(g.saved_amount/g.target_amount*100))} for g in db.query(SavingsGoal).filter(SavingsGoal.user_id==user.id).all()]

@app.post("/api/challenges")
def create_challenge(payload: ChallengeIn, user: User=Depends(current_user), db: Session=Depends(get_db)):
    c=Challenge(user_id=user.id,**payload.model_dump()); db.add(c); db.commit(); db.refresh(c)
    return {"id":c.id,"title":c.title,"daily_amount":c.daily_amount,"duration_days":c.duration_days,"saved_amount":c.saved_amount,"target_amount":c.daily_amount*c.duration_days}
@app.get("/api/challenges")
def get_challenges(user: User=Depends(current_user), db: Session=Depends(get_db)):
    items=db.query(Challenge).filter(Challenge.user_id==user.id).all()
    return [{"id":c.id,"title":c.title,"daily_amount":c.daily_amount,"duration_days":c.duration_days,"saved_amount":c.saved_amount,"target_amount":c.daily_amount*c.duration_days,"progress":min(100,round(c.saved_amount/(c.daily_amount*c.duration_days)*100)),"active":c.active} for c in items]
@app.post("/api/challenges/{challenge_id}/contributions")
def contribute(challenge_id:int,payload:ContributionIn,user:User=Depends(current_user),db:Session=Depends(get_db)):
    c=db.query(Challenge).filter(Challenge.id==challenge_id,Challenge.user_id==user.id).first()
    if not c: raise HTTPException(404,"Challenge not found")
    db.add(ChallengeContribution(challenge_id=c.id,amount=payload.amount,note=payload.note)); c.saved_amount+=payload.amount; db.commit()
    return {"saved_amount":c.saved_amount,"target_amount":c.daily_amount*c.duration_days,"progress":min(100,round(c.saved_amount/(c.daily_amount*c.duration_days)*100))}

@app.post("/api/simulate")
def simulate(payload:SimulateIn,user:User=Depends(current_user),db:Session=Depends(get_db)):
    items=txs(db,user.id); goals=db.query(SavingsGoal).filter(SavingsGoal.user_id==user.id).all()
    inc,exp=totals(items); current=inc-exp; safe=safe_to_spend(items,goals)
    return {"product_name":payload.product_name,"price":payload.price,"current_balance":round(current,2),"balance_after_purchase":round(current-payload.price,2),"safe_to_spend":safe,"affordable":payload.price<=safe,"message":"This purchase is within your estimated safe-to-spend amount." if payload.price<=safe else "This purchase exceeds your estimated safe-to-spend amount. Consider saving towards it first.","disclaimer":"Estimate only. Check upcoming bills and actual account balances before making a purchase."}


def generate_gemini_response(api_key, model, prompt):
    from google import genai

    client = genai.Client(api_key=api_key)
    interaction = client.interactions.create(
        model=model,
        input=prompt
    )
    return interaction.output_text


@app.post("/api/chat")
async def chat(
    payload: ChatIn,
    user: User = Depends(current_user),
    db: Session = Depends(get_db)
):
    items = txs(db, user.id)

    inc, exp = totals([
        x for x in items
        if x.date.month == date.today().month
        and x.date.year == date.today().year
    ])

    api_key = os.getenv("GEMINI_API_KEY", "")

    if api_key:
        prompt = (
            f"You are NexWealth, a cautious personal budgeting assistant. "
            f"User: {user.name}. "
            f"Current month income: ₹{inc:.2f}. "
            f"Current month expenses: ₹{exp:.2f}. "
            f"Net cash flow: ₹{inc-exp:.2f}. "
            f"Answer simply using only this context. "
            f"Do not claim bank access or provide investment, tax, "
            f"or legal advice. State when data is insufficient. "
            f"Question: {payload.message}"
        )

        model = os.getenv("GEMINI_MODEL", "gemini-3.8-flash")

        try:
            answer = await asyncio.wait_for(
                asyncio.to_thread(
                    generate_gemini_response,
                    api_key,
                    model,
                    prompt
                ),
                timeout=25
            )

            if answer:
                return {
                    "answer": answer,
                    "source": "gemini"
                }

        except asyncio.TimeoutError:
            print("Gemini request timed out")

        except Exception as exc:
            print(f"Gemini API error: {type(exc).__name__}: {exc}")

    q = payload.message.lower()

    if "spend" in q or "expense" in q:
        answer = (
            f"Your recorded income this month is ₹{inc:,.0f} "
            f"and recorded expenses are ₹{exp:,.0f}. "
            f"Your net cash flow is ₹{inc-exp:,.0f}."
        )

    elif "save" in q:
        answer = (
            "Start with a small, repeatable target. "
            "Review your largest spending category and "
            "set a weekly limit you can realistically follow."
        )

    else:
        answer = (
            "I can help review your recorded income, expenses "
            "and savings habits. Add transactions for more "
            "personalised insights. This prototype assistant "
            "is informational, not financial advice."
        )

    return {
        "answer": answer,
        "source": "local-fallback"
    }

@app.post("/api/demo/seed")
def seed_demo(user:User=Depends(current_user),db:Session=Depends(get_db)):
    if db.query(Transaction).filter(Transaction.user_id==user.id).count()>0: return {"seeded":False,"message":"Your account already has transactions."}
    today=date.today(); sample=[(-450,"Lunch with friends","Food", "expense",0),(-1200,"Amazon India","Shopping","expense",1),(-150,"Uber ride","Travel","expense",2),(-600,"Netflix subscription","Entertainment","expense",4),(-1850,"Electricity bill","Bills","expense",6),(30000,"Monthly salary","Income","income",13)]
    for amount,desc,cat,typ,offset in sample:
        db.add(Transaction(user_id=user.id,date=today-timedelta(days=offset),description=desc,category=cat,amount=abs(amount),type=typ))
    db.commit(); return {"seeded":True,"count":len(sample)}
