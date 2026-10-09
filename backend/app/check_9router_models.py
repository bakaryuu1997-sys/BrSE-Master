import httpx
import json
import asyncio
from app.core.config import settings

async def check_models():
    print(f"Connecting to 9Router at: {settings.openai_base_url}")
    headers = {
        "Authorization": f"Bearer {settings.openai_api_key}"
    }
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(f"{settings.openai_base_url}/models", headers=headers, timeout=10.0)
            if response.status_code == 200:
                models = response.json().get("data", [])
                model_ids = [m["id"] for m in models]
                print(json.dumps({"available_models": model_ids}, indent=2))
            else:
                print(json.dumps({"error": f"HTTP {response.status_code}", "body": response.text}, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}, indent=2))

if __name__ == "__main__":
    asyncio.run(check_models())
