from sqlalchemy.orm import Session
from models import Notification


def notify_job_complete(student_id: str, filename: str, overall_score: int, session_id: int, db: Session):
    """Send notification to student and teacher when job is complete."""

    # Notify student
    student_msg = (
        f"Your audio analysis for '{filename}' is complete! "
        f"Overall fluency score: {overall_score}/100."
    )
    student_notif = Notification(
        session_id=session_id,
        recipient=student_id,
        message=student_msg,
        is_read=False
    )
    db.add(student_notif)

    # Notify teacher
    teacher_msg = (
        f"Student {student_id} audio analysis complete. "
        f"File: '{filename}'. Overall score: {overall_score}/100."
    )
    teacher_notif = Notification(
        session_id=session_id,
        recipient="teacher",
        message=teacher_msg,
        is_read=False
    )
    db.add(teacher_notif)
    db.commit()