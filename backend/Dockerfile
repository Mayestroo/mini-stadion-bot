FROM python:3.11-slim

RUN addgroup --system --gid 1001 app && \
    adduser --system --uid 1001 --ingroup app app

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY --chown=app:app . .
RUN mkdir -p /app/uploads && chown app:app /app/uploads

USER app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
