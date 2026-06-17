from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    MESSAGE_EXCHANGE: str = "messages"
    MESSAGE_ROUTING_KEY: str = "tg.raw"

    CONTROL_EXCHANGE: str = "bot-control-exchange"   
    CONTROL_QUEUE: str = "tg-control-queue"          
    CONTROL_ROUTING_KEY: str = "control.tg"          

    BACKEND_URL: str = "http://analytics-core:8080"
    INTERNAL_API_KEY: str = ""

    INITIAL_SYNC_RETRY_DELAY: int = 5

    HEALTH_PORT: int = 8001

    class Config:
        extra = "ignore"
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()