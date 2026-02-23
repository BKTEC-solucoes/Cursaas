from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def list_alunos():
    """Lista todos os alunos (admin)"""
    return {"message": "Listar alunos - TODO"}

@router.post("/")
def create_aluno():
    """Cria um novo aluno (admin)"""
    return {"message": "Criar aluno - TODO"}

@router.get("/{aluno_id}")
def get_aluno(aluno_id: int):
    """Obtém detalhes de um aluno (admin)"""
    return {"message": f"Obter aluno {aluno_id} - TODO"}

@router.put("/{aluno_id}")
def update_aluno(aluno_id: int):
    """Atualiza informações de um aluno (admin)"""
    return {"message": f"Atualizar aluno {aluno_id} - TODO"}

@router.delete("/{aluno_id}")
def delete_aluno(aluno_id: int):
    """Deleta um aluno (admin)"""
    return {"message": f"Deletar aluno {aluno_id} - TODO"}

@router.get("/{aluno_id}/cursos")
def get_cursos_aluno(aluno_id: int):
    """Lista os cursos do aluno"""
    return {"message": f"Obter cursos do aluno {aluno_id} - TODO"}
