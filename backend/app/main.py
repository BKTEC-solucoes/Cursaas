import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import inspect, text

from app.config import settings
from app.database import Base, engine
from app.models import CourseRequest, Instituicao
from app.routes import admin, alunos, aulas, auth, cursos, notas, presenca, provas, requests, instituicao


def ensure_schema_updates():
    """Aplica ajustes minimos de schema em bancos ja existentes."""
    inspector = inspect(engine)

    if inspector.has_table("cursos"):
        columns = {column["name"] for column in inspector.get_columns("cursos")}

        if "pago" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE cursos ADD COLUMN pago BOOLEAN NOT NULL DEFAULT FALSE")
                )

        if "valor" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE cursos ADD COLUMN valor DECIMAL(10, 2)")
                )

        if "status" not in columns:
            with engine.begin() as connection:
                connection.execute(
                    text("ALTER TABLE cursos ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'aprovado'")
                )

    if inspector.has_table("instituicoes"):
        instituicoes_columns = {
            column["name"]: column for column in inspector.get_columns("instituicoes")
        }
        with engine.begin() as connection:
            if "contato" not in instituicoes_columns:
                connection.execute(
                    text("ALTER TABLE instituicoes ADD COLUMN contato VARCHAR(255) NULL AFTER cnpj")
                )

            if "user_id" not in instituicoes_columns:
                connection.execute(
                    text("ALTER TABLE instituicoes ADD COLUMN user_id INT NULL")
                )
                connection.execute(
                    text("ALTER TABLE instituicoes ADD INDEX idx_user_id (user_id)")
                )

            if "contato_responsavel" in instituicoes_columns:
                connection.execute(
                    text(
                        "UPDATE instituicoes "
                        "SET contato = contato_responsavel "
                        "WHERE (contato IS NULL OR contato = '') "
                        "AND contato_responsavel IS NOT NULL"
                    )
                )

            if "email" in instituicoes_columns and not instituicoes_columns["email"]["nullable"]:
                connection.execute(
                    text("ALTER TABLE instituicoes MODIFY COLUMN email VARCHAR(255) NULL")
                )

            if (
                "nome_responsavel" in instituicoes_columns
                and not instituicoes_columns["nome_responsavel"]["nullable"]
            ):
                connection.execute(
                    text("ALTER TABLE instituicoes MODIFY COLUMN nome_responsavel VARCHAR(255) NULL")
                )

            if (
                "contato_responsavel" in instituicoes_columns
                and not instituicoes_columns["contato_responsavel"]["nullable"]
            ):
                connection.execute(
                    text("ALTER TABLE instituicoes MODIFY COLUMN contato_responsavel VARCHAR(255) NULL")
                )

            if "senha" in instituicoes_columns and not instituicoes_columns["senha"]["nullable"]:
                connection.execute(
                    text("ALTER TABLE instituicoes MODIFY COLUMN senha VARCHAR(255) NULL")
                )

    if inspector.has_table("usuarios"):
        usuarios_columns = {
            column["name"]: column for column in inspector.get_columns("usuarios")
        }
        usuarios_fks = inspector.get_foreign_keys("usuarios")
        fk_usuarios_instituicao = any(
            fk.get("constrained_columns") == ["instituicao_id"] for fk in usuarios_fks
        )

        with engine.begin() as connection:
            if "instituicao_id" not in usuarios_columns:
                connection.execute(
                    text("ALTER TABLE usuarios ADD COLUMN instituicao_id INT NULL")
                )
                connection.execute(
                    text("ALTER TABLE usuarios ADD INDEX idx_instituicao_id (instituicao_id)")
                )

            if not fk_usuarios_instituicao:
                connection.execute(
                    text(
                        "ALTER TABLE usuarios "
                        "ADD CONSTRAINT fk_usuarios_instituicao_id "
                        "FOREIGN KEY (instituicao_id) REFERENCES instituicoes(id) ON DELETE SET NULL"
                    )
                )

            if inspector.has_table("instituicoes") and "user_id" in instituicoes_columns:
                connection.execute(
                    text(
                        "UPDATE usuarios u "
                        "JOIN instituicoes i ON i.user_id = u.id "
                        "SET u.instituicao_id = i.id "
                        "WHERE u.instituicao_id IS NULL"
                    )
                )

    CourseRequest.__table__.create(bind=engine, checkfirst=True)


Base.metadata.create_all(bind=engine)
ensure_schema_updates()

app = FastAPI(
    title="Cursaas - Portal EAD",
    description="API para o portal de educacao a distancia Cursaas",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Garantir cabeçalhos CORS mesmo em respostas de erro não tratadas (500)
@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    origin = request.headers.get("origin", "")
    headers = {}
    if origin in settings.ALLOWED_ORIGINS:
        headers["Access-Control-Allow-Origin"] = origin
        headers["Access-Control-Allow-Credentials"] = "true"
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"},
        headers=headers,
    )

os.makedirs(os.path.join(settings.UPLOAD_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "profile_pictures"), exist_ok=True)

# Servir arquivos de upload como conteúdo estático
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticacao"])
app.include_router(cursos.router, prefix="/api/cursos", tags=["Cursos"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(aulas.router, prefix="/api/aulas", tags=["Aulas"])
app.include_router(provas.router, prefix="/api/provas", tags=["Provas"])
app.include_router(alunos.router, prefix="/api/alunos", tags=["Alunos"])
app.include_router(presenca.router, prefix="/api/presenca", tags=["Presenca"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(requests.router, prefix="/api/requests", tags=["Solicitacoes"])
app.include_router(instituicao.router, prefix="/api", tags=["Instituições"])


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/health", tags=["Health"])
async def api_health_check():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return {"status": "online", "database": "connected"}
    except Exception as error:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(error)},
        )


@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Bem-vindo ao Cursaas - Portal EAD",
        "version": "1.0.0",
        "docs": "/docs",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
