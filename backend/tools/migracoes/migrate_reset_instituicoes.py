#!/usr/bin/env python3
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Migration: Reset institution approval status
Marks all existing institutions as not approved (pendente)
"""
import os
import sys
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.config import settings

def migrate_reset_instituicoes():
    """Reset all institutions to pendente status"""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔍 Checking current institution status...")
        
        # Count by approval status
        result_before = session.execute(
            text("SELECT aprovada, COUNT(*) as count FROM instituicoes GROUP BY aprovada")
        ).fetchall()
        print("\n📊 Before migration:")
        for aprovada, count in result_before:
            status = "Aprovada" if aprovada else "Pendente"
            print(f"   {status}: {count}")
        
        # Reset all to pendente (aprovada=0)
        print("\n🔄 Resetting all institutions to pendente status...")
        result = session.execute(
            text("UPDATE instituicoes SET aprovada = 0")
        )
        session.commit()
        print(f"✅ Updated {result.rowcount} institutions")
        
        # Verify
        result_after = session.execute(
            text("SELECT aprovada, COUNT(*) as count FROM instituicoes GROUP BY aprovada")
        ).fetchall()
        print("\n📊 After migration:")
        for aprovada, count in result_after:
            status = "Aprovada" if aprovada else "Pendente"
            print(f"   {status}: {count}")
        
        print("\n✨ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    migrate_reset_instituicoes()
