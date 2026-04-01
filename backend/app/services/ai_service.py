import os
import requests
import json
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"


class AIServiceError(Exception):
    pass


def call_llm(messages, model, temperature=0.3, max_tokens=800, retries=2):
    """
    Generic OpenRouter LLM caller

    messages = [
        {"role": "system", "content": "..."},
        {"role": "user", "content": "..."}
    ]
    """

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
            print(f"[AI RETRY {attempt}] Error:", str(e))

            if attempt == retries:
                raise AIServiceError("Max retries exceeded")

            time.sleep(1.5)


# =========================
# MODEL HELPERS
# =========================

def call_gemini(messages):
    """
    Gemini Flash Lite for:
    - transcript cleaning
    - summaries
    """

    return call_llm(
        messages=messages,
        model="google/gemini-2.0-flash-lite-001",
        temperature=0.2,
        max_tokens=700
    )


def call_deepseek(messages):
    """
    DeepSeek V3.1 for:
    - quiz generation
    """

    return call_llm(
        messages=messages,
        model="deepseek/deepseek-chat",
        temperature=0.3,
        max_tokens=1000
    )