from fastapi import FastAPI, HTTPException, Request, Header, Depends
from pydantic import BaseModel, EmailStr
from fastapi.middleware.cors import CORSMiddleware
import os, requests, time, psycopg2
from dotenv import load_dotenv
from database import (
    get_connection, return_connection, initialize_pool, close_pool,
    hash_password, verify_password
)
from contextlib import asynccontextmanager
import secrets
from datetime import datetime, timedelta
import re
from fastapi import Depends
import uuid
from fastapi import Path
from typing import List, Optional
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
load_dotenv()


def generate_chat_session_id():
    return str(uuid.uuid4())

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


origins = [
    "http://127.0.0.1:5500",
    "http://localhost:5500"
]

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ------------------------
# Batch chat Pydantic model
# ------------------------
class BatchChatMessage(BaseModel):
    message: str
    sender: str
    attachmentUrl: Optional[str] = None
    attachmentName: Optional[str] = None

class BatchChatRequest(BaseModel):
    session_token: str
    session_id: str
    messages: List[BatchChatMessage]

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
GOOGLE_CLIENT_ID = os.getenv(
    "GOOGLE_CLIENT_ID",
    "530881158509-geg690fkubhh7inoifhj00slavll4mi1.apps.googleusercontent.com"
)

class SignupRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ChatRequest(BaseModel):
    message: str
    session_token: str
    session_id: str | None = None

class ChatResponse(BaseModel):
    reply: str
    session_id: str

class GoogleAuthRequest(BaseModel):
    token: str


def is_valid_email(email: str) -> bool:
    """Validate email format using regex"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def generate_session_token() -> str:
    """Generate a secure random session token"""
    return secrets.token_urlsafe(32)


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

def save_chat_session_if_new(session_id: str, user_id: int, title: str = None):
    """
    Inserts a new session into chat_sessions if it does not already exist.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check if session already exists
        cur.execute("SELECT session_id FROM chat_sessions WHERE session_id = %s", (session_id,))
        if not cur.fetchone():
            # ✅ FIX: Insert with NULL title instead of hardcoded "New Conversation"
            cur.execute("""
                INSERT INTO chat_sessions (session_id, user_id, title, created_at)
                VALUES (%s, %s, %s, NOW())
            """, (session_id, user_id, None))
            conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to save chat session: {e}")
        if conn and not conn.closed:
            conn.rollback()
    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


# ✅ NEW FUNCTION: Auto-update session title from first user message
def update_session_title_if_empty(session_id: str, user_message: str):
    """
    Updates the session title to the first user message if title is NULL.
    """
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        # Check if title is NULL
        cur.execute("SELECT title FROM chat_sessions WHERE session_id = %s", (session_id,))
        result = cur.fetchone()
        
        if result and result[0] is None:
            # Extract first 40 chars as title
            title = user_message[:40].strip()
            cur.execute("""
                UPDATE chat_sessions 
                SET title = %s 
                WHERE session_id = %s
            """, (title, session_id))
            conn.commit()
            print(f"✅ Session title auto-generated: {title}")
    except Exception as e:
        print(f"⚠️ Failed to update session title: {e}")
        if conn and not conn.closed:
            conn.rollback()
    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


