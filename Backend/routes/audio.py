from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from sqlalchemy.orm import Session
import shutil
import os
from moviepy import VideoFileClip
from database import get_db, engine
from models import AudioFile, JobStatus, Base
from tasks.audio_tasks import process_audio

Base.metadata.create_all(bind=engine)

router = APIRouter()

UPLOAD_FOLDER = "uploads"
AUDIO_FOLDER  = "audio"

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(AUDIO_FOLDER,  exist_ok=True)

VIDEO_FORMATS = {".mp4", ".mov", ".avi", ".mkv"}
AUDIO_FORMATS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".mpeg", ".mpga"}


@router.post("/upload-audio")
async def upload_audio(
    file: UploadFile = File(...),
    language: str = Query(default=None, description="Language code: hi, te, en, ta, etc."),
    student_id: str = Query(default=None, description="Student ID"),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in VIDEO_FORMATS | AUDIO_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'")

    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_path = None

    try:
        if ext in VIDEO_FORMATS:
            audio_name = file.filename.rsplit(".", 1)[0] + ".wav"
            audio_path = os.path.join(AUDIO_FOLDER, audio_name)
            video = VideoFileClip(file_path)
            video.audio.write_audiofile(audio_path)
            video.close()
        else:
            audio_path = file_path

        audio_record = AudioFile(
            student_id=student_id,
            filename=file.filename,
            s3_path=audio_path,
            language=language,
            status=JobStatus.pending
        )
        db.add(audio_record)
        db.commit()
        db.refresh(audio_record)

        process_audio.delay(audio_record.id, audio_path, language)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Processing failed: {str(e)}")

    return {
        "message":    "File uploaded successfully, processing in background",
        "student_id": audio_record.student_id,
        "job_id":     audio_record.id,
        "filename":   file.filename,
        "status":     "pending"
    }


@router.get("/status/{student_id}")
def get_status(student_id: str, db: Session = Depends(get_db)):
    records = db.query(AudioFile).filter(AudioFile.student_id == student_id).all()
    if not records:
        raise HTTPException(status_code=404, detail="No records found for this student")

    return [
        {
            "job_id":        r.id,
            "student_id":    r.student_id,
            "filename":      r.filename,
            "status":        r.status,
            "transcription": r.transcription,
            "diarization":   r.diarization,
            "scores":        r.scores,        # ← NEW
        }
        for r in records
    ]

from database import get_db
from services.trends import get_student_trends

@router.get("/trends/{student_id}")
def get_trends(student_id: str, db: Session = Depends(get_db)):
    trends = get_student_trends(student_id, db)
    return trends

@router.delete("/audio/{job_id}")
def delete_audio(job_id: int, db: Session = Depends(get_db)):
    record = db.query(AudioFile).filter(AudioFile.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    db.delete(record)
    db.commit()
    return {"message": f"Job #{job_id} deleted successfully"}


@router.delete("/audio/student/{student_id}")
def delete_student_audio(student_id: str, db: Session = Depends(get_db)):
    records = db.query(AudioFile).filter(AudioFile.student_id == student_id).all()
    if not records:
        raise HTTPException(status_code=404, detail="No records found for this student")
    count = len(records)
    for record in records:
        db.delete(record)
    db.commit()
    return {"message": f"Deleted {count} record(s) for student {student_id}"}