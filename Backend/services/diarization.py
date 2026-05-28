import os
import json
import subprocess
import tempfile
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

HF_TOKEN = os.getenv("HF_TOKEN")

_pipeline = None

def _get_pipeline():
    global _pipeline
    if _pipeline is not None:
        return _pipeline
    try:
        from pyannote.audio import Pipeline
        import torch
        print("[diarization] Loading pipeline...")
        _pipeline = Pipeline.from_pretrained(
            "pyannote/speaker-diarization-3.1",
            token=HF_TOKEN
        )
        device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _pipeline = _pipeline.to(device)
        print("[diarization] Pipeline loaded OK")
    except Exception as e:
        print(f"[diarization] Pipeline failed: {e}")
        _pipeline = None
    return _pipeline


def _convert_to_wav(audio_path: str) -> str:
    tmp = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    tmp_path = tmp.name
    tmp.close()
    cmd = ["ffmpeg", "-y", "-i", audio_path, "-ar", "16000", "-ac", "1", "-f", "wav", tmp_path]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")
    return tmp_path


def diarize_audio(audio_path: str) -> list:
    pipeline = _get_pipeline()
    if pipeline is None:
        print("[diarization] Pipeline not available, skipping")
        return []

    wav_path = None
    try:
        wav_path = _convert_to_wav(audio_path)
        diarization = pipeline(wav_path)
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "speaker": speaker,
                "start":   round(turn.start, 2),
                "end":     round(turn.end, 2)
            })
        print(f"[diarization] {len(segments)} segments found")
        return segments
    except Exception as e:
        print(f"[diarization] Error: {e}")
        return []
    finally:
        if wav_path and os.path.exists(wav_path):
            try:
                os.remove(wav_path)
            except Exception:
                pass







def diarize_audio(audio_path: str) -> list:
    pipeline = _get_pipeline()
    if pipeline is None:
        print("[diarization] Pipeline not available, using fallback")
        return _single_speaker_fallback(audio_path)

    wav_path = None
    try:
        wav_path = _convert_to_wav(audio_path)
        diarization = pipeline(wav_path)
        segments = []
        for turn, _, speaker in diarization.itertracks(yield_label=True):
            segments.append({
                "speaker": speaker,
                "start":   round(turn.start, 2),
                "end":     round(turn.end, 2)
            })
        print(f"[diarization] {len(segments)} segments found")

        # If no segments detected, fall back to single speaker
        if not segments:
            print("[diarization] No segments — using single speaker fallback")
            return _single_speaker_fallback(audio_path)

        return segments
    except Exception as e:
        print(f"[diarization] Error: {e}")
        return _single_speaker_fallback(audio_path)
    finally:
        if wav_path and os.path.exists(wav_path):
            try: os.remove(wav_path)
            except: pass


def _single_speaker_fallback(audio_path: str) -> list:
    """When diarization fails or finds nothing, treat whole audio as one speaker."""
    try:
        import wave, contextlib
        wav_path = _convert_to_wav(audio_path)
        with contextlib.closing(wave.open(wav_path, 'r')) as f:
            duration = round(f.getnframes() / float(f.getframerate()), 2)
        return [{"speaker": "SPEAKER_00", "start": 0.0, "end": duration}]
    except Exception:
        return [{"speaker": "SPEAKER_00", "start": 0.0, "end": 10.0}]