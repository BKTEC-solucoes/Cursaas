"""Configuração mínima de ambiente para a suíte unitária.

Executa antes de qualquer `import app.*`: o pytest carrega o conftest do
diretório de testes antes de coletar os módulos.

`app/config.py` valida `SECRET_KEY` no import (>= 32 caracteres e diferente do
placeholder) e levanta se ela não existir. Na máquina do dev o `backend/.env`
supre o valor; na CI não há `.env`, então a coleta inteira quebrava com
ValidationError antes de rodar um único teste.

O valor abaixo é fixo de propósito: a suíte assina e verifica URLs de vídeo com
a mesma chave, então a chave precisa ser estável — e ela não vale nada, é só
para satisfazer o validador. `setdefault` deixa um `SECRET_KEY` exportado no
ambiente vencer; o `.env` não vence, porque `load_dotenv` não sobrescreve
variáveis já definidas.
"""
import os

os.environ.setdefault("SECRET_KEY", "chave-de-teste-sem-valor-com-32-chars-ok")
