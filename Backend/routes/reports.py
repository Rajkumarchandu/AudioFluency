from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import Optional
from database import get_db
from models import StudentReport
import json

router = APIRouter()


class SendReportRequest(BaseModel):
    student_id:    str
    sent_by:       str
    audio_file_id: Optional[int] = None
    report_type:   str = "session"
    report_data:   dict


@router.post("/reports/send")
def send_report(req: SendReportRequest, db: Session = Depends(get_db)):
    report = StudentReport(
        student_id    = req.student_id,
        sent_by       = req.sent_by,
        audio_file_id = req.audio_file_id,
        report_type   = req.report_type,
        report_data   = json.dumps(req.report_data),
        is_read       = False,
    )
    db.add(report)
    db.commit()
    db.refresh(report)
    return {
        "message":    "Report sent successfully",
        "report_id":  report.id,
        "student_id": report.student_id,
    }


@router.get("/reports/student/{student_id}")
def get_student_reports(student_id: str, db: Session = Depends(get_db)):
    reports = (
        db.query(StudentReport)
        .filter(StudentReport.student_id == student_id)
        .order_by(StudentReport.created_at.desc())
        .all()
    )
    return [
        {
            "id":            r.id,
            "student_id":    r.student_id,
            "sent_by":       r.sent_by,
            "report_type":   r.report_type,
            "report_data":   json.loads(r.report_data),
            "is_read":       r.is_read,
            "created_at":    r.created_at,
            "audio_file_id": r.audio_file_id,
        }
        for r in reports
    ]


@router.patch("/reports/{report_id}/read")
def mark_report_read(report_id: int, db: Session = Depends(get_db)):
    report = db.query(StudentReport).filter(StudentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    report.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.delete("/reports/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(StudentReport).filter(StudentReport.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    db.delete(report)
    db.commit()
    return {"message": "Report deleted"}