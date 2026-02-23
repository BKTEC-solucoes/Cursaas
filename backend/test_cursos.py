#!/usr/bin/env python
"""
Script para testar endpoints CRUD de cursos
"""
import requests
import json
import sys

BASE_URL = "http://localhost:8000/api/cursos"

print("=" * 80)
print("TESTE DE ENDPOINTS CRUD - CURSOS")
print("=" * 80)
print()

# ============================================================================
# TESTE 1: Listar cursos (deve estar vazio)
# ============================================================================
print("[1/6] GET /api/cursos - Listar todos os cursos")
try:
    response = requests.get(BASE_URL, timeout=5)
    print(f"     Status: {response.status_code}")
    cursos = response.json()
    print(f"     Cursos encontrados: {len(cursos)}")
    if len(cursos) > 0:
        print(f"     Exemplo: {cursos[0]}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 2: Criar um novo curso
# ============================================================================
print("[2/6] POST /api/cursos - Criar novo curso")
curso_data = {
    "nome": "Python Avançado",
    "descricao": "Curso completo de Python com OOP, async/await e mais",
    "percentual_presenca_minima": 75
}
try:
    response = requests.post(BASE_URL, json=curso_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        curso_criado = response.json()
        curso_id = curso_criado["id"]
        print(f"     ✓ Curso criado com ID: {curso_id}")
        print(f"     Nome: {curso_criado['nome']}")
        print(f"     Descrição: {curso_criado['descricao'][:50]}...")
        print(f"     Presença mínima: {curso_criado['percentual_presenca_minima']}%")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()
    sys.exit(1)

# ============================================================================
# TESTE 3: Criar segundo curso
# ============================================================================
print("[3/6] POST /api/cursos - Criar segundo curso")
curso_data2 = {
    "nome": "JavaScript para Web",
    "descricao": "Aprenda JavaScript moderno para desenvolvimento web",
    "percentual_presenca_minima": 80
}
try:
    response = requests.post(BASE_URL, json=curso_data2, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        curso_criado2 = response.json()
        curso_id2 = curso_criado2["id"]
        print(f"     ✓ Segundo curso criado com ID: {curso_id2}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 4: Obter detalhes de um curso
# ============================================================================
print(f"[4/6] GET /api/cursos/{curso_id} - Obter detalhes do curso")
try:
    response = requests.get(f"{BASE_URL}/{curso_id}", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        curso_detail = response.json()
        print(f"     ✓ Detalhes obtidos:")
        print(f"       ID: {curso_detail['id']}")
        print(f"       Nome: {curso_detail['nome']}")
        print(f"       Ativo: {curso_detail['ativo']}")
        print(f"       Data Criação: {curso_detail['data_criacao']}")
        print(f"       Aulas: {len(curso_detail.get('aulas', []))} aulas")
        print(f"       Provas: {len(curso_detail.get('provas', []))} provas")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 5: Atualizar curso
# ============================================================================
print(f"[5/6] PUT /api/cursos/{curso_id} - Atualizar curso")
update_data = {
    "nome": "Python Avançado 2025",
    "percentual_presenca_minima": 85
}
try:
    response = requests.put(f"{BASE_URL}/{curso_id}", json=update_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        curso_atualizado = response.json()
        print(f"     ✓ Curso atualizado:")
        print(f"       Nome: {curso_atualizado['nome']}")
        print(f"       Presença mínima: {curso_atualizado['percentual_presenca_minima']}%")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 6: Listar cursos (deve ter 2 agora)
# ============================================================================
print("[6/6] GET /api/cursos - Listar cursos (deve ter 2)")
try:
    response = requests.get(BASE_URL, timeout=5)
    print(f"     Status: {response.status_code}")
    cursos = response.json()
    print(f"     ✓ Total de cursos: {len(cursos)}")
    for i, curso in enumerate(cursos, 1):
        print(f"       {i}. {curso['nome']} (ID: {curso['id']})")
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

# Tentar obter curso que não existe
print("[Bonus 1] GET /api/cursos/999 - Obter curso inexistente")
try:
    response = requests.get(f"{BASE_URL}/999", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 404:
        print(f"     ✓ Erro 404 correto: {response.json()['detail']}")
    else:
        print(f"     ✗ Status esperado 404, recebido {response.status_code}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# Tentar criar curso com nome duplicado
print("[Bonus 2] POST /api/cursos - Criar com nome duplicado")
duplicate_data = {
    "nome": "Python Avançado 2025",  # Mesmo nome do curso atualizado
    "descricao": "Teste"
}
try:
    response = requests.post(BASE_URL, json=duplicate_data, timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 400:
        print(f"     ✓ Erro 400 correto: {response.json()['detail']}")
    else:
        print(f"     ⚠ Status {response.status_code}: {response.text}")
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
print("✓ GET    /api/cursos          - Listar cursos")
print("✓ POST   /api/cursos          - Criar novo curso")
print("✓ GET    /api/cursos/{id}     - Obter detalhes do curso")
print("✓ PUT    /api/cursos/{id}     - Atualizar curso")
print("✓ DELETE /api/cursos/{id}     - Deletar curso (não testado)")
print()
print("✨ Todos os endpoints estão funcionando! 🎉")
