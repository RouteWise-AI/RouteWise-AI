FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY backend/requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy source
COPY backend/ backend/
COPY mcp_server/ mcp_server/

ENV PYTHONPATH="/app/backend:/app"
ENV BACKEND_HOST="0.0.0.0"
ENV BACKEND_PORT="8001"
ENV MCP_SERVER_URL="http://mcp_server:8000/mcp"

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]

