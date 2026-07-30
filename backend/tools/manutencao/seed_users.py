#!/usr/bin/env python
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Script para criar usuários de teste no banco de dados
"""
import os
import sys
from sqlalchemy.orm import Session
from app.database import SessionLocal, engine
from app.models import Usuario, Base
from app.services.auth_service import AuthService

def seed_users():
    """Cria usuários de teste no banco de dados"""
    
    # Criar todas as tabelas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Verificar se os usuários já existem
        admin = db.query(Usuario).filter(Usuario.email == "admin@example.com").first()
        aluno = db.query(Usuario).filter(Usuario.email == "aluno1@example.com").first()
        
        if admin:
            print("✓ Admin já existe")
        else:
            print("📝 Criando usuário Admin...")
            admin = Usuario(
                email="admin@example.com",
                nome="Administrador",
                senha=AuthService.hash_password("senha123"),
                role="admin",
                ativo=True
            )
            db.add(admin)
            db.commit()
            print("✅ Admin criado com sucesso!")
            print(f"   Email: admin@example.com")
            print(f"   Senha: senha123")
        
        if aluno:
            print("✓ Aluno já existe")
        else:
            print("📝 Criando usuário Aluno...")
            aluno = Usuario(
                email="aluno1@example.com",
                nome="João da Silva",
                senha=AuthService.hash_password("senha123"),
                role="aluno",
                ativo=True
            )
            db.add(aluno)
            db.commit()
            print("✅ Aluno criado com sucesso!")
            print(f"   Email: aluno1@example.com")
            print(f"   Senha: senha123")
        
        print()
        print("=" * 60)
        print("USUÁRIOS DE TESTE")
        print("=" * 60)
        print()
        print("Admin:")
        print("  Email: admin@example.com")
        print("  Senha: senha123")
        print()
        print("Aluno:")
        print("  Email: aluno1@example.com")
        print("  Senha: senha123")
        print()
        print("=" * 60)
        
    except Exception as e:
        print(f"❌ Erro ao criar usuários: {e}")
        db.rollback()
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
