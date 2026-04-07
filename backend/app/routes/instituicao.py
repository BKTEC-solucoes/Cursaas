from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Instituicao
from app.schemas import InstituicaoCreate, InstituicaoDetailResponse, TokenResponse
from app.services.institution_registration_service import (
    InstitutionRegistrationError,
    InstitutionRegistrationService,
)

router = APIRouter(prefix="/instituicoes", tags=["Instituicoes"])


@router.post("/registrar", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def registrar_instituicao(
    dados: InstituicaoCreate,
    db: Session = Depends(get_db),
):
    service = InstitutionRegistrationService(db)

    try:
        return await service.register(dados)
    except InstitutionRegistrationError as error:
        raise HTTPException(status_code=error.status_code, detail=error.message) from error


@router.get("/{instituicao_id:int}", response_model=InstituicaoDetailResponse)
async def obter_instituicao(
    instituicao_id: int = Path(..., gt=0),
    db: Session = Depends(get_db),
):
    instituicao = db.query(Instituicao).filter(Instituicao.id == instituicao_id).first()

    if not instituicao:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Instituicao nao encontrada",
        )

    return instituicao
