from fastapi import FastAPI, HTTPException, Request, Header, Depends
from pydantic import BaseModel, EmailStr
from fastapi.middleware.cors import CORSMiddleware
import os, requests, time, psycopg2
from dotenv import load_dotenv
from database import (
    get_connection, return_connection, initialize_pool, close_pool,
    hash_password, verify_password  # ✅ Import password functions
)
from contextlib import asynccontextmanager
import secrets  # ✅ For generating session tokens
from datetime import datetime, timedelta
import re  # ✅ For email validation

app = FastAPI()
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

# ✅ NEW: Pydantic models with email validation
class SignupRequest(BaseModel):
    email: EmailStr  # ✅ Built-in email validation
    password: str

class LoginRequest(BaseModel):
    email: EmailStr  # ✅ Built-in email validation
    password: str

class ChatRequest(BaseModel):
    message: str
    session_token: str | None = None  # ✅ Session token for authenticated requests

class ChatResponse(BaseModel):
    reply: str


# ✅ NEW: Helper function to validate email format (additional server-side check)
def is_valid_email(email: str) -> bool:
    """Validate email format using regex"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


# ✅ NEW: Helper function to generate session token
def generate_session_token() -> str:
    """Generate a secure random session token"""
    return secrets.token_urlsafe(32)


# ✅ NEW: Helper function to validate session token
def validate_session(session_token: str) -> int | None:
    """Validate session token and return user_id if valid"""
    if not session_token:
        return None
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("""
            SELECT user_id FROM user_sessions 
            WHERE session_token = %s 
            AND is_active = TRUE 
            AND expires_at > NOW()
        """, (session_token,))
        
        result = cur.fetchone()
        return result[0] if result else None
    except Exception as e:
        print(f"❌ Session validation error: {e}")
        return None
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
# 🔹 SIGNUP ENDPOINT (Fixed)
# ===============================
@app.post("/signup")
async def signup(request: SignupRequest):
    email = request.email.strip().lower()  # ✅ Normalize email
    password = request.password

    # ✅ Additional email validation
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    # ✅ Password strength check
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check if user already exists
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

        # ✅ Hash password before storing
        hashed_password = hash_password(password)
        
        cur.execute(
            "INSERT INTO users (email, password) VALUES (%s, %s)",
            (email, hashed_password)
        )
        conn.commit()
        
        return {"message": "Signup successful ✅", "email": email}
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


# ===============================
# 🔹 LOGIN ENDPOINT (Fixed)
# ===============================
@app.post("/login")
async def login(request: LoginRequest):
    email = request.email.strip().lower()  # ✅ Normalize email
    password = request.password

    # ✅ Additional email validation
    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Get user with hashed password
        cur.execute("SELECT id, email, password FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_id, user_email, hashed_password = user
        
        # ✅ Verify password using bcrypt
        if not verify_password(password, hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        # ✅ Generate session token
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=7)  # 7-day session
        
        # ✅ Store session in database
        cur.execute("""
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (%s, %s, %s)
        """, (user_id, session_token, expires_at))
        conn.commit()

        return {
            "message": "Login successful ✅",
            "email": user_email,
            "user_id": user_id,
            "session_token": session_token  # ✅ Return session token to client
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Login error: {e}")
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


# ===============================
# 🔹 LOGOUT ENDPOINT (NEW)
# ===============================
@app.post("/logout")
async def logout(session_token: str = Header(None, alias="Authorization")):
    """
    Logout endpoint - invalidates the user's session token
    Expects: Authorization header with session token
    """
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token required")
    
    # Remove "Bearer " prefix if present
    if session_token.startswith("Bearer "):
        session_token = session_token[7:]
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # ✅ Invalidate session in database
        cur.execute("""
            UPDATE user_sessions 
            SET is_active = FALSE 
            WHERE session_token = %s
        """, (session_token,))
        
        if cur.rowcount == 0:
            raise HTTPException(status_code=404, detail="Session not found")
        
        conn.commit()
        
        return {"message": "Logout successful ✅"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Logout error: {e}")
        if conn and not conn.closed:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail="Logout failed")
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
# 🤖 CHAT ENDPOINTS (Fixed)
# ===============================
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")
    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not configured")

    # ✅ Validate session token
    user_id = None
    if request.session_token:
        user_id = validate_session(request.session_token)
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid or expired session")
    else:
        raise HTTPException(status_code=401, detail="Authentication required")

    try:
        response = await call_deepseek_api(user_message, SELECTED_MODEL)
        
        # ✅ Save chat with proper user_id
        save_chat_to_db(user_id, user_message, response)
        
        return ChatResponse(reply=response)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API error: {str(e)}")


def save_chat_to_db(user_id: int, user_message: str, ai_reply: str):
    """Save chat to database with proper user isolation"""
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # ✅ Now requires valid user_id (not nullable)
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
            {"role": "user", "content": message}  # ✅ FIXED: Added missing quote
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



@app.delete("/api/sessions/{session_id}")
async def delete_session(session_id: int, session_token: str = Header(None, alias="Authorization")):
    """
    Delete a chat session by ID. Requires valid session token in Authorization header.
    """
    # Validate user session
    user_id = validate_session(session_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Delete session only if it belongs to the logged-in user
        cur.execute("""
            DELETE FROM chat_history
            WHERE id = %s AND user_id = %s
            RETURNING id
        """, (session_id, user_id))

        deleted = cur.fetchone()
        conn.commit()

        if not deleted:
            raise HTTPException(status_code=404, detail="Session not found")

        return {"success": True, "deleted_id": deleted[0]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error deleting session: {e}")
        if conn and not conn.closed:
            try:
                conn.rollback()
            except:
                pass
        raise HTTPException(status_code=500, detail="Failed to delete session")
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
