from dataclasses import dataclass, asdict
import json


@dataclass
class RawMessageDto:
    """
    Contract between Python collectors and Spring Boot core.
    Published to RabbitMQ exchange 'messages', routing key 'tg.raw'.
    Must stay in sync with com.diploma.analytics.messaging.dto.RawMessageDto (Java).
    """
    source: str        
    instanceId: str    
    externalId: str    
    chatId: str        
    senderId: str      
    senderName: str    
    text: str          
    sentAt: str        
    rawPayload: str    

    def to_json_bytes(self) -> bytes:
        return json.dumps(asdict(self)).encode("utf-8")