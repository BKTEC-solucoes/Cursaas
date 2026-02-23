import os
from pydantic_settings import BaseSettings
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "mysql+pymysql://cursaas_user:cursaas_password@localhost:3306/cursaas"
    
    # JWT
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 480  # 8 horas
    
    # Upload
    UPLOAD_DIR: str = "uploads"
    MAX_FILE_SIZE: int = 500 * 1024 * 1024  # 500MB
    ALLOWED_VIDEO_FORMATS: list = ["mp4", "webm", "avi", "mov"]
    
    # CORS
    ALLOWED_ORIGINS: list = ["http://localhost:4200", "http://localhost:3000"]
    
    # Presença
    PERCENTUAL_PRESENCA_MINIMA_PADRAO: int = 75
    
    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()
