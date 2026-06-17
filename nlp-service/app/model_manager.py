import logging
from enum import Enum
from app.classifier import classifier as zero_shot
from app.knn_classifier import knn_classifier
from app.config import settings

logger = logging.getLogger(__name__)


class ClassificationMethod(str, Enum):
    ZERO_SHOT = "zero_shot"
    EMBEDDING_SIMILARITY = "embedding_similarity"


class ModelManager:
    def classify(
        self,
        workspace_id: int,
        text: str,
        categories: list[str],
        custom_model_id: str | None = None,
    ) -> dict:
        method = self._method_for_classify(workspace_id, categories)

        if method == ClassificationMethod.EMBEDDING_SIMILARITY:
            logger.debug("workspace=%s: using embedding_similarity", workspace_id)
            result = knn_classifier.classify(workspace_id, text, categories, custom_model_id) 
        else:
            logger.debug("workspace=%s: using zero_shot", workspace_id)
            result = zero_shot.classify(text, categories, custom_model_id)

        return {**result, "method": method}

    def retrain(self, workspace_id: int, examples: list[dict], custom_model_id: str | None = None) -> dict:
        metrics = knn_classifier.fit(workspace_id, examples, custom_model_id)
        return {
            "status": "ok",
            "workspace_id": workspace_id,
            "method": ClassificationMethod.EMBEDDING_SIMILARITY,
            **metrics,
        }

    def status(self, workspace_id: int) -> dict:
        method = self._method_for_status(workspace_id)
        return {
            "workspace_id": workspace_id,
            "current_method": method,
            "total_examples": knn_classifier.total_examples(workspace_id),
            "examples_per_category": knn_classifier.examples_per_category(workspace_id),
            "min_examples_to_switch": settings.min_examples_per_category,
            "zero_shot_model_loaded": zero_shot.is_loaded,
        }


    def _method_for_classify(
        self, workspace_id: int, categories: list[str]
    ) -> ClassificationMethod:
        if categories and knn_classifier.is_ready(workspace_id, categories):
            return ClassificationMethod.EMBEDDING_SIMILARITY
        logger.warning(
            f"Fallback to ZERO_SHOT for workspace={workspace_id}. "
            f"Requested categories: {categories}. "
            f"Known to kNN: {list(knn_classifier.examples_per_category(workspace_id).keys())}"
        )
        return ClassificationMethod.ZERO_SHOT
    

    def _method_for_status(self, workspace_id: int) -> ClassificationMethod:
        per_cat = knn_classifier.examples_per_category(workspace_id)
        if not per_cat:
            return ClassificationMethod.ZERO_SHOT

        ready_count = sum(
            1 for count in per_cat.values()
            if count >= settings.min_examples_per_category
        )
        if ready_count >= settings.min_ready_categories:
            return ClassificationMethod.EMBEDDING_SIMILARITY

        return ClassificationMethod.ZERO_SHOT


model_manager = ModelManager()