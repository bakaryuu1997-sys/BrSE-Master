import ipaddress
import secrets
from fastapi import Request
from fastapi.responses import JSONResponse
from app.core.config import settings


LOCAL_NETWORKS = [
    ipaddress.ip_network("127.0.0.0/8"),
    ipaddress.ip_network("10.0.0.0/8"),
    ipaddress.ip_network("172.16.0.0/12"),
    ipaddress.ip_network("192.168.0.0/16"),
    ipaddress.ip_network("169.254.0.0/16"),
    ipaddress.ip_network("::1/128"),
    ipaddress.ip_network("fe80::/10"),
    ipaddress.ip_network("fc00::/7"),
]


def is_local_ip(ip: str) -> bool:
    ip = ip.strip()
    if not ip:
        return True
    if ip in ("127.0.0.1", "::1", "localhost", "testclient"):
        return True
    if ip.startswith("::ffff:"):
        ip = ip[7:]
    try:
        addr = ipaddress.ip_address(ip)
        return any(addr in net for net in LOCAL_NETWORKS)
    except ValueError:
        return False


def check_api_auth(request: Request) -> JSONResponse | None:
    path = request.url.path
    if path.startswith("/api"):
        norm_path = path.rstrip("/")
        
        # Public endpoints are matched EXACTLY. They used to match by prefix, which silently made every
        # sub-route of /api/health public (db/inspect/{table} dumped table rows, health/self-heal
        # mutated state). A new route under these paths is protected unless it is listed here.
        PUBLIC_PATHS = {
            "/api/health",
            "/api/health/db",
            "/api/health/deep",
            "/api/ai/status",
        }
        is_public = norm_path in PUBLIC_PATHS
        
        if not is_public:
            secret_key = (settings.brse_api_secret or "").strip()
            
            # Check if request is remote (e.g. CF Tunnel or external network proxy)
            client_host = request.client.host if request.client else "unknown"
            x_forwarded_for = request.headers.get("x-forwarded-for", "")
            cf_connecting_ip = request.headers.get("cf-connecting-ip", "")
            
            is_remote = not (
                is_local_ip(client_host) and 
                (not x_forwarded_for or is_local_ip(x_forwarded_for.split(",")[0].strip())) and 
                (not cf_connecting_ip or is_local_ip(cf_connecting_ip.strip()))
            )
            
            if is_remote and not secret_key:
                return JSONResponse(
                    status_code=401,
                    content={"detail": "Unauthorized: Remote access detected but BRSE_API_SECRET is not configured on the server."}
                )
            
            if secret_key or is_remote:
                token = request.headers.get("x-brse-token") or request.headers.get("x-brse-api-key")
                if not token or not secrets.compare_digest(token, secret_key):
                    return JSONResponse(
                        status_code=401,
                        content={"detail": "Unauthorized: Invalid BrSE Personal Token"}
                    )
    return None
