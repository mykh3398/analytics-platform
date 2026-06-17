import logging
import spacy
from app.schemas import Entity

logger = logging.getLogger(__name__)

SPACY_MODEL = "xx_ent_wiki_sm"

# (False Positives)
STOP_WORDS = {
    "дякую", "привіт", "вітаю", "добрий день", "доброго дня", 
    "допоможіть", "підкажіть", "бука", "здрастуйте", "шановний", 
    "шановна", "будь ласка", "на жаль", "алло"
}

class EntityExtractor:
    def __init__(self):
        self._nlp = None

    def load(self):
        try:
            self._nlp = spacy.load(SPACY_MODEL)
            logger.info(f"spaCy model '{SPACY_MODEL}' loaded")
        except OSError:
            logger.warning(
                f"spaCy model '{SPACY_MODEL}' not found. "
                "Run: python -m spacy download xx_ent_wiki_sm"
            )

    @property
    def is_loaded(self) -> bool:
        return self._nlp is not None

    def extract(self, text: str) -> list[Entity]:
        if not self.is_loaded:
            return []  

        extracted_entities = []
        
        doc = self._nlp(text)
        
        for ent in doc.ents:
            ent_text_lower = ent.text.lower().strip()
            
            if ent_text_lower in STOP_WORDS or len(ent_text_lower) < 2:
                continue
            
            extracted_entities.append(Entity(text=ent.text, label=ent.label_))

        return extracted_entities

extractor = EntityExtractor()