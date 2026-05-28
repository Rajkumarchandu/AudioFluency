from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from passlib.context import CryptContext
from database import get_db
from models import User
import uuid

router = APIRouter()

# Use sha256_crypt instead of bcrypt — no version issues
pwd_context = CryptContext(schemes=["sha256_crypt"], deprecated="auto")


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    role: str = "student"


class LoginRequest(BaseModel):
    email: str
    password: str
    role: str


@router.post("/auth/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    # Check if email already exists
    existing = db.query(User).filter(User.email == req.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Auto-generate student ID for students
    student_id = None
    if req.role == "student":
        student_id = "STU" + str(uuid.uuid4())[:6].upper()

    # Hash password
    hashed = pwd_context.hash(req.password)

    user = User(
        name=req.name,
        email=req.email,
        password=hashed,
        role=req.role,
        student_id=student_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "message":    "Registration successful",
        "name":       user.name,
        "email":      user.email,
        "role":       user.role,
        "student_id": user.student_id,
    }


@router.post("/auth/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()

    if not user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.role != req.role:
        raise HTTPException(status_code=401, detail=f"This account is not a {req.role}")

    if not pwd_context.verify(req.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "message":    "Login successful",
        "name":       user.name,
        "email":      user.email,
        "role":       user.role,
        "student_id": user.student_id,
    }

@router.get("/auth/students")
def get_all_students(db: Session = Depends(get_db)):
    students = db.query(User).filter(User.role == "student").all()
    return [
        {
            "student_id": u.student_id,
            "name":       u.name,
            "email":      u.email,
            "role":       u.role,
            "created_at": u.created_at,
        }
        for u in students
    ]

from pydantic import BaseModel
from typing import Optional

class UpdateProfileRequest(BaseModel):
    name:     Optional[str] = None
    phone:    Optional[str] = None
    college:  Optional[str] = None
    course:   Optional[str] = None
    year:     Optional[str] = None
    bio:      Optional[str] = None

@router.patch("/auth/profile/{user_id}")
def update_profile(user_id: int, req: UpdateProfileRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if req.name:    user.name    = req.name
    if req.phone:   user.phone   = req.phone
    if req.college: user.college = req.college
    if req.course:  user.course  = req.course
    if req.year:    user.year    = req.year
    if req.bio:     user.bio     = req.bio
    db.commit()
    db.refresh(user)
    return {
        "message":    "Profile updated",
        "name":       user.name,
        "email":      user.email,
        "role":       user.role,
        "student_id": user.student_id,
        "phone":      user.phone,
        "college":    user.college,
        "course":     user.course,
        "year":       user.year,
        "bio":        user.bio,
    }

@router.get("/auth/profile/{student_id}")
def get_profile(student_id: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.student_id == student_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":         user.id,
        "name":       user.name,
        "email":      user.email,
        "role":       user.role,
        "student_id": user.student_id,
        "phone":      user.phone,
        "college":    user.college,
        "course":     user.course,
        "year":       user.year,
        "bio":        user.bio,
        "created_at": user.created_at,
    }

@router.get("/auth/teacher-profile/{email}")
def get_teacher_profile(email: str, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id":      user.id,
        "name":    user.name,
        "email":   user.email,
        "role":    user.role,
        "phone":   user.phone,
        "college": user.college,
        "bio":     user.bio,
    }


from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from jose import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY   = os.getenv("SECRET_KEY", "synycs_secret_2026")
ALGORITHM    = "HS256"

mail_config = ConnectionConfig(
    MAIL_USERNAME   = os.getenv("MAIL_USERNAME", "chandu434660@gmail.com"),
    MAIL_PASSWORD   = os.getenv("MAIL_PASSWORD", "lcgk onbm jggb iosq"),
    MAIL_FROM       = os.getenv("MAIL_FROM", "chandu434660@gmail.com"),
    MAIL_PORT       = int(os.getenv("MAIL_PORT", 587)),
    MAIL_SERVER     = os.getenv("MAIL_SERVER", "smtp.gmail.com"),
    MAIL_STARTTLS   = True,
    MAIL_SSL_TLS    = False,
    USE_CREDENTIALS = True,
)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/auth/forgot-password")
async def forgot_password(req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Don't reveal if email exists — always return success
        return {"message": "If this email exists, a reset link has been sent."}

    # Generate reset token valid for 30 minutes
    expire = datetime.utcnow() + timedelta(minutes=30)
    token = jwt.encode(
        {"sub": user.email, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM
    )

    reset_link = f"http://localhost:5173/reset-password?token={token}"

    message = MessageSchema(
        subject="SYNYCS — Password Reset Request",
        recipients=[user.email],
        body=f"""
        <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; background: #0B1120; color: white; padding: 40px; border-radius: 16px;">
            <h1 style="background: linear-gradient(to right, #8b5cf6, #06b6d4); -webkit-background-clip: text; -webkit-text-fill-color: transparent; font-size: 28px;">SYNYCS</h1>
            <p style="color: #94a3b8;">Audio Fluency Capture & Analysis System</p>
            <hr style="border-color: #1e293b; margin: 20px 0;">
            <h2 style="color: white;">Password Reset Request</h2>
            <p style="color: #94a3b8;">Hi {user.name},</p>
            <p style="color: #94a3b8;">We received a request to reset your password. Click the button below to create a new password. This link expires in <strong style="color: white;">30 minutes</strong>.</p>
            <a href="{reset_link}"
               style="display: inline-block; margin: 20px 0; padding: 14px 32px; background: linear-gradient(to right, #7c3aed, #0891b2); color: white; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px;">
               Reset My Password →
            </a>
            <p style="color: #475569; font-size: 12px; margin-top: 20px;">If you didn't request this, you can safely ignore this email.</p>
            <p style="color: #475569; font-size: 12px;">— The SYNYCS Team</p>
        </div>
        """,
        subtype="html"
    )

    try:
        fm = FastMail(mail_config)
        await fm.send_message(message)
    except Exception as e:
        print(f"[email] Failed to send: {e}")
        raise HTTPException(status_code=500, detail="Failed to send email. Check mail configuration.")

    return {"message": "If this email exists, a reset link has been sent."}


@router.post("/auth/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(req.token, SECRET_KEY, algorithms=[ALGORITHM])
        email   = payload.get("sub")
        if not email:
            raise HTTPException(status_code=400, detail="Invalid token")
    except Exception:
        raise HTTPException(status_code=400, detail="Token is invalid or expired")

    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if len(req.new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")

    user.password = pwd_context.hash(req.new_password)
    db.commit()

    return {"message": "Password reset successfully. You can now log in."}