#!/usr/bin/env python3
# Bootstrap de path: este script vive em backend/tools/<categoria>/, mas
# importa `app.*`, que resolve a partir de backend/.
import pathlib as _pathlib
import sys as _sys
_sys.path.insert(0, str(_pathlib.Path(__file__).resolve().parents[2]))

"""
Migration: Remove invalid admin roles (financeiro, suporte)
Converts these invalid values to NULL (legacy admin)
"""
import os
import sys
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.config import settings

def migrate_invalid_roles():
    """Convert invalid admin roles to NULL"""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔍 Checking for invalid admin roles...")
        
        # Count before
        result_before = session.execute(
            text("SELECT admin_role, COUNT(*) as count FROM usuarios WHERE role = 'admin' GROUP BY admin_role")
        ).fetchall()
        print("\n📊 Before migration:")
        for role, count in result_before:
            print(f"   {role or 'NULL (Legacy)'}: {count}")
        
        # Execute migration
        print("\n🔄 Converting financeiro and suporte to NULL (legacy)...")
        result = session.execute(
            text("UPDATE usuarios SET admin_role = NULL WHERE admin_role IN ('financeiro', 'suporte')")
        )
        session.commit()
        print(f"✅ Updated {result.rowcount} rows")
        
        # Count after
        result_after = session.execute(
            text("SELECT admin_role, COUNT(*) as count FROM usuarios WHERE role = 'admin' GROUP BY admin_role")
        ).fetchall()
        print("\n📊 After migration:")
        for role, count in result_after:
            print(f"   {role or 'NULL (Legacy)'}: {count}")
        
        print("\n✨ Migration completed successfully!")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    migrate_invalid_roles()
