from sqlalchemy.orm import Session
from models import AudioFile, SpeakerProfile
from typing import Optional


def get_student_trends(student_id: str, db: Session) -> dict:
    """
    Computes trend data for a student across multiple sessions.
    Returns scores over time, improvement rate, and recommendations.
    """
    # Get all completed audio files for this student
    records = db.query(AudioFile).filter(
        AudioFile.student_id == student_id,
        AudioFile.status == "completed"
    ).order_by(AudioFile.created_at.asc()).all()

    if not records:
        return _empty_trends(student_id)

    # Build session history
    history = []
    for i, record in enumerate(records):
        if not record.scores:
            continue
        import json
        scores = json.loads(record.scores)
        overall = scores.get("overall", {})
        history.append({
            "session_number": i + 1,
            "job_id":         record.id,
            "filename":       record.filename,
            "date":           record.created_at.isoformat() if record.created_at else None,
            "pronunciation":  overall.get("pronunciation"),
            "fluency":        overall.get("fluency"),
            "clarity":        overall.get("clarity"),
            "confidence":     overall.get("confidence"),
            "grammar":        overall.get("grammar"),
            "communication":  overall.get("communication"),
            "overall_score":  overall.get("overall_score"),
        })

    if not history:
        return _empty_trends(student_id)

    # Compute improvements
    first = history[0]
    last  = history[-1]

    def improvement(key):
        f = first.get(key)
        l = last.get(key)
        if f is not None and l is not None:
            return round(l - f, 1)
        return None

    improvements = {
        "pronunciation":  improvement("pronunciation"),
        "fluency":        improvement("fluency"),
        "clarity":        improvement("clarity"),
        "confidence":     improvement("confidence"),
        "grammar":        improvement("grammar"),
        "communication":  improvement("communication"),
        "overall_score":  improvement("overall_score"),
    }

    # Averages
    def avg(key):
        vals = [h[key] for h in history if h.get(key) is not None]
        return round(sum(vals) / len(vals), 1) if vals else None

    averages = {
        "pronunciation":  avg("pronunciation"),
        "fluency":        avg("fluency"),
        "clarity":        avg("clarity"),
        "confidence":     avg("confidence"),
        "grammar":        avg("grammar"),
        "communication":  avg("communication"),
        "overall_score":  avg("overall_score"),
    }

    # Best scores
    def best(key):
        vals = [h[key] for h in history if h.get(key) is not None]
        return max(vals) if vals else None

    bests = {
        "pronunciation":  best("pronunciation"),
        "fluency":        best("fluency"),
        "clarity":        best("clarity"),
        "confidence":     best("confidence"),
        "grammar":        best("grammar"),
        "communication":  best("communication"),
        "overall_score":  best("overall_score"),
    }

    # Trend direction
    def trend_direction(imp):
        if imp is None:    return "neutral"
        if imp > 5:        return "improving"
        if imp < -5:       return "declining"
        return "stable"

    trend_directions = {k: trend_direction(v) for k, v in improvements.items()}

    # Generate recommendations based on weakest areas
    weak_areas = sorted(
        [(k, averages[k]) for k in averages if averages[k] is not None],
        key=lambda x: x[1]
    )[:3]

    recommendations = _generate_recommendations(weak_areas, improvements)

    return {
        "student_id":       student_id,
        "total_sessions":   len(history),
        "history":          history,
        "improvements":     improvements,
        "averages":         averages,
        "best_scores":      bests,
        "trend_directions": trend_directions,
        "recommendations":  recommendations,
        "overall_trend":    trend_direction(improvements.get("overall_score")),
    }


def _generate_recommendations(weak_areas: list, improvements: dict) -> list:
    tips = {
        "fluency": [
            "Practice speaking without pausing by reading aloud daily.",
            "Record yourself and listen back to identify filler words.",
            "Try tongue twisters to improve speech flow.",
        ],
        "clarity": [
            "Slow down your speech and enunciate each word clearly.",
            "Practice minimal pairs (words that differ by one sound).",
            "Focus on ending consonants clearly.",
        ],
        "grammar": [
            "Review subject-verb agreement rules.",
            "Practice using complete sentences in everyday speech.",
            "Read English texts aloud to internalize grammar patterns.",
        ],
        "confidence": [
            "Practice speaking in front of a mirror daily.",
            "Join group discussions to build comfort speaking publicly.",
            "Prepare key points before speaking sessions.",
        ],
        "pronunciation": [
            "Use a pronunciation dictionary to check difficult words.",
            "Practice vowel sounds that differ from your native language.",
            "Listen and repeat after native speakers.",
        ],
        "communication": [
            "Focus on organizing your thoughts before speaking.",
            "Practice summarizing topics in 2-3 clear sentences.",
            "Work on maintaining eye contact and steady pace.",
        ],
        "overall_score": [
            "Consistent daily practice is the key to improvement.",
            "Focus on one skill at a time rather than everything at once.",
        ]
    }

    result = []
    for area, score in weak_areas:
        area_tips = tips.get(area, [])
        if area_tips:
            result.append({
                "area":     area,
                "score":    score,
                "priority": "high" if score < 50 else "medium",
                "tip":      area_tips[0],
            })

    return result


def _empty_trends(student_id: str) -> dict:
    return {
        "student_id":      student_id,
        "total_sessions":  0,
        "history":         [],
        "improvements":    {},
        "averages":        {},
        "best_scores":     {},
        "trend_directions":{},
        "recommendations": [],
        "overall_trend":   "neutral",
    }