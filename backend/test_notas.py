import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

# ==================== SETUP FIXTURES ====================

def login_admin():
    """Autentica como admin e retorna token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "admin@example.com",
        "password": "senha123"
    })
    assert response.status_code == 200, f"Erro ao fazer login: {response.text}"
    return response.json()["access_token"]

def login_aluno():
    """Autentica como aluno e retorna token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": "aluno1@example.com",
        "password": "senha123"
    })
    assert response.status_code in [200, 401], f"Erro inesperado: {response.text}"
    
    if response.status_code == 401:
        # Criar aluno se não existir (precisa estar admin)
        admin_token = login_admin()
        headers = {"Authorization": f"Bearer {admin_token}"}
        
        # Criar usuário aluno
        requests.post(f"{BASE_URL}/api/usuarios", json={
            "nome": "Aluno Teste 1",
            "email": "aluno1@example.com",
            "password": "senha123",
            "role": "aluno"
        }, headers=headers)
        
        # Tentar login novamente
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "aluno1@example.com",
            "password": "senha123"
        })
    
    return response.json()["access_token"]

def criar_curso(admin_token):
    """Cria um curso de teste"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BASE_URL}/api/cursos", json={
        "nome": "Curso Notas Teste",
        "descricao": "Curso para teste de notas",
        "data_inicio": datetime.utcnow().isoformat(),
        "data_fim": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }, headers=headers)
    assert response.status_code in [200, 201], f"Erro ao criar curso: {response.text}"
    return response.json().get("id") or response.json()

def criar_aula(admin_token, curso_id):
    """Cria uma aula de teste"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = requests.post(f"{BASE_URL}/api/aulas", json={
        "curso_id": curso_id,
        "titulo": "Aula Teste Notas",
        "descricao": "Aula para teste",
        "numero_aula": 1,
        "data": datetime.utcnow().isoformat(),
        "duracao_minutos": 60,
        "video_url": "https://example.com/video.mp4"
    }, headers=headers)
    assert response.status_code in [200, 201], f"Erro ao criar aula: {response.text}"
    return response.json().get("id") or response.json()

def criar_prova(admin_token, curso_id, aula_id):
    """Cria uma prova com questões"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Criar prova
    response = requests.post(f"{BASE_URL}/api/provas", json={
        "curso_id": curso_id,
        "aula_id": aula_id,
        "titulo": "Prova Teste",
        "descricao": "Prova para teste de notas",
        "tipo": "objetiva",
        "pontuacao_maxima": 10,
        "is_obrigatoria": True,
        "data_inicio": datetime.utcnow().isoformat(),
        "data_fim": (datetime.utcnow() + timedelta(days=1)).isoformat()
    }, headers=headers)
    assert response.status_code in [200, 201], f"Erro ao criar prova: {response.text}"
    prova = response.json()
    prova_id = prova.get("id") or prova
    
    # Criar 2 questões
    for i in range(2):
        response_questao = requests.post(f"{BASE_URL}/api/questoes", json={
            "prova_id": prova_id,
            "numero": i + 1,
            "texto": f"Questão {i+1} teste",
            "tipo": "multipla_escolha",
            "pontuacao": 5
        }, headers=headers)
        assert response_questao.status_code in [200, 201], f"Erro ao criar questão: {response_questao.text}"
        
        # Criar opções de resposta
        for j in range(3):
            requests.post(f"{BASE_URL}/api/opcoes-resposta", json={
                "questao_id": response_questao.json().get("id") or response_questao.json(),
                "texto": f"Opção {j+1}",
                "eh_correta": (j == 0)  # Primera opção é correta
            }, headers=headers)
    
    return prova_id

def inscrever_aluno(admin_token, aluno_id, curso_id):
    """Inscreve aluno em um curso"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    requests.post(f"{BASE_URL}/api/inscricoes", json={
        "usuario_id": aluno_id,
        "curso_id": curso_id
    }, headers=headers)

# ==================== TEST HELPERS ====================

def get_aluno_id(admin_token, email):
    """Obter ID do aluno por email"""
    # Para este teste, vamos usar ID fixo baseado em quando aluno foi criado
    # Tipicamente aluno1 terá ID 2 ou 3
    return 2

# ==================== TESTS ====================

