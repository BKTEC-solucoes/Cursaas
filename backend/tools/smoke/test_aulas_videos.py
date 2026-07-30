#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import requests
import json

response = requests.get('http://localhost:8000/api/aulas')
if response.status_code == 200:
    aulas = response.json()
    print(f"Total de aulas: {len(aulas)}")
    print()
    for aula in aulas[:3]:
        print(f"Aula: {aula['titulo']} (ID: {aula['id']})")
        print(f"  Videos: {len(aula.get('videos', []))}")
        if aula.get('videos'):
            for v in aula['videos']:
                print(f"    - {v['arquivo_nome']} ({v['status']})")
        print()
else:
    print(f"Erro: {response.status_code}")
    print(response.text)
