from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env")

    database_url: str = "sqlite:///./gridflow.db"
    file_storage_path: str = "./storage/files"
    cors_origins: list[str] = ["http://localhost:5173"]
    max_upload_size_mb: int = 100
    preview_row_limit: int = 200


settings = Settings()

Path(settings.file_storage_path).mkdir(parents=True, exist_ok=True)
