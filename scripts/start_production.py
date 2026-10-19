"""
RouteWise AI - Production Process Orchestrator for Render
Starts the local MCP Server (if configured for localhost) and the FastAPI Backend on $PORT.
Handles graceful shutdown on SIGTERM / SIGINT signals from hosting environments.
"""

import os
import signal
import subprocess
import sys
import time
import urllib.request
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

# Ensure stdout/stderr flush immediately in container environments
sys.stdout.reconfigure(line_buffering=True) if hasattr(sys.stdout, "reconfigure") else None

processes = []


def terminate_all(sig=None, frame=None):
    print("\n[RouteWise Production] Received shutdown signal. Terminating child processes...")
    for p in processes:
        try:
            if sys.platform == "win32":
                p.terminate()
            else:
                p.send_signal(signal.SIGTERM)
        except Exception:
            pass
    print("[RouteWise Production] Clean shutdown complete.")
    sys.exit(0)


def wait_for_mcp(health_url: str, timeout_seconds: int = 10) -> bool:
    """Poll the MCP server health endpoint until ready or timeout."""
    start_time = time.time()
    while time.time() - start_time < timeout_seconds:
        try:
            req = urllib.request.Request(health_url, headers={"User-Agent": "RouteWise-HealthCheck"})
            with urllib.request.urlopen(req, timeout=1.0) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            time.sleep(0.5)
    return False


def main():
    signal.signal(signal.SIGINT, terminate_all)
    signal.signal(signal.SIGTERM, terminate_all)

    # Render binds web traffic to $PORT, defaulting to 8001 locally
    render_port = int(os.environ.get("PORT", os.environ.get("BACKEND_PORT", 8001)))
    render_host = os.environ.get("HOST", "0.0.0.0")

    # Environment setup
    env = os.environ.copy()
    backend_path = str(ROOT_DIR / "backend")
    root_path = str(ROOT_DIR)
    current_pythonpath = env.get("PYTHONPATH", "")
    env["PYTHONPATH"] = f"{backend_path}{os.pathsep}{root_path}" + (f"{os.pathsep}{current_pythonpath}" if current_pythonpath else "")

    mcp_url = env.get("MCP_SERVER_URL", "http://127.0.0.1:8000/mcp")
    is_local_mcp = "127.0.0.1" in mcp_url or "localhost" in mcp_url

    print("=" * 65)
    print("  [RouteWise AI] Production Orchestrator")
    print(f"  Target Host: {render_host}:{render_port}")
    print(f"  MCP Server URL: {mcp_url} (Internal daemon: {is_local_mcp})")
    print("=" * 65)

    # 1. Start background MCP Server if pointing to local host
    if is_local_mcp:
        mcp_env = env.copy()
        # Ensure MCP server binds to internal port 8000, NOT the external Render $PORT
        mcp_env["PORT"] = "8000"
        mcp_env["MCP_SERVER_PORT"] = "8000"
        mcp_env["MCP_SERVER_HOST"] = "127.0.0.1"

        print("[1/2] Starting RouteWise MCP Server daemon on 127.0.0.1:8000...")
        mcp_proc = subprocess.Popen(
            [sys.executable, str(ROOT_DIR / "mcp_server" / "server.py")],
            cwd=str(ROOT_DIR),
            env=mcp_env,
        )
        processes.append(mcp_proc)

        # Wait up to 10 seconds for MCP /health to respond
        health_url = "http://127.0.0.1:8000/health"
        if wait_for_mcp(health_url, timeout_seconds=10):
            print("       [OK] MCP Server is healthy and accepting Streamable HTTP connections.")
        else:
            print("       [WARN] MCP Server startup verification timed out; continuing backend launch.")
    else:
        print(f"[1/2] Using external/remote MCP server at: {mcp_url}")

    # 2. Start FastAPI Backend in foreground binding to 0.0.0.0:$PORT
    print(f"[2/2] Starting FastAPI Backend on {render_host}:{render_port}...")
    try:
        import uvicorn
        # Run uvicorn synchronously in the main process
        uvicorn.run(
            "app.main:app",
            host=render_host,
            port=render_port,
            log_level="info",
            access_log=True,
            reload=False,
        )
    except Exception as e:
        print(f"[RouteWise Production] Fatal backend error: {e}", file=sys.stderr)
        terminate_all()


if __name__ == "__main__":
    main()
