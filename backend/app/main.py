from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import os
from app.config import settings
from app.database import engine, Base
from app.routes import auth, cursos, aulas, provas, alunos, presenca, notas

# Criar as tabelas no banco de dados
Base.metadata.create_all(bind=engine)

# Criar a aplicação FastAPI
app = FastAPI(
    title="Cursaas - Portal EAD",
    description="API para o portal de educação a distância Cursaas",
    version="1.0.0"
)

# Configurar CORS
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

# Criar diretório de uploads se não existir
os.makedirs(os.path.join(settings.UPLOAD_DIR, "videos"), exist_ok=True)
os.makedirs(os.path.join(settings.UPLOAD_DIR, "profile_pictures"), exist_ok=True)

# Servir arquivos de upload como conteúdo estático
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Incluir rotas
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticação"])
app.include_router(cursos.router, prefix="/api/cursos", tags=["Cursos"])
app.include_router(aulas.router, prefix="/api/aulas", tags=["Aulas"])
app.include_router(provas.router, prefix="/api/provas", tags=["Provas"])
app.include_router(alunos.router, prefix="/api/alunos", tags=["Alunos"])
app.include_router(presenca.router, prefix="/api/presenca", tags=["Presença"])
app.include_router(notas.router, prefix="/api/notas", tags=["Notas"])

# Health check
@app.get("/health", tags=["Health"])
async def health_check():
    return {
        "status": "ok",
        "version": "1.0.0"
    }

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Bem-vindo ao Cursaas - Portal EAD",
        "version": "1.0.0",
        "docs": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
