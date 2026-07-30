#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""Script de teste para registro de usuário"""

import requests
import json
import sys

BASE_URL = "http://localhost:8000"

def test_registro():
    """Testa o endpoint de registro"""
    
    print("=" * 70)
    print("TESTE DE REGISTRO - CURSAAS API")
    print("=" * 70)
    print()
    
    # Dados de teste
    usuario_data = {
        "nome": "Bianca Santos",
        "email": "bianca@cursaas.com",
        "senha": "batata123"
    }
    
    print(f"📤 Enviando requisição para: {BASE_URL}/api/auth/registro")
    print(f"📋 Dados: {json.dumps(usuario_data, indent=2)}")
    print()
    
    try:
        # Fazer a requisição
        response = requests.post(
            f"{BASE_URL}/api/auth/registro",
            json=usuario_data,
            timeout=5
        )
        
        print(f"📊 Status Code: {response.status_code}")
        print()
        
        # Analisar resposta
        if response.status_code == 200:
            data = response.json()
            print("✅ SUCESSO!")
            print()
            print("Resposta:")
            print(json.dumps(data, indent=2))
            print()
            print(f"✨ Token JWT: {data['access_token'][:50]}...")
            print(f"✨ Usuário: {data['usuario']['nome']} ({data['usuario']['email']})")
            print(f"✨ Role: {data['usuario']['role']}")
            return True
            
        else:
            print(f"❌ ERRO {response.status_code}")
            print()
            print("Resposta:")
            try:
                print(json.dumps(response.json(), indent=2))
            except:
                print(response.text)
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ ERRO: Não conseguiu conectar ao servidor")
        print("   FastAPI está rodando em http://localhost:8000?")
        return False
    except Exception as e:
        print(f"❌ ERRO: {type(e).__name__}: {e}")
        return False

if __name__ == "__main__":
    success = test_registro()
    sys.exit(0 if success else 1)
