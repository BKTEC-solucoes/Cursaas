import os
from pathlib import Path
from pydantic import field_validator
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

# Get the directory where this config file is located (app directory)
APP_DIR = Path(__file__).parent
# Backend directory (parent of app directory)
BACKEND_DIR = APP_DIR.parent
# Load environment variables from .env file in backend directory
ENV_FILE = BACKEND_DIR / ".env"
load_dotenv(ENV_FILE)

class Settings(BaseSettings):
    # Database - will be overridden by .env if present
    DATABASE_URL: str = os.getenv("DATABASE_URL", "mysql+pymysql://cursaas_user:cursaas_password@localhost:3306/cursaas")
    
    # JWT
    SECRET_KEY: str = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))

    @field_validator("SECRET_KEY")
    @classmethod
    def secret_key_must_be_strong(cls, v: str) -> str:
        if v == "your-secret-key-change-in-production" or len(v) < 32:
            raise ValueError(
                "SECRET_KEY insegura — defina no .env com no mínimo 32 caracteres aleatórios. "
                "Gere um com: python -c \"import secrets; print(secrets.token_hex(32))\""
            )
        return v
    
    # Upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))
    ALLOWED_VIDEO_FORMATS: list = ["mp4", "webm", "avi", "mov"]

    # SMTP (deixado em branco desativa envio real — apenas loga o link)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() == "true"
    SMTP_USER: str = os.getenv("SMTP_USER", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "noreply@cursaas.com")

    # URL base do frontend (usado para montar links nos e-mails)
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "http://localhost:4200")

    # Convite admin
    INVITE_EXPIRE_HOURS: int = int(os.getenv("INVITE_EXPIRE_HOURS", "48"))
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:4200", "http://localhost:3000"]
    
    # Presença
    PERCENTUAL_PRESENCA_MINIMA_PADRAO: int = int(os.getenv("PERCENTUAL_PRESENCA_MINIMA_PADRAO", "75"))
    
    class Config:
        env_file = ENV_FILE
        env_file_encoding = 'utf-8'
        case_sensitive = True

# Create settings instance  
settings = Settings()
