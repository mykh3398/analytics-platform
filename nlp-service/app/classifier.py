import logging
from transformers import pipeline
from app.config import settings
import time

logger = logging.getLogger(__name__)


class ZeroShotClassifierManager:
    def __init__(self):
        self._pipelines: dict = {}

    def load(self) -> None:
        self._load_model(settings.model_name)

    def classify(
        self,
        text: str,
        categories: list[str],
        custom_model_id: str | None = None,
    ) -> dict:
        logger.info(f"DEBUG: Received custom_model_id='{custom_model_id}'")
        
        model_name = custom_model_id if (custom_model_id and custom_model_id.strip()) else settings.model_name
        
        logger.info(f"Using model: {model_name}")
        if model_name not in self._pipelines:
            self._load_model(model_name)
            
        start_time = time.perf_counter()
        logger.info("ACTUAL TEMPLATE: '%s'", settings.hypothesis_template)
        result = self._pipelines[model_name](
            sequences=text,
            candidate_labels=categories,
            hypothesis_template=settings.hypothesis_template,
            multi_label=False,
        )
        
        end_time = time.perf_counter()
        execution_time_ms = (end_time - start_time) * 1000
        logger.info("Zero-Shot classification for text '%s...' took %.2f ms", text[:15], execution_time_ms)
        
        return {
            "category": result["labels"][0],
            "confidence": round(result["scores"][0], 4),
        }

    @property
    def is_loaded(self) -> bool:
        return settings.model_name in self._pipelines

    @property
    def loaded_models(self) -> list[str]:
        return list(self._pipelines.keys())


    def _load_model(self, model_name: str) -> None:
        logger.info("Loading zero-shot model: %s", model_name)
        try:
            self._pipelines[model_name] = pipeline(
                "zero-shot-classification",
                model=model_name,
                device=settings.device,
            )
            logger.info("Model loaded and cached: %s", model_name)
        except Exception as e:
            logger.error(f"Failed to load model {model_name}: {e}")
            raise ValueError(f"Failed to load model '{model_name}'. Ensure it's a valid NLI model on HuggingFace.")


classifier = ZeroShotClassifierManager()