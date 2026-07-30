#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Simular upload do Angular com token JWT
"""
import requests
from pathlib import Path
import os
import json

# Primeiro, fazer login para obter token
print("="*70)
print("1. AUTENTICANDO...")
print("="*70)

login_response = requests.post(
    'http://localhost:8000/api/auth/login',
    json={'email': 'admin@example.com', 'senha': 'senha123'}
)

if login_response.status_code != 200:
    print(f"❌ Erro ao fazer login: {login_response.status_code}")
    print(login_response.text)
    exit(1)

token = login_response.json().get('access_token')
print(f"✓ Token obtido: {token[:20]}...")

# Agora fazer upload com token
print("\n" + "="*70)
print("2. FAZENDO UPLOAD COM TOKEN JWT...")
print("="*70)

test_file = "c:\\projetos\\Cursaas\\backend\\uploads\\videos\\aula_3_video_1771798298295.mp4"

with open(test_file, 'rb') as f:
    files = {'file': (Path(test_file).name, f)}
    headers = {'Authorization': f'Bearer {token}'}
    
    response = requests.post(
        'http://localhost:8000/api/aulas/6/upload-video',
        files=files,
        headers=headers,
        timeout=30
    )

print(f"Status: {response.status_code}")

if response.status_code in [200, 201]:
    print("✓ Upload bem-sucedido!")
    data = response.json()
    print(f"\nResposta da API:")
    print(json.dumps(data, indent=2, default=str))
    
    # Verificar se arquivo existe
    caminho = data.get('caminho_arquivo')
    if os.path.exists(caminho):
        print(f"\n✓ Arquivo salvo em: {caminho}")
    else:
        print(f"\n⚠️ Arquivo não encontrado em: {caminho}")
else:
    print("❌ Erro no upload:")
    print(response.text)
