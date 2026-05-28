import os
import asyncio
import tempfile
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

os.environ["PATH"] += (
    r";C:\Users\91798\AppData\Local\Microsoft\WinGet\Packages"
    r"\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe"
    r"\ffmpeg-8.1.1-full_build\bin"
)

router = APIRouter()

_model = None

def _get_model():
    global _model
    if _model is None:
        import whisper
        print("[live_audio] Loading Whisper model...")
        _model = whisper.load_model("base")
        print("[live_audio] Whisper model loaded OK")
    return _model


@router.websocket("/ws/live-audio")
async def live_audio_ws(websocket: WebSocket):
    await websocket.accept()
    audio_chunks: list[bytes] = []

    try:
        while True:
            message = await websocket.receive()

            if "bytes" in message:
                audio_chunks.append(message["bytes"])

            elif "text" in message:
                command = message["text"].strip().upper()

                if command == "STOP":
                    if not audio_chunks:
                        await websocket.send_json({"error": "No audio received"})
                        break

                    transcript = await asyncio.to_thread(
                        _transcribe_chunks, audio_chunks
                    )
                    await websocket.send_json({
                        "status":     "completed",
                        "transcript": transcript
                    })
                    break

                elif command == "PING":
                    await websocket.send_json({"status": "alive"})

    except WebSocketDisconnect:
        pass
    except Exception as e:
        print(f"[live_audio] WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass
    finally:
        try:
            await websocket.close()
        except:
            pass


def _transcribe_chunks(chunks: list[bytes]) -> str:
    raw_audio = b"".join(chunks)

    with tempfile.NamedTemporaryFile(suffix=".webm", delete=False) as tmp:
        tmp.write(raw_audio)
        tmp_path = tmp.name

    try:
        model = _get_model()
        result = model.transcribe(
            tmp_path,
            task="transcribe",
            fp16=False,
        )
        return result.get("text", "")
    except Exception as e:
        print(f"[live_audio] Transcription error: {e}")
        return f"[Transcription error: {e}]"
    finally:
        try:
            os.unlink(tmp_path)
        except:
            pass