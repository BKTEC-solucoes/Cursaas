"""Regras de validação de CursoCreate/CursoUpdate. Sem banco."""
from decimal import Decimal

from app.schemas import CursoCreate


def test_curso_gratuito_zera_o_valor():
    curso = CursoCreate(nome="Gratis", pago=False, valor=Decimal("99.90"))
    assert curso.valor is None


def test_curso_pago_sem_valor_vira_zero():
    assert CursoCreate(nome="Pago", pago=True).valor == Decimal("0.0")


def test_curso_pago_com_valor_negativo_vira_zero():
    assert CursoCreate(nome="Pago", pago=True, valor=Decimal("-10")).valor == Decimal("0.0")


def test_curso_pago_preserva_valor_valido():
    assert CursoCreate(nome="Pago", pago=True, valor=Decimal("149.90")).valor == Decimal("149.90")


def test_faculdade_id_e_opcional_e_default_none():
    """Só super admin informa; para os demais o tenant vem do TenantContext."""
    assert CursoCreate(nome="X", pago=False).faculdade_id is None
    assert CursoCreate(nome="X", pago=False, faculdade_id=3).faculdade_id == 3


def test_percentual_presenca_tem_default_75():
    assert CursoCreate(nome="X", pago=False).percentual_presenca_minima == 75
