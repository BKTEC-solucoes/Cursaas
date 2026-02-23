from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Aula, Curso, Video
from app.schemas import AulaCreate, AulaUpdate, AulaResponse, AulaDetailResponse, VideoResponse
import os
import shutil
from pathlib import Path
from app.config import settings

router = APIRouter()

@router.get("/", response_model=list[AulaDetailResponse])
def list_aulas(curso_id: int = None, db: Session = Depends(get_db)):
    """
    Lista todas as aulas ativas.
    
    **Parâmetros de Query:**
    - `curso_id` (int, opcional): Filtrar por curso específico
    
    **Retorna:**
    - Lista de aulas com ID, título, data, duração, status e vídeos associados
    """
    query = db.query(Aula).filter(Aula.ativo == True)
    
    if curso_id:
        query = query.filter(Aula.curso_id == curso_id)
    
    aulas = query.order_by(Aula.data_aula).all()
    return [AulaDetailResponse.model_validate(a) for a in aulas]

@router.post("/", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def create_aula(aula_data: AulaCreate, db: Session = Depends(get_db)):
    """
    Cria uma nova aula (apenas admin).
    
    **Parâmetros:**
    - `curso_id` (int, obrigatório): ID do curso
    - `titulo` (str, obrigatório): Título da aula
    - `descricao` (str, opcional): Descrição/conteúdo da aula
    - `data_aula` (datetime, obrigatório): Data e hora da aula
    - `duracao_minutos` (int, opcional): Duração em minutos
    
    **Retorna:**
    - Dados da aula criada incluindo ID e timestamps
    
    **Erros:**
    - 404: Curso não encontrado
    """
    # Verificar se curso existe
    curso = db.query(Curso).filter(Curso.id == aula_data.curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {aula_data.curso_id} não encontrado"
        )
    
    # Criar nova aula
    db_aula = Aula(
        curso_id=aula_data.curso_id,
        titulo=aula_data.titulo,
        descricao=aula_data.descricao,
        data_aula=aula_data.data_aula,
        duracao_minutos=aula_data.duracao_minutos,
        ativo=True
    )
    
    db.add(db_aula)
    db.commit()
    db.refresh(db_aula)
    
    return AulaResponse.model_validate(db_aula)

@router.get("/{aula_id}", response_model=AulaDetailResponse)
def get_aula(aula_id: int, db: Session = Depends(get_db)):
    """
    Obtém detalhes completos de uma aula incluindo vídeos.
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula
    
    **Retorna:**
    - Dados da aula com vídeos relacionados
    
    **Erros:**
    - 404: Aula não encontrada
    """
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )
    
    return AulaDetailResponse.model_validate(aula)

@router.put("/{aula_id}", response_model=AulaResponse)
def update_aula(
    aula_id: int,
    aula_data: AulaUpdate,
    db: Session = Depends(get_db)
):
    """
    Atualiza uma aula existente (apenas admin).
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula a atualizar
    - `titulo` (str, opcional): Novo título
    - `descricao` (str, opcional): Nova descrição
    - `data_aula` (datetime, opcional): Nova data/hora
    - `duracao_minutos` (int, opcional): Nova duração
    - `ativo` (bool, opcional): Ativar/desativar aula
    
    **Retorna:**
    - Dados atualizados da aula
    
    **Erros:**
    - 404: Aula não encontrada
    """
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )
    
    # Atualizar apenas os campos fornecidos
    update_data = aula_data.model_dump(exclude_unset=True)
    for campo, valor in update_data.items():
        setattr(aula, campo, valor)
    
    db.commit()
    db.refresh(aula)
    
    return AulaResponse.model_validate(aula)

@router.delete("/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_aula(aula_id: int, db: Session = Depends(get_db)):
    """
    Deleta uma aula (apenas admin).
    
    ⚠️ **Cuidado:** Ao deletar, todos os vídeos e registros de presença associados também serão deletados.
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula a deletar
    
    **Retorna:**
    - 204 No Content (sem corpo)
    
    **Erros:**
    - 404: Aula não encontrada
    """
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )
    
    db.delete(aula)
    db.commit()
    
    return None

