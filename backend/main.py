from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os, requests, time, psycopg2
from dotenv import load_dotenv
from database import get_connection, return_connection, initialize_pool, close_pool
from contextlib import asynccontextmanager

load_dotenv()

# Lifespan context manager for startup/shutdown
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Calicdan AI Backend...")
    initialize_pool()
    yield
    # Shutdown
    close_pool()
    print("👋 Shutting down gracefully")

app = FastAPI(lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# -------------------------
# 🧠 DeepSeek AI Config
# -------------------------
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

DEEPSEEK_MODELS = {
    "deepseek-chat": "deepseek-chat",
    "deepseek-coder": "deepseek-coder",
    "deepseek-llm": "deepseek-llm",
}
SELECTED_MODEL = "deepseek-chat"

class ChatRequest(BaseModel):
    message: str
    user_id: str | None = None

class ChatResponse(BaseModel):
    reply: str


# ===============================
# 🔹 LOGIN & SIGNUP ENDPOINTS
# ===============================
@app.post("/signup")
async def signup(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        cur.execute("INSERT INTO users (email, password) VALUES (%s, %s)", (email, password))
        conn.commit()
        return {"message": "Signup successful ✅"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Signup error: {e}")
        if conn and not conn.closed:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail="Database error occurred")
    finally:
        if cur:
            try:
                cur.close()
            except:
                pass
        if conn:
            try:
                return_connection(conn)
            except:
                pass


@app.post("/login")
async def login(request: Request):
    data = await request.json()
    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        raise HTTPException(status_code=400, detail="Email and password required")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("SELECT * FROM users WHERE email=%s AND password=%s", (email, password))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return {"message": "Login successful ✅", "email": user[1]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
        raise HTTPException(status_code=500, detail="Database error occurred")
    finally:
        if cur:
            try:
                cur.close()
            except:
                pass
        if conn:
            try:
                return_connection(conn)
            except:
                pass


# ===============================
# 🤖 CHAT ENDPOINTS (DeepSeek)
# ===============================
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not configured")

    try:
        response = await call_deepseek_api(user_message, SELECTED_MODEL)
        save_chat_to_db(request.user_id or "guest", user_message, response)
        return ChatResponse(reply=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API error: {str(e)}")


def save_chat_to_db(user_id: str, user_message: str, ai_reply: str):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO chat_history (user_id, user_message, ai_reply) VALUES (%s, %s, %s)",
            (user_id, user_message, ai_reply)
        )
        conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to save chat: {e}")
        if conn and not conn.closed:
            try:
                conn.rollback()
            except:
                pass
    finally:
        if cur:
            try:
                cur.close()
            except:
                pass
        if conn:
            try:
                return_connection(conn)
            except:
                pass


async def call_deepseek_api(message: str, model: str) -> str:
    url = "https://api.deepseek.com/v1/chat/completions"
    headers = {"Authorization": f"Bearer {DEEPSEEK_API_KEY}", "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for students."},
            {"role": "user", "content": message}
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }

    for attempt in range(3):
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            if attempt == 2:
                raise Exception(f"DeepSeek API error: {response.status_code} - {response.text}")
        except requests.exceptions.Timeout:
            if attempt == 2:
                raise Exception("DeepSeek API timeout after 3 attempts")
            time.sleep(2)
        except requests.exceptions.ConnectionError:
            if attempt == 2:
                raise Exception("Connection error to DeepSeek API")
            time.sleep(3)
    raise Exception("Failed to get response from DeepSeek API")


@app.get("/health")
async def health_check():
    return {"status": "healthy", "api_provider": "DeepSeek", "model": SELECTED_MODEL}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
