#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Test script para debugar o erro 500 no registro
"""
import json
import requests
import sys
sys.path.insert(0, r'c:\projetos\Cursaas\backend')

print("=" * 70)
print("TESTE DETALHADO DE REGISTRO - DEBUG")
print("=" * 70)
print()

# Testar se consegue conectar
print("[1/4] Testando conexão com o servidor...")
try:
    response = requests.get("http://localhost:8000/health", timeout=5)
    if response.status_code == 200:
        print("      ✓ Servidor respondendo")
    else:
        print(f"      ✗ Status: {response.status_code}")
        exit(1)
except Exception as e:
    print(f"      ✗ Erro de conexão: {e}")
    exit(1)

print()
print("[2/4] Testando schemas locais...")
try:
    from app.schemas import UsuarioCreate, UsuarioResponse, RoleEnum
    print("      ✓ Schemas importados com sucesso")
    
    # Criar dados de teste
    usuario_data = UsuarioCreate(
        nome="Bianca Santos",
        email="bianca@cursaas.com",
        senha="batata123"
    )
    print(f"      ✓ Dados de teste criados: {usuario_data}")
except Exception as e:
    print(f"      ✗ Erro ao carregar schemas: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print()
print("[3/4] Testando auth service...")
try:
    from app.services.auth_service import AuthService
    from app.database import SessionLocal
    
    db = SessionLocal()
    service = AuthService()
    
    # Testar hash de senha
    hash_resultado = service.hash_password("test123")
    print(f"      ✓ Função hash_password funcionando")
    
    # Verificar hash
    verify = service.verify_password("test123", hash_resultado)
    print(f"      ✓ Função verify_password funcionando: {verify}")
    
    db.close()
except Exception as e:
    print(f"      ✗ Erro no auth service: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

print()
print("[4/4] Testando endpoint /api/auth/registro...")
print()

dados = {
    "nome": "Bianca Santos",
    "email": "bianca@cursaas.com",
    "senha": "batata123"
}

print(f"    URL: POST http://localhost:8000/api/auth/registro")
print(f"    Dados: {json.dumps(dados, indent=2)}")
print()

try:
    response = requests.post(
        "http://localhost:8000/api/auth/registro",
        json=dados,
        timeout=5
    )
    
    print(f"    Status: {response.status_code}")
    print(f"    Headers: {dict(response.headers)}")
    print(f"    Response: {response.text}")
    print()
    
    if response.status_code == 200:
        print("✓ SUCESSO! Registr registrado")
        data = response.json()
        print(f"  Token: {data.get('access_token', 'N/A')[:50]}...")
        print(f"  User: {data.get('usuario', 'N/A')}")
    else:
        print(f"✗ ERRO {response.status_code}: {response.text}")
        
except Exception as e:
    print(f"    ✗ Erro: {e}")
    import traceback
    traceback.print_exc()
