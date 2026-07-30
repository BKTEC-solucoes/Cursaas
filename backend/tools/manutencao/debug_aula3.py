# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import requests
import json

response = requests.get('http://localhost:8000/api/aulas/3')
if response.status_code == 200:
    data = response.json()
    print('Dados da aula 3:')
    print(f"Titulo: {data.get('titulo')}")
    print(f"Videos: {len(data.get('videos', []))}")
    
    for i, v in enumerate(data.get('videos', [])):
        print(f"\n  Video {i+1}:")
        print(f"    - Arquivo: {v.get('arquivo_nome')}")
        print(f"    - Caminho: {v.get('caminho_arquivo')}")
        print(f"    - Status: {v.get('status')}")
        print(f"    - Tamanho: {v.get('tamanho_bytes')} bytes")
else:
    print(f'Erro: {response.status_code}')
    print(response.text)