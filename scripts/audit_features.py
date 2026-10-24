import urllib.request
import urllib.error
import json
import time
import sys

BASE_URL = "http://127.0.0.1:3010"

ENDPOINTS = [
    ("Health Check", "/api/health"),
    ("Deep System Health", "/api/health/deep"),
    ("AI Provider Health", "/api/ai/health"),
    ("AI Models Status", "/api/ai/status"),
    ("Operations Board", "/api/operations"),
    ("Meeting Minutes History", "/api/meetings/history"),
    ("Personal Schedules", "/api/calendar/schedules"),
    ("IT Glossary Terms", "/api/glossary"),
    ("Universal Notes", "/api/universal-notes"),
    ("Project Settings", "/api/projects"),
]

FRONTEND_ROUTES = [
    ("Main Dashboard", "/app"),
    ("Power Tools", "/app/power-tools"),
    ("BrSE Todo Task Board", "/app/brse-todo"),
    ("Personal Calendar", "/app/calendar"),
    ("IT Glossary Search", "/app/glossary"),
    ("Meeting Minutes Editor", "/app/meeting-note"),
    ("Universal Notes", "/app/notes"),
    ("Operations Tracker", "/app/operations"),
    ("Report Center", "/app/reports"),
    ("Project Settings", "/app/settings/projects"),
    ("Email & Doc Templates", "/app/templates"),
]

def check_endpoints():
    print("=" * 70)
    print("1. CHECKING BACKEND API ENDPOINTS")
    print("=" * 70)
    all_ok = True
    for name, path in ENDPOINTS:
        url = f"{BASE_URL}{path}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "BrSE-HealthCheck/1.0"})
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = (time.time() - t0) * 1000
                status = resp.status
                print(f"  [PASS] {name:25} ({path:25}) -> HTTP {status} in {elapsed:.1f}ms")
        except urllib.error.HTTPError as e:
            all_ok = False
            print(f"  [FAIL] {name:25} ({path:25}) -> HTTP {e.code}")
        except Exception as e:
            all_ok = False
            print(f"  [ERROR] {name:25} ({path:25}) -> {e}")

    print("\n" + "=" * 70)
    print("2. CHECKING FRONTEND PAGES")
    print("=" * 70)
    for name, path in FRONTEND_ROUTES:
        url = f"{BASE_URL}{path}"
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "BrSE-HealthCheck/1.0"})
            t0 = time.time()
            with urllib.request.urlopen(req, timeout=10) as resp:
                elapsed = (time.time() - t0) * 1000
                status = resp.status
                print(f"  [PASS] {name:25} ({path:25}) -> HTTP {status} in {elapsed:.1f}ms")
        except urllib.error.HTTPError as e:
            all_ok = False
            print(f"  [FAIL] {name:25} ({path:25}) -> HTTP {e.code}")
        except Exception as e:
            all_ok = False
            print(f"  [ERROR] {name:25} ({path:25}) -> {e}")

    print("\n" + "=" * 70)
    print("3. CHECKING AI RUNTIME & 9ROUTER")
    print("=" * 70)
    try:
        req = urllib.request.Request("http://127.0.0.1:20128/v1/models")
        with urllib.request.urlopen(req, timeout=5) as resp:
            print("  [PASS] 9router Native Port (:20128) -> Online (HTTP 200)")
    except urllib.error.HTTPError as e:
        if e.code in (401, 403):
            print(f"  [PASS] 9router Native Port (:20128) -> Online (Auth Required: HTTP {e.code})")
        else:
            print(f"  [WARN] 9router Native Port (:20128) -> HTTP {e.code}")
    except Exception as e:
        print(f"  [WARN] 9router Native Port (:20128) -> {e}")

    return all_ok

if __name__ == "__main__":
    success = check_endpoints()
    sys.exit(0 if success else 1)
