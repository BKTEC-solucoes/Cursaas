#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Script para testar upload de vídeo completo
"""
import requests
from pathlib import Path
import os

# Usar um arquivo pequeno para teste
test_file = "c:\\projetos\\Cursaas\\backend\\uploads\\videos\\aula_3_video_1771798298295.mp4"

if not os.path.exists(test_file):
    print(f"❌ Arquivo de teste não encontrado: {test_file}")
    exit(1)

file_size = os.path.getsize(test_file) / 1024 / 1024

print("="*70)
print("TESTE DE UPLOAD DE VÍDEO")
print("="*70)
print(f"\nArquivo: {Path(test_file).name}")
print(f"Tamanho: {file_size:.2f} MB")
print(f"\nTestando upload para aula 5...")

try:
    with open(test_file, 'rb') as f:
        files = {'file': (Path(test_file).name, f)}
        
        # Fazer upload
        response = requests.post(
            'http://localhost:8000/api/aulas/5/upload-video',
            files=files,
            timeout=30
        )
        
    print(f"\n✓ Status: {response.status_code}")
    
    if response.status_code in [200, 201]:
        print("✓ Upload bem-sucedido!")
        data = response.json()
        print(f"  - Arquivo: {data.get('arquivo_nome')}")
        print(f"  - Tamanho: {data.get('tamanho_bytes')} bytes")
        print(f"  - Status: {data.get('status')}")
        print(f"  - Caminho: {data.get('caminho_arquivo')}")
        
        # Verificar se arquivo existe
        caminho = data.get('caminho_arquivo')
        if os.path.exists(caminho):
            print(f"\n✓ Arquivo foi salvo no disco:")
            print(f"  {caminho}")
            print(f"  Tamanho no disco: {os.path.getsize(caminho) / 1024 / 1024:.2f} MB")
        else:
            print(f"\n❌ Arquivo NÃO foi encontrado no disco:")
            print(f"  {caminho}")
    else:
        print(f"✗ Erro de upload:")
        print(response.text)
        
except Exception as e:
    print(f"❌ Erro: {e}")
