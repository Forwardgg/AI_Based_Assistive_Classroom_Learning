import os
import requests
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")  # API key from env
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"  # OpenRouter endpoint

# 🔒 restrict allowed models (security + cost control)
ALLOWED_MODELS = {
    "google/gemini-2.0-flash-lite-001",
    "deepseek/deepseek-chat"
}


class AIServiceError(Exception):
    pass  # custom error for AI failures


def call_llm(messages, model, temperature=0.3, max_tokens=800, retries=0):
    """
    Safe OpenRouter LLM caller
    """

    # block unauthorized models
    if model not in ALLOWED_MODELS:
        raise AIServiceError(f"Blocked model: {model}")

    # debug: track prompt size
    total_chars = sum(len(m.get("content", "")) for m in messages)
    print(f"[LLM CALL] model={model} chars={total_chars}")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json"
    }

    payload = {
        "model": model,
        "messages": messages,  # chat format input
        "temperature": temperature,
        "max_tokens": max_tokens
    }

    # retry loop for reliability
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
            content = data["choices"][0]["message"]["content"]  # extract response text

            if not content:
                raise AIServiceError("Empty response")

            return content.strip()

        except Exception as e:
            print(f"[AI ERROR] {str(e)}")

            if attempt == retries:
                raise AIServiceError("Request failed")  # final failure

            time.sleep(1.5)  # small delay before retry


# MODEL HELPERS
def call_gemini(messages):
    return call_llm(
        messages=messages,
        model="google/gemini-2.0-flash-lite-001",  # used for text processing
        temperature=0.2,
        max_tokens=700
    )


def call_deepseek(messages):
    return call_llm(
        messages=messages,
        model="deepseek/deepseek-chat",  # used for quiz generation
        temperature=0.3,
        max_tokens=1000
    )