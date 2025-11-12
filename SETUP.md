# Setup Instructions

## The Problem
Opening HTML files directly (`file://` protocol) causes CORS errors. You need to serve the frontend over HTTP.

## Quick Start

### 1. Start the Backend Server
```bash
cd backend
python main.py
```
The backend will run on `http://127.0.0.1:8000`

### 2. Start the Frontend Server
Open a **new terminal** and run:
```bash
cd frontend
python server.py
```
Or on Windows, just double-click `start-server.bat`

The frontend will open at `http://localhost:5500`

### 3. Access the Application
Open your browser and go to: `http://localhost:5500/index.html`

## Alternative: Using Live Server (VS Code)
If you have VS Code with the Live Server extension:
1. Right-click on `frontend/index.html`
2. Select "Open with Live Server"
3. Make sure it's running on port 5500 (or update backend CORS if different)

## Troubleshooting

### "Failed to fetch" errors
- Make sure the backend is running (`python main.py` in the backend folder)
- Make sure you're accessing the frontend via `http://localhost:5500` NOT `file://`
- Check that both servers are running

### CORS errors
- Make sure the frontend URL matches one in `backend/main.py` origins list
- Restart the backend after changing CORS settings

### npm install error
- You don't need npm for this project (it's vanilla HTML/JS)
- If you see npm errors, you're in the wrong directory or trying to install something unnecessary

