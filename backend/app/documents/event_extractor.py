"""
AI-powered event and content extraction from documents using Vision LLMs.
"""
import json
import httpx
import structlog

logger = structlog.get_logger(__name__)

EVENT_TYPES = ["Lost Circulation", "Kick", "Stuck Pipe", "Torque Spike", "Formation Instability",
               "Blowout", "Casing Wear", "Cementing Issue", "Equipment Failure", "Other"]

VISION_PROMPT = """You are an expert document analysis AI.
Please carefully read and analyze the provided image of the document page.

Extract all textual content from the image and format it as clean Markdown. 
Preserve headings, lists, and represent any tables using Markdown table syntax.
Do not add any explanation, just return the raw markdown text.
"""

async def extract_from_vision(
    b64_image: str,
    ai_provider: str,
    api_key: str,
    model: str,
    base_url: str,
) -> dict:
    """Call Vision LLM to extract markdown text and structured events from a page image."""
    prompt = VISION_PROMPT

    is_ollama = ai_provider == "ollama"
    # Note: openrouter uses standard OpenAI vision payload
    # "image_url": {"url": f"data:image/jpeg;base64,{b64_image}"}

    messages = [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": prompt},
                {
                    "type": "image_url",
                    "image_url": {
                        "url": f"data:image/jpeg;base64,{b64_image}"
                    }
                }
            ]
        }
    ]
    
    # If using ollama with llava, the format might be slightly different depending on the proxy, 
    # but ollama natively supports base64 images in 'images' array.
    if is_ollama:
        messages = [
            {
                "role": "user",
                "content": prompt,
                "images": [b64_image]
            }
        ]

    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": 0.0,
                "max_tokens": 3000,
            }
            headers = {"Authorization": f"Bearer {api_key}"}
            res = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=180.0,
            )
            res.raise_for_status()
            raw = res.json()["choices"][0]["message"]["content"].strip()

            # No JSON anymore, just raw text
            return {
                "markdown_content": raw,
                "events": []
            }
    except Exception as e:
        logger.warning("vision_extraction_failed", error=str(e))
        return {"markdown_content": "", "events": []}

EXTRACTION_PROMPT = """You are an expert drilling engineer analyzing a document for drilling incidents and events.

Extract ALL drilling incidents, events, and non-productive time (NPT) entries from the text.
For each event found, return a JSON object with these fields:
- "event_type": one of {event_types}
- "severity": one of "Low", "Moderate", "High", "Critical"
- "start_depth": depth in meters where event started (number or null)
- "end_depth": depth in meters where event ended (number or null)
- "description": brief description of the event
- "cause": root cause if mentioned
- "consequence": what happened as a result
- "npt_hours": non-productive time in hours (number or null)
- "well_name": well name/ID mentioned (string or null)
- "field_name": field name mentioned (string or null)
- "basin_name": basin name mentioned (string or null)
- "formation_name": formation name mentioned (string or null)
- "mitigation": mitigation action taken (string or null)
- "lesson_learned": lesson learned mentioned (string or null)

Return a JSON array. If no events found, return [].
Do not add any explanation, only return the JSON array.

Document text:
{text}
"""

async def extract_events_from_text(
    text: str,
    ai_provider: str,
    api_key: str,
    model: str,
    base_url: str,
) -> list[dict]:
    """Call LLM to extract structured events from document text (fallback for non-vision)."""
    if not text.strip():
        return []

    prompt = EXTRACTION_PROMPT.format(
        event_types=", ".join(f'"{t}"' for t in EVENT_TYPES),
        text=text[:6000],  # cap to avoid token limits
    )

    try:
        async with httpx.AsyncClient() as client:
            payload = {
                "model": model,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.0,
                "max_tokens": 2000,
            }
            
            is_ollama = ai_provider == "ollama"
            if not is_ollama and "openrouter" in base_url.lower():
                payload["response_format"] = {"type": "json_object"}
                
            headers = {"Authorization": f"Bearer {api_key}"}
            res = await client.post(
                f"{base_url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=120.0,
            )
            res.raise_for_status()
            raw = res.json()["choices"][0]["message"]["content"].strip()

            # Strip markdown fences
            if raw.startswith("```"):
                raw = raw.split("```")[1]
                if raw.startswith("json"):
                    raw = raw[4:]
            raw = raw.strip()

            events = json.loads(raw)
            # handle case where LLM wraps array in an object (due to json_object requirement)
            if isinstance(events, dict) and "events" in events:
                events = events["events"]
            if isinstance(events, list):
                return events
            return []
    except Exception as e:
        logger.warning("text_event_extraction_failed", error=str(e))
        return []

