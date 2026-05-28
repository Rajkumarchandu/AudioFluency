from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.audio import router
from routes.live_audio import router as live_audio_router
from routes.notifications import router as notifications_router
from routes.auth import router as auth_router
from routes.reports import router as reports_router
from routes.debate import router as debate_router

app = FastAPI()

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # Allow all origins for global demo/testing
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Routes
app.include_router(router)
app.include_router(live_audio_router)
app.include_router(notifications_router)
app.include_router(auth_router)
app.include_router(reports_router)
app.include_router(debate_router)

# Health Check
@app.get("/")
def home():
    return {"message": "Audio Fluency System Running"}