from pydantic import BaseModel, Field, ConfigDict
from typing import List

# ──────────────────────────────────────────────
#  Classify
# ──────────────────────────────────────────────

class ClassifyRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    workspace_id: int = Field(..., alias="workspaceId", gt=0)
    text: str = Field(..., min_length=1, max_length=4096)
    categories: List[str] = Field(..., min_length=1)
    custom_model_id: str | None = Field(
        default=None,
        alias="customModelId",
        description="ID моделі з whitelist. Якщо None — використовується дефолтна.",
    )


class Entity(BaseModel):
    text: str
    label: str


class ClassifyResponse(BaseModel):
    category: str
    confidence: float
    entities: List[Entity]
    method: str


# ──────────────────────────────────────────────
#  Training
# ──────────────────────────────────────────────

class TrainingExample(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)
    category: str = Field(..., min_length=1)


class RetrainRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    workspace_id: int = Field(..., alias="workspaceId", gt=0)
    examples: List[TrainingExample] = Field(..., min_length=1)

    custom_model_id: str | None = Field(
        default=None,
        alias="customModelId",
        description="ID моделі, на якій потрібно побудувати k-NN індекс.",
    )


class RetrainResponse(BaseModel):
    status: str
    workspace_id: int
    method: str

    # Train / eval split
    examples_count: int          # прикладів у train
    eval_count: int              # прикладів в eval

    accuracy: float | None
    f1_score: float | None
    precision: float | None
    recall: float | None

    loss_history: None = None    


class ModelStatusResponse(BaseModel):
    workspace_id: int
    current_method: str
    total_examples: int
    examples_per_category: dict
    min_examples_to_switch: int
    zero_shot_model_loaded: bool


# ──────────────────────────────────────────────
#  Anonymization
# ──────────────────────────────────────────────

class AnonymizeRequest(BaseModel):
    text: str = Field(..., min_length=1, max_length=4096)


class AnonymizeResponse(BaseModel):
    anonymized_text: str


# ──────────────────────────────────────────────
#  Validation
# ──────────────────────────────────────────────

class ValidateModelRequest(BaseModel):
    model_config = ConfigDict(populate_by_name=True)
    model_id: str = Field(..., alias="modelId", min_length=3)

class ValidateModelResponse(BaseModel):
    is_valid: bool
    message: str


# ──────────────────────────────────────────────
#  Health
# ──────────────────────────────────────────────

class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_loaded: bool
    
    