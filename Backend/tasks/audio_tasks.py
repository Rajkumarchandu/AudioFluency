import os
import json
from celery_app import celery
from database import SessionLocal
from models import AudioFile, JobStatus, Session as SessionModel

from services.speech_to_text import speech_to_text
from services.diarization import diarize_audio
from services.scoring import compute_scores
from services.notifications import notify_job_complete
from services.emotion_detector import detect_emotions
from services.topic_detector import detect_topic


@celery.task(bind=True)
def process_audio(self, audio_file_id: int, audio_path: str, language: str = None):

    print("\n========== TASK STARTED ==========")
    print(f"Audio File ID : {audio_file_id}")
    print(f"Audio Path    : {audio_path}")
    print(f"Language      : {language}")

    db         = SessionLocal()
    audio_file = None

    try:
        # ── 1. Fetch record ────────────────────────────────────────────────
        print("[1] Fetching audio record...")
        audio_file = db.query(AudioFile).filter(AudioFile.id == audio_file_id).first()
        if not audio_file:
            raise ValueError(f"AudioFile {audio_file_id} not found in DB")

        # ── 2. Mark processing ─────────────────────────────────────────────
        print("[2] Marking as PROCESSING...")
        audio_file.status = JobStatus.processing
        db.commit()

        # ── 3. Transcription ───────────────────────────────────────────────
        print("[3] Starting Speech-to-Text...")
        transcription = speech_to_text(audio_path, language=language)
        print(f"[3] Transcription: {transcription[:80]}...")

        # ── 4. Diarization ─────────────────────────────────────────────────
        print("[4] Starting diarization...")
        diarization = diarize_audio(audio_path)
        print(f"[4] Diarization: {len(diarization)} segments")

        # ── 5. Emotion detection ───────────────────────────────────────────
        print("[5] Starting emotion detection...")
        try:
            emotion_result = detect_emotions(audio_path)
            print("[5] Emotion detection COMPLETE")
        except Exception as e:
            print(f"[5] Emotion detection skipped: {e}")
            emotion_result = {
                "dominant_emotion":   "neutral",
                "emotion_scores":     {},
                "confidence_indicator": "neutral",
                "emotion_summary":    "Emotion analysis unavailable.",
            }

        # ── 6. Scoring ─────────────────────────────────────────────────────
        print("[6] Starting score computation...")
        raw_scores = compute_scores(transcription, diarization, language=language)
        print("[6] Scoring COMPLETE")

        # ── 7. Flatten scores so frontend parseScores() works ──────────────
        # compute_scores returns:
        #   { overall: {overall_score, pronunciation, ...}, per_speaker: {...}, ... }
        # The frontend parseScores() expects the DB scores column to have
        #   overall_score, pronunciation, fluency, ... at the TOP LEVEL
        # So we flatten overall INTO the saved object.

        overall_obj = raw_scores.get("overall", {})

        scores_to_save = {
            # Top-level flat scores (what parseScores reads)
            "overall_score":  overall_obj.get("overall_score", 0),
            "pronunciation":  overall_obj.get("pronunciation", 0),
            "fluency":        overall_obj.get("fluency", 0),
            "grammar":        overall_obj.get("grammar", 0),
            "confidence":     overall_obj.get("confidence", 0),
            "clarity":        overall_obj.get("clarity", 0),
            "communication":  overall_obj.get("communication", 0),
            "word_count":     overall_obj.get("word_count", 0),
            "filler_count":   overall_obj.get("filler_count", 0),
            "vocab_richness": overall_obj.get("vocab_richness", 0),

            # Extra detail fields
            "summary":          raw_scores.get("summary", ""),
            "language":         raw_scores.get("language", language or "en"),
            "corrections":      raw_scores.get("corrections", []),
            "corrected_text":   raw_scores.get("corrected_text", ""),
            "per_speaker":      raw_scores.get("per_speaker", {}),

            # NEW AI fields
            "grammar_check":    raw_scores.get("grammar_check", {}),
            "phoneme_analysis": raw_scores.get("phoneme_analysis", {}),
            "topic":            raw_scores.get("topic", {}),
            "emotion":          emotion_result,
        }

        # Also fix per_speaker so each speaker has flat scores too
        per_speaker_fixed = {}
        for speaker, sp_scores in raw_scores.get("per_speaker", {}).items():
            per_speaker_fixed[speaker] = {
                "overall_score": sp_scores.get("overall_score", 0),
                "pronunciation": sp_scores.get("pronunciation", 0),
                "fluency":       sp_scores.get("fluency", 0),
                "grammar":       sp_scores.get("grammar", 0),
                "confidence":    sp_scores.get("confidence", 0),
                "clarity":       sp_scores.get("clarity", 0),
                "communication": sp_scores.get("communication", 0),
                "speaking_time_seconds": sp_scores.get("speaking_time_seconds", 0),
                "segment_count": sp_scores.get("segment_count", 0),
            }
        scores_to_save["per_speaker"] = per_speaker_fixed

        print(f"[7] Scores flattened — overall_score={scores_to_save['overall_score']}")

        # ── 8. Save to DB ──────────────────────────────────────────────────
        print("[8] Saving to database...")
        audio_file.transcription = transcription
        audio_file.diarization   = json.dumps(diarization)
        audio_file.scores        = json.dumps(scores_to_save)
        audio_file.status        = JobStatus.completed
        db.commit()
        print("[8] DB save COMPLETE")

        # ── 9. Create session record ───────────────────────────────────────
        print("[9] Creating session record...")
        session = SessionModel(
            audio_file_id = audio_file_id,
            student_id    = audio_file.student_id or "unknown",
            session_type  = "individual",
            language      = language,
            speaker_count = len(per_speaker_fixed) or 1,
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        print("[9] Session record COMPLETE")

        # ── 10. Notify ─────────────────────────────────────────────────────
        print("[10] Sending notifications...")
        notify_job_complete(
            student_id    = audio_file.student_id or "unknown",
            filename      = audio_file.filename,
            overall_score = scores_to_save["overall_score"],
            session_id    = session.id,
            db            = db,
        )
        print("[10] Notification COMPLETE")
        print("========== TASK FINISHED ==========\n")

    except Exception as e:
        print(f"\n========== TASK FAILED ==========")
        print(f"ERROR: {str(e)}")
        import traceback; traceback.print_exc()
        print("=================================\n")

        if audio_file:
            try:
                audio_file.status = JobStatus.failed
                db.commit()
            except Exception:
                pass

        raise self.retry(exc=e, countdown=5, max_retries=3)

    finally:
        db.close()