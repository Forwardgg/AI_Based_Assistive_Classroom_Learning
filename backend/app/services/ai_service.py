import os
import requests
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

# 🔒 ONLY ALLOW THESE MODELS
ALLOWED_MODELS = {
    "google/gemini-2.0-flash-lite-001",
    "deepseek/deepseek-chat"
}


class AIServiceError(Exception):
    pass


def call_llm(messages, model, temperature=0.3, max_tokens=800, retries=0):
    """
    Safe OpenRouter LLM caller
    """

    # 🔒 BLOCK ANY OTHER MODEL (CRITICAL)
    if model not in ALLOWED_MODELS:
        raise AIServiceError(f"Blocked model: {model}")

    # 🔍 DEBUG LOG (helps track big inputs)
    total_chars = sum(len(m.get("content", "")) for m in messages)
    print(f"[LLM CALL] model={model} chars={total_chars}")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    for attempt in range(retries + 1):
        try:
            response = requests.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=60
            )

            if response.status_code != 200:
                print("OpenRouter error:", response.text)
                raise AIServiceError("API call failed")

            data = response.json()
            content = data["choices"][0]["message"]["content"]

            if not content:
                raise AIServiceError("Empty response")

            return content.strip()

        except Exception as e:
            print(f"[AI ERROR] {str(e)}")

            if attempt == retries:
                raise AIServiceError("Request failed")

            time.sleep(1.5)


# =========================
# MODEL HELPERS
# =========================

def call_gemini(messages):
    return call_llm(
        messages=messages,
        model="google/gemini-2.0-flash-lite-001",
        temperature=0.2,
        max_tokens=700
    )


def call_deepseek(messages):
    return call_llm(
        messages=messages,
        model="deepseek/deepseek-chat",
        temperature=0.3,
        max_tokens=1000
    )