#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import requests
import json

# Testar GET /api/aulas/1
print("="*60)
print("GET /api/aulas/1")
print("="*60)
response = requests.get('http://localhost:8000/api/aulas/1')
print(json.dumps(response.json(), indent=2, default=str))

print("\n" + "="*60)
print("GET /api/aulas (Lista completa)")
print("="*60)
response = requests.get('http://localhost:8000/api/aulas')
aulas = response.json()
if aulas:
    aula = aulas[0]
    print(f"\nPrimeira aula:")
    print(json.dumps(aula, indent=2, default=str))
