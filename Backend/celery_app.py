from celery import Celery
from dotenv import load_dotenv
import os

load_dotenv()

REDIS_URL = os.getenv(
    "REDIS_URL",
    "redis://redis:6379/0"
)

celery = Celery(
    "audio_tasks",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["tasks.audio_tasks"]
)

celery.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="Asia/Kolkata",
    enable_utc=True,
)