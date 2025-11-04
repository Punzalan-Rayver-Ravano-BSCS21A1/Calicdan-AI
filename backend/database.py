import psycopg2
from psycopg2 import pool
import os
from dotenv import load_dotenv
import bcrypt  # ✅ Added for password hashing

load_dotenv()
DATABASE_URL = os.getenv("DATABASE_URL")

# Connection pool for better performance
connection_pool = None

def initialize_pool():
    """Initialize connection pool on startup"""
    global connection_pool
    try:
        # Add SSL mode and connection parameters
        connection_pool = psycopg2.pool.SimpleConnectionPool(
            1,  # min connections
            10,  # max connections
            DATABASE_URL,
            # Use 'prefer' to work with local dev instances that may not have SSL
            sslmode='prefer',
            connect_timeout=10,
            keepalives=1,
            keepalives_idle=30,
            keepalives_interval=10,
            keepalives_count=5
        )
        print("✅ Database connection pool created successfully")
        
        # Create tables on startup
        conn = get_connection()
        cur = conn.cursor()
        
        # Users table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # ✅ Chat history table - now properly linked to user id
        cur.execute("""
            CREATE TABLE IF NOT EXISTS chat_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                user_message TEXT,
                ai_reply TEXT,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # ✅ Sessions table for proper logout tracking
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_sessions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                session_token TEXT UNIQUE NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP NOT NULL,
                is_active BOOLEAN DEFAULT TRUE
            );
        """)
        
        conn.commit()
        cur.close()
        return_connection(conn)
        print("✅ Database tables initialized successfully")
        
    except Exception as e:
        print(f"❌ Error initializing database pool: {e}")
        raise

def get_connection():
    """Get connection from pool"""
    if connection_pool:
        conn = connection_pool.getconn()
        # Test if connection is alive
        try:
            conn.isolation_level
        except:
            # Connection is dead, get a new one
            connection_pool.putconn(conn, close=True)
            conn = connection_pool.getconn()
        return conn
    else:
        return psycopg2.connect(DATABASE_URL, sslmode='prefer')

def return_connection(conn):
    """Return connection to pool"""
    if connection_pool:
        connection_pool.putconn(conn)
    else:
        conn.close()

def close_pool():
    """Close all connections in pool"""
    if connection_pool:
        connection_pool.closeall()
        print("✅ Database connection pool closed")

# ✅ NEW: Password hashing utilities
def hash_password(password: str) -> str:
    """Hash a password using bcrypt"""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash"""
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
