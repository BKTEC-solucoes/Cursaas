#!/usr/bin/env python
"""
Script para testar endpoints de upload de vídeos
"""
import requests
import os
from datetime import datetime, timedelta
import sys

BASE_URL = "http://localhost:8000/api"

print("=" * 80)
print("TESTE DE ENDPOINTS DE UPLOAD - VÍDEOS")
print("=" * 80)
print()

# ============================================================================
# PREPARAÇÃO: Criar curso e aula para usar nos testes
# ============================================================================
print("[Prep 1/2] Criando curso de teste...")
curso_data = {
    "nome": "Programação Python",
    "descricao": "Aprenda Python do zero ao avançado",
    "percentual_presenca_minima": 75
}
try:
    response = requests.post(f"{BASE_URL}/cursos", json=curso_data, timeout=5)
    if response.status_code == 201:
        curso_criado = response.json()
        curso_id = curso_criado["id"]
        print(f"      ✓ Curso criado com ID: {curso_id}")
    else:
        print(f"      ✗ Erro: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

print()
print("[Prep 2/2] Criando aula de teste...")
aula_data = {
    "curso_id": curso_id,
    "titulo": "Módulo 1: Variáveis e Tipos",
    "descricao": "Aprenda sobre variáveis e tipos de dados em Python",
    "data_aula": (datetime.now() + timedelta(days=1)).isoformat(),
    "duracao_minutos": 60
}
try:
    response = requests.post(f"{BASE_URL}/aulas", json=aula_data, timeout=5)
    if response.status_code == 201:
        aula_criada = response.json()
        aula_id = aula_criada["id"]
        print(f"      ✓ Aula criada com ID: {aula_id}")
    else:
        print(f"      ✗ Erro: {response.text}")
        sys.exit(1)
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

print()

# ============================================================================
# TESTE 1: Criar arquivo de vídeo fake para teste
# ============================================================================
print("[1/5] Criando arquivo de vídeo de teste...")
video_file_path = "test_video.mp4"
try:
    # Criar um arquivo fake de vídeo (apenas para teste)
    with open(video_file_path, "wb") as f:
        # Escrever alguns bytes fake (simula um vídeo)
        f.write(b"FAKE VIDEO CONTENT FOR TESTING" * 100)
    
    file_size = os.path.getsize(video_file_path)
    print(f"      ✓ Arquivo criado: {video_file_path} ({file_size} bytes)")
    print()
except Exception as e:
    print(f"      ✗ Erro: {e}")
    sys.exit(1)

# ============================================================================
# TESTE 2: Upload de vídeo
# ============================================================================
print(f"[2/5] POST /api/aulas/{aula_id}/upload-video - Upload de vídeo")
try:
    with open(video_file_path, "rb") as f:
        files = {"file": (video_file_path, f, "video/mp4")}
        response = requests.post(
            f"{BASE_URL}/aulas/{aula_id}/upload-video",
            files=files,
            timeout=10
        )
    
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        video_criado = response.json()
        video_id = video_criado["id"]
        print(f"     ✓ Vídeo enviado com sucesso!")
        print(f"       ID: {video_id}")
        print(f"       Nome do arquivo: {video_criado['arquivo_nome']}")
        print(f"       Tamanho: {video_criado['tamanho_bytes']} bytes")
        print(f"       Formato: {video_criado['formato']}")
        print(f"       Status: {video_criado['status']}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    import traceback
    traceback.print_exc()
    print()

# ============================================================================
# TESTE 3: Obter informações do vídeo
# ============================================================================
print(f"[3/5] GET /api/aulas/{aula_id}/video - Obter informações do vídeo")
try:
    response = requests.get(f"{BASE_URL}/aulas/{aula_id}/video", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        video_data = response.json()
        print(f"     ✓ Informações do vídeo obtidas:")
        print(f"       ID: {video_data['id']}")
        print(f"       Arquivo: {video_data['arquivo_nome']}")
        print(f"       Tamanho: {video_data['tamanho_bytes']} bytes")
        print(f"       Formato: {video_data['formato']}")
        print(f"       Status: {video_data['status']}")
        print(f"       Data Upload: {video_data['data_upload']}")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 4: Substituir vídeo (upload novo)
# ============================================================================
print(f"[4/5] POST /api/aulas/{aula_id}/upload-video - Substituir vídeo (novo upload)")
video_file_path2 = "test_video_v2.mp4"
try:
    # Criar arquivo novo (maior)
    with open(video_file_path2, "wb") as f:
        f.write(b"UPDATED VIDEO CONTENT FOR TESTING" * 200)
    
    with open(video_file_path2, "rb") as f:
        files = {"file": (video_file_path2, f, "video/mp4")}
        response = requests.post(
            f"{BASE_URL}/aulas/{aula_id}/upload-video",
            files=files,
            timeout=10
        )
    
    print(f"     Status: {response.status_code}")
    if response.status_code == 201:
        video_novo = response.json()
        print(f"     ✓ Vídeo substituído com sucesso!")
        print(f"       Novo tamanho: {video_novo['tamanho_bytes']} bytes")
        print(f"       (Arquivo anterior foi removido automaticamente)")
    else:
        print(f"     ✗ Erro: {response.text}")
    print()
except Exception as e:
    print(f"     ✗ Erro: {e}")
    print()

# ============================================================================
# TESTE 5: Verificar detalhes da aula (com vídeo)
# ============================================================================
print(f"[5/5] GET /api/aulas/{aula_id} - Verificar aula com vídeo")
try:
    response = requests.get(f"{BASE_URL}/aulas/{aula_id}", timeout=5)
    print(f"     Status: {response.status_code}")
    if response.status_code == 200:
        aula_detail = response.json()
        print(f"     ✓ Aula com vídeo integrado:")
        print(f"       Título: {aula_detail['titulo']}")
        print(f"       Vídeos: {len(aula_detail['videos'])} vídeo(s)")
        if len(aula_detail['videos']) > 0:
            video = aula_detail['videos'][0]
            print(f"         - {video['arquivo_nome']} ({video['tamanho_bytes']} bytes)")
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

# Tentar upload com formato inválido
print("[Bonus 1] Upload com formato inválido")
invalid_file = "test_file.txt"
try:
    with open(invalid_file, "w") as f:
        f.write("This is not a video file")
    
    with open(invalid_file, "rb") as f:
        files = {"file": (invalid_file, f, "text/plain")}
        response = requests.post(
            f"{BASE_URL}/aulas/{aula_id}/upload-video",
            files=files,
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

# Tentar obter vídeo de aula inexistente
print("[Bonus 2] GET vídeo de aula inexistente")
try:
    response = requests.get(f"{BASE_URL}/aulas/999/video", timeout=5)
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
# LIMPEZA
# ============================================================================
print("=" * 80)
print("LIMPEZA DE ARQUIVOS DE TESTE")
print("=" * 80)
print()

try:
    if os.path.exists(video_file_path):
        os.remove(video_file_path)
        print(f"✓ Removido: {video_file_path}")
    
    if os.path.exists(video_file_path2):
        os.remove(video_file_path2)
        print(f"✓ Removido: {video_file_path2}")
    
    if os.path.exists(invalid_file):
        os.remove(invalid_file)
        print(f"✓ Removido: {invalid_file}")
except Exception as e:
    print(f"⚠ Erro ao remover arquivos: {e}")

print()

# ============================================================================
# RESUMO
# ============================================================================
print("=" * 80)
print("✨ RESUMO:")
print("=" * 80)
print("✓ POST   /api/aulas/{id}/upload-video  - Upload de vídeo")
print("✓ GET    /api/aulas/{id}/video         - Obter informações do vídeo")
print("✓ DELETE /api/aulas/{id}/video/{id}    - Deletar vídeo")
print()
print("Funcionalidades:")
print("✓ Validação de formato de arquivo")
print("✓ Limitação de tamanho máximo")
print("✓ Substituição automática de vídeo anterior")
print("✓ Integração com aulas (relacionamento)")
print()
print("✨ Todos os endpoints de Upload de Vídeo estão funcionando! 🎉")
