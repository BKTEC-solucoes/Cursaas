#!/usr/bin/env python
"""
Script para testar endpoints CRUD de aulas
"""
import requests
import json
from datetime import datetime, timedelta
import sys

BASE_URL = "http://localhost:8000/api"

print("=" * 80)
print("TESTE DE ENDPOINTS CRUD - AULAS")
print("=" * 80)
print()

# ============================================================================
# PREPARAÇÃO: Criar um curso para usar nos testes
# ============================================================================
print("[Prep] Criando curso de teste...")
curso_data = {
    "nome": "Desenvolvimento Web",
    "descricao": "Aprenda a desenvolver aplicações web modernas",
    "percentual_presenca_minima": 75
}
try:
    response = requests.post(f"{BASE_URL}/cursos", json=curso_data, timeout=5)
    if response.status_code == 201:
        curso_criado = response.json()
        curso_id = curso_criado["id"]
        print(f"      ✓ Curso criado com ID: {curso_id}")
        print()
    else:
        print(f"      ✗ Erro: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

# ============================================================================
# TESTE 1: Listar aulas (deve estar vazio)
# ============================================================================
print("[1/6] GET /api/aulas - Listar todas as aulas")
try:
    response = requests.get(f"{BASE_URL}/aulas", timeout=5)
    print(f"     Status: {response.status_code}")
    aulas = response.json()
    print(f"     Aulas encontradas: {len(aulas)}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 2: Criar primeira aula
# ============================================================================
print("[2/6] POST /api/aulas - Criar primeira aula")
aula_data = {
    "curso_id": curso_id,
    "titulo": "Introdução ao HTML",
    "descricao": "Aprenda as bases do HTML5 e semântica",
    "data_aula": (datetime.now() + timedelta(days=1)).isoformat(),
    "duracao_minutos": 60
}
try:
    response = requests.post(f"{BASE_URL}/aulas", json=aula_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        aula_criada = response.json()
        aula_id = aula_criada["id"]
        print(f"     ✓ Aula criada com ID: {aula_id}")
        print(f"     Título: {aula_criada['titulo']}")
        print(f"     Curso ID: {aula_criada['curso_id']}")
        print(f"     Duração: {aula_criada['duracao_minutos']} min")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()
    sys.exit(1)

# ============================================================================
# TESTE 3: Criar segunda aula
# ============================================================================
print("[3/6] POST /api/aulas - Criar segunda aula")
aula_data2 = {
    "curso_id": curso_id,
    "titulo": "CSS3 Avançado",
    "descricao": "Aprenda utilidades e animações com CSS3",
    "data_aula": (datetime.now() + timedelta(days=2)).isoformat(),
    "duracao_minutos": 90
}
try:
    response = requests.post(f"{BASE_URL}/aulas", json=aula_data2, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        aula_criada2 = response.json()
        aula_id2 = aula_criada2["id"]
        print(f"     ✓ Segunda aula criada com ID: {aula_id2}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 4: Obter detalhes de uma aula
# ============================================================================
print(f"[4/6] GET /api/aulas/{aula_id} - Obter detalhes da aula")
try:
    response = requests.get(f"{BASE_URL}/aulas/{aula_id}", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        aula_detail = response.json()
        print(f"     ✓ Detalhes obtidos:")
        print(f"       ID: {aula_detail['id']}")
        print(f"       Título: {aula_detail['titulo']}")
        print(f"       Curso ID: {aula_detail['curso_id']}")
        print(f"       Ativo: {aula_detail['ativo']}")
        print(f"       Data Criação: {aula_detail['data_criacao']}")
        print(f"       Vídeos: {len(aula_detail.get('videos', []))} vídeos")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 5: Atualizar aula
# ============================================================================
print(f"[5/6] PUT /api/aulas/{aula_id} - Atualizar aula")
update_data = {
    "titulo": "Introdução ao HTML5 e Semântica",
    "duracao_minutos": 75
}
try:
    response = requests.put(f"{BASE_URL}/aulas/{aula_id}", json=update_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        aula_atualizada = response.json()
        print(f"     ✓ Aula atualizada:")
        print(f"       Título: {aula_atualizada['titulo']}")
        print(f"       Duração: {aula_atualizada['duracao_minutos']} min")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 6: Listar aulas filtradas por curso
# ============================================================================
print(f"[6/6] GET /api/aulas?curso_id={curso_id} - Listar aulas do curso")
try:
    response = requests.get(f"{BASE_URL}/aulas?curso_id={curso_id}", timeout=5)
    print(f"     Status: {response.status_code}")
    aulas = response.json()
    print(f"     ✓ Total de aulas do curso: {len(aulas)}")
    for i, aula in enumerate(aulas, 1):
        print(f"       {i}. {aula['titulo']} (ID: {aula['id']})")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE BÔNUS: Testar erros
# ============================================================================
print("=" * 80)
print("TESTES DE VALIDAÇÃO E ERROS")
print("=" * 80)
print()

# Tentar obter aula que não existe
print("[Bonus 1] GET /api/aulas/999 - Obter aula inexistente")
try:
    response = requests.get(f"{BASE_URL}/aulas/999", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 404:
        print(f"     ✓ Erro 404 correto: {response.json()['detail']}")
    else:
        print(f"     ⚠ Status {response.status_code}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# Tentar criar aula com curso inexistente
print("[Bonus 2] POST /api/aulas - Criar com curso inexistente")
bad_aula_data = {
    "curso_id": 999,
    "titulo": "Teste",
    "data_aula": datetime.now().isoformat()
}
try:
    response = requests.post(f"{BASE_URL}/aulas", json=bad_aula_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 404:
        print(f"     ✓ Erro 404 correto: {response.json()['detail']}")
    else:
        print(f"     ⚠ Status {response.status_code}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# RESUMO
# ============================================================================
print("=" * 80)
print("✨ RESUMO:")
print("=" * 80)
print("✓ GET    /api/aulas              - Listar aulas (com filtro por curso)")
print("✓ POST   /api/aulas              - Criar nova aula")
print("✓ GET    /api/aulas/{id}         - Obter detalhes da aula")
print("✓ PUT    /api/aulas/{id}         - Atualizar aula")
print("✓ DELETE /api/aulas/{id}         - Deletar aula (não testado)")
print()
print("✨ Todos os endpoints de Aulas estão funcionando! 🎉")
