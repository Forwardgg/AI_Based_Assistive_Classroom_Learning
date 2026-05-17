import os
import requests
import time

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")

OPENROUTER_URL = (
    "https://openrouter.ai/api/v1/chat/completions"
)

ALLOWED_MODELS = {

    # reliable models only
    "google/gemini-2.0-flash-lite-001",
    "deepseek/deepseek-chat",
}

SUMMARY_MODEL_CHAIN = [

    # transcript cleanup
    "google/gemini-2.0-flash-lite-001",
]

QUIZ_MODEL_CHAIN = [

    # quiz generation
    "deepseek/deepseek-chat",
]


class AIServiceError(Exception):
    pass


def call_llm(
    messages,
    model,
    temperature=0.3,
    max_tokens=800,
    retries=2
):

    if model not in ALLOWED_MODELS:

        raise AIServiceError(
            f"Blocked model: {model}"
        )

    total_chars = sum(
        len(m.get("content", ""))
        for m in messages
    )

    print(
        f"[LLM CALL] "
        f"model={model} "
        f"chars={total_chars}"
    )

    headers = {
        "Authorization":
            f"Bearer {OPENROUTER_API_KEY}",

        "Content-Type":
            "application/json",

        "HTTP-Referer":
            "https://aibacls.app",

        "X-Title":
            "AIBACLS",
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
                timeout=25,
            )

            if response.status_code != 200:

                try:
                    error_body = response.json()
                except Exception:
                    error_body = response.text

                print(
                    f"[OPENROUTER ERROR] "
                    f"{error_body}"
                )

                last_error = str(error_body)

                raise AIServiceError(
                    f"HTTP {response.status_code}"
                )

            data = response.json()

            content = (
                data["choices"][0]
                ["message"]["content"]
            )

            if (
                not content or
                not content.strip()
            ):

                raise AIServiceError(
                    "Empty response from model"
                )

            return content.strip()

        except requests.exceptions.Timeout:

            last_error = "Request timeout"

        except requests.exceptions.RequestException as e:

            last_error = f"Network error: {str(e)}"

        except AIServiceError as e:

            last_error = str(e)

        # retry
        if attempt < retries:

            wait = 2 * (attempt + 1)

            print(
                f"[RETRY] "
                f"{attempt + 1}/{retries} "
                f"waiting {wait}s"
            )

            time.sleep(wait)

        else:

            raise AIServiceError(
                f"All attempts failed for "
                f"{model}. "
                f"Last error: {last_error}"
            )


def call_with_fallback(
    messages,
    model_chain,
    temperature=0.3,
    max_tokens=800
):

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

            print(
                f"[MODEL FAILED] "
                f"{model} -> {str(e)}"
            )

            continue

    raise AIServiceError(
        f"All models failed. "
        f"Chain: {model_chain}"
    )


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