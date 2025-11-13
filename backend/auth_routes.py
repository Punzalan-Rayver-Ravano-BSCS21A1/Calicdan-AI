from fastapi import APIRouter, HTTPException, Form, Request
from fastapi.responses import JSONResponse
from database import get_connection
from google.oauth2 import id_token
from google.auth.transport import requests as grequests
import psycopg2

router = APIRouter()

GOOGLE_CLIENT_ID = "530881158509-geg690fkubhh7inoifhj00slavll4mi1.apps.googleusercontent.com"


# --- SIGN UP ---
@router.post("/signup")
def signup(email: str = Form(...), password: str = Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()

        # Check if user already exists
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        existing = cur.fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email already registered")

        # Insert new user
        cur.execute("INSERT INTO users (email, password) VALUES (%s, %s)", (email, password))
        conn.commit()

        cur.close()
        conn.close()
        return JSONResponse({"message": "Signup successful"}, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- LOGIN ---
@router.post("/login")
def login(email: str = Form(...), password: str = Form(...)):
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("SELECT * FROM users WHERE email = %s AND password = %s", (email, password))
        user = cur.fetchone()

        cur.close()
        conn.close()

        if not user:
            raise HTTPException(status_code=401, detail="Invalid email or password")

        return JSONResponse({"message": "Login successful"}, status_code=200)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- GOOGLE AUTH ---
@router.post("/google-auth")
async def google_auth(request: Request):
    """
    Verifies Google ID token and either logs in or creates a user in the database.
    The frontend must send JSON: { "token": "<Google ID token>" }
    """
    try:
        data = await request.json()
        token = data.get("token")

        if not token:
            raise HTTPException(status_code=400, detail="Missing Google token")

        # Verify token with Google's servers
        idinfo = id_token.verify_oauth2_token(token, grequests.Request(), GOOGLE_CLIENT_ID)

        # Extract user info
        email = idinfo.get("email")
        name = idinfo.get("name")
        picture = idinfo.get("picture")

        # Connect to DB
        conn = get_connection()
        cur = conn.cursor()

        # Check if user already exists
        cur.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cur.fetchone()

        if not user:
            # Create new user (no password for Google accounts)
            cur.execute(
                "INSERT INTO users (email, password, name, picture) VALUES (%s, %s, %s, %s)",
                (email, None, name, picture),
            )
            conn.commit()

        cur.close()
        conn.close()

        return JSONResponse({
            "message": "Google login successful",
            "email": email,
            "name": name,
            "picture": picture
        }, status_code=200)

    except ValueError:
        # Invalid token
        raise HTTPException(status_code=401, detail="Invalid Google token")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