def save_chat_to_db(session_id: str, user_id: int, user_message: str, ai_reply: str):
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO chat_history (session_id, user_id, user_message, ai_reply, timestamp)
            VALUES (%s, %s, %s, %s, NOW())
        """, (session_id, user_id, user_message, ai_reply))
        conn.commit()
    except Exception as e:
        print(f"⚠️ Failed to save chat: {e}")
        if conn and not conn.closed:
            conn.rollback()
    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


# ===============================
# 🔹 SIGNUP ENDPOINT
# ===============================
@app.post("/signup")
async def signup(request: SignupRequest):
    email = request.email.strip().lower()
    password = request.password

    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")
    
    if len(password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            raise HTTPException(status_code=400, detail="Email already registered")

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
# 🔹 LOGIN ENDPOINT
# ===============================
@app.post("/login")
async def login(request: LoginRequest):
    email = request.email.strip().lower()
    password = request.password

    if not is_valid_email(email):
        raise HTTPException(status_code=400, detail="Invalid email format")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
        cur.execute("SELECT id, email, password FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        user_id, user_email, hashed_password = user
        
        if not verify_password(password, hashed_password):
            raise HTTPException(status_code=401, detail="Invalid email or password")
        
        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=7)
        
        cur.execute("""
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (%s, %s, %s)
        """, (user_id, session_token, expires_at))
        conn.commit()

        return {
            "message": "Login successful ✅",
            "email": user_email,
            "user_id": user_id,
            "session_token": session_token
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
# 🔹 GOOGLE LOGIN ENDPOINT
# ===============================
@app.post("/auth/google")
async def google_login(request: GoogleAuthRequest):
    if not request.token:
        raise HTTPException(status_code=400, detail="Missing Google token")

    try:
        idinfo = id_token.verify_oauth2_token(
            request.token,
            google_requests.Request(),
            GOOGLE_CLIENT_ID
        )
    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google token")

    email = idinfo.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="Google account is missing email scope")

    name = idinfo.get("name")
    picture = idinfo.get("picture")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT id FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user:
            user_id = user[0]
        else:
            placeholder_password = hash_password(secrets.token_hex(16))
            cur.execute(
                """
                INSERT INTO users (email, password) 
                VALUES (%s, %s)
                RETURNING id
                """,
                (email, placeholder_password)
            )
            user_id = cur.fetchone()[0]

        session_token = generate_session_token()
        expires_at = datetime.now() + timedelta(days=7)
        cur.execute(
            """
            INSERT INTO user_sessions (user_id, session_token, expires_at)
            VALUES (%s, %s, %s)
            """,
            (user_id, session_token, expires_at)
        )
        conn.commit()

        return {
            "message": "Google login successful ✅",
            "email": email,
            "user_id": user_id,
            "session_token": session_token,
            "name": name,
            "picture": picture
        }
    except HTTPException:
        raise
    except Exception as e:
        if conn and not conn.closed:
            try:
                conn.rollback()
            except:
                pass
        print(f"❌ Google login error: {e}")
        raise HTTPException(status_code=500, detail="Google login failed")
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
# 🔹 LOGOUT ENDPOINT
# ===============================
@app.post("/logout")
async def logout(session_token: str = Header(None, alias="Authorization")):
    """
    Logout endpoint - invalidates the user's session token
    """
    if not session_token:
        raise HTTPException(status_code=400, detail="Session token required")
    
    if session_token.startswith("Bearer "):
        session_token = session_token[7:]
    
    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        
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
# 🤖 CHAT ENDPOINT
# ===============================
@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    user_id = validate_session(request.session_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    # Generate new chat session if none was provided
    session_id = request.session_id or generate_chat_session_id()

    # Save session if it doesn't exist
    save_chat_session_if_new(session_id, user_id)
    
    # ✅ FIX: Auto-update title from first user message
    update_session_title_if_empty(session_id, user_message)

    # Call AI API
    response = await call_deepseek_api(user_message, SELECTED_MODEL)

    # Save chat message
    save_chat_to_db(session_id, user_id, user_message, response)

    return {"reply": response, "session_id": session_id}


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


@app.get("/chat/sessions")
async def get_chat_sessions(Authorization: str = Header(None)):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if Authorization.startswith("Bearer "):
        Authorization = Authorization[7:]

    user_id = validate_session(Authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT session_id, title, created_at
            FROM chat_sessions
            WHERE user_id = %s
            ORDER BY created_at DESC
        """, (user_id,))
        sessions = cur.fetchall()

        result = []

        for session_id, title, created_at in sessions:
            cur.execute("""
                SELECT user_message, ai_reply, timestamp
                FROM chat_history
                WHERE session_id = %s
                ORDER BY timestamp ASC
            """, (session_id,))
            rows = cur.fetchall()

            messages = []
            for row in rows:
                user_msg, ai_msg, ts = row
                messages.append({"sender": "user", "content": user_msg, "timestamp": ts.isoformat()})
                messages.append({"sender": "ai", "content": ai_msg, "timestamp": ts.isoformat()})

            # ✅ FIX: Auto-generate title if missing
            if not title and messages:
                first_user_msg = next((m for m in messages if m["sender"] == "user"), None)
                if first_user_msg:
                    title = first_user_msg["content"][:40]
                else:
                    title = "New Conversation"

            result.append({
                "id": session_id,
                "title": title or "New Conversation",
                "messages": messages,
                "endedAt": messages[-1]["timestamp"] if messages else created_at.isoformat(),
                "tags": []
            })

        return result

    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


