# RouteWise AI — Troubleshooting Guide

## Common Issues and Quick Fixes

### 1. Port Conflicts (Port 8000, 8001, or 5173 Already in Use)

**Symptom:** `OSError: [Errno 10048] error while attempting to bind on address ('127.0.0.1', 8000)`

**Solution:**
Check for active processes on those ports:
```powershell
# Windows PowerShell:
Get-NetTCPConnection -LocalPort 8000, 8001, 5173 -ErrorAction SilentlyContinue | Select-Object LocalPort, OwningProcess
Stop-Process -Id <PID> -Force
```
Or customize ports in `.env`:
```bash
MCP_SERVER_PORT=8010
BACKEND_PORT=8011
MCP_SERVER_URL=http://127.0.0.1:8010/mcp
```

---

### 2. PowerShell Script Execution Policy Error with `npm`

**Symptom:** `npm.ps1 cannot be loaded because running scripts is disabled on this system.`

**Solution:**
On Windows PowerShell, run `npm.cmd` instead of `npm`, or temporarily bypass script policy in your session:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
```

---

### 3. MCP Server Unreachable from Backend

**Symptom:** In the UI, the MCP status pill indicates `Offline`, or the Inspector shows `unreachable`.

**Solution:**
1. Verify the MCP server is running:
   ```bash
   python mcp_server/server.py
   ```
2. Verify its health endpoint in your browser: `http://127.0.0.1:8000/health`.
3. Test using the standalone verification script:
   ```bash
   python scripts/test_mcp_connection.py
   ```

---

### 4. Amazon Bedrock Authentication or Access Denied

**Symptom:** `boto3.exceptions.NoCredentialsError` or `AccessDeniedException: Model access not granted`.

**Solution:**
1. Check that AWS CLI is configured with valid credentials:
   ```bash
   aws sts get-caller-identity
   ```
2. Verify you requested and received access for Anthropic Claude 3.5 Sonnet in the **Amazon Bedrock Console -> Model access**.
3. Verify the model ID exists in your configured region:
   ```bash
   aws bedrock list-foundation-models --region us-east-1
   ```
4. If credentials are not immediately available, simply keep `AI_PROVIDER=mock` in `.env` to test the full application offline with zero cost.
