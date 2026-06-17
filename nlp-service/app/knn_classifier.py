import logging
import pickle
import time
from collections import defaultdict
from cachetools import cached, TTLCache, keys
import numpy as np
from sklearn.metrics import accuracy_score, precision_recall_fscore_support
from cachetools import cached, TTLCache

from app.config import settings
from app.embedder import embedder
from app.storage import storage  

logger = logging.getLogger(__name__)

_MIN_EXAMPLES_FOR_SPLIT = 3
_EVAL_RATIO = 0.2

index_cache = TTLCache(maxsize=100, ttl=3600)

class KnnClassifier:
    def fit(self, workspace_id: int, examples: list[dict], custom_model_id: str | None = None) -> dict:
        if workspace_id in index_cache:
            del index_cache[workspace_id]

        train_examples, eval_examples = self._split(examples)

        workspace_index = self._build_index(train_examples, custom_model_id)
        
        index_bytes = pickle.dumps(workspace_index)
        upload_success = storage.save_knn_index(workspace_id, index_bytes)

        if not upload_success:
            raise RuntimeError(f"Failed to save KNN index for workspace={workspace_id} to MinIO")

        index_cache[workspace_id] = workspace_index

        metrics = self._evaluate(workspace_index, eval_examples, custom_model_id)

        logger.info(
            "workspace=%s retrained: train=%d eval=%d acc=%.3f f1=%.3f",
            workspace_id,
            len(train_examples),
            len(eval_examples),
            metrics.get("accuracy") or 0,
            metrics.get("f1_score") or 0,
        )
        return {
            "examples_count": len(train_examples),
            "eval_count": len(eval_examples),
            **metrics,
        }

    def is_ready(self, workspace_id: int, active_categories: list[str]) -> bool:
        index = self._get_index_for_workspace(workspace_id)
        if not index:
            return False
            
        return all(
            len(index.get(cat, [])) >= settings.min_examples_per_category
            for cat in active_categories
        )

    def classify(self, workspace_id: int, text: str, categories: list[str], custom_model_id: str | None = None) -> dict:
            index = self._get_index_for_workspace(workspace_id)
            if not index:
                return {"category": categories[0] if categories else "UNCLASSIFIED", "confidence": 0.0}
                
            query_vec = embedder.encode(text, custom_model_id)
            scores: dict[str, float] = {}
            start_time = time.perf_counter()    
            
            for cat in categories:
                stored = index.get(cat, [])
                scores[cat] = (
                    round(
                        sum(float(np.dot(query_vec, sv)) for sv in stored) / len(stored),
                        4,
                    )
                    if stored else 0.0
                )
    
            if not scores:
                return {"category": "UNCLASSIFIED", "confidence": 0.0}
    
            best_cat = max(scores, key=lambda c: scores[c])
            
            end_time = time.perf_counter()
            execution_time_ms = (end_time - start_time) * 1000
            
            total_vectors = sum(len(v) for v in index.values())
            logger.info(f"k-NN Dot Product classification (workspace={workspace_id}, index_size={total_vectors}) took {execution_time_ms:.3f} ms")
            return {"category": best_cat, "confidence": scores[best_cat]}

    def total_examples(self, workspace_id: int) -> int:
        index = self._get_index_for_workspace(workspace_id)
        return sum(len(v) for v in index.values()) if index else 0

    def examples_per_category(self, workspace_id: int) -> dict[str, int]:
        index = self._get_index_for_workspace(workspace_id)
        return {cat: len(vecs) for cat, vecs in index.items()} if index else {}


    @cached(cache=index_cache, key=lambda self, workspace_id: keys.hashkey(workspace_id))
    def _get_index_for_workspace(self, workspace_id: int) -> dict[str, list[np.ndarray]]:
        logger.debug(f"Cache miss for workspace={workspace_id}. Fetching from MinIO...")
        index_bytes = storage.load_knn_index(workspace_id)
        
        if not index_bytes:
            logger.warning(f"MinIO returned NO DATA for workspace={workspace_id}")
            return {}
            
        try:
            return pickle.loads(index_bytes)
        except Exception as e:
            logger.error(f"Failed to unpickle index for workspace={workspace_id}: {e}")
            return {}

    def _split(self, examples: list[dict]) -> tuple[list[dict], list[dict]]:
        by_category: dict[str, list[dict]] = defaultdict(list)
        for ex in examples:
            by_category[ex["category"]].append(ex)

        train, eval_ = [], []
        for cat, items in by_category.items():
            if len(items) < _MIN_EXAMPLES_FOR_SPLIT:
                train.extend(items)
                continue
            split_idx = max(1, int(len(items) * (1 - _EVAL_RATIO)))
            train.extend(items[:split_idx])
            eval_.extend(items[split_idx:])

        return train, eval_

    def _build_index(self, train_examples: list[dict], custom_model_id: str | None = None) -> dict[str, list[np.ndarray]]:
        by_category: dict[str, list[str]] = defaultdict(list)
        for ex in train_examples:
            by_category[ex["category"]].append(ex["text"])

        workspace_index: dict[str, list[np.ndarray]] = {}
        for cat, texts in by_category.items():
            workspace_index[cat] = list(embedder.encode_batch(texts, custom_model_id))

        return workspace_index

    def _evaluate(
        self, 
        workspace_index: dict[str, list[np.ndarray]], 
        eval_examples: list[dict], 
        custom_model_id: str | None = None  
    ) -> dict:
        if not eval_examples:
            return {"accuracy": None, "f1_score": None, "precision": None, "recall": None}

        categories = list(workspace_index.keys())
        if not categories:
             return {"accuracy": 0.0, "f1_score": 0.0, "precision": 0.0, "recall": 0.0}

        true_labels, pred_labels = [], []
        
        for ex in eval_examples:
            query_vec = embedder.encode(ex["text"], custom_model_id)
            
            scores = {}
            for cat in categories:
                stored = workspace_index.get(cat, [])
                scores[cat] = sum(float(np.dot(query_vec, sv)) for sv in stored) / len(stored) if stored else 0.0
            
            best_cat = max(scores, key=lambda c: scores[c])
            
            true_labels.append(ex["category"])
            pred_labels.append(best_cat)

        precision, recall, f1, _ = precision_recall_fscore_support(
            true_labels, pred_labels, average="macro", zero_division=0
        )
        accuracy = accuracy_score(true_labels, pred_labels)

        return {
            "accuracy": round(float(accuracy), 4),
            "f1_score": round(float(f1), 4),
            "precision": round(float(precision), 4),
            "recall": round(float(recall), 4),
        }

knn_classifier = KnnClassifier()