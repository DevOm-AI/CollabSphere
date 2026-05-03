import json
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from app.core.config import get_settings


GROQ_CHAT_COMPLETIONS_URL = "https://api.groq.com/openai/v1/chat/completions"


def generate_match_reason(matched_skills: list[str], collaboration_title: str, required_skills: list[str]) -> str | None:
    settings = get_settings()
    if not settings.groq_api_key:
        return None

    prompt = (
        "Write one short sentence explaining why the student's skills match this collaboration. "
        "Mention only skills from the provided matched skills. Do not exaggerate. "
        f"Collaboration: {collaboration_title}. "
        f"Matched skills: {', '.join(matched_skills)}. "
        f"Required skills: {', '.join(required_skills)}."
    )
    body = json.dumps(
        {
            "model": settings.groq_model,
            "messages": [
                {
                    "role": "system",
                    "content": "You write concise, personalized collaboration match reasons in one sentence.",
                },
                {"role": "user", "content": prompt},
            ],
            "max_tokens": 40,
            "temperature": 0.3,
        }
    ).encode("utf-8")
    request = Request(
        GROQ_CHAT_COMPLETIONS_URL,
        data=body,
        headers={
            "Authorization": f"Bearer {settings.groq_api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=settings.groq_timeout_seconds) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError):
        return None

    reason = payload.get("choices", [{}])[0].get("message", {}).get("content", "").strip()
    if not reason:
        return None
    return reason.splitlines()[0][:220]
