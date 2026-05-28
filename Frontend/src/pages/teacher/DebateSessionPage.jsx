import { useState, useEffect, useRef } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { useAuth } from "../../context/AuthContext";
import {
  uploadDebateAudio, getDebateStatus,
  createDebateRoom, getDebateRoom, updateRoomStatus
} from "../../services/audioService";
import { sendReportToStudent } from "../../services/reportService";
import { generateSessionReport } from "../../utils/reportGenerator";
import { scoreColor } from "../../utils/scoreHelpers";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
];

const METRICS = ["pronunciation", "fluency", "grammar", "confidence", "clarity", "communication"];

const SPEAKER_COLORS = [
  "#ff375f", "#30d158", "#0a84ff",
  "#ff9f0a", "#bf5af2", "#64d2ff",
  "#ff6b35", "#32ade6",
];

export default function DebateSessionPage() {
  const { user } = useAuth();

  const [tab, setTab]                   = useState("upload");
  const [language, setLanguage]         = useState("en");
  const [sessionTitle, setSessionTitle] = useState("");

  // ROOM CODE
  const [roomCode, setRoomCode]             = useState(null);
  const [roomCreated, setRoomCreated]       = useState(false);
  const [participants, setParticipants]     = useState([]);
  const [creatingRoom, setCreatingRoom]     = useState(false);
  const participantPollRef                  = useRef(null);

  // UPLOAD
  const [file, setFile]           = useState(null);
  const [uploading, setUploading] = useState(false);

  // LIVE RECORD
  const [students, setStudents]           = useState([{ id: "", name: "" }, { id: "", name: "" }]);
  const [recording, setRecording]         = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [activeStudent, setActiveStudent] = useState(null);
  const [timestamps, setTimestamps]       = useState([]);

  const mediaRef     = useRef(null);
  const chunksRef    = useRef([]);
  const timerRef     = useRef(null);
  const startTimeRef = useRef(null);

  // JOB
  const [jobId, setJobId]     = useState(null);
  const [jobData, setJobData] = useState(null);
  const [polling, setPolling] = useState(false);
  const pollRef               = useRef(null);

  // TAGGING
  const [tags, setTags]           = useState({});
  const [tagInputs, setTagInputs] = useState({});

  // SEND
  const [sending, setSending]           = useState(null);
  const [sentSpeakers, setSentSpeakers] = useState(new Set());

  // TOAST
  const [toast, setToast] = useState(null);

  // HISTORY
  const [sessions, setSessions]               = useState(() =>
    JSON.parse(localStorage.getItem("debate_sessions") || "[]")
  );
  const [selectedSession, setSelectedSession] = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function saveSession(entry) {
    const updated = [entry, ...sessions];
    localStorage.setItem("debate_sessions", JSON.stringify(updated));
    setSessions(updated);
  }

  useEffect(() => () => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
    clearInterval(participantPollRef.current);
  }, []);

  // ── CREATE ROOM ────────────────────────────────────────────────────────────
  async function handleCreateRoom() {
    if (!sessionTitle.trim()) return showToast("Enter a session title first", "err");
    setCreatingRoom(true);
    try {
      const data = await createDebateRoom(
        sessionTitle,
        user?.studentId || user?.email || "teacher",
        user?.name || "Teacher",
        language
      );
      setRoomCode(data.code);
      setRoomCreated(true);
      showToast(`Room created! Code: ${data.code} — share with students`);

      // Poll for participants every 5 seconds
      clearInterval(participantPollRef.current);
      participantPollRef.current = setInterval(async () => {
        try {
          const room = await getDebateRoom(data.code);
          setParticipants(room.participants || []);
        } catch (e) {}
      }, 5000);
    } catch (e) {
      showToast(e.response?.data?.detail || "Failed to create room", "err");
    } finally {
      setCreatingRoom(false);
    }
  }

  function copyCode() {
    if (!roomCode) return;
    navigator.clipboard.writeText(roomCode);
    showToast("Room code copied to clipboard!");
  }

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  async function handleUpload(fileToUse) {
    const f = fileToUse || file;
    if (!f) return showToast("Please select an audio file", "err");
    if (!sessionTitle.trim()) return showToast("Enter a session title", "err");
    setUploading(true);
    try {
      const data = await uploadDebateAudio(f, language, sessionTitle, roomCode);
      setJobId(data.job_id);
      showToast(`Uploaded! Processing job #${data.job_id}...`);
      // Update room status to recording
      if (roomCode) {
        await updateRoomStatus(roomCode, "recording").catch(() => {});
      }
      startPolling(data.job_id);
    } catch (e) {
      showToast(e.response?.data?.detail || "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  }

  // ── STUDENTS LIST ─────────────────────────────────────────────────────────
  function addStudent() {
    if (recording) return;
    setStudents((prev) => [...prev, { id: "", name: "" }]);
  }

  function removeStudent(idx) {
    if (recording) return;
    setStudents((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateStudent(idx, field, value) {
    setStudents((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  }

  // ── LIVE RECORDING ────────────────────────────────────────────────────────
  async function startLiveRecording() {
    if (!sessionTitle.trim()) return showToast("Enter a session title first", "err");
    const valid = students.filter((s) => s.name.trim());
    if (valid.length < 1) return showToast("Add at least one student name", "err");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current    = [];
      startTimeRef.current = Date.now();
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = () => { stream.getTracks().forEach((t) => t.stop()); clearInterval(timerRef.current); };
      mr.start(500);
      mediaRef.current = mr;
      setRecording(true);
      setTimestamps([]);
      setActiveStudent(null);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => setRecordSeconds((prev) => prev + 1), 1000);
      if (roomCode) updateRoomStatus(roomCode, "recording").catch(() => {});
      showToast("Recording started — tap a student button when they start speaking");
    } catch (e) {
      showToast("Microphone access denied", "err");
    }
  }

  function markStudent(idx) {
    if (!recording) return;
    const elapsed = (Date.now() - startTimeRef.current) / 1000;
    setActiveStudent(idx);
    setTimestamps((prev) => [
      ...prev,
      {
        studentIdx:  idx,
        studentName: students[idx]?.name || `Student ${idx + 1}`,
        studentId:   students[idx]?.id || "",
        time:        parseFloat(elapsed.toFixed(2)),
      },
    ]);
  }

  function stopLiveRecording() {
    if (!mediaRef.current) return;
    mediaRef.current.stop();
    setRecording(false);
    clearInterval(timerRef.current);
    showToast("Recording stopped — uploading for analysis...");
    setTimeout(() => {
      const blob = new Blob(chunksRef.current, { type: "audio/webm" });
      const f    = new File([blob], `live_debate_${Date.now()}.webm`, { type: "audio/webm" });
      handleUpload(f);
    }, 800);
  }

  function formatTime(seconds) {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = Math.floor(seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  // ── POLLING ───────────────────────────────────────────────────────────────
  function startPolling(jId) {
    setPolling(true);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const data = await getDebateStatus(jId);
        if (data.status === "completed") {
          setJobData(data);
          setPolling(false);
          clearInterval(pollRef.current);
          showToast("Analysis complete! Tag speakers to students below.");
          const spks = Object.keys(data?.scores?.per_speaker || {});
          const initTags = {}, initInputs = {};
          spks.forEach((sp, idx) => {
            const ts = timestamps[idx];
            // Auto-tag from participants if names match
            const matchedParticipant = participants[idx];
            if (ts?.studentId) initTags[sp] = ts.studentId;
            else if (matchedParticipant?.student_id) initTags[sp] = matchedParticipant.student_id;
            initInputs[sp] = initTags[sp] || "";
          });
          setTags(initTags);
          setTagInputs(initInputs);
          setSentSpeakers(new Set());
          saveSession({
            job_id: jId, session_title: sessionTitle, language,
            filename: data.filename, status: "completed",
            data, timestamps, room_code: roomCode,
            saved_at: new Date().toISOString(),
          });
        } else if (data.status === "failed") {
          setPolling(false);
          clearInterval(pollRef.current);
          showToast("Processing failed", "err");
        }
      } catch (e) { console.error(e); }
    }, 8000);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  function getSpeakers(data) {
    const d = data || jobData;
    if (!d?.scores?.per_speaker) return [];
    return Object.keys(d.scores.per_speaker);
  }

  function getSpeakerTranscript(speaker, data) {
    const d = data || jobData;
    return (d?.diarization || []).filter((s) => s.speaker === speaker)
      .map((s) => `[${s.start}s → ${s.end}s]`).join("  ");
  }

  function getSpeakerScore(speaker, data) {
    const d = data || jobData;
    return d?.scores?.per_speaker?.[speaker] || null;
  }

  function tagSpeaker(speaker) {
    const val = tagInputs[speaker]?.trim();
    if (!val) return showToast("Enter a Student ID first", "err");
    setTags((prev) => ({ ...prev, [speaker]: val }));
    showToast(`${speaker} tagged as ${val} ✓`);
  }

  async function handleSendReport(speaker) {
    const studentId = tags[speaker];
    if (!studentId) return showToast("Tag this speaker to a student first", "err");
    setSending(speaker);
    try {
      const score = getSpeakerScore(speaker);
      await sendReportToStudent(studentId, user?.name || "Teacher", {
        session: jobData.job_id, student_id: studentId,
        language: jobData.language, filename: jobData.filename,
        transcription: getSpeakerTranscript(speaker),
        scores: score,
        summary: jobData.scores?.summary || "",
        corrections: jobData.scores?.corrections || [],
        corrected_text: jobData.scores?.corrected_text || "",
        debate_session: sessionTitle,
        speaker_label: speaker,
        room_code: roomCode || "",
        sent_at: new Date().toISOString(),
      }, "session", jobData.job_id);
      setSentSpeakers((prev) => new Set([...prev, speaker]));
      showToast(`✅ Report sent to ${studentId} — they'll see it on login!`);
    } catch (e) {
      showToast("Failed to send report", "err");
    } finally {
      setSending(null);
    }
  }

  function handleDownloadPDF(speaker, data) {
    const d = data || jobData;
    const studentId = tags[speaker] || speaker;
    const score = getSpeakerScore(speaker, d);
    generateSessionReport({
      session: d.job_id, language: d.language,
      filename: `${sessionTitle} — ${speaker}`,
      transcription: getSpeakerTranscript(speaker, d),
      _rawScores: { summary: d.scores?.summary, corrections: d.scores?.corrections || [] },
      ...(score || {}), overall_score: score?.overall_score,
    }, studentId, studentId);
  }

  function loadSession(s) {
    setSelectedSession(s);
    setJobData(s.data);
    setJobId(s.job_id);
    setSessionTitle(s.session_title);
    setLanguage(s.language);
    setTimestamps(s.timestamps || []);
    setRoomCode(s.room_code || null);
    setPolling(false);
    clearInterval(pollRef.current);
    const spks = Object.keys(s.data?.scores?.per_speaker || {});
    const initInputs = {};
    spks.forEach((sp) => { initInputs[sp] = ""; });
    setTagInputs(initInputs);
    setTags({});
    setSentSpeakers(new Set());
    showToast(`Loaded: ${s.session_title}`);
  }

  const speakers = getSpeakers();

  return (
    <TeacherLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-bold text-white">🎙 Debate Sessions</h1>
          <p className="text-slate-400 mt-1">
            Create a room code → students join → record → score → send reports
          </p>
        </div>

        {/* TABS */}
        <div className="flex gap-3">
          {[
            { key: "upload", label: "⬆ Upload Audio",  desc: "Upload existing recording" },
            { key: "live",   label: "🔴 Live Record",   desc: "Record debate in real time" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-6 py-3 rounded-2xl border font-semibold text-sm transition flex flex-col items-start ${
                tab === t.key
                  ? "bg-purple-600 border-purple-500 text-white"
                  : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
              }`}
            >
              <span>{t.label}</span>
              <span className="text-xs opacity-60 font-normal mt-0.5">{t.desc}</span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* LEFT PANEL */}
          <div className="space-y-4 min-w-0">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">

              {/* SESSION TITLE */}
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                  Session Title
                </label>
                <input
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Class 10 Debate - May 2026"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                />
              </div>

              {/* LANGUAGE */}
              <div>
                <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                  Language
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => setLanguage(l.code)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition ${
                        language === l.code
                          ? "bg-purple-600 border-purple-500 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── ROOM CODE SECTION ── */}
              {!roomCreated ? (
                <button
                  onClick={handleCreateRoom}
                  disabled={creatingRoom || !sessionTitle.trim()}
                  className="w-full py-2.5 rounded-xl bg-white/5 border border-purple-500/40 text-purple-400 hover:bg-purple-500/10 disabled:opacity-40 text-sm font-semibold transition flex items-center justify-center gap-2"
                >
                  {creatingRoom ? "⏳ Creating..." : "🔑 Create Room Code for Students"}
                </button>
              ) : (
                <div className="bg-purple-500/10 border border-purple-500/30 rounded-2xl p-4">
                  <div className="text-slate-400 text-xs uppercase tracking-wider mb-1 text-center">
                    Share with students
                  </div>
                  <div
                    className="text-white font-mono font-black text-2xl tracking-widest text-center cursor-pointer hover:text-purple-300 transition"
                    onClick={copyCode}
                    title="Click to copy"
                  >
                    {roomCode}
                  </div>
                  <button
                    onClick={copyCode}
                    className="w-full mt-2 text-xs text-purple-400 hover:text-purple-300 transition"
                  >
                    📋 Click to copy
                  </button>

                  {/* PARTICIPANTS */}
                  <div className="mt-3 border-t border-white/10 pt-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-slate-400 text-xs">Students joined:</span>
                      <span className="text-purple-400 text-xs font-bold">
                        {participants.length}
                      </span>
                    </div>
                    {participants.length === 0 ? (
                      <div className="text-slate-600 text-xs italic text-center py-2">
                        Waiting for students to join...
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {participants.map((p, i) => (
                          <div key={p.student_id} className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: SPEAKER_COLORS[i % SPEAKER_COLORS.length] }}
                            />
                            <span className="text-white text-xs font-medium truncate">{p.student_name}</span>
                            <span className="text-slate-500 text-xs font-mono ml-auto shrink-0">{p.student_id}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ── UPLOAD TAB ── */}
              {tab === "upload" && (
                <>
                  <div>
                    <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                      Audio File
                    </label>
                    <input
                      type="file"
                      accept=".mp3,.wav,.m4a,.flac,.ogg,.webm,.mp4"
                      onChange={(e) => setFile(e.target.files[0])}
                      className="w-full text-slate-400 text-xs file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
                    />
                    {file && <p className="text-green-400 text-xs mt-1">✅ {file.name}</p>}
                  </div>
                  <button
                    onClick={() => handleUpload()}
                    disabled={uploading || polling || !file || !sessionTitle}
                    className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-sm transition"
                  >
                    {uploading ? "⏳ Uploading..." : polling ? "⏳ Analyzing..." : "Upload & Analyze"}
                  </button>
                </>
              )}

              {/* ── LIVE TAB ── */}
              {tab === "live" && (
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-slate-400 text-xs uppercase tracking-wider">
                        Students in Debate
                      </label>
                      <button
                        onClick={addStudent}
                        disabled={recording}
                        className="text-xs text-purple-400 hover:text-purple-300 disabled:opacity-40 font-semibold"
                      >
                        + Add
                      </button>
                    </div>
                    <div className="space-y-2">
                      {students.map((s, idx) => (
                        <div key={idx} className="flex gap-1.5 items-center w-full">
                          <div
                            className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-white font-bold"
                            style={{ background: SPEAKER_COLORS[idx % SPEAKER_COLORS.length], fontSize: "9px" }}
                          >
                            {idx + 1}
                          </div>
                          <input
                            value={s.name}
                            onChange={(e) => updateStudent(idx, "name", e.target.value)}
                            placeholder="Name"
                            disabled={recording}
                            className="min-w-0 flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 disabled:opacity-50"
                          />
                          <input
                            value={s.id}
                            onChange={(e) => updateStudent(idx, "id", e.target.value)}
                            placeholder="ID"
                            disabled={recording}
                            className="w-16 shrink-0 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none disabled:opacity-50"
                          />
                          {students.length > 1 && !recording ? (
                            <button
                              type="button"
                              onClick={() => removeStudent(idx)}
                              className="shrink-0 w-6 h-6 flex items-center justify-center rounded-full bg-red-500/20 text-red-400 hover:bg-red-500/40 transition text-xs font-bold"
                            >
                              ✕
                            </button>
                          ) : (
                            <div className="shrink-0 w-6" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {!recording ? (
                    <button
                      onClick={startLiveRecording}
                      disabled={uploading || polling}
                      className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                    >
                      🔴 Start Recording
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-xl">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                          <span className="text-red-400 text-sm font-mono font-bold">
                            {formatTime(recordSeconds)}
                          </span>
                        </div>
                        <button
                          onClick={stopLiveRecording}
                          className="px-3 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition"
                        >
                          ⏹ Stop & Analyze
                        </button>
                      </div>
                      <p className="text-slate-400 text-xs">Tap when a student starts speaking:</p>
                      <div className="space-y-2">
                        {students.filter((s) => s.name.trim()).map((s, idx) => (
                          <button
                            key={idx}
                            onClick={() => markStudent(idx)}
                            className="w-full py-3 rounded-xl font-bold text-sm transition flex items-center gap-3 px-4"
                            style={{
                              background: activeStudent === idx ? SPEAKER_COLORS[idx % SPEAKER_COLORS.length] + "33" : "rgba(255,255,255,0.05)",
                              border: `2px solid ${SPEAKER_COLORS[idx % SPEAKER_COLORS.length]}${activeStudent === idx ? "99" : "33"}`,
                              color: SPEAKER_COLORS[idx % SPEAKER_COLORS.length],
                              transform: activeStudent === idx ? "scale(1.03)" : "scale(1)",
                            }}
                          >
                            <span
                              className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-xs shrink-0"
                              style={{ background: SPEAKER_COLORS[idx % SPEAKER_COLORS.length] }}
                            >
                              {idx + 1}
                            </span>
                            <span className="flex-1 text-left truncate">
                              {s.name}
                              {s.id && <span className="text-xs opacity-60 ml-1">({s.id})</span>}
                            </span>
                            {activeStudent === idx && (
                              <span className="text-xs animate-pulse shrink-0">🎤 Speaking</span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {polling && (
                <div className="text-center text-blue-400 text-xs animate-pulse">
                  🔄 Processing... checking every 8s
                </div>
              )}
            </div>

            {/* SPEAKING LOG */}
            {timestamps.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <h3 className="text-white font-bold text-sm">⏱ Speaking Log</h3>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-white/5">
                  {timestamps.map((t, i) => (
                    <div key={i} className="p-2.5 flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: SPEAKER_COLORS[t.studentIdx % SPEAKER_COLORS.length] }} />
                      <span className="text-white text-xs font-medium truncate">{t.studentName}</span>
                      <span className="text-slate-500 text-xs ml-auto font-mono shrink-0">{formatTime(t.time)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* PAST SESSIONS */}
            {sessions.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                <div className="p-3 border-b border-white/10">
                  <h3 className="text-white font-bold text-sm">📂 Past Sessions</h3>
                </div>
                <div className="max-h-48 overflow-y-auto divide-y divide-white/5">
                  {sessions.map((s) => (
                    <div
                      key={s.job_id}
                      onClick={() => loadSession(s)}
                      className={`p-3 cursor-pointer transition hover:bg-white/5 ${
                        selectedSession?.job_id === s.job_id ? "bg-purple-500/10 border-l-2 border-purple-500" : ""
                      }`}
                    >
                      <div className="text-white text-xs font-medium truncate">{s.session_title}</div>
                      {s.room_code && (
                        <div className="text-purple-400 text-xs font-mono">{s.room_code}</div>
                      )}
                      <div className="text-slate-500 text-xs uppercase">{s.language}</div>
                      <div className="text-slate-600 text-xs">{new Date(s.saved_at).toLocaleDateString()}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT RESULTS */}
          <div className="lg:col-span-3 space-y-5">

            {!jobData && !polling && (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-6xl mb-4">{tab === "live" ? "🎤" : "🎭"}</div>
                <p className="text-slate-400 text-lg">
                  {tab === "live" ? "Add students, then press Start Recording" : "Upload a debate audio file to get started"}
                </p>

                {/* FLOW GUIDE */}
                <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-3 text-left">
                  {[
                    { step: "1", icon: "🔑", title: "Create Room", desc: "Enter title → click Create Room Code" },
                    { step: "2", icon: "📢", title: "Share Code", desc: "Students go to Join Debate → enter code" },
                    { step: "3", icon: "🎙", title: "Record", desc: "Upload or record the debate audio" },
                    { step: "4", icon: "📨", title: "Send Reports", desc: "Tag each speaker → send individual reports" },
                  ].map(({ step, icon, title, desc }) => (
                    <div key={step} className="bg-white/5 rounded-2xl p-4">
                      <div className="text-2xl mb-2">{icon}</div>
                      <div className="text-white font-bold text-sm mb-1">
                        <span className="text-purple-400 mr-1">{step}.</span>{title}
                      </div>
                      <div className="text-slate-500 text-xs">{desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {polling && !jobData && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-2xl p-12 text-center">
                <div className="text-5xl mb-4 animate-spin">⏳</div>
                <p className="text-blue-400 text-lg font-semibold animate-pulse">Analyzing debate audio...</p>
                <p className="text-slate-500 text-sm mt-2">Whisper transcribing · Diarization separating speakers</p>
                <p className="text-slate-600 text-xs mt-3">May take 1–5 minutes</p>
              </div>
            )}

            {jobData && (
              <>
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <h2 className="text-white font-bold text-xl">{sessionTitle || "Debate Session"}</h2>
                      <p className="text-slate-400 text-sm mt-0.5">
                        {speakers.length} speakers · <span className="uppercase">{jobData.language}</span>
                        {roomCode && <span className="ml-2 text-purple-400 font-mono text-xs">{roomCode}</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 text-green-400 text-xs font-bold">
                        ✓ Analysis Complete
                      </span>
                      <span className="text-slate-500 text-xs">
                        {Object.values(tags).filter(Boolean).length}/{speakers.length} tagged
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                    <p className="text-blue-300 text-xs">
                      <span className="font-bold">How to send reports:</span> Enter Student ID → click Tag → click Send Report → student sees it in their dashboard under "Reports from Teacher".
                    </p>
                  </div>
                </div>

                {jobData.transcription && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-2">📝 Full Transcription</h3>
                    <p className="text-slate-300 text-sm leading-relaxed max-h-28 overflow-y-auto">{jobData.transcription}</p>
                  </div>
                )}

                {jobData.scores?.summary && (
                  <div className="bg-white/5 border border-purple-500/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-2">🤖 AI Summary</h3>
                    <p className="text-slate-300 text-sm">{jobData.scores.summary}</p>
                  </div>
                )}

                <div className="space-y-4">
                  <h2 className="text-white font-bold text-lg">👥 Speakers — Tag & Send Reports</h2>

                  {speakers.length === 0 && (
                    <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500">
                      No speakers detected. Audio may be too short or diarization unavailable.
                    </div>
                  )}

                  {speakers.map((speaker, idx) => {
                    const score  = getSpeakerScore(speaker);
                    const color  = SPEAKER_COLORS[idx % SPEAKER_COLORS.length];
                    const tagged = tags[speaker];
                    const isSent = sentSpeakers.has(speaker);
                    const matchTs = timestamps[idx];
                    const matchedParticipant = participants[idx];

                    return (
                      <div
                        key={speaker}
                        className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden"
                        style={{ borderLeftColor: color, borderLeftWidth: 4 }}
                      >
                        <div className="p-5 flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-white shrink-0"
                              style={{ background: color + "33", border: `2px solid ${color}` }}
                            >
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-white font-bold text-lg">{speaker}</div>
                              <div className="text-slate-500 text-xs">
                                {(jobData.diarization || []).filter((s) => s.speaker === speaker).length} segments ·{" "}
                                {Math.round((jobData.diarization || []).filter((s) => s.speaker === speaker).reduce((a, s) => a + (s.end - s.start), 0))}s speaking
                                {matchTs && <span className="ml-2 text-slate-600">· marked @ {formatTime(matchTs.time)} ({matchTs.studentName})</span>}
                                {matchedParticipant && !matchTs && (
                                  <span className="ml-2 text-purple-500">· joined as {matchedParticipant.student_name}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {score && (
                            <div className="text-center px-4 py-2 rounded-xl shrink-0" style={{ background: color + "15", border: `1px solid ${color}44` }}>
                              <div className="text-2xl font-black" style={{ color }}>{score.overall_score ?? "—"}</div>
                              <div className="text-xs text-slate-400">Overall</div>
                            </div>
                          )}
                        </div>

                        {score && (
                          <div className="px-5 pb-3 grid grid-cols-3 md:grid-cols-6 gap-2">
                            {METRICS.map((key) => (
                              <div key={key} className="bg-white/5 rounded-xl p-2 text-center">
                                <div className="text-slate-500 text-xs capitalize mb-0.5">{key.slice(0, 5)}</div>
                                <div className="text-base font-bold" style={{ color: scoreColor(score[key]) }}>{score[key] ?? "—"}</div>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="px-5 pb-3">
                          <div className="flex flex-wrap gap-1">
                            {(jobData.diarization || []).filter((s) => s.speaker === speaker).map((seg, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full" style={{ background: color + "20", color }}>
                                {seg.start}s–{seg.end}s
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="px-5 pb-5 pt-4 border-t border-white/5">
                          {!tagged ? (
                            <div className="flex gap-2 items-center mb-3 flex-wrap">
                              <span className="text-slate-500 text-xs shrink-0">Step 1:</span>
                              <input
                                value={tagInputs[speaker] || ""}
                                onChange={(e) => setTagInputs((prev) => ({ ...prev, [speaker]: e.target.value }))}
                                onKeyDown={(e) => e.key === "Enter" && tagSpeaker(speaker)}
                                placeholder={matchedParticipant ? `e.g. ${matchedParticipant.student_id}` : "Enter Student ID"}
                                className="flex-1 min-w-36 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 text-sm"
                              />
                              {matchedParticipant && (
                                <button
                                  onClick={() => setTagInputs((prev) => ({ ...prev, [speaker]: matchedParticipant.student_id }))}
                                  className="text-xs px-2 py-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/40 transition shrink-0"
                                >
                                  Use {matchedParticipant.student_id}
                                </button>
                              )}
                              <button
                                onClick={() => tagSpeaker(speaker)}
                                className="px-4 py-2 rounded-xl text-sm font-bold transition shrink-0"
                                style={{ background: color + "33", color, border: `1px solid ${color}55` }}
                              >
                                🏷 Tag
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 mb-3 flex-wrap">
                              <span className="text-slate-500 text-xs shrink-0">Tagged:</span>
                              <span className="px-3 py-1.5 rounded-xl text-sm font-bold" style={{ background: color + "20", color, border: `1px solid ${color}44` }}>
                                👤 {tagged}
                              </span>
                              <button onClick={() => setTags((prev) => ({ ...prev, [speaker]: null }))} className="text-slate-500 text-xs hover:text-red-400 transition">
                                ✕ Untag
                              </button>
                            </div>
                          )}

                          <div className="flex gap-2 flex-wrap">
                            <span className="text-slate-500 text-xs shrink-0 self-center">Step 2:</span>
                            <button
                              onClick={() => handleSendReport(speaker)}
                              disabled={!tagged || sending === speaker || isSent}
                              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition ${
                                isSent ? "bg-green-600/20 border border-green-500/30 text-green-400"
                                : tagged ? "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:opacity-90"
                                : "bg-white/5 border border-white/10 text-slate-600 cursor-not-allowed"
                              } disabled:opacity-50`}
                            >
                              {isSent ? "✅ Sent to " + tagged : sending === speaker ? "⏳ Sending..." : "📨 Send Report to Student"}
                            </button>
                            <button
                              onClick={() => handleDownloadPDF(speaker)}
                              disabled={!score}
                              className="px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 text-sm font-bold transition disabled:opacity-40"
                            >
                              📥 PDF
                            </button>
                          </div>

                          {isSent && (
                            <div className="mt-3 p-2.5 bg-green-500/10 border border-green-500/20 rounded-xl">
                              <p className="text-green-400 text-xs">
                                ✅ <span className="font-bold">{tagged}</span> will see this in their "Reports from Teacher" section when they log in.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {speakers.length > 0 && Object.values(tags).some(Boolean) && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">📨 Send All Tagged Reports at Once</h3>
                    <div className="flex flex-wrap gap-2 mb-4">
                      {speakers.filter((s) => tags[s]).map((s) => (
                        <div key={s} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-sm">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SPEAKER_COLORS[speakers.indexOf(s) % SPEAKER_COLORS.length] }} />
                          <span className="text-slate-400 text-xs">{s}</span>
                          <span className="text-white font-bold text-xs">→ {tags[s]}</span>
                          {sentSpeakers.has(s) && <span className="text-green-400 text-xs">✓</span>}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={async () => {
                        for (const sp of speakers.filter((s) => tags[s] && !sentSpeakers.has(s))) {
                          await handleSendReport(sp);
                        }
                      }}
                      disabled={sending !== null}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white font-bold transition disabled:opacity-50"
                    >
                      {sending ? "⏳ Sending..." : "📨 Send All Reports to Students"}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl ${
          toast.type === "err" ? "bg-red-600" : "bg-green-600"
        }`}>
          {toast.msg}
        </div>
      )}
    </TeacherLayout>
  );
}