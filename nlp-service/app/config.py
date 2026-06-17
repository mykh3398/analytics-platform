from pydantic_settings import BaseSettings
from typing import List
from pydantic import Field

class Settings(BaseSettings):
    model_name: str = "joeddav/xlm-roberta-large-xnli"

    allowed_zero_shot_models: List[str] = [
        "joeddav/xlm-roberta-large-xnli",
        "MoritzLaurer/mDeBERTa-v3-base-mnli-xnli",
        "MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7",
        "cross-encoder/nli-MiniLM2-L6-H768",
    ]

    device: str = "cpu"
    hypothesis_template: str = Field(default="Це повідомлення стосується теми: {}")
    max_length: int = 512

    min_examples_per_category: int = 5
    
    min_ready_categories: int = 2

    knn_index_path: str = "/app/data/knn_index.pkl"

    class Config:
        env_file = ".env"
        protected_namespaces = ("settings_",)


settings = Settings()