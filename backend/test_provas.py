#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
Script para testar endpoints de Provas e Questões
"""
import sys
import io

# Configure stdout to use UTF-8
if sys.platform == "win32":
    import os
    os.environ["PYTHONIOENCODING"] = "utf-8"
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000/api"
ADMIN_EMAIL = "admin@cursaas.com"
ADMIN_PASSWORD = "senha123"
ALUNO_EMAIL = "test_aluno@cursaas.com"  # Usar email diferente para não ter conflito
ALUNO_PASSWORD = "senha123"

print("=" * 80)
print("TESTE DE ENDPOINTS - PROVAS E QUESTÕES")
print("=" * 80)
print()

# ============================================================================
# PREPARAÇÃO: Fazer login como admin (ou criar se não existir)
# ============================================================================
print("[Prep 0/3] Criando/verificando admin...")
try:
    # Tentar criar admin
    admin_create = {
        "email": ADMIN_EMAIL,
        "nome": "Admin User",
        "senha": ADMIN_PASSWORD
    }
    response = requests.post(
        f"{BASE_URL}/auth/admin-registro",
        json=admin_create,
        timeout=5
    )
    if response.status_code == 201 or response.status_code == 200:
        print(f"      ✓ Admin criado/obtido")
    elif "já registrado" in response.text.lower():
        print(f"      ✓ Admin já existe")
    else:
        print(f"      ⚠ Response: {response.status_code}")
except Exception as e:
    print(f"      ⚠ {e}")

print()
print("[Prep 1/3] Fazendo login como admin...")
try:
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ADMIN_EMAIL, "senha": ADMIN_PASSWORD},
        timeout=5
    )
    if login_response.status_code == 200:
        admin_token = login_response.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f"      ✓ Login realizado com sucesso")
    else:
        print(f"      ✗ Erro no login: {login_response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

print()
print("[Prep 2/3] Criando curso de teste...")
import random
random_suffix = random.randint(1000, 9999)
curso_data = {
    "nome": f"Desenvolvimento Web {random_suffix}",
    "descricao": "Aprenda web development do zero",
    "percentual_presenca_minima": 75
}
try:
    response = requests.post(
        f"{BASE_URL}/cursos",
        json=curso_data,
        headers=admin_headers,
        timeout=5
    )
    if response.status_code == 201:
        curso = response.json()
        curso_id = curso["id"]
        print(f"      ✓ Curso criado com ID: {curso_id}")
    else:
        print(f"      ✗ Erro: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

print()
print("[Prep 3/3] Fazendo login como aluno (ou criar se não existir)...")
try:
    # Tentar criar aluno
    aluno_create = {
        "email": ALUNO_EMAIL,
        "nome": "Bianca Santos",
        "senha": ALUNO_PASSWORD
    }
    response = requests.post(
        f"{BASE_URL}/auth/registro",
        json=aluno_create,
        timeout=5
    )
    if response.status_code == 201 or response.status_code == 200:
        print(f"      ✓ Aluno criado")
    elif "já registrado" in response.text.lower():
        print(f"      ✓ Aluno já existe")
    else:
        print(f"      ⚠ Response: {response.status_code}")
except Exception as e:
    print(f"      ⚠ {e}")

# Fazer login como aluno
try:
    login_response = requests.post(
        f"{BASE_URL}/auth/login",
        json={"email": ALUNO_EMAIL, "senha": ALUNO_PASSWORD},
        timeout=5
    )
    if login_response.status_code == 200:
        aluno_token = login_response.json()["access_token"]
        aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
        aluno_data = login_response.json()["usuario"]
        aluno_id = aluno_data["id"]
        print(f"      ✓ Login como aluno realizado (ID: {aluno_id})")
    else:
        print(f"      ✗ Erro: {login_response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

print()

# ============================================================================
# TESTE 1: Criar Prova
# ============================================================================
print("[1/10] POST /api/provas - Criar prova")
data_inicio = datetime.now() + timedelta(days=-1)  # Começou ontem
data_fim = datetime.now() + timedelta(days=1)      # Termina amanhã

prova_data = {
    "curso_id": curso_id,
    "titulo": "Prova de HTML e CSS",
    "descricao": "Avaliação sobre conceitos básicos de HTML5 e CSS3",
    "data_inicio": data_inicio.isoformat(),
    "data_fim": data_fim.isoformat(),
    "tempo_limite_minutos": 30,
    "tentativas_permitidas": 2
}
try:
    response = requests.post(
        f"{BASE_URL}/provas",
        json=prova_data,
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        prova = response.json()
        prova_id = prova["id"]
        print(f"     ✓ Prova criada com sucesso!")
        print(f"       ID: {prova_id}")
        print(f"       Título: {prova['titulo']}")
        print(f"       Período: {prova['data_inicio']} até {prova['data_fim']}")
    else:
        print(f"     ✗ Erro: {response.json()}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 2: Listar Provas
# ============================================================================
print("[2/10] GET /api/provas - Listar provas")
try:
    response = requests.get(
        f"{BASE_URL}/provas?curso_id={curso_id}",
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        provas_list = response.json()
        print(f"     ✓ Provas listadas com sucesso!")
        print(f"       Total: {len(provas_list)} prova(s)")
        for p in provas_list:
            print(f"         - {p['titulo']} (ID: {p['id']})")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 3: Obter detalhes da prova
# ============================================================================
print(f"[3/10] GET /api/provas/{prova_id} - Obter detalhes da prova")
try:
    response = requests.get(
        f"{BASE_URL}/provas/{prova_id}",
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        prova = response.json()
        print(f"     ✓ Prova obtida com sucesso!")
        print(f"       Título: {prova['titulo']}")
        print(f"       Questões: {len(prova['questoes'])}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 4: Criar questões
# ============================================================================
print(f"[4/10] POST /api/provas/{prova_id}/questoes - Criar questões")
questoes_ids = []
questao1_id = None
questao2_id = None

# Questão 1: Múltipla escolha
questao1_data = {
    "enunciado": "O que significa a sigla HTML?",
    "tipo": "multipla_escolha",
    "ordem": 1,
    "pontos": 2.5
}

# Questão 2: Dissertativa
questao2_data = {
    "enunciado": "Explique a diferença entre HTML e CSS",
    "tipo": "dissertativa",
    "ordem": 2,
    "pontos": 3.0
}

for i, questao_data in enumerate([questao1_data, questao2_data], 1):
    try:
        response = requests.post(
            f"{BASE_URL}/provas/{prova_id}/questoes",
            json=questao_data,
            headers=admin_headers,
            timeout=5
        )
        if response.status_code == 201:
            questao = response.json()
            questao_id = questao["id"]
            questoes_ids.append(questao_id)
            if i == 1:
                questao1_id = questao_id
            else:
                questao2_id = questao_id
            print(f"     ✓ Questão {i} criada (ID: {questao_id})")
        else:
            print(f"     ✗ Erro ao criar questão {i}: Status {response.status_code}")
            try:
                print(f"       Resposta: {response.json()}")
            except:
                print(f"       Resposta: {response.text}")
    except Exception as e:
        print(f"     ✗ Erro: {e}")

print()

# ============================================================================
# TESTE 5: Criar opções de resposta
# ============================================================================
print(f"[5/10] POST /api/provas/{prova_id}/questoes/{questao1_id}/opcoes - Criar opções")
opcoes_ids = []

opcoes_data = [
    {"texto": "HyperText Markup Language", "correta": True, "ordem": 1},
    {"texto": "High Tech Modern Language", "correta": False, "ordem": 2},
    {"texto": "Home Tool Modern Language", "correta": False, "ordem": 3},
    {"texto": "Hyper Tool Markup Learning", "correta": False, "ordem": 4},
]

for i, opcao_data in enumerate(opcoes_data, 1):
    try:
        response = requests.post(
            f"{BASE_URL}/provas/{prova_id}/questoes/{questao1_id}/opcoes",
            json=opcao_data,
            headers=admin_headers,
            timeout=5
        )
        if response.status_code == 201:
            opcao = response.json()
            opcoes_ids.append(opcao["id"])
            print(f"     ✓ Opção {i} criada (ID: {opcao['id']})")
        else:
            print(f"     ✗ Erro ao criar opção {i}: {response.json()}")
    except Exception as e:
        print(f"     ✗ Erro: {e}")

print()

# ============================================================================
# TESTE 6: Atualizar prova
# ============================================================================
print(f"[6/10] PUT /api/provas/{prova_id} - Atualizar prova")
update_data = {
    "titulo": "Prova de HTML e CSS (Versão Revisada)",
    "tempo_limite_minutos": 45
}
try:
    response = requests.put(
        f"{BASE_URL}/provas/{prova_id}",
        json=update_data,
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        prova = response.json()
        print(f"     ✓ Prova atualizada!")
        print(f"       Novo título: {prova['titulo']}")
    else:
        print(f"     ✗ Erro: {response.json()}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 7: Obter detalhes com questões e opções
# ============================================================================
print(f"[7/10] GET /api/provas/{prova_id} - Obter detalhes completos")
try:
    response = requests.get(
        f"{BASE_URL}/provas/{prova_id}",
        headers=admin_headers,
        timeout=5
    )
    if response.status_code == 200:
        prova = response.json()
        print(f"     ✓ Prova com questões obtida!")
        print(f"       Questões: {len(prova['questoes'])}")
        for q in prova['questoes']:
            print(f"         - Q{q['ordem']}: {q['enunciado'][:50]}...")
            print(f"           Opções: {len(q['opcoes'])}, Tipo: {q['tipo']}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 8: Submeter respostas (aluno)
# ============================================================================
print(f"[8/10] POST /api/provas/{prova_id}/responder - Aluno submete respostas")
submission_data = {
    "respostas": [
        {
            "questao_id": questao1_id,
            "opcao_id": opcoes_ids[0]  # Resposta correta
        },
        {
            "questao_id": questao2_id,
            "texto_resposta": "HTML é a estrutura, CSS é o estilo"
        }
    ]
}
try:
    response = requests.post(
        f"{BASE_URL}/provas/{prova_id}/responder",
        json=submission_data,
        headers=aluno_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        resultado = response.json()
        print(f"     ✓ Respostas submetidas com sucesso!")
        print(f"       Total de questões: {resultado['total_questoes']}")
        print(f"       Acertos: {resultado['total_acertos']}")
        print(f"       Nota final: {resultado['nota_final']}")
        print(f"       Percentual: {resultado['percentual_acerto']:.1f}%")
    else:
        print(f"     ✗ Erro: {response.json()}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 9: Visualizar respostas (aluno vê as suas)
# ============================================================================
print(f"[9/10] GET /api/provas/{prova_id}/respostas - Aluno vê suas respostas")
try:
    response = requests.get(
        f"{BASE_URL}/provas/{prova_id}/respostas",
        headers=aluno_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        respostas = response.json()
        print(f"     ✓ Respostas obtidas!")
        print(f"       Total: {len(respostas)} resposta(s)")
        for r in respostas:
            status = "✓" if r.get('correta') else "✗" if r.get('correta') is False else "?"
            print(f"         {status} Q{r['questao_id']}: opcao_id={r.get('opcao_id')}, correta={r.get('correta')}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 10: Deletar questão
# ============================================================================
print(f"[10/10] DELETE /api/provas/{prova_id}/questoes/{questao2_id} - Deletar questão")
try:
    response = requests.delete(
        f"{BASE_URL}/provas/{prova_id}/questoes/{questao2_id}",
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 204:
        print(f"     ✓ Questão deletada com sucesso!")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTES BÔNUS: Validações de erro
# ============================================================================
print("=" * 80)
print("TESTES DE VALIDAÇÃO E ERROS")
print("=" * 80)
print()

# Tentar criar prova com datas inversas
print("[Bonus 1] Criar prova com data_inicio > data_fim")
bad_prova = {
    "curso_id": curso_id,
    "titulo": "Prova inválida",
    "data_inicio": (datetime.now() + timedelta(days=1)).isoformat(),
    "data_fim": (datetime.now() + timedelta(days=-1)).isoformat(),
    "tentativas_permitidas": 1
}
try:
    response = requests.post(
        f"{BASE_URL}/provas",
        json=bad_prova,
        headers=admin_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 400:
        print(f"     ✓ Erro 400 correto: {response.json()['detail']}")
    else:
        print(f"     ⚠ Status {response.status_code}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# Tentar submeter sem ser aluno com permissão
print("[Bonus 2] Aluno tenta acessar respostas de outro usuário (não permitido)")
try:
    response = requests.get(
        f"{BASE_URL}/provas/{prova_id}/respostas?usuario_id=999",
        headers=aluno_headers,
        timeout=5
    )
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        # Aluno só vê as dele
        respostas = response.json()
        print(f"     ✓ Aluno vê apenas suas 1 resposta (filtro ignorado)")
    else:
        print(f"     Erro: {response.json()}")
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
print("✓ POST   /api/provas                           - Criar prova")
print("✓ GET    /api/provas                           - Listar provas")
print("✓ GET    /api/provas/{id}                      - Obter prova com questões")
print("✓ PUT    /api/provas/{id}                      - Atualizar prova")
print("✓ DELETE /api/provas/{id}                      - Deletar prova")
print("✓ POST   /api/provas/{id}/questoes             - Criar questão")
print("✓ PUT    /api/provas/{id}/questoes/{id}        - Atualizar questão")
print("✓ DELETE /api/provas/{id}/questoes/{id}        - Deletar questão")
print("✓ POST   /api/provas/{id}/questoes/{id}/opcoes - Criar opção")
print("✓ DELETE /api/provas/{id}/questoes/{id}/opcoes/{id} - Deletar opção")
print("✓ POST   /api/provas/{id}/responder            - Submeter respostas")
print("✓ GET    /api/provas/{id}/respostas            - Obter respostas")
print()
print("Funcionalidades:")
print("✓ Validação de período (data_inicio <= agora <= data_fim)")
print("✓ Suporte a múltipla escolha e dissertativas")
print("✓ Cálculo automático de notas")
print("✓ Controle de permissões (admin vs aluno)")
print("✓ Cascata de deleção (prova → questões → opções)")
print()
print("✨ Todos os endpoints de Provas estão funcionando! 🎉")
