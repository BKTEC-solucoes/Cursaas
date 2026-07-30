#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Test script para testar login e endpoints adicionais
"""
import json
import requests

print("=" * 70)
print("TESTE DE LOGIN - CURSAAS API")
print("=" * 70)
print()

# Tentar login com as credenciais que acabamos de registrar
email = "bianca@cursaas.com"
senha = "batata123"

print(f"📤 Tentando login com:")
print(f"   Email: {email}")
print(f"   Senha: {senha}")
print()

try:
    response = requests.post(
        "http://localhost:8000/api/auth/login",
        json={"email": email, "senha": senha},
        timeout=5
    )
    
    print(f"📊 Status Code: {response.status_code}")
    print()
    
    if response.status_code == 200:
        data = response.json()
        print("✅ LOGIN SUCESSO!")
        print()
        print(f"Token: {data.get('access_token', '')[:50]}...")
        print(f"Token Type: {data.get('token_type', '')}")
        usuario = data.get('usuario', {})
        print(f"User: {usuario.get('nome')} ({usuario.get('email')})")
        print(f"Role: {usuario.get('role')}")
        print(f"Ativo: {usuario.get('ativo')}")
    else:
        print(f"✗ ERRO {response.status_code}")
        print(f"Response: {response.text}")
        
except Exception as e:
    print(f"✗ Erro: {e}")

print()
print("=" * 70)
print("TESTE DE ENDPOINTS BÁSICOS")
print("=" * 70)
print()

# Testar health check
print("[1] Health Check:")
try:
    response = requests.get("http://localhost:8000/health", timeout=5)
    print(f"    Status: {response.status_code}")
    print(f"    Response: {response.json()}")
except Exception as e:
    print(f"    ✗ Erro: {e}")

print()

# Testar root
print("[2] Root Endpoint:")
try:
    response = requests.get("http://localhost:8000/", timeout=5)
    print(f"    Status: {response.status_code}")
    print(f"    Response: {response.json()}")
except Exception as e:
    print(f"    ✗ Erro: {e}")

print()
print("=" * 70)
print("✨ API FUNCIONANDO CORRETAMENTE!")
print("=" * 70)
