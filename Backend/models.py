from sqlalchemy import Column, Integer, String, Text, DateTime, Enum, Float, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class JobStatus(str, enum.Enum):
    pending    = "pending"
    processing = "processing"
    completed  = "completed"
    failed     = "failed"


class AudioFile(Base):
    __tablename__ = "audio_files"

    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(String, nullable=True, index=True)
    filename      = Column(String, nullable=False)
    s3_path       = Column(String, nullable=True)
    language      = Column(String, nullable=True)
    status        = Column(Enum(JobStatus), default=JobStatus.pending)
    transcription = Column(Text, nullable=True)
    diarization   = Column(Text, nullable=True)
    scores        = Column(Text, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())
    updated_at    = Column(DateTime(timezone=True), onupdate=func.now())

    session       = relationship("Session", back_populates="audio_file", uselist=False)


class Session(Base):
    __tablename__ = "sessions"

    id               = Column(Integer, primary_key=True, index=True)
    audio_file_id    = Column(Integer, ForeignKey("audio_files.id"), nullable=False)
    student_id       = Column(String, nullable=False, index=True)
    session_type     = Column(String, default="individual")
    language         = Column(String, nullable=True)
    duration_seconds = Column(Float, nullable=True)
    speaker_count    = Column(Integer, default=1)
    created_at       = Column(DateTime(timezone=True), server_default=func.now())

    audio_file       = relationship("AudioFile", back_populates="session")
    speaker_profiles = relationship("SpeakerProfile", back_populates="session")
    notifications    = relationship("Notification", back_populates="session")


class SpeakerProfile(Base):
    __tablename__ = "speaker_profiles"

    id            = Column(Integer, primary_key=True, index=True)
    session_id    = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    student_id    = Column(String, nullable=False, index=True)
    speaker_label = Column(String, nullable=True)
    speaking_time = Column(Float, nullable=True)
    segment_count = Column(Integer, default=0)

    pronunciation = Column(Float, nullable=True)
    fluency       = Column(Float, nullable=True)
    clarity       = Column(Float, nullable=True)
    confidence    = Column(Float, nullable=True)
    grammar       = Column(Float, nullable=True)
    communication = Column(Float, nullable=True)
    overall_score = Column(Float, nullable=True)

    word_count    = Column(Integer, nullable=True)
    filler_count  = Column(Integer, nullable=True)
    vocab_richness= Column(Float, nullable=True)

    created_at    = Column(DateTime(timezone=True), server_default=func.now())

    session         = relationship("Session", back_populates="speaker_profiles")
    recommendations = relationship("Recommendation", back_populates="speaker_profile")


class Recommendation(Base):
    __tablename__ = "recommendations"

    id                 = Column(Integer, primary_key=True, index=True)
    speaker_profile_id = Column(Integer, ForeignKey("speaker_profiles.id"), nullable=False)
    category           = Column(String, nullable=False)
    message            = Column(Text, nullable=False)
    priority           = Column(String, default="medium")
    created_at         = Column(DateTime(timezone=True), server_default=func.now())

    speaker_profile    = relationship("SpeakerProfile", back_populates="recommendations")


class Notification(Base):
    __tablename__ = "notifications"

    id         = Column(Integer, primary_key=True, index=True)
    session_id = Column(Integer, ForeignKey("sessions.id"), nullable=False)
    recipient  = Column(String, nullable=False)
    message    = Column(Text, nullable=False)
    is_read    = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    session    = relationship("Session", back_populates="notifications")

class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    name       = Column(String, nullable=False)
    email      = Column(String, unique=True, nullable=False, index=True)
    password   = Column(String, nullable=False)  # hashed
    role       = Column(String, default="student")
    student_id = Column(String, unique=True, nullable=True)
    phone      = Column(String, nullable=True)
    college    = Column(String, nullable=True)
    course     = Column(String, nullable=True)
    year       = Column(String, nullable=True)
    bio        = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class StudentReport(Base):
    __tablename__ = "student_reports"

    id            = Column(Integer, primary_key=True, index=True)
    student_id    = Column(String, nullable=False, index=True)
    sent_by       = Column(String, nullable=False)          # teacher name/email
    audio_file_id = Column(Integer, nullable=True)
    report_type   = Column(String, default="session")       # session or overall
    report_data   = Column(Text, nullable=False)            # JSON of all scores/transcription
    is_read       = Column(Boolean, default=False)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class DebateRoom(Base):
    __tablename__ = "debate_rooms"

    id            = Column(Integer, primary_key=True, index=True)
    code          = Column(String, unique=True, nullable=False, index=True)
    title         = Column(String, nullable=False)
    teacher_id    = Column(String, nullable=False)
    teacher_name  = Column(String, nullable=False)
    language      = Column(String, default="en")
    status        = Column(String, default="waiting")  # waiting, recording, completed
    job_id        = Column(Integer, nullable=True)
    created_at    = Column(DateTime(timezone=True), server_default=func.now())


class DebateParticipant(Base):
    __tablename__ = "debate_participants"

    id            = Column(Integer, primary_key=True, index=True)
    room_code     = Column(String, nullable=False, index=True)
    student_id    = Column(String, nullable=False)
    student_name  = Column(String, nullable=False)
    joined_at     = Column(DateTime(timezone=True), server_default=func.now())