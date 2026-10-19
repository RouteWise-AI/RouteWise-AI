"""
RouteWise AI - Local Services Orchestrator
Launches the MCP Server, FastAPI Backend, and React Frontend concurrently.
"""

import os
import signal
import subprocess
import sys
import time
from pathlib import Path

# Ensure UTF-8 stdout on Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

ROOT_DIR = Path(__file__).resolve().parent.parent

# Detect python executable in venv
if sys.platform == "win32":
    VENV_PYTHON = ROOT_DIR / ".venv" / "Scripts" / "python.exe"
    NPM_CMD = "npm.cmd"
else:
    VENV_PYTHON = ROOT_DIR / ".venv" / "bin" / "python"
    NPM_CMD = "npm"

if not VENV_PYTHON.exists():
    VENV_PYTHON = Path(sys.executable)

processes = []


def terminate_all(sig=None, frame=None):
    print("\n[RouteWise AI] Gracefully terminating all background services...")
    for p in processes:
        try:
            if sys.platform == "win32":
                p.terminate()
            else:
                p.send_signal(signal.SIGINT)
        except Exception:
            pass
    print("[RouteWise AI] All processes stopped. Goodbye!")
    sys.exit(0)


def main():
    signal.signal(signal.SIGINT, terminate_all)
    signal.signal(signal.SIGTERM, terminate_all)

    print("=" * 70)
    print("  [RouteWise AI] Smarter Decisions for Every Journey")
    print("  Amazon Developer Hackathon: Build, Ship, Shape Edition")
    print("=" * 70)

    env = os.environ.copy()
    env["PYTHONPATH"] = f"{ROOT_DIR / 'backend'}{os.pathsep}{ROOT_DIR}"

    # 1. Start MCP Server (Port 8000)
    print("\n[1/3] Starting MCP Server over Streamable HTTP on port 8000...")
    mcp_proc = subprocess.Popen(
        [str(VENV_PYTHON), "mcp_server/server.py"],
        cwd=str(ROOT_DIR),
        env=env,
    )
    processes.append(mcp_proc)
    time.sleep(1.5)

    # 2. Start FastAPI Backend (Port 8001)
    print("[2/3] Starting FastAPI Backend on port 8001...")
    backend_proc = subprocess.Popen(
        [
            str(VENV_PYTHON),
            "-m",
            "uvicorn",
            "app.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8001",
            "--reload",
        ],
        cwd=str(ROOT_DIR / "backend"),
        env=env,
    )
    processes.append(backend_proc)
    time.sleep(1.5)

    # 3. Start Frontend (Port 5173)
    print("[3/3] Starting React + TypeScript + Vite Frontend on port 5173...")
    frontend_proc = subprocess.Popen(
        [NPM_CMD, "run", "dev", "--", "--host", "0.0.0.0"],
        cwd=str(ROOT_DIR / "frontend"),
        env=env,
        shell=(sys.platform == "win32"),
    )
    processes.append(frontend_proc)

    print("\n" + "=" * 70)
    print("  >>> ALL SERVICES RUNNING LOCALLY:")
    print("  [+] Web Application:   http://localhost:5173 (or http://127.0.0.1:5173)")
    print("  [+] Backend REST API:  http://127.0.0.1:8001 (Docs: http://127.0.0.1:8001/docs)")
    print("  [+] MCP Streamable:    http://127.0.0.1:8000/mcp (Health: http://127.0.0.1:8000/health)")
    print("=" * 70)
    print("\nPress Ctrl+C to terminate all services.\n")

    try:
        while True:
            time.sleep(1)
            # Check if any process terminated prematurely
            for p in processes:
                ret = p.poll()
                if ret is not None:
                    print(f"\n[WARNING] Process {p.args} exited with code {ret}")
                    terminate_all()
    except KeyboardInterrupt:
        terminate_all()


if __name__ == "__main__":
    main()

