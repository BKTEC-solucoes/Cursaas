FROM python:3.12-slim

ARG BACKEND_DIR=backend
ARG UVICORN_APP=app.main:app

WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UVICORN_APP=${UVICORN_APP}

COPY ${BACKEND_DIR}/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY ${BACKEND_DIR}/ /app/

EXPOSE 8000

CMD sh -c "uvicorn ${UVICORN_APP} --host 0.0.0.0 --port 8000"
