FROM python:3.12-slim

WORKDIR /app

# System deps kept minimal; pandas/openpyxl wheels are prebuilt.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# App Runner / most container hosts inject $PORT. Default to 8000 locally.
ENV PORT=8000
EXPOSE 8000

# One worker is right for pilot volumes; raise later behind the async-job work.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT}"]
