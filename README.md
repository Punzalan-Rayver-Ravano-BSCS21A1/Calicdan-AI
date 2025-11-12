Calicdan AI Chat System

Calicdan AI is a full-featured chat application with persistent user history, backend session management, and dynamic message handling. The system is built using a frontend in JavaScript (chat.js) and a Python/FastAPI backend.

Features

Backend-dependent Chat Sessions
Each chat session is stored in the backend, allowing session restoration, clearing, and proper archiving.

Persistent Chat History

Users have a full sidebar thread history.

Each session is saved in localStorage under chatThreads_user_{userId}.

Active session tracking ensures users resume conversations seamlessly.

UI Enhancements

Chat resets to a clean “welcome” message when starting a new chat or clearing sessions.

Input focus and send button states are managed automatically for better UX.

Error Handling & Data Safety

Backend failures and network errors are logged and displayed in chat messages.

Duplicate threads and messages are prevented.

File Structure

chat.js – Frontend logic for sending, receiving, and managing chat sessions.

backend/ – FastAPI server handling chat sessions, clearing, and new session creation.

database.py – Database functions for session storage, message handling, and user data.

.env – Environment variables for backend URL, database credentials, etc.


Usage

Clone the repository:

git clone https://github.com/<your-username>/calicdan-ai.git
cd calicdan-ai


Setup the backend environment:

python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt


Configure environment variables in .env:

BACKEND_URL=http://localhost:8000
DATABASE_URL=postgresql://user:password@localhost:5432/chatdb


Start the backend server:

uvicorn backend.main:app --reload


Open the frontend in your browser and start chatting.


ontributing

Ensure all new features support backend session storage.

Maintain consistent localStorage structure (calicdan-activeSession_user_{userId} & chatThreads_user_{userId}).

Avoid duplicating messages or threads in the sidebar/history UI.


License

MIT License – see LICENSE for details.