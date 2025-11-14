import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(DATABASE_URL)
    print("✅ Successfully connected to Neon Postgres!")
    conn.close()
except Exception as e:
    print("❌ Connection failed:", e)