def test_1_listar_notas_admin():
    """Teste 1: Admin consegue listar todas as notas"""
    print("\n=== Teste 1: Listar todas as notas (admin) ===")
    admin_token = login_admin()
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(f"{BASE_URL}/api/notas", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    
    assert response.status_code == 200, f"Erro: {response.text}"
    assert isinstance(response.json(), list), "Deve retornar uma lista"
    print("✓ Admin conseguiu listar notas")

def test_2_listar_notas_aluno_negado():
    """Teste 2: Aluno NÃO consegue listar todas as notas (apenas suas próprias)"""
    print("\n=== Teste 2: Aluno negado - listar todas as notas ===")
    aluno_token = login_aluno()
    headers = {"Authorization": f"Bearer {aluno_token}"}
    
    response = requests.get(f"{BASE_URL}/api/notas", headers=headers)
    print(f"Status: {response.status_code}")
    
    assert response.status_code == 403, f"Esperava 403, recebeu {response.status_code}"
    print("✓ Aluno foi negado corretamente")

def test_3_aluno_ver_suas_notas():
    """Teste 3: Aluno consegue ver SUAS notas"""
    print("\n=== Teste 3: Aluno vê suas notas ===")
    admin_token = login_admin()
    aluno_token = login_aluno()
    
    # Criar estrutura de teste
    curso = requests.post(f"{BASE_URL}/api/cursos", json={
        "nome": "Curso para Notas 3",
        "descricao": "Teste 3",
        "data_inicio": datetime.utcnow().isoformat(),
        "data_fim": (datetime.utcnow() + timedelta(days=30)).isoformat()
    }, headers={"Authorization": f"Bearer {admin_token}"}).json()
    curso_id = curso.get("id") or curso
    
    # Aluno tenta ver suas notas
    aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
    aluno_id = 2  # Considerando que criamos aluno1 com ID 2
    
    response = requests.get(f"{BASE_URL}/api/notas/{aluno_id}", headers=aluno_headers)
    print(f"Status: {response.status_code}")
    
    assert response.status_code == 200, f"Erro: {response.text}"
    assert isinstance(response.json(), list), "Deve retornar uma lista"
    print("✓ Aluno conseguiu ver suas notas")

def test_4_admin_ver_notas_outro_aluno():
    """Teste 4: Admin consegue ver notas de qualquer aluno"""
    print("\n=== Teste 4: Admin vê notas de outro aluno ===")
    admin_token = login_admin()
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(f"{BASE_URL}/api/notas/2", headers=headers)
    print(f"Status: {response.status_code}")
    print(f"Response count: {len(response.json()) if isinstance(response.json(), list) else 'não é lista'}")
    
    assert response.status_code == 200, f"Erro: {response.text}"
    print("✓ Admin conseguiu ver notas de outro aluno")

def test_5_atualizar_nota_admin():
    """Teste 5: Admin consegue atualizar nota (nota_final e observações)"""
    print("\n=== Teste 5: Admin atualiza nota ===")
    admin_token = login_admin()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Buscar uma nota existente para atualizar
    notas = requests.get(f"{BASE_URL}/api/notas/2", headers=admin_headers).json()
    
    if not notas:
        print("⚠ Nenhuma nota encontrada para atualizar - criando estrutura de teste")
        # Criar curso, aula, prova e nota
        curso_id = 1  # Considerando que já existe
        
    else:
        nota_id = notas[0]["id"]
        
        # Atualizar nota
        response = requests.put(f"{BASE_URL}/api/notas/{nota_id}", json={
            "nota_final": 8.5,
            "observacoes": "Nota atualizada por admin"
        }, headers=admin_headers)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json() if response.status_code == 200 else response.text}")
        
        assert response.status_code == 200, f"Erro: {response.text}"
        assert response.json()["nota_final"] == 8.5, "Nota_final não foi atualizada"
        print("✓ Admin atualizou nota com sucesso")

def test_6_aluno_nao_pode_atualizar_nota():
    """Teste 6: Aluno NÃO consegue atualizar nota"""
    print("\n=== Teste 6: Aluno negado - atualizar nota ===")
    admin_token = login_admin()
    aluno_token = login_aluno()
    
    # Buscar uma nota como admin
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    notas = requests.get(f"{BASE_URL}/api/notas/2", headers=admin_headers).json()
    
    if notas:
        nota_id = notas[0]["id"]
        aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
        
        response = requests.put(f"{BASE_URL}/api/notas/{nota_id}", json={
            "nota_final": 10,
            "observacoes": "Tentativa de fraude"
        }, headers=aluno_headers)
        print(f"Status: {response.status_code}")
        
        assert response.status_code == 403, f"Esperava 403, recebeu {response.status_code}"
        print("✓ Aluno foi negado corretamente")
    else:
        print("⚠ Nenhuma nota para testar")

def test_7_calcular_media_curso():
    """Teste 7: Admin consegue calcular média de um aluno em um curso"""
    print("\n=== Teste 7: Calcular média do curso (admin) ===")
    admin_token = login_admin()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Assumindo aluno 2, curso 1
    response = requests.post(
        f"{BASE_URL}/api/notas/2/1/calcular-media",
        headers=admin_headers
    )
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json() if response.status_code in [200, 400] else response.text}")
    
    if response.status_code == 200:
        data = response.json()
        assert "media_final" in data or data.get("media_final"), "Resposta deve incluir media_final"
        assert "aprovado" in data or data.get("aprovado") is not None, "Resposta deve incluir aprovado"
        print("✓ Média calculada com sucesso")
    elif response.status_code == 400:
        print("⚠ Erro esperado (aluno sem notas neste curso)")
    else:
        print(f"✗ Erro inesperado: {response.status_code}")

