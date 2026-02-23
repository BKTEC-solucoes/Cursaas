# -*- coding: utf-8 -*-
import requests
import random
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

# ==================== SETUP - CRIAR DADOS DE TESTE ====================

print("=" * 70)
print("TESTE COMPLETO - ENDPOINTS DE PRESENÇA (Rastreamento)")
print("=" * 70)

# 1. Criar admin ou buscar token existente
print("\n[SETUP] 1. Criando admin...")
admin_data = {
    "nome": "Admin Presença",
    "email": "admin_presenca@test.com",
    "senha": "admin123"
}
response = requests.post(f"{BASE_URL}/api/auth/admin-registro", json=admin_data)
if response.status_code in [200, 201]:
    print(f"  ✓ Admin criado ou já existe")
else:
    print(f"  ✗ Erro: {response.status_code}")

# 2. Login como admin
print("\n[SETUP] 2. Fazendo login como admin...")
login_data = {
    "email": "admin_presenca@test.com",
    "senha": "admin123"
}
response = requests.post(f"{BASE_URL}/api/auth/login", json=login_data)
if response.status_code != 200:
    print(f"  ✗ Erro no login: {response.status_code}")
    print(response.text)
    exit(1)
admin_token = response.json()["access_token"]
admin_headers = {"Authorization": f"Bearer {admin_token}"}
print(f"  ✓ Login bem-sucedido")

# 3. Criar curso
print("\n[SETUP] 3. Criando curso...")
random_suffix = random.randint(1000, 9999)
curso_data = {
    "nome": f"Curso Presença {random_suffix}",
    "descricao": "Curso para testar presença",
    "percentual_presenca_minima": 75
}
response = requests.post(f"{BASE_URL}/api/cursos", json=curso_data, headers=admin_headers)
if response.status_code != 201:
    print(f"  ✗ Erro: {response.status_code}")
    print(response.text)
    exit(1)
curso_id = response.json()["id"]
print(f"  ✓ Curso criado (ID: {curso_id})")

# 4. Criar aula
print("\n[SETUP] 4. Criando aula...")
aula_data = {
    "curso_id": curso_id,
    "titulo": "Aula de Presença - Video Player",
    "descricao": "Aula para testar rastreamento de presença",
    "data_aula": (datetime.utcnow() + timedelta(days=1)).isoformat(),
    "duracao_minutos": 60
}
response = requests.post(f"{BASE_URL}/api/aulas", json=aula_data, headers=admin_headers)
if response.status_code != 201:
    print(f"  ✗ Erro: {response.status_code}")
    print(response.text)
    exit(1)
aula_id = response.json()["id"]
print(f"  ✓ Aula criada (ID: {aula_id})")

# 5. Criar segundo aluno para testes
print("\n[SETUP] 5. Criando aluno de teste...")
aluno_data = {
    "nome": "Aluno Presença",
    "email": f"aluno_presenca_{random_suffix}@test.com",
    "senha": "aluno123",
    "role": "aluno"
}
response = requests.post(f"{BASE_URL}/api/auth/registro", json=aluno_data)
if response.status_code in [200, 201]:
    print(f"  ✓ Aluno criado")
    aluno_id = response.json()["usuario"]["id"] if "usuario" in response.json() else response.json()["id"]
else:
    print(f"  ✗ Erro: {response.status_code}")
    print(response.text)
    exit(1)

# 6. Login como aluno
print("\n[SETUP] 6. Fazendo login como aluno...")
aluno_login = {
    "email": f"aluno_presenca_{random_suffix}@test.com",
    "senha": "aluno123"
}
response = requests.post(f"{BASE_URL}/api/auth/login", json=aluno_login)
if response.status_code != 200:
    print(f"  ✗ Erro no login: {response.status_code}")
    exit(1)
aluno_token = response.json()["access_token"]
aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
print(f"  ✓ Aluno logado")

# 7. Inscrever aluno no curso
print("\n[SETUP] 7. Inscrevendo aluno no curso...")
inscricao_data = {
    "usuario_id": aluno_id,
    "curso_id": curso_id
}
response = requests.post(f"{BASE_URL}/api/cursos/{curso_id}/inscrever", 
                        headers=admin_headers)
if response.status_code in [200, 201]:
    print(f"  ✓ Aluno inscrito no curso")
else:
    print(f"  ℹ Inscrição pode falhar em endpoints TODO, continuando...")

# ==================== TESTES PRINCIPAIS ====================

print("\n" + "=" * 70)
print("TESTES DE PRESENÇA")
print("=" * 70)

