from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import bcrypt
import jwt
from io import BytesIO
from fastapi.responses import StreamingResponse
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Secret
JWT_SECRET = os.environ.get('JWT_SECRET', 'budget-planner-secret-key-2024')
JWT_ALGORITHM = 'HS256'

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class UserRegister(BaseModel):
    email: str
    password: str
    name: str

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    is_pro: bool = False
    pin: Optional[str] = None

class TokenResponse(BaseModel):
    token: str
    user: UserResponse

class PinUpdate(BaseModel):
    pin: str

class TransactionCreate(BaseModel):
    type: str  # 'income' or 'expense'
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    notes: Optional[str] = None

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    notes: Optional[str] = None

class TransactionResponse(BaseModel):
    id: str
    user_id: str
    type: str
    amount: float
    category: str
    description: Optional[str] = None
    date: str
    notes: Optional[str] = None
    created_at: str

class BudgetCreate(BaseModel):
    category: str
    amount: float
    month: str  # Format: YYYY-MM

class BudgetUpdate(BaseModel):
    amount: Optional[float] = None
    month: Optional[str] = None

class BudgetResponse(BaseModel):
    id: str
    user_id: str
    category: str
    amount: float
    month: str
    spent: float = 0

class CategoryCreate(BaseModel):
    name: str
    color: str
    icon: str

class CategoryResponse(BaseModel):
    id: str
    user_id: str
    name: str
    color: str
    icon: str
    is_default: bool = False

class AIInsightRequest(BaseModel):
    months: int = 3

class AIInsightResponse(BaseModel):
    insights: str
    spending_patterns: List[Dict[str, Any]]
    savings_suggestions: List[str]
    budget_recommendations: List[Dict[str, Any]]
    predicted_expenses: Dict[str, float]
    health_score: int
    auto_categories: Optional[Dict[str, str]] = None

class CheckoutRequest(BaseModel):
    origin_url: str

class CheckoutResponse(BaseModel):
    url: str
    session_id: str

# ==================== AUTH HELPERS ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

def create_token(user_id: str, email: str) -> str:
    payload = {
        'user_id': user_id,
        'email': email,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(request: Request) -> dict:
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail='Missing or invalid token')
    
    token = auth_header.split(' ')[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({'id': payload['user_id']}, {'_id': 0})
        if not user:
            raise HTTPException(status_code=401, detail='User not found')
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail='Token expired')
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail='Invalid token')

# ==================== DEFAULT CATEGORIES ====================

DEFAULT_CATEGORIES = [
    {'name': 'Food', 'color': '#ef4444', 'icon': 'utensils'},
    {'name': 'Rent', 'color': '#3b82f6', 'icon': 'home'},
    {'name': 'Utilities', 'color': '#f59e0b', 'icon': 'zap'},
    {'name': 'Transportation', 'color': '#8b5cf6', 'icon': 'car'},
    {'name': 'Entertainment', 'color': '#ec4899', 'icon': 'film'},
    {'name': 'Shopping', 'color': '#10b981', 'icon': 'shopping-bag'},
    {'name': 'Health', 'color': '#06b6d4', 'icon': 'heart'},
    {'name': 'Other', 'color': '#6b7280', 'icon': 'more-horizontal'},
    {'name': 'Salary', 'color': '#22c55e', 'icon': 'briefcase'},
    {'name': 'Freelance', 'color': '#14b8a6', 'icon': 'laptop'},
    {'name': 'Investment', 'color': '#f97316', 'icon': 'trending-up'},
]

