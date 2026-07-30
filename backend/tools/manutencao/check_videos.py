#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import requests

print("Testando GET /api/aulas para verificar se videos estão sendo retornados")
print("="*70)

response = requests.get('http://localhost:8000/api/aulas')
if response.status_code == 200:
    aulas = response.json()
    for aula in aulas[:5]:  # Primeiras 5 aulas
        videos = aula.get('videos', [])
        print(f"\n✓ Aula ID {aula['id']}: '{aula['titulo']}'")
        if videos:
            print(f"  ✓✓ Tem {len(videos)} video(s):")
            for v in videos:
                print(f"     - {v['arquivo_nome']} ({v['status']})")
        else:
            print(f"  ✗ Sem vídeos")
else:
    print(f"✗ Erro ao conectar: {response.status_code}")
