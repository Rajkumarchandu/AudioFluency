from fastapi import APIRouter, UploadFile, File, HTTPException, Query, Depends
from sqlalchemy.orm import Session
import shutil, os, json, random, string
from database import get_db, engine
from models import AudioFile, JobStatus, Base, DebateRoom, DebateParticipant
from tasks.audio_tasks import process_audio
from pydantic import BaseModel

Base.metadata.create_all(bind=engine)
router = APIRouter()

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

VIDEO_FORMATS = {".mp4", ".mov", ".avi", ".mkv"}
AUDIO_FORMATS = {".wav", ".mp3", ".m4a", ".flac", ".ogg", ".webm", ".mpeg"}


def generate_code():
    return "DEB-" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


# ── ROOM MANAGEMENT ───────────────────────────────────────────────────────────

class CreateRoomRequest(BaseModel):
    title:        str
    teacher_id:   str
    teacher_name: str
    language:     str = "en"


class JoinRoomRequest(BaseModel):
    student_id:   str
    student_name: str


class UpdateRoomStatusRequest(BaseModel):
    status: str  # waiting | recording | completed


@router.post("/debate/create")
def create_room(req: CreateRoomRequest, db: Session = Depends(get_db)):
    code = generate_code()
    # Ensure unique
    while db.query(DebateRoom).filter(DebateRoom.code == code).first():
        code = generate_code()

    room = DebateRoom(
        code         = code,
        title        = req.title,
        teacher_id   = req.teacher_id,
        teacher_name = req.teacher_name,
        language     = req.language,
        status       = "waiting",
    )
    db.add(room)
    db.commit()
    db.refresh(room)

    return {
        "code":         room.code,
        "title":        room.title,
        "teacher_name": room.teacher_name,
        "language":     room.language,
        "status":       room.status,
        "created_at":   room.created_at,
    }


@router.get("/debate/room/{code}")
def get_room(code: str, db: Session = Depends(get_db)):
    room = db.query(DebateRoom).filter(DebateRoom.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    participants = db.query(DebateParticipant).filter(
        DebateParticipant.room_code == code
    ).all()

    return {
        "code":         room.code,
        "title":        room.title,
        "teacher_name": room.teacher_name,
        "language":     room.language,
        "status":       room.status,
        "job_id":       room.job_id,
        "created_at":   room.created_at,
        "participants": [
            {
                "student_id":   p.student_id,
                "student_name": p.student_name,
                "joined_at":    p.joined_at,
            }
            for p in participants
        ],
    }


@router.post("/debate/join/{code}")
def join_room(code: str, req: JoinRoomRequest, db: Session = Depends(get_db)):
    room = db.query(DebateRoom).filter(DebateRoom.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found. Check the code.")
    if room.status == "completed":
        raise HTTPException(status_code=400, detail="This debate has already ended.")

    # Check if already joined
    existing = db.query(DebateParticipant).filter(
        DebateParticipant.room_code  == code,
        DebateParticipant.student_id == req.student_id,
    ).first()

    if not existing:
        participant = DebateParticipant(
            room_code    = code,
            student_id   = req.student_id,
            student_name = req.student_name,
        )
        db.add(participant)
        db.commit()

    return {
        "message":      f"Joined room {code} successfully",
        "code":         room.code,
        "title":        room.title,
        "teacher_name": room.teacher_name,
        "language":     room.language,
        "status":       room.status,
        "job_id":       room.job_id,
    }


@router.patch("/debate/room/{code}/status")
def update_room_status(code: str, req: UpdateRoomStatusRequest, db: Session = Depends(get_db)):
    room = db.query(DebateRoom).filter(DebateRoom.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.status = req.status
    db.commit()
    return {"message": f"Status updated to {req.status}"}


@router.patch("/debate/room/{code}/job")
def set_room_job(code: str, job_id: int = Query(...), db: Session = Depends(get_db)):
    room = db.query(DebateRoom).filter(DebateRoom.code == code).first()
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")
    room.job_id = job_id
    room.status = "completed"
    db.commit()
    return {"message": "Job ID saved", "job_id": job_id}


@router.get("/debate/teacher/{teacher_id}/rooms")
def get_teacher_rooms(teacher_id: str, db: Session = Depends(get_db)):
    rooms = db.query(DebateRoom).filter(
        DebateRoom.teacher_id == teacher_id
    ).order_by(DebateRoom.created_at.desc()).all()

    result = []
    for room in rooms:
        participants = db.query(DebateParticipant).filter(
            DebateParticipant.room_code == room.code
        ).all()
        result.append({
            "code":              room.code,
            "title":             room.title,
            "language":          room.language,
            "status":            room.status,
            "job_id":            room.job_id,
            "created_at":        room.created_at,
            "participant_count": len(participants),
            "participants":      [
                {"student_id": p.student_id, "student_name": p.student_name}
                for p in participants
            ],
        })
    return result


# ── AUDIO UPLOAD ──────────────────────────────────────────────────────────────

@router.post("/debate/upload")
async def upload_debate(
    file: UploadFile = File(...),
    language: str = Query(default="en"),
    session_title: str = Query(default="Debate Session"),
    room_code: str = Query(default=None),
    db: Session = Depends(get_db)
):
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in VIDEO_FORMATS | AUDIO_FORMATS:
        raise HTTPException(status_code=400, detail=f"Unsupported file type '{ext}'")

    file_path = os.path.join(UPLOAD_FOLDER, f"debate_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    audio_record = AudioFile(
        student_id = f"DEBATE_{session_title}",
        filename   = file.filename,
        s3_path    = file_path,
        language   = language,
        status     = JobStatus.pending
    )
    db.add(audio_record)
    db.commit()
    db.refresh(audio_record)

    process_audio.delay(audio_record.id, file_path, language)

    # Link job to room if room_code provided
    if room_code:
        room = db.query(DebateRoom).filter(DebateRoom.code == room_code).first()
        if room:
            room.job_id = audio_record.id
            room.status = "completed"
            db.commit()

    return {
        "message":       "Debate audio uploaded, processing...",
        "job_id":        audio_record.id,
        "session_title": session_title,
        "filename":      file.filename,
        "status":        "pending",
    }


@router.get("/debate/status/{job_id}")
def get_debate_status(job_id: int, db: Session = Depends(get_db)):
    record = db.query(AudioFile).filter(AudioFile.id == job_id).first()
    if not record:
        raise HTTPException(status_code=404, detail="Job not found")
    return {
        "job_id":        record.id,
        "status":        record.status,
        "transcription": record.transcription,
        "diarization":   json.loads(record.diarization) if record.diarization else [],
        "scores":        json.loads(record.scores) if record.scores else None,
        "language":      record.language,
        "filename":      record.filename,
    }