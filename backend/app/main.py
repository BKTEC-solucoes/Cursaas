import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
# Import explícito: registra TODOS os modelos em Base.metadata antes do
# create_all. As rotas importam models de forma transitiva, mas depender disso
# faria uma tabela sumir do schema ao se reorganizar imports.
from app import models  # noqa: F401
from app.security.middleware import TenantMiddleware
from app.routes import admin, alunos, aulas, auth, cursos, notas, presenca, provas, requests, convites, instituicao, faculdades, cadastro, sistema

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    """
    Cria as tabelas ausentes no startup.

    Isto rodava em tempo de import (`Base.metadata.create_all()` no corpo do
    módulo), o que fazia um simples `import app.main` abrir conexão com o banco:
    qualquer teste unitário exigia MySQL no ar, e o processo nem subia se o
    banco estivesse fora. Movido para o lifespan, o módulo importa sem I/O.

    Atenção ao limite: `create_all` cria tabelas NOVAS, mas nunca altera as
    existentes. Adição de coluna continua exigindo migração aplicada à mão em
    database/migration_*.sql.
    """
    Base.metadata.create_all(bind=engine)
    logger.info("Schema verificado (create_all).")
    yield


app = FastAPI(
    title="Cursaas - Portal EAD",
    description="API para o portal de educacao a distancia Cursaas",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
# TenantMiddleware adicionado após CORS (stack LIFO: executa antes do CORS)
app.add_middleware(TenantMiddleware)

# Garantir cabeçalhos CORS mesmo em respostas de erro não tratadas (500)
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error("422 Validation error on %s %s: %s", request.method, request.url.path, exc.errors())
    return JSONResponse(
        status_code=422,
        content={"detail": exc.errors()},
    )

@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    logger.exception("Unhandled exception while processing %s %s", request.method, request.url.path)
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

# Servir arquivos de upload como conteúdo estático.
#
# Apenas profile_pictures — são avatares, consumidos por <img> sem header de
# autenticação. Os vídeos NÃO entram aqui: montar UPLOAD_DIR inteiro deixava
# /uploads/videos/<arquivo> público, contornando toda a autorização de
# /api/aulas/video/{filename}. Nomes de vídeo são previsíveis
# (aula_<id>_video_<timestamp>), então isso equivalia a expor a mídia de todas
# as faculdades.
app.mount(
    "/uploads/profile_pictures",
    StaticFiles(directory=os.path.join(settings.UPLOAD_DIR, "profile_pictures")),
    name="profile_pictures",
)

app.include_router(auth.router, prefix="/api/auth", tags=["Autenticacao"])
app.include_router(cursos.router, prefix="/api/cursos", tags=["Cursos"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(aulas.router, prefix="/api/aulas", tags=["Aulas"])
app.include_router(provas.router, prefix="/api/provas", tags=["Provas"])
app.include_router(alunos.router, prefix="/api/alunos", tags=["Alunos"])
app.include_router(presenca.router, prefix="/api/presenca", tags=["Presenca"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])
app.include_router(requests.router, prefix="/api/requests", tags=["Solicitacoes"])
app.include_router(convites.router, prefix="/api/convites", tags=["Convites"])
app.include_router(instituicao.router, prefix="/api", tags=["Instituições"])
app.include_router(faculdades.router, prefix="/api/faculdades", tags=["Faculdades"])
app.include_router(cadastro.router,   prefix="/api/cadastro",   tags=["Cadastro Público"])
app.include_router(sistema.router,    prefix="/api/sistema",    tags=["Sistema"])


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
