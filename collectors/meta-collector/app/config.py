from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_SECRET: str    
    VERIFY_TOKEN: str  

    BACKEND_URL: str = "http://analytics-platform:8080"
    INTERNAL_API_KEY: str = ""

    RABBITMQ_URL: str = "amqp://guest:guest@localhost:5672"

    CONTROL_EXCHANGE: str = "bot-control-exchange"  
    CONTROL_QUEUE: str = "meta-control-queue"     
    CONTROL_ROUTING_KEY: str = "control.meta"     

    WEBHOOK_PATH: str = "/webhook/meta"
    WEBAPP_HOST: str = "0.0.0.0"
    WEBAPP_PORT: int = 8000
    HEALTH_PORT: int = 8002

    class Config:
        env_file = ".env"


settings = Settings()