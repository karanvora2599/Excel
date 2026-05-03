#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ ! -d ".venv" ]; then
  python -m venv .venv
  .venv/Scripts/pip install -r requirements.txt
fi
.venv/Scripts/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