test_count = 0
passed = 0

# TESTE 1: Atualizar progresso para 50% (não registra automaticamente)
test_count += 1
print(f"\n[TESTE {test_count}] Atualizar progresso para 50% (não deve registrar automaticamente)")
progress_data = {
    "percentual_assistido": 50,
    "tempo_total_segundos": 1800
}
response = requests.post(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula_id}/atualizar-progresso",
    json=progress_data,
    headers=aluno_headers
)
if response.status_code == 200:
    result = response.json()
    if result["percentual_assistido"] == 50 and result["registrada_automaticamente"] == False:
        print(f"  ✓ PASSOU - Progresso atualizado para 50%, não registrado automaticamente")
        passed += 1
    else:
        print(f"  ✗ FALHOU - registrada_automaticamente deveria ser False")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")

# TESTE 2: Atualizar progresso para 75% (deve registrar automaticamente)
test_count += 1
print(f"\n[TESTE {test_count}] Atualizar progresso para 75% (deve registrar automaticamente)")
progress_data = {
    "percentual_assistido": 75,
    "tempo_total_segundos": 2700
}
response = requests.post(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula_id}/atualizar-progresso",
    json=progress_data,
    headers=aluno_headers
)
if response.status_code == 200:
    result = response.json()
    if result["percentual_assistido"] == 75 and result["registrada_automaticamente"] == True and result["data_conclusao"] is not None:
        print(f"  ✓ PASSOU - Presença registrada automaticamente em 75%")
        print(f"    - percentual_assistido: {result['percentual_assistido']}%")
        print(f"    - registrada_automaticamente: {result['registrada_automaticamente']}")
        print(f"    - data_conclusao: {result['data_conclusao']}")
        passed += 1
    else:
        print(f"  ✗ FALHOU - Presença deveria estar registrada automaticamente")
        print(f"    - registrada_automaticamente: {result.get('registrada_automaticamente')}")
        print(f"    - data_conclusao: {result.get('data_conclusao')}")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")
    print(f"    {response.text}")

# TESTE 3: Atualizar progresso para 100% (deve manter status de registrado)
test_count += 1
print(f"\n[TESTE {test_count}] Atualizar progresso para 100% (deve manter registro automático)")
progress_data = {
    "percentual_assistido": 100,
    "tempo_total_segundos": 3600
}
response = requests.post(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula_id}/atualizar-progresso",
    json=progress_data,
    headers=aluno_headers
)
if response.status_code == 200:
    result = response.json()
    if result["percentual_assistido"] == 100 and result["registrada_automaticamente"] == True:
        print(f"  ✓ PASSOU - Progresso em 100%, ainda registrado automaticamente")
        print(f"    - percentual_assistido: {result['percentual_assistido']}%")
        print(f"    - registrada_automaticamente: {result['registrada_automaticamente']}")
        passed += 1
    else:
        print(f"  ✗ FALHOU")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")

# TESTE 4: Obtém presença de uma aula específica
test_count += 1
print(f"\n[TESTE {test_count}] Obter presença de uma aula específica")
response = requests.get(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula_id}",
    headers=aluno_headers
)
if response.status_code == 200:
    result = response.json()
    if result["percentual_assistido"] == 100 and result["aula_titulo"] == "Aula de Presença - Video Player":
        print(f"  ✓ PASSOU - Presença recuperada corretamente")
        print(f"    - Aluno: {result['usuario_nome']}")
        print(f"    - Aula: {result['aula_titulo']}")
        print(f"    - Percentual: {result['percentual_assistido']}%")
        passed += 1
    else:
        print(f"  ✗ FALHOU - Dados incorretos")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")

# TESTE 5: Listar todas presença do aluno
test_count += 1
print(f"\n[TESTE {test_count}] Listar todas presenças do aluno")
response = requests.get(
    f"{BASE_URL}/api/presenca/{aluno_id}",
    headers=aluno_headers
)
if response.status_code == 200:
    result = response.json()
    if len(result) > 0 and result[0]["percentual_assistido"] == 100:
        print(f"  ✓ PASSOU - Presenças do aluno listadas")
        print(f"    - Total de aulas: {len(result)}")
        print(f"    - Primeira aula: {result[0]['aula_titulo']}")
        passed += 1
    else:
        print(f"  ✗ FALHOU - Lista vazia ou dados incorretos: {result}")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")

