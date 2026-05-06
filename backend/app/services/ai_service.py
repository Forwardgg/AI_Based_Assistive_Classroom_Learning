import os
import requests
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

ALLOWED_MODELS = {
    # stable free models
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",
    "minimax/minimax-m2.5:free",

    # reliable paid fallbacks
    "google/gemini-2.0-flash-lite-001",
    "deepseek/deepseek-chat",
}

SUMMARY_MODEL_CHAIN = [
    # fast + reliable free models
    "google/gemma-4-26b-a4b-it:free",
    "google/gemma-4-31b-it:free",

    # paid fallback
    "google/gemini-2.0-flash-lite-001",
]

QUIZ_MODEL_CHAIN = [
    # free first
    "minimax/minimax-m2.5:free",

    # reliable paid fallback
    "deepseek/deepseek-chat",
]


class AIServiceError(Exception):
    pass


def call_llm(messages, model, temperature=0.3, max_tokens=800, retries=1):

    if model not in ALLOWED_MODELS:
        raise AIServiceError(f"Blocked model: {model}")

    total_chars = sum(len(m.get("content", "")) for m in messages)

    print(f"[LLM CALL] model={model} chars={total_chars}")

    headers = {
        "Authorization": f"Bearer {OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aibacls.app",
        "X-Title": "AIBACLS",
    }

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    last_error = None

    for attempt in range(retries + 1):

        try:

            response = requests.post(
                OPENROUTER_URL,
                headers=headers,
                json=payload,
                timeout=20,  # reduced from 60
            )

            if response.status_code != 200:

                error_body = response.json()

                print(f"[OPENROUTER ERROR] {error_body}")

                last_error = error_body.get(
                    "error",
                    {}
                ).get(
                    "message",
                    "Unknown error"
                )

                # skip retries for overloaded free models
                if response.status_code == 429 and ":free" in model:
                    raise AIServiceError(
                        f"Free model overloaded: {model}"
                    )

                # skip retries for dead models
                if response.status_code == 404:
                    raise AIServiceError(
                        f"No endpoint available: {model}"
                    )

                raise AIServiceError(
                    f"HTTP {response.status_code}: {last_error}"
                )

            data = response.json()

            content = data["choices"][0]["message"]["content"]

            if not content or not content.strip():
                raise AIServiceError("Empty response from model")

            return content.strip()

        except AIServiceError as e:

            # don't retry overloaded/dead free models
            if (
                "Free model overloaded" in str(e)
                or "No endpoint available" in str(e)
            ):
                raise

            if attempt < retries:

                wait = 1.5 * (attempt + 1)

                print(
                    f"[RETRY] attempt {attempt + 1}/{retries} after {wait}s"
                )

                time.sleep(wait)

            else:

                raise AIServiceError(
                    f"All {retries + 1} attempts failed for {model}. "
                    f"Last error: {last_error}"
                )

        except requests.exceptions.Timeout:

            raise AIServiceError(
                f"Request timed out after 20s (model={model})"
            )

        except requests.exceptions.RequestException as e:

            raise AIServiceError(
                f"Network error: {str(e)}"
            )


def call_with_fallback(messages, model_chain, temperature=0.3, max_tokens=800):

    for model in model_chain:

        try:

            result = call_llm(
                messages=messages,
                model=model,
                temperature=temperature,
                max_tokens=max_tokens,
            )

            print(f"[MODEL SUCCESS] {model}")

            return result

        except AIServiceError as e:

            print(f"[MODEL FAILED] {model} -> {str(e)}")

            continue

    raise AIServiceError(f"All models failed. Chain: {model_chain}")


def call_gemini(messages):

    return call_with_fallback(
        messages=messages,
        model_chain=SUMMARY_MODEL_CHAIN,
        temperature=0.2,
        max_tokens=700,
    )


def call_deepseek(messages):

    return call_with_fallback(
        messages=messages,
        model_chain=QUIZ_MODEL_CHAIN,
        temperature=0.3,
        max_tokens=1000,
    )