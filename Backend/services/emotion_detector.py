import os
import numpy as np
import tempfile
import subprocess

os.environ["PATH"] += (
    r";C:\Users\91798\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-8.1.1-full_build\bin"
)

_emotion_model = None

def _get_model():
    global _emotion_model
    if _emotion_model is None:
        try:
            from transformers import pipeline
            print("[emotion] Loading emotion model...")
            _emotion_model = pipeline(
                "audio-classification",
                model="ehcalabres/wav2vec2-lg-xlsr-en-speech-emotion-recognition"
            )
            print("[emotion] Emotion model loaded OK")
        except Exception as e:
            print(f"[emotion] Model load failed: {e}")
            _emotion_model = None
    return _emotion_model


def _convert_to_wav(audio_path: str) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    tmp.close()
    cmd = [
        "ffmpeg", "-y", "-i", audio_path,
        "-ar", "16000", "-ac", "1", "-f", "wav", tmp_path
    ]
    subprocess.run(cmd, capture_output=True)
    return tmp_path


def detect_emotions(audio_path: str) -> dict:
    """
    Detects emotions from audio file.
    Returns dominant emotion + confidence scores for all emotions.
    """
    model = _get_model()
    if model is None:
        return _fallback_emotions()

    wav_path = None
    try:
        wav_path = _convert_to_wav(audio_path)
        results  = model(wav_path)

        # Sort by score
        emotions = sorted(results, key=lambda x: x["score"], reverse=True)

        dominant = emotions[0]["label"] if emotions else "neutral"
        scores   = {e["label"]: round(e["score"] * 100, 1) for e in emotions}

        # Map to confidence indicators
        confidence_indicator = _emotion_to_confidence(dominant, scores)

        return {
            "dominant_emotion":    dominant,
            "emotion_scores":      scores,
            "confidence_indicator": confidence_indicator,
            "emotion_summary":     _describe_emotion(dominant, scores),
        }

    except Exception as e:
        print(f"[emotion] Detection error: {e}")
        return _fallback_emotions()

    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except:
                pass


def _emotion_to_confidence(dominant: str, scores: dict) -> str:
    """Maps emotion to a speaking confidence level."""
    confident_emotions = {"happy", "surprised", "calm", "neutral"}
    low_confidence     = {"fearful", "sad", "disgust"}
    high_energy        = {"angry"}

    if dominant in confident_emotions:
        return "confident"
    elif dominant in low_confidence:
        return "nervous"
    elif dominant in high_energy:
        return "aggressive"
    return "neutral"


def _describe_emotion(dominant: str, scores: dict) -> str:
    descriptions = {
        "happy":     "Speaker sounds enthusiastic and positive.",
        "neutral":   "Speaker sounds calm and composed.",
        "calm":      "Speaker sounds relaxed and in control.",
        "sad":       "Speaker sounds low-energy or uncertain.",
        "angry":     "Speaker sounds highly passionate or aggressive.",
        "fearful":   "Speaker sounds nervous or anxious.",
        "surprised": "Speaker sounds engaged and energetic.",
        "disgust":   "Speaker sounds disapproving or uncomfortable.",
    }
    return descriptions.get(dominant, "Emotion detected but unclear.")


def _fallback_emotions():
    return {
        "dominant_emotion":     "neutral",
        "emotion_scores":       {"neutral": 100.0},
        "confidence_indicator": "neutral",
        "emotion_summary":      "Emotion analysis unavailable.",
    }