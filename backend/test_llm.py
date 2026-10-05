import asyncio
import httpx
from app.config import settings

async def test():
    payload = {
        "model": settings.MODEL_NAME,
        "messages": [{"role": "user", "content": "hello"}],
        "temperature": 0.3,
        "max_tokens": 10
    }
    print("Testing Ollama...")
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(f"http://localhost:11434/v1/chat/completions", json=payload)
            print("Status:", res.status_code)
            print("Body:", res.text)
    except Exception as e:
        print("Error:", repr(e))

asyncio.run(test())
