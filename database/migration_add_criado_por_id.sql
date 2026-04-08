-- Migration: Add criado_por_id column to cursos table
-- Tracks which admin created each course

ALTER TABLE cursos 
ADD COLUMN criado_por_id INT NULL AFTER data_criacao,
ADD CONSTRAINT fk_cursos_criado_por FOREIGN KEY (criado_por_id) REFERENCES usuarios(id);

-- Create index for better performance
CREATE INDEX idx_cursos_criado_por ON cursos(criado_por_id);
