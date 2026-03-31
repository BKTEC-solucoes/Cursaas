from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from app.database import get_db
from app.schemas import InstituicaoCreate, InstituicaoResponse, InstituicaoDetailResponse, TokenResponse, UsuarioResponse
from app.models import Instituicao, RoleEnum
from app.services.auth_service import AuthService
from app.config import settings
from datetime import timedelta
import re

router = APIRouter(prefix="/instituicoes", tags=["Instituições"])

def _validar_cnpj(cnpj: str) -> bool:
    """Valida formato do CNPJ (XX.XXX.XXX/XXXX-XX)"""
    padrao = r'^\d{2}\.\d{3}\.\d{3}/\d{4}-\d{2}$'
    return bool(re.match(padrao, cnpj))

@router.post("/registrar", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def registrar_instituicao(
    dados: InstituicaoCreate,
    db: Session = Depends(get_db)
):
    """
    Registra uma nova instituição e faz login automático.
    
    - **nome_instituicao**: Nome da instituição
    - **cnpj**: CNPJ no formato XX.XXX.XXX/XXXX-XX
    - **email**: Email da instituição
    - **nome_responsavel**: Nome do responsável legal
    - **contato_responsavel**: Telefone/WhatsApp do responsável
    - **endereco**: Endereço completo da instituição
    - **senha**: Senha (mínimo 6 caracteres)
    
    Retorna token JWT e dados da instituição criada.
    """
    
    # Validar CNPJ
    if not _validar_cnpj(dados.cnpj):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CNPJ inválido. Use o formato: XX.XXX.XXX/XXXX-XX"
        )
    
    # Validar comprimento da senha
    if len(dados.senha) < 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Senha deve ter no mínimo 6 caracteres"
        )
    
    # Verificar se CNPJ já existe
    cnpj_existente = db.query(Instituicao).filter(Instituicao.cnpj == dados.cnpj).first()
    if cnpj_existente:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="CNPJ já registrado no sistema"
        )
    
    # Verificar se email já existe em instituições
    email_existente_inst = db.query(Instituicao).filter(Instituicao.email == dados.email).first()
    if email_existente_inst:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado em outra instituição"
        )
    
    # Verificar se email já existe em usuários (caso admin ou aluno anterior)
    from app.models import Usuario
    email_existente_user = db.query(Usuario).filter(Usuario.email == dados.email).first()
    if email_existente_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email já registrado no sistema"
        )
    
    try:
        # Hash da senha
        senha_hash = AuthService.hash_password(dados.senha)
        
        # Criar instituição
        nova_instituicao = Instituicao(
            nome_instituicao=dados.nome_instituicao,
            cnpj=dados.cnpj,
            email=dados.email,
            nome_responsavel=dados.nome_responsavel,
            contato_responsavel=dados.contato_responsavel,
            endereco=dados.endereco,
            senha=senha_hash,
            ativo=True,  # Ativa automaticamente
            aprovada=False  # Aguarda aprovação de admin
        )
        
        db.add(nova_instituicao)
        db.commit()
        db.refresh(nova_instituicao)
        
        # Gerar token JWT para login automático
        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = AuthService.create_token(
            data={"email": nova_instituicao.email, "role": "instituicao"},
            expires_delta=access_token_expires
        )
        
        # Preparar resposta (usando UsuarioResponse como modelo padrão)
        usuario_response = UsuarioResponse(
            id=nova_instituicao.id,
            nome=nova_instituicao.nome_instituicao,
            email=nova_instituicao.email,
            role=RoleEnum.aluno,  # Usando como placeholder
            admin_role=None,
            foto_perfil=None,
            ativo=True,
            data_criacao=nova_instituicao.data_criacao
        )
        
        return TokenResponse(
            access_token=access_token,
            token_type="bearer",
            usuario=usuario_response
        )
        
    except IntegrityError as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Erro ao registrar instituição. Verifique os dados fornecidos."
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erro interno ao registrar instituição"
        )

@router.get("/{instituicao_id}", response_model=InstituicaoDetailResponse)
async def obter_instituicao(
    instituicao_id: int,
    db: Session = Depends(get_db)
):
    """
    Obtém detalhes de uma instituição pelo ID.
    """
    instituicao = db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()
    
    if not instituicao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instituição não encontrada"
        )
    
    return instituicao
