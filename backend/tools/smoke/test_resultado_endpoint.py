#!/usr/bin/env python3
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Script para testar o endpoint /meu-resultado
"""
import sys
import json
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Nota, Prova, Curso, Questao, Resposta, Usuario
from datetime import datetime

def test_resultado_data():
    """Testa se há dados de resultado para testes"""
    db = SessionLocal()
    
    try:
        # Verificar se há notas
        notas_count = db.query(Nota).count()
        print(f"[OK] Notas no banco: {notas_count}")
        
        if notas_count > 0:
            # Pegar primeira nota
            nota = db.query(Nota).order_by(Nota.id.desc()).first()
            print(f"\n[NOTA] Ultima nota:")
            print(f"   - ID: {nota.id}")
            print(f"   - Prova ID: {nota.prova_id}")
            print(f"   - Usuario ID: {nota.usuario_id}")
            print(f"   - Nota Final: {nota.nota_final}")
            print(f"   - Tentativa: {nota.tentativa}")
            print(f"   - Data: {nota.data_submissao}")
            
            # Detalhar e simular a logica do endpoint
            print(f"\n[SIMULACAO] Executando logica do endpoint:")
            
            # Buscar todas as questoes da prova
            questoes = db.query(Questao).filter(Questao.prova_id == nota.prova_id).all()
            total_questoes = len(questoes)
            print(f"   [Total Questoes] {total_questoes}")
            
            # Tipos
            tipos = {}
            for q in questoes:
                t = q.tipo or "multipla_escolha"
                tipos[t] = tipos.get(t, 0) + 1
            print(f"   [Tipos] {tipos}")
            
            # Buscar respostas do aluno
            respostas_raw = db.query(Resposta).filter(
                Resposta.usuario_id == nota.usuario_id,
                Resposta.prova_id == nota.prova_id
            ).order_by(
                Resposta.questao_id,
                Resposta.data_resposta.desc()
            ).all()
            
            print(f"   [Respostas Brutas] {len(respostas_raw)}")
            
            # Agrupar por questao - pegar ultima de cada
            questoes_respondidas = {}
            for resposta in respostas_raw:
                if resposta.questao_id not in questoes_respondidas:
                    questoes_respondidas[resposta.questao_id] = resposta
                    
            print(f"   [Questoes Respondidas] {len(questoes_respondidas)}")
            
            # Contar acertos - apenas True
            total_acertos = sum(1 for r in questoes_respondidas.values() if r.correta == True)
            print(f"   [Total Acertos] {total_acertos}")
            
            # Multipla escolha count
            multi_count = sum(1 for q in questoes if q.tipo == "multipla_escolha")
            print(f"   [Multipla Escolha Total] {multi_count}")
            
            # Percentual
            if multi_count > 0:
                percentual = round((total_acertos / multi_count) * 100, 2)
                print(f"   [Percentual] {percentual}%")
            else:
                print(f"   [Percentual] 0% (nenhuma multipla escolha)")
            
            # Detalhe de respostas
            print(f"\n[DETALHES] Primeiras 10 respostas:")
            for q_id, resposta in list(questoes_respondidas.items())[:10]:
                questao = next((q for q in questoes if q.id == q_id), None)
                q_tipo = questao.tipo if questao else "desconhecido"
                status = f"CORRETA" if resposta.correta == True else (f"ERRADA" if resposta.correta == False else f"DISSERTATIVA")
                print(f"   Q{q_id} ({q_tipo}): {status}")
            
            # Mostrar resultado final
            print(f"\n[RESULTADO FINAL] Seria retornado:")
            resultado = {
                "id": nota.id,
                "prova_id": nota.prova_id,
                "usuario_id": nota.usuario_id,
                "nota_final": float(nota.nota_final),
                "total_questoes": total_questoes,
                "total_acertos": total_acertos,
                "percentual_acerto": percentual if multi_count > 0 else 0.0,
                "tentativa": nota.tentativa,
                "data_submissao": nota.data_submissao.isoformat() if nota.data_submissao else None
            }
            
            for key, value in resultado.items():
                print(f"   {key}: {value}")
        
        print("\n[OK] Teste concluido!")
        
    except Exception as e:
        print(f"[ERRO] {e}")
        import traceback
        traceback.print_exc()
    finally:
        db.close()

if __name__ == "__main__":
    test_resultado_data()
