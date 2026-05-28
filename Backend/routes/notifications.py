from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Notification

router = APIRouter()


@router.get("/notifications/{recipient}")
def get_notifications(recipient: str, db: Session = Depends(get_db)):
    notifications = db.query(Notification).filter(
        Notification.recipient == recipient
    ).order_by(Notification.created_at.desc()).all()

    return [
        {
            "id":         n.id,
            "recipient":  n.recipient,
            "message":    n.message,
            "is_read":    n.is_read,
            "created_at": n.created_at.isoformat() if n.created_at else None,
        }
        for n in notifications
    ]


@router.patch("/notifications/{notification_id}/read")
def mark_as_read(notification_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    n.is_read = True
    db.commit()
    return {"message": "Marked as read"}


@router.patch("/notifications/{recipient}/read-all")
def mark_all_read(recipient: str, db: Session = Depends(get_db)):
    db.query(Notification).filter(
        Notification.recipient == recipient,
        Notification.is_read == False
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read"}


@router.delete("/notifications/{notification_id}")
def delete_notification(notification_id: int, db: Session = Depends(get_db)):
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    db.delete(n)
    db.commit()
    return {"message": "Notification deleted"}