Quick checklist — set up CalicdanAI on a new Windows machine (PowerShell)

Run these commands from PowerShell, unless noted otherwise. Use an elevated PowerShell only if a step complains about permissions.

0) What you need beforehand

Install Python 3.12 (or the same minor version you used).

During installation, optionally check “Add Python to PATH” (helps but not required).

Install Node.js (for the frontend) — recommended LTS.

Ensure you have the project files (clone repo / copy project folder).

1) Open PowerShell and verify python availability
# Optional: open a fresh PowerShell window
# Check if python is found
where python
# or
Get-Command python


If you see nothing or you get the Microsoft Store message, either:

Use the full path to your installed python (see later), or

Re-run Python installer and enable "Add to PATH".

2) Change into the project root

Assuming you put the project at C:\Users\<you>\Desktop\Calicdan-AI-main:

cd C:\Users\<you>\Desktop\Calicdan-AI-main

3) Create the virtual environment (create it inside the project)

This ensures the venv lives in the project and won’t break when user accounts change.

# If 'python' works:
python -m venv venv

# If 'python' isn't in PATH but you know the installer path, use full path:
& "C:\Users\<you>\AppData\Local\Programs\Python\Python312\python.exe" -m venv venv


After this you’ll have .\venv inside your project.

4) Activate the venv (PowerShell)

PowerShell uses .ps1 activation scripts. Use this:

# Temporarily allow scripts for this session if blocked (safe):
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

# Run activation script
.\venv\Scripts\Activate.ps1


You should now see (venv) on the left of the prompt.

If you see no (venv) or an error, try:

& "$PWD\venv\Scripts\Activate.ps1"

5) Verify python & pip inside venv
Get-Command python
python --version
pip --version
# If pip isn't found, run:
python -m ensurepip --upgrade
python -m pip install --upgrade pip

6) Install backend dependencies

From project backend folder (if requirements are there):

cd .\backend
# If file named requirements.txt:
pip install -r requirements.txt
# If it's requirement.txt (singular):
pip install -r requirement.txt

# If you prefer, you can install specific items:
pip install fastapi uvicorn requests python-dotenv

7) Configure environment variables / .env

Create a .env file in backend (if your project uses it) or set in PowerShell temporarily:

# Temporary for this session:
$env:DEEPSEEK_API_KEY = "your_real_api_key_here"

# Or create a backend/.env file with:
# DEEPSEEK_API_KEY=your_real_api_key_here


Security tip: Don’t commit .env to git. Use a .gitignore entry.

8) Run the backend
python main.py


You should see Uvicorn logs and http://127.0.0.1:8000 running. If you get ModuleNotFoundError for a package, pip install that package (or re-run the requirements install).

9) Frontend setup (in project root or frontend folder)

Open a new PowerShell (or reuse venv but Node is separate). In frontend:

cd ..\frontend\src    # or wherever package.json is (looks like src root)
# Install JS deps
npm install

# Start dev server (Vite)
npm run dev
# Or if package.json uses "start" or something else check scripts block.


Then open the given URL (usually http://localhost:5173) or ensure front-end fetch URL points to your backend (http://127.0.0.1:8000/chat).

10) Optional: make venv easier to activate (per project)

You can add a small helper PS1 file in the project root for convenience, e.g. activate-project.ps1:

# activate-project.ps1
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
& "$PSScriptRoot\venv\Scripts\Activate.ps1"


Then run .\activate-project.ps1.

Troubleshooting notes & common fixes

"Python was not found" — use full python.exe path or reinstall and check "Add Python to PATH".

Activation not working — use Activate.ps1 and Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass.

pip not found — run python -m pip install -U pip or python -m ensurepip.

Wrong venv path (created in wrong dir) — delete that venv and re-run python -m venv venv from the project root.

Permissions errors — open PowerShell as Administrator (only if you must).

Requirements file missing or misnamed — check backend folder for requirements.txt vs requirement.txt.

Backend returns CORS or fetch errors in browser — ensure backend and frontend URLs match (CORS enabled in main.py already).

Remember to export environment variable each new session — PowerShell env vars are session-local unless permanently set through System > Env vars.

Recommended final steps after successful setup

Test the backend: curl -X GET http://127.0.0.1:8000/health (or open in browser).

Test the chat: use your frontend UI and send a message — inspect browser console/network for errors.

Add venv/ to .gitignore so teammates don't commit the venv folder.

If you want, I can turn this into a one-file setup.ps1 script that you can run on a fresh Windows machine to automate most steps (I’ll include safe prompts where keys are required). Want that?