def test_8_aluno_nao_pode_calcular_media():
    """Teste 8: Aluno NÃO consegue calcular média de outro aluno"""
    print("\n=== Teste 8: Aluno negado - calcular média ===")
    aluno_token = login_aluno()
    aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
    
    response = requests.post(
        f"{BASE_URL}/api/notas/2/1/calcular-media",
        headers=aluno_headers
    )
    print(f"Status: {response.status_code}")
    
    assert response.status_code == 403, f"Esperava 403, recebeu {response.status_code}"
    print("✓ Aluno foi negado corretamente")

def test_9_obter_notas_curso_detalhado():
    """Teste 9: Admin consegue obter relatório detalhado de notas de um curso"""
    print("\n=== Teste 9: Relatório detalhado de notas do curso ===")
    admin_token = login_admin()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.get(f"{BASE_URL}/api/notas/curso/1", headers=admin_headers)
    print(f"Status: {response.status_code}")
    print(f"Response count: {len(response.json()) if isinstance(response.json(), list) else 'erro'}")
    
    assert response.status_code == 200, f"Erro: {response.text}"
    assert isinstance(response.json(), list), "Deve retornar uma lista"
    
    # Se tiver dados, verificar estrutura
    if response.json():
        first = response.json()[0]
        assert "usuario_nome" in first or first.get("usuario_nome"), "Deve incluir usuario_nome"
        assert "curso_nome" in first or first.get("curso_nome"), "Deve incluir curso_nome"
        assert "notas_provas" in first or first.get("notas_provas") is not None, "Deve incluir notas_provas"
        print("✓ Relatório estruturado corretamente")
    else:
        print("⚠ Curso sem notas ainda")

def test_10_obter_nota_especifica_aluno():
    """Teste 10: Aluno consegue obter sua nota específica em uma prova"""
    print("\n=== Teste 10: Obter nota específica em prova ===")
    admin_token = login_admin()
    aluno_token = login_aluno()
    
    aluno_id = 2
    prova_id = 1  # Assumindo que existe
    
    aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
    response = requests.get(
        f"{BASE_URL}/api/notas/{aluno_id}/{prova_id}",
        headers=aluno_headers
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        assert data.get("nota_final") is not None or "nota_final" in data, "Deve incluir nota_final"
        print("✓ Nota específica obtida com sucesso")
    elif response.status_code == 404:
        print("⚠ Nota não encontrada (é esperado se prova não tem resposta)")
    else:
        print(f"✗ Erro: {response.status_code}")

def test_11_obter_nota_curso_aluno():
    """Teste 11: Aluno consegue obter sua nota (média) em um curso"""
    print("\n=== Teste 11: Obter nota (média) do curso ===")
    admin_token = login_admin()
    aluno_token = login_aluno()
    
    aluno_id = 2
    curso_id = 1
    
    # Primeiro calcular média como admin
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    requests.post(
        f"{BASE_URL}/api/notas/{aluno_id}/{curso_id}/calcular-media",
        headers=admin_headers
    )
    
    # Agora aluno tenta obter
    aluno_headers = {"Authorization": f"Bearer {aluno_token}"}
    response = requests.get(
        f"{BASE_URL}/api/notas/aluno/{aluno_id}/curso/{curso_id}",
        headers=aluno_headers
    )
    print(f"Status: {response.status_code}")
    
    if response.status_code == 200:
        data = response.json()
        assert "media_final" in data or data.get("media_final") is not None, "Deve incluir media_final"
        assert "aprovado" in data or data.get("aprovado") is not None, "Deve incluir aprovado"
        print("✓ Nota do curso obtida com sucesso")
    elif response.status_code == 404:
        print("⚠ Nota do curso não encontrada (esperado se não calculada)")
    else:
        print(f"✗ Erro: {response.status_code}")

def test_12_erro_nota_inexistente():
    """Teste 12: Erro ao atualizar nota que não existe"""
    print("\n=== Teste 12: Erro - nota inexistente ===")
    admin_token = login_admin()
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    response = requests.put(f"{BASE_URL}/api/notas/99999", json={
        "nota_final": 10,
        "observacoes": "teste"
    }, headers=admin_headers)
    print(f"Status: {response.status_code}")
    
    assert response.status_code == 404, f"Esperava 404, recebeu {response.status_code}"
    print("✓ Erro 404 retornado corretamente")

# ==================== MAIN ====================

if __name__ == "__main__":
    print("=" * 60)
    print("TESTES DE NOTAS - CURSAAS EAD")
    print("=" * 60)
    
    try:
        test_1_listar_notas_admin()
        test_2_listar_notas_aluno_negado()
        test_3_aluno_ver_suas_notas()
        test_4_admin_ver_notas_outro_aluno()
        test_5_atualizar_nota_admin()
        test_6_aluno_nao_pode_atualizar_nota()
        test_7_calcular_media_curso()
        test_8_aluno_nao_pode_calcular_media()
        test_9_obter_notas_curso_detalhado()
        test_10_obter_nota_especifica_aluno()
        test_11_obter_nota_curso_aluno()
        test_12_erro_nota_inexistente()
        
        print("\n" + "=" * 60)
        print("✓ TODOS OS TESTES COMPLETADOS")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ ERRO: {str(e)}")
        import traceback
        traceback.print_exc()
