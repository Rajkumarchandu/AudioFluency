import { useEffect, useRef, useState } from "react";
import { toast } from "react-toastify";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { uploadAudio, getStudentStatus } from "../../services/audioService";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";
import {
  connectSocket,
  sendAudioChunk,
  closeSocket,
} from "../../services/websocketService";

const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
];

export default function LiveSessionPage() {
  const { user } = useAuth();
  const [recording, setRecording] = useState(false);
  const [language, setLanguage] = useState("hi");
  const [transcript, setTranscript] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [result, setResult] = useState(null);
  const [polling, setPolling] = useState(false);

  const mediaRecorderRef = useRef(null);
  const socketRef = useRef(null);
  const chunksRef = useRef([]);
  const pollRef = useRef(null);

  // START LIVE RECORDING
  const startRecording = async () => {
    try {
      socketRef.current = connectSocket();

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.transcript) {
            setTranscript((prev) => prev + " " + data.transcript);
          }
        } catch {
          setTranscript((prev) => prev + " " + event.data);
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
          const arrayBuffer = await event.data.arrayBuffer();
          sendAudioChunk(arrayBuffer);
        }
      };

      mediaRecorder.start(1000);
      setRecording(true);
      toast.success("Recording started");
    } catch (error) {
      toast.error("Microphone access denied");
    }
  };

  // STOP + AUTO UPLOAD FOR ANALYSIS
  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    closeSocket();
    setRecording(false);
    toast.info("Recording stopped");

    // Auto-upload recorded audio for full analysis
    setTimeout(() => {
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `live_${Date.now()}.webm`, {
          type: "audio/webm",
        });
        handleUpload(file);
      }
    }, 500);
  };

  // UPLOAD FILE (recorded or manual)
  async function handleUpload(file) {
    if (!file) {
      toast.error("No file selected");
      return;
    }
    if (!user?.studentId) {
      toast.error("Not logged in");
      return;
    }

    setUploading(true);
    setResult(null);
    try {
      const data = await uploadAudio(file, user.studentId, language);
      setJobId(data.job_id);
      toast.success(`Uploaded! Job #${data.job_id} — analyzing...`);
      startPolling(data.job_id);
    } catch (e) {
      toast.error("Upload failed: " + (e.response?.data?.detail || e.message));
    } finally {
      setUploading(false);
    }
  }

  // POLL FOR RESULTS
  function startPolling(jId) {
    setPolling(true);
    pollRef.current = setInterval(async () => {
      try {
        const records = await getStudentStatus(user.studentId);
        const found = records.find((r) => r.job_id === jId);
        if (found && found.status === "completed") {
          setResult(found);
          setPolling(false);
          clearInterval(pollRef.current);
          toast.success("Analysis complete!");
        } else if (found && found.status === "failed") {
          setPolling(false);
          clearInterval(pollRef.current);
          toast.error("Analysis failed.");
        }
      } catch (e) {
        console.error(e);
      }
    }, 10000); // check every 10 seconds
  }

  useEffect(() => {
    return () => {
      closeSocket();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const scores = result ? parseScores(result.scores) : null;
  const corrections = result?.scores
    ? JSON.parse(result.scores)?.corrections || []
    : [];
  const correctedText = result?.scores
    ? JSON.parse(result.scores)?.corrected_text || ""
    : "";
  const summary = result?.scores
    ? JSON.parse(result.scores)?.summary || ""
    : "";

  return (
    <StudentLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">🎙 Live Session</h1>
          <p className="text-slate-400">
            Speak or upload audio — get instant fluency analysis.
          </p>
        </div>

        {/* LANGUAGE SELECTOR */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-slate-400 text-sm">Language:</span>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLanguage(l.code)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition ${
                language === l.code
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        {/* RECORD + UPLOAD CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* LIVE RECORD */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">⏺ Live Recording</h2>
            <div className="flex gap-3">
              <button
                onClick={startRecording}
                disabled={recording || uploading}
                className="flex-1 py-3 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold transition"
              >
                {recording ? "🔴 Recording..." : "Start"}
              </button>
              <button
                onClick={stopRecording}
                disabled={!recording}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-semibold transition"
              >
                Stop & Analyze
              </button>
            </div>
            {recording && (
              <p className="text-xs text-green-400 mt-3 animate-pulse">
                ● Listening... speak clearly in {LANGUAGES.find(l => l.code === language)?.label}
              </p>
            )}
          </div>

          {/* FILE UPLOAD */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-white font-bold text-lg mb-4">⬆ Upload Audio</h2>
            <input
              type="file"
              accept=".mp3,.wav,.m4a,.flac,.ogg,.webm,.mp4"
              onChange={(e) => setUploadFile(e.target.files[0])}
              className="w-full text-slate-400 text-sm mb-3 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
            />
            <button
              onClick={() => handleUpload(uploadFile)}
              disabled={!uploadFile || uploading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold transition"
            >
              {uploading ? "⏳ Uploading..." : "Upload & Analyze"}
            </button>
          </div>
        </div>

        {/* LIVE TRANSCRIPT */}
        {transcript && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-xl font-bold text-white mb-3">📄 Live Transcript</h2>
            <p className="text-slate-300 leading-relaxed">{transcript}</p>
          </div>
        )}

        {/* POLLING STATUS */}
        {polling && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-5 text-center">
            <div className="text-blue-400 animate-pulse text-lg">
              ⏳ Analyzing your audio... this may take 1-2 minutes
            </div>
            <p className="text-slate-500 text-xs mt-1">
              Job #{jobId} · Checking every 10 seconds
            </p>
          </div>
        )}

        {/* RESULTS */}
        {result && scores && (
          <div className="space-y-5">

            {/* SCORE GRID */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                "pronunciation", "fluency", "grammar",
                "confidence", "clarity", "communication"
              ].map((key) => (
                <div
                  key={key}
                  className="bg-white/5 border border-white/10 rounded-2xl p-4"
                >
                  <div className="text-slate-400 text-xs capitalize mb-1">{key}</div>
                  <div
                    className="text-3xl font-bold"
                    style={{ color: scoreColor(scores[key]) }}
                  >
                    {scores[key] ?? "—"}
                  </div>
                  <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${scores[key] ?? 0}%`,
                        background: scoreColor(scores[key]),
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* AI SUMMARY */}
            {summary && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-2">🤖 AI Summary</h3>
                <p className="text-slate-300">{summary}</p>
              </div>
            )}

            {/* PRONUNCIATION CORRECTIONS */}
            {corrections.length > 0 && (
              <div className="bg-white/5 border border-red-500/20 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-3">
                  ⚠️ Pronunciation Corrections ({corrections.length})
                </h3>
                <div className="space-y-2">
                  {corrections.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3"
                    >
                      <span className="text-red-400 font-mono line-through">{c.wrong}</span>
                      <span className="text-slate-400">→</span>
                      <span className="text-green-400 font-mono font-bold">{c.correct}</span>
                      <span className="text-slate-500 text-xs ml-auto italic">
                        "{c.context}"
                      </span>
                    </div>
                  ))}
                </div>

                {correctedText && (
                  <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                    <div className="text-green-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                      Corrected Version
                    </div>
                    <p className="text-slate-300 text-sm leading-relaxed">{correctedText}</p>
                  </div>
                )}
              </div>
            )}

            {/* TRANSCRIPTION */}
            {result.transcription && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-2">📝 Full Transcription</h3>
                <p className="text-slate-300 leading-relaxed">{result.transcription}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </StudentLayout>
  );
}