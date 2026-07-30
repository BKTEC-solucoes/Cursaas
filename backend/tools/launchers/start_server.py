#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import os
import sys
sys.path.insert(0, r'c:\projetos\Cursaas\backend')

# Test imports
print("Testing imports...")
try:
    from app.database import engine, Base
    print("✓ Database imports OK")
except Exception as e:
    print(f"✗ Database error: {e}")
    exit(1)

try:
    from app.config import settings
    print("✓ Config OK")
    print(f"  DATABASE_URL: {settings.DATABASE_URL}")
except Exception as e:
    print(f"✗ Config error: {e}")
    exit(1)

try:
    from app.routes import auth
    print("✓ Routes OK")
except Exception as e:
    print(f"✗ Routes error: {e}")
    exit(1)

print("\nAttempting to create database tables...")
try:
    Base.metadata.create_all(bind=engine)
    print("✓ Tables created (or already exist)")
except Exception as e:
    print(f"✗ Table creation error: {e}")
    print("\n⚠️  This is expected if MySQL is not configured correctly.")
    print("   Edit .env with correct MySQL credentials and try again.")
    print("\nContinuing anyway to test FastAPI...")

print("\nStarting FastAPI server...")
import uvicorn
from app.main import app

try:
    uvicorn.run(app, host='127.0.0.1', port=8000, reload=False)
except Exception as e:
    print(f"✗ Server error: {e}")
    exit(1)
