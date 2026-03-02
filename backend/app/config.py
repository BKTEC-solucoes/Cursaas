import os
from pathlib import Path
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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "480"))
    
    # Upload
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", "uploads")
    MAX_FILE_SIZE: int = int(os.getenv("MAX_FILE_SIZE", str(500 * 1024 * 1024)))
    ALLOWED_VIDEO_FORMATS: list = ["mp4", "webm", "avi", "mov"]
    
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
