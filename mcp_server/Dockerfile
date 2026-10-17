FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY mcp_server/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY mcp_server/ mcp_server/
COPY backend/app/logistics/ backend/app/logistics/

ENV PYTHONPATH="/app/backend:/app"
ENV MCP_SERVER_HOST="0.0.0.0"
ENV MCP_SERVER_PORT="8000"

EXPOSE 8000

CMD ["python", "mcp_server/server.py"]