# TESTE 6: Criar segunda aula e deixar com presença baixa
print("\n[SETUP] Criando segunda aula para teste de relatório...")
aula2_data = {
    "curso_id": curso_id,
    "titulo": "Aula 2 - Teste Relatório",
    "descricao": "Segunda aula",
    "data_aula": (datetime.utcnow() + timedelta(days=2)).isoformat(),
    "duracao_minutos": 45
}
response = requests.post(f"{BASE_URL}/api/aulas", json=aula2_data, headers=admin_headers)
aula2_id = response.json()["id"]
print(f"  ✓ Aula 2 criada (ID: {aula2_id})")

# Atualizar presença da aula 2 para 50% (abaixo do mínimo)
progress_data = {
    "percentual_assistido": 50,
    "tempo_total_segundos": 1350
}
requests.post(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula2_id}/atualizar-progresso",
    json=progress_data,
    headers=aluno_headers
)

# TESTE 7: Obter relatório de presença do curso (admin)
test_count += 1
print(f"\n[TESTE {test_count}] Obter relatório de presença do curso (admin)")
response = requests.get(
    f"{BASE_URL}/api/presenca/curso/{curso_id}",
    headers=admin_headers
)
if response.status_code == 200:
    result = response.json()
    if len(result) > 0:
        print(f"  ✓ PASSOU - Relatório recuperado")
        aluno_report = result[0]
        print(f"    - Aluno: {aluno_report['aluno_nome']}")
        print(f"    - Total de aulas: {aluno_report['total_aulas']}")
        print(f"    - Aulas com 75%+: {aluno_report['aulas_assistidas_75']}")
        print(f"    - Percentual de presença: {aluno_report['percentual_presenca']}%")
        passed += 1
    else:
        print(f"  ✗ FALHOU - Relatório vazio: {result}")
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")
    print(f"    {response.text}")

# TESTE 8: Aluno NÃO pode acessar relatório de presença de curso
test_count += 1
print(f"\n[TESTE {test_count}] Aluno não pode acessar relatório de presença (controle de acesso)")
response = requests.get(
    f"{BASE_URL}/api/presenca/curso/{curso_id}",
    headers=aluno_headers
)
if response.status_code == 403:
    print(f"  ✓ PASSOU - Acesso negado para aluno (403)")
    passed += 1
else:
    print(f"  ✗ FALHOU - Deveria ser 403, obteve {response.status_code}")

# TESTE 9: Aluno só vê suas presenças
test_count += 1
print(f"\n[TESTE {test_count}] Aluno não pode ver presença de outro aluno")
# Criar segundo aluno
aluno2_data = {
    "nome": "Aluno 2",
    "email": f"aluno2_{random_suffix}@test.com",
    "senha": "aluno123",
    "role": "aluno"
}
response = requests.post(f"{BASE_URL}/api/auth/registro", json=aluno2_data)
if response.status_code in [200, 201]:
    result = response.json()
    aluno2_id = result.get("usuario", {}).get("id") or result.get("id")
else:
    print(f"  ✗ Erro ao criar aluno 2: {response.status_code}")
    aluno2_id = -1

# Tentar como aluno 1 acessar presença de aluno 2
if aluno2_id > 0:
    response = requests.get(
        f"{BASE_URL}/api/presenca/{aluno2_id}/{aula_id}",
        headers=aluno_headers
    )
    if response.status_code == 403:
        print(f"  ✓ PASSOU - Acesso negado (403)")
        passed += 1
    else:
        print(f"  ✗ FALHOU - Deveria ser 403, obteve {response.status_code}")
else:
    print(f"  ✗ FALHOU - Não foi possível criar segundo aluno")

# TESTE 10: Admin pode acessar presenças de qualquer aluno
test_count += 1
print(f"\n[TESTE {test_count}] Admin pode acessar presença de qualquer aluno")
response = requests.get(
    f"{BASE_URL}/api/presenca/{aluno_id}/{aula_id}",
    headers=admin_headers
)
if response.status_code == 200:
    print(f"  ✓ PASSOU - Admin acessou presença de aluno")
    passed += 1
else:
    print(f"  ✗ FALHOU - Status {response.status_code}")

# ==================== RESUMO ====================

print("\n" + "=" * 70)
print("RESUMO DOS TESTES")
print("=" * 70)
print(f"Total de testes: {test_count}")
print(f"Testes passados: {passed}")
print(f"Testes falhados: {test_count - passed}")
print(f"Taxa de sucesso: {(passed/test_count)*100:.1f}%")

if passed == test_count:
    print("\n✓ TODOS OS TESTES PASSARAM! 🎉")
else:
    print(f"\n✗ {test_count - passed} teste(s) falharam")

print("=" * 70)