@router.post("/{aula_id}/upload-video", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
def upload_video(aula_id: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    """
    Faz upload de um vídeo para uma aula (apenas admin).
    
    ⚠️ **Nota:** Apenas um vídeo por aula é permitido. Se já houver um vídeo, ele será substituído.
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula
    - `file` (UploadFile): Arquivo de vídeo (MP4, WebM, AVI, MOV)
    
    **Formatos suportados:**
    - mp4, webm, avi, mov
    
    **Tamanho máximo:**
    - 500 MB
    
    **Retorna:**
    - Dados do vídeo criado incluindo caminho, tamanho e formato
    
    **Erros:**
    - 404: Aula não encontrada
    - 400: Formato de vídeo não suportado ou arquivo muito grande
    """
    # Verificar se aula existe
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )
    
    # Validar extensão do arquivo
    allowed_formats = settings.ALLOWED_VIDEO_FORMATS
    file_extension = file.filename.split(".")[-1].lower()
    
    if file_extension not in allowed_formats:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Formato de vídeo não suportado. Permitidos: {', '.join(allowed_formats)}"
        )
    
    # Deletar vídeo anterior se existir (apenas um por aula)
    video_anterior = db.query(Video).filter(Video.aula_id == aula_id).first()
    if video_anterior:
        # Deletar arquivo do disco
        try:
            os.remove(video_anterior.caminho_arquivo)
        except:
            pass
        # Deletar registro do banco
        db.delete(video_anterior)
        db.commit()
    
    # Criar diretório se não existir
    upload_dir = Path(settings.UPLOAD_DIR) / "videos"
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    # Gerar nome único para o arquivo
    import time
    timestamp = int(time.time() * 1000)
    novo_nome = f"aula_{aula_id}_video_{timestamp}.{file_extension}"
    caminho_completo = upload_dir / novo_nome
    
    try:
        # Salvar arquivo
        with open(caminho_completo, "wb") as buffer:
            conteudo = file.file.read()
            
            # Validar tamanho máximo
            if len(conteudo) > settings.MAX_FILE_SIZE:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Arquivo muito grande. Máximo: {settings.MAX_FILE_SIZE / (1024*1024):.0f} MB"
                )
            
            buffer.write(conteudo)
        
        # Criar registro no banco
        db_video = Video(
            aula_id=aula_id,
            arquivo_nome=file.filename,
            caminho_arquivo=str(caminho_completo),
            tamanho_bytes=len(conteudo),
            formato=file_extension,
            status="disponivel"  # StatusVideoEnum.disponivel
        )
        
        db.add(db_video)
        db.commit()
        db.refresh(db_video)
        
        return VideoResponse.model_validate(db_video)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erro ao fazer upload do vídeo: {str(e)}"
        )

@router.get("/video/{filename}")
def get_video_file(filename: str):
    """
    Serve arquivos de vídeo para reprodução.
    
    **Parâmetros:**
    - `filename` (str): Nome do arquivo de vídeo
    
    **Retorna:**
    - Arquivo de vídeo para streaming
    
    **Erros:**
    - 404: Vídeo não encontrado
    """
    file_path = os.path.join(settings.UPLOAD_DIR, "videos", filename)
    
    if not os.path.exists(file_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vídeo não encontrado"
        )
    
    return FileResponse(
        file_path, 
        media_type="video/mp4",
        headers={"Accept-Ranges": "bytes"}
    )

@router.get("/{aula_id}/video", response_model=VideoResponse)
def get_video(aula_id: int, db: Session = Depends(get_db)):
    """
    Obtém informações do vídeo de uma aula.
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula
    
    **Retorna:**
    - Dados do vídeo (nome, tamanho, formato, status, data de upload)
    
    **Erros:**
    - 404: Aula ou vídeo não encontrado
    """
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )
    
    video = db.query(Video).filter(Video.aula_id == aula_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum vídeo encontrado para a aula {aula_id}"
        )
    
    return VideoResponse.model_validate(video)

@router.delete("/{aula_id}/video/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(aula_id: int, video_id: int, db: Session = Depends(get_db)):
    """
    Deleta o vídeo de uma aula (apenas admin).
    
    **Parâmetros:**
    - `aula_id` (int): ID da aula
    - `video_id` (int): ID do vídeo
    
    **Retorna:**
    - 204 No Content (sem corpo)
    
    **Erros:**
    - 404: Vídeo não encontrado
    """
    video = db.query(Video).filter(
        Video.id == video_id,
        Video.aula_id == aula_id
    ).first()
    
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vídeo {video_id} não encontrado para a aula {aula_id}"
        )
    
    try:
        # Deletar arquivo do disco
        if os.path.exists(video.caminho_arquivo):
            os.remove(video.caminho_arquivo)
    except:
        pass
    
    # Deletar registro do banco
    db.delete(video)
    db.commit()
    
    return None