# ==================== AUTH ROUTES ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(data: UserRegister):
    existing = await db.users.find_one({'email': data.email})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    user_id = str(uuid.uuid4())
    user = {
        'id': user_id,
        'email': data.email,
        'password': hash_password(data.password),
        'name': data.name,
        'is_pro': False,
        'pin': None,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user)
    
    # Create default categories for user
    for cat in DEFAULT_CATEGORIES:
        await db.categories.insert_one({
            'id': str(uuid.uuid4()),
            'user_id': user_id,
            'name': cat['name'],
            'color': cat['color'],
            'icon': cat['icon'],
            'is_default': True
        })
    
    token = create_token(user_id, data.email)
    return TokenResponse(
        token=token,
        user=UserResponse(id=user_id, email=data.email, name=data.name, is_pro=False)
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: UserLogin):
    user = await db.users.find_one({'email': data.email}, {'_id': 0})
    if not user or not verify_password(data.password, user['password']):
        raise HTTPException(status_code=401, detail='Invalid credentials')
    
    token = create_token(user['id'], data.email)
    return TokenResponse(
        token=token,
        user=UserResponse(
            id=user['id'],
            email=user['email'],
            name=user['name'],
            is_pro=user.get('is_pro', False),
            pin=user.get('pin')
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(user: dict = Depends(get_current_user)):
    return UserResponse(
        id=user['id'],
        email=user['email'],
        name=user['name'],
        is_pro=user.get('is_pro', False),
        pin=user.get('pin')
    )

@api_router.post("/auth/forgot-password")
async def forgot_password(email: str):
    user = await db.users.find_one({'email': email})
    if not user:
        return {'message': 'If email exists, reset link sent'}
    # In production, send email with reset link
    return {'message': 'If email exists, reset link sent'}

@api_router.put("/auth/pin")
async def update_pin(data: PinUpdate, user: dict = Depends(get_current_user)):
    await db.users.update_one({'id': user['id']}, {'$set': {'pin': data.pin}})
    return {'message': 'PIN updated successfully'}

@api_router.post("/auth/verify-pin")
async def verify_pin(data: PinUpdate, user: dict = Depends(get_current_user)):
    if user.get('pin') != data.pin:
        raise HTTPException(status_code=401, detail='Invalid PIN')
    return {'message': 'PIN verified'}

# ==================== TRANSACTION ROUTES ====================

@api_router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(data: TransactionCreate, user: dict = Depends(get_current_user)):
    transaction_id = str(uuid.uuid4())
    transaction = {
        'id': transaction_id,
        'user_id': user['id'],
        'type': data.type,
        'amount': data.amount,
        'category': data.category,
        'description': data.description,
        'date': data.date,
        'notes': data.notes,
        'created_at': datetime.now(timezone.utc).isoformat()
    }
    await db.transactions.insert_one(transaction)
    return TransactionResponse(**transaction)

@api_router.get("/transactions", response_model=List[TransactionResponse])
async def get_transactions(
    month: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    sort_by: Optional[str] = 'date',
    sort_order: Optional[str] = 'desc',
    user: dict = Depends(get_current_user)
):
    query = {'user_id': user['id']}
    
    if month:
        query['date'] = {'$regex': f'^{month}'}
    if type:
        query['type'] = type
    if category:
        query['category'] = category
    if search:
        query['$or'] = [
            {'description': {'$regex': search, '$options': 'i'}},
            {'notes': {'$regex': search, '$options': 'i'}},
            {'category': {'$regex': search, '$options': 'i'}}
        ]
    
    sort_dir = -1 if sort_order == 'desc' else 1
    transactions = await db.transactions.find(query, {'_id': 0}).sort(sort_by, sort_dir).to_list(1000)
    return [TransactionResponse(**t) for t in transactions]

@api_router.get("/transactions/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    transaction = await db.transactions.find_one(
        {'id': transaction_id, 'user_id': user['id']}, {'_id': 0}
    )
    if not transaction:
        raise HTTPException(status_code=404, detail='Transaction not found')
    return TransactionResponse(**transaction)

@api_router.put("/transactions/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: str,
    data: TransactionUpdate,
    user: dict = Depends(get_current_user)
):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail='No data to update')
    
    result = await db.transactions.update_one(
        {'id': transaction_id, 'user_id': user['id']},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Transaction not found')
    
    transaction = await db.transactions.find_one(
        {'id': transaction_id}, {'_id': 0}
    )
    return TransactionResponse(**transaction)

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, user: dict = Depends(get_current_user)):
    result = await db.transactions.delete_one({'id': transaction_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Transaction not found')
    return {'message': 'Transaction deleted'}

# ==================== BUDGET ROUTES ====================

@api_router.post("/budgets", response_model=BudgetResponse)
async def create_budget(data: BudgetCreate, user: dict = Depends(get_current_user)):
    # Check if budget exists for this category/month
    existing = await db.budgets.find_one({
        'user_id': user['id'],
        'category': data.category,
        'month': data.month
    })
    if existing:
        raise HTTPException(status_code=400, detail='Budget already exists for this category/month')
    
    budget_id = str(uuid.uuid4())
    budget = {
        'id': budget_id,
        'user_id': user['id'],
        'category': data.category,
        'amount': data.amount,
        'month': data.month
    }
    await db.budgets.insert_one(budget)
    return BudgetResponse(**budget, spent=0)

@api_router.get("/budgets", response_model=List[BudgetResponse])
async def get_budgets(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {'user_id': user['id']}
    if month:
        query['month'] = month
    
    budgets = await db.budgets.find(query, {'_id': 0}).to_list(100)
    
    # Calculate spent for each budget
    result = []
    for budget in budgets:
        spent = await calculate_spent(user['id'], budget['category'], budget['month'])
        result.append(BudgetResponse(**budget, spent=spent))
    
    return result

async def calculate_spent(user_id: str, category: str, month: str) -> float:
    pipeline = [
        {'$match': {
            'user_id': user_id,
            'category': category,
            'type': 'expense',
            'date': {'$regex': f'^{month}'}
        }},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    result = await db.transactions.aggregate(pipeline).to_list(1)
    return result[0]['total'] if result else 0

@api_router.put("/budgets/{budget_id}", response_model=BudgetResponse)
async def update_budget(budget_id: str, data: BudgetUpdate, user: dict = Depends(get_current_user)):
    update_data = {k: v for k, v in data.model_dump().items() if v is not None}
    if not update_data:
        raise HTTPException(status_code=400, detail='No data to update')
    
    result = await db.budgets.update_one(
        {'id': budget_id, 'user_id': user['id']},
        {'$set': update_data}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Budget not found')
    
    budget = await db.budgets.find_one({'id': budget_id}, {'_id': 0})
    spent = await calculate_spent(user['id'], budget['category'], budget['month'])
    return BudgetResponse(**budget, spent=spent)

@api_router.delete("/budgets/{budget_id}")
async def delete_budget(budget_id: str, user: dict = Depends(get_current_user)):
    result = await db.budgets.delete_one({'id': budget_id, 'user_id': user['id']})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Budget not found')
    return {'message': 'Budget deleted'}

# ==================== CATEGORY ROUTES ====================

@api_router.post("/categories", response_model=CategoryResponse)
async def create_category(data: CategoryCreate, user: dict = Depends(get_current_user)):
    category_id = str(uuid.uuid4())
    category = {
        'id': category_id,
        'user_id': user['id'],
        'name': data.name,
        'color': data.color,
        'icon': data.icon,
        'is_default': False
    }
    await db.categories.insert_one(category)
    return CategoryResponse(**category)

@api_router.get("/categories", response_model=List[CategoryResponse])
async def get_categories(user: dict = Depends(get_current_user)):
    categories = await db.categories.find({'user_id': user['id']}, {'_id': 0}).to_list(100)
    return [CategoryResponse(**c) for c in categories]

@api_router.put("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(category_id: str, data: CategoryCreate, user: dict = Depends(get_current_user)):
    result = await db.categories.update_one(
        {'id': category_id, 'user_id': user['id'], 'is_default': False},
        {'$set': {'name': data.name, 'color': data.color, 'icon': data.icon}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Category not found or is default')
    
    category = await db.categories.find_one({'id': category_id}, {'_id': 0})
    return CategoryResponse(**category)

@api_router.delete("/categories/{category_id}")
async def delete_category(category_id: str, user: dict = Depends(get_current_user)):
    result = await db.categories.delete_one({
        'id': category_id,
        'user_id': user['id'],
        'is_default': False
    })
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Category not found or is default')
    return {'message': 'Category deleted'}

# ==================== DASHBOARD/ANALYTICS ROUTES ====================

@api_router.get("/dashboard")
async def get_dashboard(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not month:
        month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    # Get totals
    income_pipeline = [
        {'$match': {'user_id': user['id'], 'type': 'income', 'date': {'$regex': f'^{month}'}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    expense_pipeline = [
        {'$match': {'user_id': user['id'], 'type': 'expense', 'date': {'$regex': f'^{month}'}}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    
    income_result = await db.transactions.aggregate(income_pipeline).to_list(1)
    expense_result = await db.transactions.aggregate(expense_pipeline).to_list(1)
    
    total_income = income_result[0]['total'] if income_result else 0
    total_expenses = expense_result[0]['total'] if expense_result else 0
    
    # Get total budget for month
    budget_pipeline = [
        {'$match': {'user_id': user['id'], 'month': month}},
        {'$group': {'_id': None, 'total': {'$sum': '$amount'}}}
    ]
    budget_result = await db.budgets.aggregate(budget_pipeline).to_list(1)
    total_budget = budget_result[0]['total'] if budget_result else 0
    
    # Recent transactions
    recent = await db.transactions.find(
        {'user_id': user['id']}, {'_id': 0}
    ).sort('date', -1).limit(5).to_list(5)
    
    return {
        'total_income': total_income,
        'total_expenses': total_expenses,
        'balance': total_income - total_expenses,
        'total_budget': total_budget,
        'remaining_budget': total_budget - total_expenses if total_budget > 0 else 0,
        'budget_used_percent': (total_expenses / total_budget * 100) if total_budget > 0 else 0,
        'recent_transactions': recent,
        'month': month
    }

@api_router.get("/analytics")
async def get_analytics(
    start_month: Optional[str] = None,
    end_month: Optional[str] = None,
    user: dict = Depends(get_current_user)
):
    if not start_month:
        start_month = (datetime.now(timezone.utc) - timedelta(days=180)).strftime('%Y-%m')
    if not end_month:
        end_month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    # Category breakdown
    category_pipeline = [
        {'$match': {
            'user_id': user['id'],
            'type': 'expense',
            'date': {'$gte': f'{start_month}-01', '$lte': f'{end_month}-31'}
        }},
        {'$group': {'_id': '$category', 'total': {'$sum': '$amount'}}},
        {'$sort': {'total': -1}}
    ]
    category_data = await db.transactions.aggregate(category_pipeline).to_list(20)
    
    # Monthly trend
    monthly_pipeline = [
        {'$match': {
            'user_id': user['id'],
            'date': {'$gte': f'{start_month}-01', '$lte': f'{end_month}-31'}
        }},
        {'$addFields': {'month': {'$substr': ['$date', 0, 7]}}},
        {'$group': {
            '_id': {'month': '$month', 'type': '$type'},
            'total': {'$sum': '$amount'}
        }},
        {'$sort': {'_id.month': 1}}
    ]
    monthly_data = await db.transactions.aggregate(monthly_pipeline).to_list(100)
    
    # Process monthly data
    months_dict = {}
    for item in monthly_data:
        month = item['_id']['month']
        type_ = item['_id']['type']
        if month not in months_dict:
            months_dict[month] = {'month': month, 'income': 0, 'expense': 0}
        months_dict[month][type_] = item['total']
    
    monthly_trend = sorted(months_dict.values(), key=lambda x: x['month'])
    
    return {
        'category_breakdown': [{'category': c['_id'], 'amount': c['total']} for c in category_data],
        'monthly_trend': monthly_trend,
        'start_month': start_month,
        'end_month': end_month
    }

# ==================== AI INSIGHTS ROUTES (PRO FEATURE) ====================

@api_router.post("/ai/insights", response_model=AIInsightResponse)
async def get_ai_insights(data: AIInsightRequest, user: dict = Depends(get_current_user)):
    if not user.get('is_pro', False):
        raise HTTPException(status_code=403, detail='Pro subscription required')
    
    # Get transactions from last N months
    start_date = (datetime.now(timezone.utc) - timedelta(days=data.months * 30)).strftime('%Y-%m-%d')
    transactions = await db.transactions.find({
        'user_id': user['id'],
        'date': {'$gte': start_date}
    }, {'_id': 0}).to_list(1000)
    
    if not transactions:
        return AIInsightResponse(
            insights="No transaction data available for analysis.",
            spending_patterns=[],
            savings_suggestions=["Start tracking your expenses to get personalized insights!"],
            budget_recommendations=[],
            predicted_expenses={},
            health_score=50
        )
    
    # Calculate spending by category
    category_totals = {}
    monthly_totals = {}
    for t in transactions:
        if t['type'] == 'expense':
            cat = t['category']
            month = t['date'][:7]
            category_totals[cat] = category_totals.get(cat, 0) + t['amount']
            if month not in monthly_totals:
                monthly_totals[month] = {'income': 0, 'expense': 0}
            monthly_totals[month]['expense'] += t['amount']
        else:
            month = t['date'][:7]
            if month not in monthly_totals:
                monthly_totals[month] = {'income': 0, 'expense': 0}
            monthly_totals[month]['income'] += t['amount']
    
    total_expenses = sum(category_totals.values())
    total_income = sum(m['income'] for m in monthly_totals.values())
    
    # Generate AI insights using OpenAI
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"budget-{user['id']}-{datetime.now().timestamp()}",
            system_message="You are a financial advisor AI. Analyze spending data and provide actionable insights. Be concise and specific."
        ).with_model("openai", "gpt-5.2")
        
        prompt = f"""Analyze this financial data:
        
Total Income (last {data.months} months): ${total_income:.2f}
Total Expenses: ${total_expenses:.2f}
Savings Rate: {((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0:.1f}%

Spending by Category:
{chr(10).join([f"- {cat}: ${amt:.2f} ({amt/total_expenses*100:.1f}%)" for cat, amt in sorted(category_totals.items(), key=lambda x: -x[1])])}

Provide:
1. Brief overall assessment (2-3 sentences)
2. Top 3 savings suggestions
3. Budget recommendations

Format your response as:
ASSESSMENT: [your assessment]
SAVINGS:
- [suggestion 1]
- [suggestion 2]
- [suggestion 3]
RECOMMENDATIONS:
- [recommendation 1]
- [recommendation 2]"""

        response = await chat.send_message(UserMessage(text=prompt))
        
        # Parse AI response
        insights = response
        savings_suggestions = []
        budget_recommendations = []
        
        if "SAVINGS:" in response:
            parts = response.split("SAVINGS:")
            if len(parts) > 1:
                savings_part = parts[1].split("RECOMMENDATIONS:")[0] if "RECOMMENDATIONS:" in parts[1] else parts[1]
                savings_suggestions = [s.strip().lstrip('- ') for s in savings_part.strip().split('\n') if s.strip() and s.strip() != '-'][:3]
        
        if "ASSESSMENT:" in response:
            insights = response.split("ASSESSMENT:")[1].split("SAVINGS:")[0].strip()
        
    except Exception as e:
        logger.error(f"AI error: {e}")
        insights = f"Based on your spending data, you've spent ${total_expenses:.2f} across {len(category_totals)} categories."
        savings_suggestions = [
            "Consider reducing spending in your highest expense category",
            "Set up automatic savings transfers",
            "Review subscription services for unused memberships"
        ]
    
    # Calculate spending patterns
    spending_patterns = [
        {'category': cat, 'amount': amt, 'percentage': amt/total_expenses*100 if total_expenses > 0 else 0}
        for cat, amt in sorted(category_totals.items(), key=lambda x: -x[1])[:5]
    ]
    
    # Simple prediction (average of last 3 months)
    monthly_expenses = [m['expense'] for m in monthly_totals.values()]
    avg_expense = sum(monthly_expenses) / len(monthly_expenses) if monthly_expenses else 0
    
    predicted_expenses = {}
    for cat, amt in category_totals.items():
        predicted_expenses[cat] = (amt / data.months) * 1.05  # 5% increase prediction
    
    # Calculate health score
    savings_rate = ((total_income - total_expenses) / total_income * 100) if total_income > 0 else 0
    health_score = min(100, max(0, int(50 + savings_rate)))
    
    return AIInsightResponse(
        insights=insights,
        spending_patterns=spending_patterns,
        savings_suggestions=savings_suggestions[:3] if savings_suggestions else ["Track more expenses for personalized suggestions"],
        budget_recommendations=[
            {'category': cat, 'suggested_budget': amt * 0.9}
            for cat, amt in list(category_totals.items())[:3]
        ],
        predicted_expenses=predicted_expenses,
        health_score=health_score
    )

@api_router.post("/ai/categorize")
async def auto_categorize(description: str, user: dict = Depends(get_current_user)):
    if not user.get('is_pro', False):
        raise HTTPException(status_code=403, detail='Pro subscription required')
    
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
        
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        chat = LlmChat(
            api_key=api_key,
            session_id=f"categorize-{user['id']}-{datetime.now().timestamp()}",
            system_message="You are a transaction categorizer. Given a transaction description, return ONLY the category name from: Food, Rent, Utilities, Transportation, Entertainment, Shopping, Health, Salary, Freelance, Investment, Other"
        ).with_model("openai", "gpt-5.2")
        
        response = await chat.send_message(UserMessage(text=f"Categorize this transaction: {description}"))
        
        # Clean response
        category = response.strip().title()
        valid_categories = ['Food', 'Rent', 'Utilities', 'Transportation', 'Entertainment', 'Shopping', 'Health', 'Salary', 'Freelance', 'Investment', 'Other']
        
        if category not in valid_categories:
            category = 'Other'
        
        return {'category': category}
    except Exception as e:
        logger.error(f"Categorization error: {e}")
        return {'category': 'Other'}

@api_router.get("/ai/report/pdf")
async def generate_pdf_report(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    if not user.get('is_pro', False):
        raise HTTPException(status_code=403, detail='Pro subscription required')
    
    if not month:
        month = datetime.now(timezone.utc).strftime('%Y-%m')
    
    # Get data
    dashboard_data = await get_dashboard(month, user)
    
    # Create PDF
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Header
    p.setFont("Helvetica-Bold", 24)
    p.setFillColor(colors.HexColor('#1E3A8A'))
    p.drawString(1*inch, height - 1*inch, "Budget Planner Report")
    
    p.setFont("Helvetica", 12)
    p.setFillColor(colors.black)
    p.drawString(1*inch, height - 1.4*inch, f"Month: {month}")
    p.drawString(1*inch, height - 1.6*inch, f"Generated for: {user['name']}")
    
    # Summary Box
    y = height - 2.2*inch
    p.setFillColor(colors.HexColor('#F3F4F6'))
    p.rect(0.8*inch, y - 1.5*inch, 6.4*inch, 1.5*inch, fill=1, stroke=0)
    
    p.setFillColor(colors.black)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(1*inch, y - 0.3*inch, "Monthly Summary")
    
    p.setFont("Helvetica", 12)
    p.drawString(1*inch, y - 0.6*inch, f"Total Income: ${dashboard_data['total_income']:.2f}")
    p.drawString(1*inch, y - 0.85*inch, f"Total Expenses: ${dashboard_data['total_expenses']:.2f}")
    p.drawString(1*inch, y - 1.1*inch, f"Balance: ${dashboard_data['balance']:.2f}")
    
    p.setFillColor(colors.HexColor('#10B981') if dashboard_data['balance'] >= 0 else colors.HexColor('#EF4444'))
    p.drawString(4*inch, y - 0.6*inch, f"Budget Used: {dashboard_data['budget_used_percent']:.1f}%")
    
    # Recent Transactions
    y = y - 2*inch
    p.setFillColor(colors.black)
    p.setFont("Helvetica-Bold", 14)
    p.drawString(1*inch, y, "Recent Transactions")
    
    p.setFont("Helvetica", 10)
    y -= 0.3*inch
    for t in dashboard_data['recent_transactions'][:5]:
        color = colors.HexColor('#10B981') if t['type'] == 'income' else colors.HexColor('#EF4444')
        p.setFillColor(color)
        sign = '+' if t['type'] == 'income' else '-'
        p.drawString(1*inch, y, f"{t['date']} | {t['category']} | {sign}${t['amount']:.2f}")
        y -= 0.25*inch
    
    p.save()
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type='application/pdf',
        headers={'Content-Disposition': f'attachment; filename=budget_report_{month}.pdf'}
    )

# ==================== STRIPE PAYMENT ROUTES ====================

@api_router.post("/payments/checkout", response_model=CheckoutResponse)
async def create_checkout(data: CheckoutRequest, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    
    api_key = os.environ.get('STRIPE_API_KEY')
    host_url = data.origin_url.rstrip('/')
    webhook_url = f"{host_url}/api/webhook/stripe"
    
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    
    success_url = f"{host_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{host_url}/settings"
    
    checkout_request = CheckoutSessionRequest(
        amount=9.99,  # Pro subscription price
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "user_id": user['id'],
            "product": "pro_subscription"
        }
    )
    
    session = await stripe_checkout.create_checkout_session(checkout_request)
    
    # Store payment transaction
    await db.payment_transactions.insert_one({
        'id': str(uuid.uuid4()),
        'user_id': user['id'],
        'session_id': session.session_id,
        'amount': 9.99,
        'currency': 'usd',
        'status': 'pending',
        'payment_status': 'initiated',
        'created_at': datetime.now(timezone.utc).isoformat()
    })
    
    return CheckoutResponse(url=session.url, session_id=session.session_id)

@api_router.get("/payments/status/{session_id}")
async def check_payment_status(session_id: str, user: dict = Depends(get_current_user)):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    status = await stripe_checkout.get_checkout_status(session_id)
    
    # Update transaction and user if paid
    if status.payment_status == 'paid':
        await db.payment_transactions.update_one(
            {'session_id': session_id, 'user_id': user['id']},
            {'$set': {'status': 'completed', 'payment_status': 'paid'}}
        )
        await db.users.update_one(
            {'id': user['id']},
            {'$set': {'is_pro': True, 'pro_since': datetime.now(timezone.utc).isoformat()}}
        )
    
    return {
        'status': status.status,
        'payment_status': status.payment_status,
        'amount': status.amount_total / 100,  # Convert from cents
        'currency': status.currency
    }

@api_router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    
    api_key = os.environ.get('STRIPE_API_KEY')
    stripe_checkout = StripeCheckout(api_key=api_key, webhook_url="")
    
    body = await request.body()
    signature = request.headers.get("Stripe-Signature")
    
    try:
        event = await stripe_checkout.handle_webhook(body, signature)
        
        if event.payment_status == 'paid':
            # Update user to pro
            await db.payment_transactions.update_one(
                {'session_id': event.session_id},
                {'$set': {'status': 'completed', 'payment_status': 'paid'}}
            )
            
            # Get user from metadata
            transaction = await db.payment_transactions.find_one({'session_id': event.session_id})
            if transaction:
                await db.users.update_one(
                    {'id': transaction['user_id']},
                    {'$set': {'is_pro': True}}
                )
        
        return {'received': True}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {'received': False, 'error': str(e)}

# ==================== CSV EXPORT ====================

@api_router.get("/export/csv")
async def export_csv(month: Optional[str] = None, user: dict = Depends(get_current_user)):
    query = {'user_id': user['id']}
    if month:
        query['date'] = {'$regex': f'^{month}'}
    
    transactions = await db.transactions.find(query, {'_id': 0}).to_list(10000)
    
    # Generate CSV
    import csv
    from io import StringIO
    
    output = StringIO()
    writer = csv.writer(output)
    writer.writerow(['Date', 'Type', 'Category', 'Amount', 'Description', 'Notes'])
    
    for t in transactions:
        writer.writerow([
            t['date'],
            t['type'],
            t['category'],
            t['amount'],
            t.get('description', ''),
            t.get('notes', '')
        ])
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': f'attachment; filename=transactions_{month or "all"}.csv'}
    )

# ==================== APP CONFIG ====================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
