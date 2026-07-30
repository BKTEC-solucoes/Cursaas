# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

import re

path = r'c:\Users\Gabriel\Documents\GitHub\Cursaas\frontend\src\app\features\instituicao\pages\alunos.component.ts'

with open(path, 'rb') as f:
    data = f.read()

# Mapeamento: bytes mojibake (CP1252 re-encoded como UTF-8) -> bytes UTF-8 corretos
replacements = [
    # Emojis
    # 👨‍🎓 (U+1F468 U+200D U+1F393)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xa8\xc3\xa2\xe2\x82\xac\xc2\x8d\xc3\xb0\xc5\xb8\xc5\xbd\xe2\x80\x9c', '👨‍🎓'.encode('utf-8')),
    # 🗑️ (U+1F5D1 U+FE0F)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x94\xc2\xb1\xc3\xaf\xc2\xb8\xc2\x8f', '🗑️'.encode('utf-8')),
    # ✏️ (U+270F U+FE0F)
    (b'\xc3\xa2\xc2\x9c\xc2\x8f\xc3\xaf\xc2\xb8\xc2\x8f', '✏️'.encode('utf-8')),
    # ➕ (U+2795)
    (b'\xc3\xa2\xc2\x9e\xc2\x95', '➕'.encode('utf-8')),
    # 👤 (U+1F464)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xa4', '👤'.encode('utf-8')),
    # 📍 (U+1F4CD)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x9c\xc2\x8d', '📍'.encode('utf-8')),
    # 👨‍👩‍👦 (family)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xa8\xc3\xa2\xe2\x82\xac\xc2\x8d\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xa9\xc3\xa2\xe2\x82\xac\xc2\x8d\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xa6', '👨‍👩‍👦'.encode('utf-8')),
    # 🎓 (U+1F393)
    (b'\xc3\xb0\xc5\xb8\xc5\xbd\xe2\x80\x9c', '🎓'.encode('utf-8')),
    # 💾 (U+1F4BE)
    (b'\xc3\xb0\xc5\xb8\xe2\x80\x98\xc2\xbe', '💾'.encode('utf-8')),
    # ✔ (U+2714)
    (b'\xc3\xa2\xc2\x9c\xc2\x94', '✔'.encode('utf-8')),
    # ✗ (U+2717)
    (b'\xc3\xa2\xc2\x9c\xc2\x97', '✗'.encode('utf-8')),

    # Caracteres portugueses (Latin-1 re-encoded)
    # Ã£ = ã
    (b'\xc3\x83\xc2\xa3', 'ã'.encode('utf-8')),
    # Ã§ = ç
    (b'\xc3\x83\xc2\xa7', 'ç'.encode('utf-8')),
    # Ãµ = õ
    (b'\xc3\x83\xc2\xb5', 'õ'.encode('utf-8')),
    # Ã¡ = á
    (b'\xc3\x83\xc2\xa1', 'á'.encode('utf-8')),
    # Ã© = é
    (b'\xc3\x83\xc2\xa9', 'é'.encode('utf-8')),
    # Ã­ = í
    (b'\xc3\x83\xc2\xad', 'í'.encode('utf-8')),
    # Ã³ = ó
    (b'\xc3\x83\xc2\xb3', 'ó'.encode('utf-8')),
    # Ãº = ú
    (b'\xc3\x83\xc2\xba', 'ú'.encode('utf-8')),
    # Ã = Â (not needed usually, but covers Â prefix artifacts)
    # â€" = — (em dash U+2014)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9c', '—'.encode('utf-8')),
    # â€™ = ' (right single quote)
    (b'\xc3\xa2\xe2\x82\xac\xe2\x84\xa2', '\u2019'.encode('utf-8')),
    # Â° = ° (degree)
    (b'\xc3\x82\xc2\xb0', '°'.encode('utf-8')),
    # Ã (U+00C3 alone, uppercase A-tilde) - careful, only replace when followed by non-combining
    # Ã© = é already covered above
    # Ã  = à
    (b'\xc3\x83\xc2\xa0', 'à'.encode('utf-8')),
]

count = 0
for old, new in replacements:
    occurrences = data.count(old)
    if occurrences > 0:
        data = data.replace(old, new)
        print(f'Replaced {occurrences}x: {repr(old)} -> {repr(new)}')
        count += occurrences

with open(path, 'wb') as f:
    f.write(data)

print(f'\nTotal replacements: {count}')
print('Done!')
