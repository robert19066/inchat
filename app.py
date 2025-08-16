from flask import Flask, render_template, request, jsonify
import requests
import os
from dotenv import load_dotenv

# Load environment variables from .env file
env_path = os.path.join(os.path.dirname(__file__), '.env')
load_dotenv(env_path)

app = Flask(__name__)

# Available Groq models (as of 2025)
AVAILABLE_MODELS = {
    # Production Models (Most Reliable)
    "llama-3.3-70b-versatile": {
        "name": "Llama 3.3 70B (Best Quality)", 
        "developer": "Meta",
        "description": "Most capable model, best for complex tasks"
    },
    "llama-3.1-8b-instant": {
        "name": "Llama 3.1 8B (Fast)", 
        "developer": "Meta",
        "description": "Faster responses, good for simple conversations"
    },
    "gemma2-9b-it": {
        "name": "Gemma2 9B", 
        "developer": "Google",
        "description": "Google's efficient model"
    },
    
    # Preview Models (Experimental)
    "deepseek-r1-distill-llama-70b": {
        "name": "DeepSeek R1 70B (Reasoning)", 
        "developer": "DeepSeek/Meta",
        "description": "Advanced reasoning capabilities"
    },
    "qwen/qwen3-32b": {
        "name": "Qwen3 32B (Multilingual)", 
        "developer": "Alibaba",
        "description": "Great for multilingual conversations"
    },
    "moonshotai/kimi-k2-instruct": {
        "name": "Kimi K2 (Large Context)", 
        "developer": "Moonshot AI",
        "description": "1 trillion parameters, advanced capabilities"
    }
}

# Configuration
API_TYPE = "groq"
API_KEY = os.environ.get('GROQ_API_KEY')
API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "llama-3.3-70b-versatile"  # Default model

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/chat", methods=["POST"])
def chat():
    user_message = request.json.get("message", "")
    selected_model = request.json.get("model", DEFAULT_MODEL)
    
    if not user_message.strip():
        return jsonify({"reply": "Please type a message!"})
    
    # Validate model selection
    if selected_model not in AVAILABLE_MODELS:
        selected_model = DEFAULT_MODEL
    
    # Check if API key is configured
    if not API_KEY:
        return jsonify({"reply": "⚠️ API key not configured. Please contact the administrator."})
    
    # Try the API with selected model
    result = try_api(API_TYPE, API_KEY, API_URL, selected_model, user_message)
    if result and not result.startswith(("🚫", "⏰", "💳", "🔧", "❌")):
        return jsonify({
            "reply": result, 
            "model_used": AVAILABLE_MODELS[selected_model]["name"]
        })
    elif result:
        return jsonify({"reply": result})
    
    # If API fails
    return jsonify({"reply": "Sorry, the AI service is temporarily unavailable. Please try again in a moment."})

def try_api(api_type, api_key, api_url, model, message):
    """Try to get response from an AI API"""
    if not api_key:
        return None
        
    try:
        payload = {
            "model": model,
            "messages": [
                {"role": "system", "content": f"You are a helpful, friendly AI assistant using the {AVAILABLE_MODELS.get(model, {}).get('name', model)} model. Keep responses conversational and engaging."},
                {"role": "user", "content": message}
            ],
            "max_tokens": 150,
            "temperature": 0.7
        }
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        print(f"Using model: {model}")
        response = requests.post(api_url, headers=headers, json=payload, timeout=30)
        
        if response.status_code == 200:
            data = response.json()
            ai_reply = data.get("choices", [{}])[0].get("message", {}).get("content", "")
            return ai_reply.strip() if ai_reply else None
        
        elif response.status_code == 401:
            return "🚫 Invalid API key. Please check your API key configuration."
        
        elif response.status_code == 429:
            return "⏰ Rate limit exceeded! You've reached the maximum number of requests. Please try again later or upgrade your API plan."
        
        elif response.status_code == 402:
            return "💳 Payment required. Your API usage limit has been reached. Please check your billing settings."
        
        elif response.status_code == 503:
            return "🔧 AI service is temporarily overloaded. Please try again in a few moments."
        
        else:
            print(f"API Error: {response.status_code} - {response.text}")
            return f"❌ AI service error ({response.status_code}). Please try again."
            
    except requests.exceptions.Timeout:
        return "⏰ Request timed out. Please try again."
    
    except requests.exceptions.ConnectionError:
        return "🌐 Cannot connect to AI service. Please check your internet connection."
    
    except Exception as e:
        print(f"API error ({api_type}): {e}")
        return "❌ An unexpected error occurred. Please try again."

@app.route("/models")
def get_models():
    """API endpoint to get available models"""
    return jsonify(AVAILABLE_MODELS)

@app.route("/health")
def health_check():
    """Health check endpoint for Render"""
    return jsonify({
        "status": "healthy", 
        "api_configured": bool(API_KEY),
        "available_models": len(AVAILABLE_MODELS),
        "default_model": DEFAULT_MODEL
    })

if __name__ == "__main__":
    print("=" * 60)
    print("AI CHAT WITH MODEL SELECTION")
    print("=" * 60)
    print(f"API Type: {API_TYPE}")
    print(f"Default Model: {DEFAULT_MODEL}")
    print(f"Available Models: {len(AVAILABLE_MODELS)}")
    print(f"API Key configured: {'✅ Yes' if API_KEY else '❌ No'}")
    print("=" * 60)
    
    for model_id, info in AVAILABLE_MODELS.items():
        print(f"📱 {info['name']} ({info['developer']})")
    
    print("=" * 60)
    
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)