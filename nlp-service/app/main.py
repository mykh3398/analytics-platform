import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Query

from app.storage import storage
from app.classifier import classifier
from app.embedder import embedder
from app.ner import extractor
from app.model_manager import model_manager
from app.schemas import (
    ClassifyRequest, ClassifyResponse,
    RetrainRequest, RetrainResponse,
    ModelStatusResponse, HealthResponse,
    AnonymizeRequest, AnonymizeResponse,
)
from huggingface_hub import HfApi
from huggingface_hub.utils import RepositoryNotFoundError, HfHubHTTPError
from app.schemas import ValidateModelRequest, ValidateModelResponse


logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    classifier.load()
    extractor.load()
    yield
    logger.info("NLP service shutting down")


app = FastAPI(
    title="NLP Classification Service",
    version="3.0.0",
    lifespan=lifespan,
)


@app.post("/classify", response_model=ClassifyResponse)
async def classify(request: ClassifyRequest):
    if not request.categories:
        raise HTTPException(status_code=400, detail="Cannot perform classification without categories.")

    safe_model_id = request.custom_model_id
    if not safe_model_id or safe_model_id.upper() == "DEFAULT":
        safe_model_id = "joeddav/xlm-roberta-large-xnli"

    try:
        result = model_manager.classify(
            workspace_id=request.workspace_id,
            text=request.text,
            categories=request.categories,
            custom_model_id=safe_model_id, 
        )
        entities = extractor.extract(request.text)
        return ClassifyResponse(
            category=result["category"],
            confidence=result["confidence"],
            entities=entities,
            method=str(result["method"]),
        )
    except ValueError as e:
        logger.error(f"VALUE ERROR in classify: {e}", exc_info=True)
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.error("Classification failed for workspace=%s: %s", request.workspace_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Classification error")


@app.post("/retrain", response_model=RetrainResponse)
async def retrain(request: RetrainRequest):
    try:
        examples = [ex.model_dump() for ex in request.examples]
        result = model_manager.retrain(request.workspace_id, examples, request.custom_model_id)
        return RetrainResponse(**result)
    except Exception as e:
        logger.error("Retrain failed for workspace=%s: %s", request.workspace_id, e, exc_info=True)
        raise HTTPException(status_code=500, detail="Retrain error")


@app.delete("/workspace/{workspace_id}")
async def delete_workspace(workspace_id: int):
    try:
        storage.delete_knn_index(workspace_id)

        from app.knn_classifier import index_cache
        if workspace_id in index_cache:
            del index_cache[workspace_id]
            
        logger.info(f"Successfully deleted index for workspace={workspace_id}")
        return {"status": "deleted", "workspace_id": workspace_id}
    except Exception as e:
        logger.warning(f"Failed to delete index or it doesn't exist: {e}")
        return {"status": "not_found_or_error"}


@app.get("/model/status", response_model=ModelStatusResponse)
async def model_status(workspace_id: int = Query(..., alias="workspaceId", gt=0)):
    return ModelStatusResponse(**model_manager.status(workspace_id))


@app.post("/anonymize", response_model=AnonymizeResponse)
async def anonymize(request: AnonymizeRequest):
    """
    Двоетапна анонімізація:
      1. Regex — видалення email та телефонів 
      2. spaCy NER — заміна PER / LOC / ORG з ігноруванням STOP_WORDS
    """
    import re

    if not extractor.is_loaded:
        raise HTTPException(status_code=503, detail="NER model is not loaded")

    ANONYMIZE_LABELS = {"PER", "LOC", "ORG"}
    text = request.text

    EMAIL_RE = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
    text = EMAIL_RE.sub("[EMAIL]", text)

    PHONE_RE = re.compile(
        r"(?:\+?380|0)"
        r"[\s\-]?"
        r"\(?\d{2}\)?"
        r"[\s\-]?"
        r"\d{3}"
        r"[\s\-]?"
        r"\d{2}"
        r"[\s\-]?"
        r"\d{2}"
    )
    text = PHONE_RE.sub("[PHONE]", text)

    # spaCy NER + STOP_WORDS 
    doc = extractor._nlp(text)
    
    from app.ner import STOP_WORDS
    
    for ent in reversed(doc.ents):
        ent_text_lower = ent.text.lower().strip()
        
        # Перевірка 1: Чи це хибне спрацьовування (стоп-слово або 1 символ)?
        if ent_text_lower in STOP_WORDS or len(ent_text_lower) < 2:
            continue
            
        # Перевірка 2: Чи підлягає цей тип сутності анонімізації?
        if ent.label_ not in ANONYMIZE_LABELS:
            continue
            
        # Якщо обидві перевірки пройдено — замінюємо текст на лейбл
        text = text[: ent.start_char] + f"[{ent.label_}]" + text[ent.end_char :]

    return AnonymizeResponse(anonymized_text=text)

@app.post("/model/validate", response_model=ValidateModelResponse)
async def validate_model(request: ValidateModelRequest):
    """
    Легка перевірка сумісності моделі без її завантаження.
    Використовує підхід "Білого списку" (Whitelist) за pipeline_tag.
    """
    api = HfApi()
    model_id = request.model_id.strip()

    if model_id.upper() == "DEFAULT":
        return ValidateModelResponse(is_valid=True, message="Дефолтна модель сумісна.")

    try:
        info = api.model_info(model_id)
        
        files = [f.rfilename for f in info.siblings]
        if "config.json" not in files:
            return ValidateModelResponse(
                is_valid=False, 
                message="Модель не підтримується. Вона не є стандартним Transformer-ом (відсутній config.json)."
            )
            
        allowed_pipelines = {
            "sentence-similarity", 
            "feature-extraction", 
            "text-classification", 
            "fill-mask",
            "token-classification",
            "zero-shot-classification"
        }
        
        if info.pipeline_tag and info.pipeline_tag not in allowed_pipelines:
            return ValidateModelResponse(
                is_valid=False, 
                message=f"Несумісний тип моделі: '{info.pipeline_tag}'. Оберіть текстову NLP модель (напр., sentence-similarity)."
            )

        return ValidateModelResponse(is_valid=True, message="Модель сумісна та готова до використання.")

    except RepositoryNotFoundError:
        return ValidateModelResponse(
            is_valid=False, 
            message=f"Модель '{model_id}' не знайдено на Hugging Face."
        )
    except HfHubHTTPError:
        return ValidateModelResponse(
            is_valid=False, 
            message="Помилка доступу до Hugging Face (можливо модель приватна)."
        )
    except Exception as e:
        logger.error(f"Validation error for {model_id}: {e}")
        return ValidateModelResponse(
            is_valid=False, 
            message=f"Внутрішня помилка перевірки: {str(e)}"
        )
        
@app.get("/health", response_model=HealthResponse)
async def health():
    return HealthResponse(status="ok", model_loaded=classifier.is_loaded)