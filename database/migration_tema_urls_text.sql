-- ---------------------------------------------------------------------------
-- migration_tema_urls_text.sql
--
-- Alarga `logo_url_override` e `favicon_url` de VARCHAR(500) para TEXT em
-- `faculdade_temas`.
--
-- Motivo: as duas colunas passaram a receber data URIs (`data:image/png;base64,...`)
-- do upload de logo/favicon do white-label, e não apenas caminhos de arquivo.
-- Um PNG pequeno já estoura 500 caracteres em base64, e o MySQL rejeita o INSERT
-- com "Data too long for column".
--
-- Precisa ser aplicada à mão: `Base.metadata.create_all()` no startup cria
-- tabelas novas, mas nunca altera as existentes.
--
--   docker exec -i cursaas-db-1 mysql -u root -p cursaas < database/migration_tema_urls_text.sql
--
-- Idempotente: reexecutar em coluna já TEXT é no-op no MySQL.
-- ---------------------------------------------------------------------------

ALTER TABLE faculdade_temas
    MODIFY COLUMN logo_url_override TEXT NULL
        COMMENT 'Override de logo; se NULL usa faculdades.logo_url';

ALTER TABLE faculdade_temas
    MODIFY COLUMN favicon_url TEXT NULL;
