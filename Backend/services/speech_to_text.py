import whisper
import ffmpeg
import os

print("[speech_to_text] Loading Whisper model...")
model = whisper.load_model("base")   # base is much better than tiny for Indian languages
print("[speech_to_text] Whisper model loaded")


def convert_to_wav(input_path):
    wav_path = input_path.rsplit(".", 1)[0] + "_converted.wav"
    print(f"[speech_to_text] Converting to WAV: {wav_path}")
    (
        ffmpeg
        .input(input_path)
        .output(wav_path, acodec="pcm_s16le", ac=1, ar="16000")
        .overwrite_output()
        .run(quiet=True)
    )
    print("[speech_to_text] WAV conversion complete")
    return wav_path


def speech_to_text(audio_path, language=None):
    print(f"[speech_to_text] Processing: {audio_path}, language={language}")

    wav_path = convert_to_wav(audio_path)

    # Language code mapping — Whisper uses full names for some languages
    lang_map = {
        "hi": "hi",
        "te": "te",
        "en": "en",
        "ta": "ta",
        "kn": "kn",
        "mr": "mr",
    }
    whisper_lang = lang_map.get(language, "en") if language else None

    print(f"[speech_to_text] Using Whisper language: {whisper_lang}")

    result = model.transcribe(
        wav_path,
        task="transcribe",
        fp16=False,
        language=whisper_lang,   # correctly passed now
        verbose=False,
        temperature=0.0,
        beam_size=5,             # better accuracy than beam_size=1
        best_of=5,
    )

    text = result.get("text", "").strip()
    print(f"[speech_to_text] Result: {text[:100]}...")

    # Cleanup converted wav
    try:
        if wav_path != audio_path and os.path.exists(wav_path):
            os.remove(wav_path)
    except Exception:
        pass

    return text