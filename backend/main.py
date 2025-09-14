# backend/main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
import os
import requests
import time
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

class ChatRequest(BaseModel):
    message: str

class ChatResponse(BaseModel):
    reply: str

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")

# Available DeepSeek Models (choose one)
DEEPSEEK_MODELS = {
    "deepseek-chat": "deepseek-chat",      # Best for general chat (recommended)
    "deepseek-coder": "deepseek-coder",    # Best for coding
    "deepseek-llm": "deepseek-llm",        # General purpose
}

SELECTED_MODEL = "deepseek-chat"  # ← CHANGE THIS TO TRY DIFFERENT MODELS

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    user_message = request.message.strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty.")

    if not DEEPSEEK_API_KEY:
        raise HTTPException(status_code=500, detail="DeepSeek API key not configured")

    try:
        response = await call_deepseek_api(user_message, SELECTED_MODEL)
        return ChatResponse(reply=response)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"API error: {str(e)}")

async def call_deepseek_api(message: str, model: str) -> str:
    """Call DeepSeek API with retry logic and longer timeout"""
    url = "https://api.deepseek.com/v1/chat/completions"
    
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": "You are a helpful AI assistant for students. Keep responses concise and helpful."},
            {"role": "user", "content": message}
        ],
        "temperature": 0.7,
        "max_tokens": 500  # Reduced from 1024 to speed up response
    }
    
    # Retry up to 3 times with longer timeout
    for attempt in range(3):
        try:
            # Increased timeout from 30 to 60 seconds
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            
            if response.status_code == 200:
                data = response.json()
                return data['choices'][0]['message']['content']
            else:
                error_msg = f"DeepSeek API error: {response.status_code} - {response.text}"
                if attempt == 2:  # Last attempt
                    raise Exception(error_msg)
                print(f"Attempt {attempt + 1} failed with status {response.status_code}, retrying...")
                
        except requests.exceptions.Timeout:
            if attempt == 2:  # Last attempt
                raise Exception("DeepSeek API timeout after 3 attempts (60s each)")
            print(f"Timeout on attempt {attempt + 1}, retrying in 2 seconds...")
            time.sleep(2)  # Wait before retrying
            
        except requests.exceptions.ConnectionError:
            if attempt == 2:  # Last attempt
                raise Exception("Connection error to DeepSeek API")
            print(f"Connection error on attempt {attempt + 1}, retrying in 3 seconds...")
            time.sleep(3)
            
        except Exception as e:
            if attempt == 2:  # Last attempt
                raise e
            print(f"Attempt {attempt + 1} failed: {str(e)}")
            time.sleep(1)
    
    raise Exception("Failed to get response from DeepSeek API after 3 attempts")

@app.get("/models")
async def list_models():
    """Get available DeepSeek models"""
    return {
        "available_models": list(DEEPSEEK_MODELS.keys()),
        "current_model": SELECTED_MODEL,
        "model_descriptions": {
            "deepseek-chat": "Best for general conversation and questions (Recommended)",
            "deepseek-coder": "Optimized for programming and code assistance",
            "deepseek-llm": "General purpose language model"
        }
    }

@app.post("/change-model/{model_name}")
async def change_model(model_name: str):
    """Change the active model"""
    global SELECTED_MODEL
    if model_name in DEEPSEEK_MODELS:
        SELECTED_MODEL = DEEPSEEK_MODELS[model_name]
        return {"message": f"Model changed to {model_name}", "current_model": SELECTED_MODEL}
    else:
        raise HTTPException(status_code=400, detail="Invalid model name")

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "api_provider": "DeepSeek",
        "current_model": SELECTED_MODEL,
        "balance_info": "Check your DeepSeek dashboard for usage"
    }

@app.get("/test-connection")
async def test_connection():
    """Test DeepSeek API connection"""
    try:
        # Test with a simple message
        test_response = await call_deepseek_api("Hello", "deepseek-chat")
        return {
            "status": "connected",
            "message": "API connection successful",
            "response_preview": test_response[:100] + "..." if len(test_response) > 100 else test_response
        }
    except Exception as e:
        return {
            "status": "error",
            "message": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    print("Starting DeepSeek Chat API Server...")
    print(f"Using model: {SELECTED_MODEL}")
    uvicorn.run(app, host="0.0.0.0", port=8000)