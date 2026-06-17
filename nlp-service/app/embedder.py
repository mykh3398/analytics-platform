import logging
import numpy as np
from sentence_transformers import SentenceTransformer
from app.config import settings

logger = logging.getLogger(__name__)

class TextEmbedder:
    def __init__(self):
        self._models: dict[str, SentenceTransformer] = {}

    def _get_model_name(self, custom_model_id: str | None) -> str:
        if custom_model_id and custom_model_id.strip() and custom_model_id.upper() != "DEFAULT":
            return custom_model_id
        return settings.model_name

    def load(self, model_name: str) -> None:
        if model_name not in self._models:
            device = settings.device
            logger.info(f"Loading embedding model: {model_name} on {device}")
            try:
                model = SentenceTransformer(model_name, device=device)
                model.max_seq_length = 128
                self._models[model_name] = model
                logger.info(f"Model {model_name} loaded. Max seq length: {model.max_seq_length}")
            except Exception as e:
                logger.error(f"Failed to load embedding model {model_name}: {e}")
                raise

    def encode(self, text: str, custom_model_id: str | None = None) -> np.ndarray:
        model_name = self._get_model_name(custom_model_id)
        if model_name not in self._models:
            self.load(model_name)
        return self._models[model_name].encode(text, normalize_embeddings=True)

    def encode_batch(self, texts: list[str], custom_model_id: str | None = None) -> np.ndarray:
        model_name = self._get_model_name(custom_model_id)
        if model_name not in self._models:
            self.load(model_name)
        return self._models[model_name].encode(texts, normalize_embeddings=True, batch_size=32)
    
    @property
    def is_loaded(self) -> bool:
        return len(self._models) > 0

embedder = TextEmbedder()