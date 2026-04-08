#!/usr/bin/env python3
"""
Migration: Add criado_por_id to cursos table
Tracks which instructor created each course
"""
import os
import sys
from sqlalchemy import text, create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.join(os.path.dirname(__file__)))

from app.config import settings

def migrate_add_criado_por_id():
    """Add criado_por_id column to cursos table"""
    engine = create_engine(settings.DATABASE_URL)
    Session = sessionmaker(bind=engine)
    session = Session()
    
    try:
        print("🔍 Checking if criado_por_id column exists...")
        
        # Check if column already exists
        result = session.execute(
            text("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='cursos' AND COLUMN_NAME='criado_por_id'")
        ).fetchone()
        
        if result:
            print("✅ Column criado_por_id already exists")
            return
        
        print("🔄 Adding criado_por_id column to cursos table...")
        
        # Add the column
        session.execute(text("""
            ALTER TABLE cursos 
            ADD COLUMN criado_por_id INT NULL AFTER data_criacao,
            ADD CONSTRAINT fk_cursos_criado_por FOREIGN KEY (criado_por_id) REFERENCES usuarios(id) ON DELETE SET NULL
        """))
        
        # Create index
        session.execute(text("CREATE INDEX idx_cursos_criado_por ON cursos(criado_por_id)"))
        
        session.commit()
        print("✅ Column criado_por_id added successfully")
        
        # Verify
        result = session.execute(
            text("SELECT COUNT(*) FROM cursos WHERE criado_por_id IS NULL")
        ).scalar()
        print(f"📊 Cursos without creator: {result}")
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        session.rollback()
        sys.exit(1)
    finally:
        session.close()

if __name__ == "__main__":
    migrate_add_criado_por_id()
