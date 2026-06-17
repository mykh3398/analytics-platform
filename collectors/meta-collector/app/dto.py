import json
from dataclasses import dataclass, asdict


@dataclass
class RawMessageDto:
    source: str       
    instanceId: str   
    externalId: str   
    chatId: str       
    senderId: str     
    senderName: str   
    text: str         
    sentAt: str       
    rawPayload: str   

    def to_json(self) -> bytes:
        return json.dumps(asdict(self)).encode("utf-8")