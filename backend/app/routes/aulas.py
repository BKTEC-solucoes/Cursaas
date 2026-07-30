from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Aula, Curso, Video, Usuario
from app.schemas import AulaCreate, AulaUpdate, AulaResponse, AulaDetailResponse, VideoResponse
import os
import shutil
from pathlib import Path
from app.config import settings
from app.routes.auth import get_current_user
from app.security.tenant import TenantContext, tenant_context
from app.services.admin_course_access import get_allowed_course_ids, ensure_admin_can_access_course

router = APIRouter()

@router.get("/", response_model=list[AulaDetailResponse])
def list_aulas(
    curso_id: int = None,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Lista todas as aulas ativas.
    
    **Parâmetros de Query:**
    - `curso_id` (int, opcional): Filtrar por curso específico
    
    **Retorna:**
    - Lista de aulas com ID, título, data, duração, status e vídeos associados
    """
    # Join com Curso para aplicar filtro de tenant (Aula não tem faculdade_id direto)
    query = (
        db.query(Aula)
        .join(Curso, Aula.curso_id == Curso.id)
        .filter(Aula.ativo == True)
    )

    # Filtro de tenant via Curso
    query = tc.filter_query(query, Curso.faculdade_id)

    if curso_id:
        query = query.filter(Aula.curso_id == curso_id)

    if current_user.role == "admin":
        allowed = get_allowed_course_ids(db, current_user)
        if allowed is not None:
            if not allowed:
                return []
            query = query.filter(Aula.curso_id.in_(allowed))
    
    aulas = query.order_by(Aula.data_aula).all()
    return [AulaDetailResponse.model_validate(a) for a in aulas]

@router.post("/", response_model=AulaResponse, status_code=status.HTTP_201_CREATED)
def create_aula(
    aula_data: AulaCreate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem criar aulas")

    # Verificar se curso existe
    curso = db.query(Curso).filter(Curso.id == aula_data.curso_id).first()
    if not curso:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Curso {aula_data.curso_id} não encontrado"
        )

    tc.assert_access(curso.faculdade_id)
    ensure_admin_can_access_course(db, current_user, aula_data.curso_id)

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
def get_aula(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
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

    # Bloquear acesso se o curso da aula pertence a outro tenant
    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first()
    if curso:
        tc.assert_access(curso.faculdade_id)

    if current_user.role == "admin":
        ensure_admin_can_access_course(db, current_user, aula.curso_id)

    return AulaDetailResponse.model_validate(aula)

@router.put("/{aula_id}", response_model=AulaResponse)
def update_aula(
    aula_id: int,
    aula_data: AulaUpdate,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem atualizar aulas")

    aula = db.query(Aula).filter(Aula.id == aula_id).first()

    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )

    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first()
    if curso:
        tc.assert_access(curso.faculdade_id)
    ensure_admin_can_access_course(db, current_user, aula.curso_id)

    # Atualizar apenas os campos fornecidos
    update_data = aula_data.model_dump(exclude_unset=True)
    for campo, valor in update_data.items():
        setattr(aula, campo, valor)
    
    db.commit()
    db.refresh(aula)
    
    return AulaResponse.model_validate(aula)

@router.delete("/{aula_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_aula(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem deletar aulas")

    aula = db.query(Aula).filter(Aula.id == aula_id).first()

    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )

    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first()
    if curso:
        tc.assert_access(curso.faculdade_id)
    ensure_admin_can_access_course(db, current_user, aula.curso_id)

    db.delete(aula)
    db.commit()

    return None

@router.post("/{aula_id}/upload-video", response_model=VideoResponse, status_code=status.HTTP_201_CREATED)
def upload_video(
    aula_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Apenas administradores podem fazer upload de vídeo")

    # Verificar se aula existe
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )

    curso_aula = db.query(Curso).filter(Curso.id == aula.curso_id).first()
    if curso_aula:
        tc.assert_access(curso_aula.faculdade_id)
    ensure_admin_can_access_course(db, current_user, aula.curso_id)

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
def get_video_file(
    filename: str,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Serve arquivos de vídeo para reprodução.

    Exige `Authorization: Bearer`. O frontend não pode usar `<video src>` direto
    aqui — precisa baixar via HttpClient (que passa pelo authInterceptor) e
    reproduzir a partir de uma object URL. Ver `VideoService` no Angular.

    **Parâmetros:**
    - `filename` (str): Nome do arquivo de vídeo

    **Retorna:**
    - Arquivo de vídeo para streaming

    **Erros:**
    - 403: Vídeo pertence a um curso de outro tenant
    - 404: Vídeo não encontrado
    """
    # O vídeo precisa existir em `videos` para que exista um curso — e portanto
    # um tenant — contra o qual autorizar. Servir pelo nome do arquivo sem esta
    # busca deixaria qualquer autenticado baixar mídia de qualquer faculdade.
    #
    # `caminho_arquivo` guarda o path completo gravado no upload (separador varia
    # com o SO), então casamos pelo sufixo. Wildcards de LIKE vindos da URL são
    # escapados para o filtro não virar uma varredura.
    padrao = filename.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    video = (
        db.query(Video)
        .filter(Video.caminho_arquivo.like(f"%{padrao}", escape="\\"))
        .first()
    )
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vídeo não encontrado"
        )

    aula = db.query(Aula).filter(Aula.id == video.aula_id).first()
    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first() if aula else None
    tc.assert_access(curso.faculdade_id if curso else None)

    # `filename` vem da URL: normaliza e confina em uploads/videos para que
    # nenhuma sequência de travessia ("..", caminho absoluto) escape do diretório.
    videos_dir = Path(settings.UPLOAD_DIR).resolve() / "videos"
    file_path = (videos_dir / filename).resolve()

    if not file_path.is_file() or videos_dir not in file_path.parents:
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
def get_video(
    aula_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Obtém informações do vídeo de uma aula.

    **Parâmetros:**
    - `aula_id` (int): ID da aula

    **Retorna:**
    - Dados do vídeo (nome, tamanho, formato, status, data de upload)

    **Erros:**
    - 403: Aula pertence a outro tenant
    - 404: Aula ou vídeo não encontrado
    """
    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    if not aula:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Aula {aula_id} não encontrada"
        )

    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first()
    tc.assert_access(curso.faculdade_id if curso else None)

    video = db.query(Video).filter(Video.aula_id == aula_id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Nenhum vídeo encontrado para a aula {aula_id}"
        )
    
    return VideoResponse.model_validate(video)

@router.delete("/{aula_id}/video/{video_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_video(
    aula_id: int,
    video_id: int,
    db: Session = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
    tc: TenantContext = Depends(tenant_context),
):
    """
    Deleta o vídeo de uma aula (apenas admin).

    **Parâmetros:**
    - `aula_id` (int): ID da aula
    - `video_id` (int): ID do vídeo

    **Retorna:**
    - 204 No Content (sem corpo)

    **Erros:**
    - 403: Não é admin, ou aula pertence a outro tenant
    - 404: Vídeo não encontrado
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Apenas administradores podem excluir vídeos",
        )

    video = db.query(Video).filter(
        Video.id == video_id,
        Video.aula_id == aula_id
    ).first()

    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Vídeo {video_id} não encontrado para a aula {aula_id}"
        )

    aula = db.query(Aula).filter(Aula.id == aula_id).first()
    curso = db.query(Curso).filter(Curso.id == aula.curso_id).first() if aula else None
    tc.assert_access(curso.faculdade_id if curso else None)
    ensure_admin_can_access_course(db, current_user, aula.curso_id)

    try:
        # Deletar arquivo do disco
        if os.path.exists(video.caminho_arquivo):
            os.remove(video.caminho_arquivo)
    except OSError:
        # Registro sai do banco de qualquer forma; arquivo órfão em disco é
        # preferível a deixar o vídeo acessível por já ter falhado o unlink.
        pass

    # Deletar registro do banco
    db.delete(video)
    db.commit()
    
    return None
