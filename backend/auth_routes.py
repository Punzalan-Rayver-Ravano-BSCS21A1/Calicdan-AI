# backend/auth_routes.py
from fastapi import APIRouter, HTTPException, Form
from fastapi.responses import JSONResponse
from database import get_connection
import psycopg2

router = APIRouter()

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
