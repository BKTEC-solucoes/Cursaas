#!/usr/bin/env python
"""
Servidor FastAPI para Cursaas EAD
Executa continuamente sem fechar
"""
import sys
import os

# Adicionar o backend ao path
sys.path.insert(0, r'c:\projetos\Cursaas\backend')
os.chdir(r'c:\projetos\Cursaas\backend')

print("=" * 70)
print("CURSAAS - Servidor API")
print("=" * 70)
print()

print("[1/3] Carregando configurações...")
try:
    from app.config import settings
    print(f"      ✓ DATABASE_URL: {settings.DATABASE_URL[:50]}...")
except Exception as e:
    print(f"      ✗ Erro: {e}")
    exit(1)

print("[2/3] Inicializando banco de dados...")
try:
    from app.database import engine, Base
    Base.metadata.create_all(bind=engine)
    print("      ✓ Banco de dados pronto")
except Exception as e:
    print(f"      ✗ Erro: {e}")
    print("      ⚠️  Continuando mesmo assim...")

print("[3/3] Iniciando servidor...")
print()

import uvicorn
from app.main import app

try:
    uvicorn.run(
        app,
        host='127.0.0.1',
        port=8000,
        log_level='info'
    )
except KeyboardInterrupt:
    print("\n✓ Servidor encerrado pelo usuário")
    exit(0)
except Exception as e:
    print(f"\n✗ Erro do servidor: {e}")
    exit(1)