@app.post("/chat/sessions/{session_id}/clear")
async def clear_chat_session(
    session_id: str,
    Authorization: str = Header(None)
):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if Authorization.startswith("Bearer "):
        Authorization = Authorization[7:]

    user_id = validate_session(Authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT session_id FROM chat_sessions WHERE session_id=%s AND user_id=%s",
            (session_id, user_id)
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        cur.execute(
            "DELETE FROM chat_history WHERE session_id=%s AND user_id=%s",
            (session_id, str(user_id))
        )
        conn.commit()
        return {"message": "Session messages cleared ✅"}

    except Exception as e:
        if conn and not conn.closed:
            conn.rollback()
        print(f"❌ Failed to clear chat session: {e}")
        raise HTTPException(status_code=500, detail="Failed to clear chat session")
    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(
    session_id: str,
    Authorization: str = Header(None)
):
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if Authorization.startswith("Bearer "):
        Authorization = Authorization[7:]

    user_id = validate_session(Authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute(
            "SELECT session_id FROM chat_sessions WHERE session_id = %s AND user_id::text = %s",
            (session_id, str(user_id))
        )
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Session not found")

        cur.execute("DELETE FROM chat_history WHERE session_id = %s AND user_id::text = %s", (session_id, str(user_id)))
        cur.execute("DELETE FROM chat_sessions WHERE session_id = %s AND user_id::text = %s", (session_id, str(user_id)))

        conn.commit()
        return {"message": f"Session {session_id} deleted successfully ✅"}

    except Exception as e:
        if conn and not conn.closed:
            conn.rollback()
        print(f"❌ Failed to delete chat session: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


@app.post("/chat/new-session", response_model=dict)
async def new_chat_session(Authorization: str = Header(None)):
    """
    Creates a new chat session in the database for the logged-in user.
    """
    if not Authorization:
        raise HTTPException(status_code=401, detail="Missing Authorization header")

    if Authorization.startswith("Bearer "):
        Authorization = Authorization[7:]

    user_id = validate_session(Authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    session_id = generate_chat_session_id()

    try:
        save_chat_session_if_new(session_id, user_id)
    except Exception as e:
        print(f"❌ Failed to create new session: {e}")
        raise HTTPException(status_code=500, detail="Failed to create new chat session")

    return {"session_id": session_id, "message": "New chat session created ✅"}


@app.post("/chat/batch")
async def chat_batch_endpoint(request: BatchChatRequest):
    user_id = validate_session(request.session_token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session")

    save_chat_session_if_new(request.session_id, user_id)

    if not request.messages:
        return {"message": "No messages to archive"}

    conn = None
    cur = None
    try:
        conn = get_connection()
        cur = conn.cursor()
        for msg in request.messages:
            user_msg = msg.message if msg.sender == "user" else ""
            ai_msg = msg.message if msg.sender == "ai" else ""
            
            cur.execute("""
                INSERT INTO chat_history 
                (session_id, user_id, user_message, ai_reply, timestamp)
                VALUES (%s, %s, %s, %s, NOW())
            """, (request.session_id, user_id, user_msg, ai_msg))
        conn.commit()
        return {"message": f"{len(request.messages)} messages archived successfully ✅"}

    except Exception as e:
        if conn and not conn.closed:
            conn.rollback()
        print(f"❌ Failed to archive batch messages: {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="Failed to archive messages")

    finally:
        if cur: cur.close()
        if conn: return_connection(conn)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
