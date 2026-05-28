import { useState, useEffect, useRef } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { useAuth } from "../../context/AuthContext";
import { uploadAudio, getStudentStatus, deleteAudio } from "../../services/audioService";
import { getNotifications, markAllRead } from "../../services/notificationService";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";
import { sendReportToStudent } from "../../services/reportService";
import { generateSessionReport } from "../../utils/reportGenerator";

const LANGUAGES = [
  { code: "hi", label: "Hindi" },
  { code: "te", label: "Telugu" },
  { code: "en", label: "English" },
  { code: "ta", label: "Tamil" },
  { code: "kn", label: "Kannada" },
  { code: "mr", label: "Marathi" },
];

const METRICS = ["pronunciation","fluency","grammar","confidence","clarity","communication"];

export default function TeacherDashboard() {
  const { user } = useAuth();
  const [studentId, setStudentId]       = useState("");
  const [language, setLanguage]         = useState("en");
  const [file, setFile]                 = useState(null);
  const [uploading, setUploading]       = useState(false);
  const [submissions, setSubmissions]   = useState(() =>
    JSON.parse(localStorage.getItem("teacher_submissions") || "[]")
  );
  const [selected, setSelected]         = useState(null);
  const [search, setSearch]             = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [notifications, setNotifications] = useState([]);
  const [unread, setUnread]             = useState(0);
  const [recording, setRecording]       = useState(false);
  const [toast, setToast]               = useState(null);
  const [sending, setSending]           = useState(false);
  const [sentIds, setSentIds]           = useState(new Set());

  const mediaRef  = useRef(null);
  const chunksRef = useRef([]);
  const pollRef   = useRef(null);

  useEffect(() => {
    fetchNotifications();
    pollActiveSubmissions();
    return () => clearInterval(pollRef.current);
  }, []);

  // ── AUTO-SYNC PENDING JOBS FROM BACKEND ────────────────────────────────────
  function pollActiveSubmissions() {
    clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const current = JSON.parse(localStorage.getItem("teacher_submissions") || "[]");
      const active  = current.filter((s) => s.status === "pending" || s.status === "processing");
      if (active.length === 0) { clearInterval(pollRef.current); return; }

      const studentIds = [...new Set(active.map((s) => s.student_id))];
      let updated = [...current];

      for (const sid of studentIds) {
        try {
          const records = await getStudentStatus(sid);
          records.forEach((r) => {
            const idx = updated.findIndex((s) => s.job_id === r.job_id);
            if (idx >= 0) {
              updated[idx] = {
                ...updated[idx],
                status:        r.status,
                transcription: r.transcription,
                diarization:   r.diarization,
                scores:        r.scores,
              };
            }
          });
        } catch (e) {}
      }

      localStorage.setItem("teacher_submissions", JSON.stringify(updated));
      setSubmissions([...updated]);

      // If selected session was pending and now completed, update it too
      setSelected((prev) => {
        if (!prev) return prev;
        const fresh = updated.find((s) => s.job_id === prev.job_id);
        return fresh || prev;
      });

      fetchNotifications();
    }, 10000);
  }

  // ── MANUAL REFRESH ────────────────────────────────────────────────────────
  async function handleRefresh() {
    const current    = JSON.parse(localStorage.getItem("teacher_submissions") || "[]");
    const studentIds = [...new Set(current.map((s) => s.student_id))];
    let updated      = [...current];

    for (const sid of studentIds) {
      try {
        const records = await getStudentStatus(sid);
        records.forEach((r) => {
          const idx = updated.findIndex((s) => s.job_id === r.job_id);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              status:        r.status,
              transcription: r.transcription,
              diarization:   r.diarization,
              scores:        r.scores,
            };
          }
        });
      } catch (e) {}
    }

    localStorage.setItem("teacher_submissions", JSON.stringify(updated));
    setSubmissions([...updated]);

    // Also refresh selected panel
    setSelected((prev) => {
      if (!prev) return prev;
      const fresh = updated.find((s) => s.job_id === prev.job_id);
      return fresh || prev;
    });

    showToast("Synced latest results from backend");
    pollActiveSubmissions();
  }

  async function fetchNotifications() {
    try {
      const data = await getNotifications("teacher");
      setNotifications(data);
      setUnread(data.filter((n) => !n.is_read).length);
    } catch (e) {}
  }

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  function saveSubmissions(data) {
    localStorage.setItem("teacher_submissions", JSON.stringify(data));
    setSubmissions(data);
  }

  // ── RECORD ────────────────────────────────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      chunksRef.current = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunksRef.current.push(e.data);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const f    = new File([blob], `rec_${Date.now()}.webm`, { type: "audio/webm" });
        setFile(f);
        stream.getTracks().forEach((t) => t.stop());
        showToast("Recording ready — click Upload & Analyze");
      };
      mr.start();
      mediaRef.current = mr;
      setRecording(true);
    } catch (e) {
      showToast("Microphone access denied", "err");
    }
  }

  function stopRecording() {
    mediaRef.current?.stop();
    setRecording(false);
  }

  // ── UPLOAD ────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!studentId.trim()) return showToast("Enter a Student ID first", "err");
    if (!file)             return showToast("Select or record an audio file", "err");
    setUploading(true);
    try {
      const data  = await uploadAudio(file, studentId.trim(), language);
      const entry = {
        job_id:        data.job_id,
        student_id:    studentId.trim(),
        filename:      file.name,
        language,
        status:        "pending",
        transcription: null,
        diarization:   null,
        scores:        null,
        submitted:     new Date().toLocaleString(),
      };
      saveSubmissions([entry, ...submissions]);
      showToast(`Uploaded! Job #${data.job_id} queued — auto-syncing every 10s`);
      setFile(null);
      setStudentId("");
      pollActiveSubmissions();
    } catch (e) {
      showToast(e.response?.data?.detail || "Upload failed", "err");
    } finally {
      setUploading(false);
    }
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  async function handleDelete(jobId) {
    try {
      await deleteAudio(jobId);
      const updated = submissions.filter((s) => s.job_id !== jobId);
      saveSubmissions(updated);
      if (selected?.job_id === jobId) setSelected(null);
      showToast("Deleted successfully");
    } catch (e) {
      showToast("Delete failed", "err");
    }
  }

  // ── SEND REPORT ── THE KEY FIX: scores is the raw object, not rawScores.overall ──
  async function handleSendReport(submission) {
    if (!submission) return;
    setSending(true);
    try {
      // Parse the scores JSON string safely
      let rawScores = null;
      try {
        rawScores = submission.scores ? JSON.parse(submission.scores) : null;
      } catch {}

      // rawScores IS the scores object — it contains overall_score, pronunciation etc.
      // NOT rawScores.overall — that field doesn't exist
      const reportData = {
        session:        submission.job_id,
        student_id:     submission.student_id,
        language:       submission.language || "en",
        filename:       submission.filename || "",
        transcription:  submission.transcription || "",
        scores:         rawScores,             // ← FIXED: pass the whole object
        summary:        rawScores?.summary || "",
        corrections:    rawScores?.corrections || [],
        corrected_text: rawScores?.corrected_text || "",
        sent_at:        new Date().toISOString(),
      };

      await sendReportToStudent(
        submission.student_id,
        user?.name || "Teacher",
        reportData,
        "session",
        submission.job_id
      );

      setSentIds((prev) => new Set([...prev, submission.job_id]));
      showToast(`Report sent to ${submission.student_id} ✓`);
    } catch (e) {
      console.error("Send report error:", e?.response?.data || e);
      showToast(e?.response?.data?.detail || "Failed to send report — check console", "err");
    } finally {
      setSending(false);
    }
  }

  // ── DOWNLOAD PDF ──────────────────────────────────────────────────────────
  function handleDownloadPDF(submission) {
    let raw = null;
    try { raw = submission.scores ? JSON.parse(submission.scores) : null; } catch {}
    const scores = parseScores(submission.scores);
    generateSessionReport({
      session:       submission.job_id,
      language:      submission.language,
      filename:      submission.filename,
      transcription: submission.transcription,
      _rawScores:    raw,
      ...(scores || {}),
      overall_score: scores?.overall_score,
    }, submission.student_id, submission.student_id);
  }

  // ── FILTER ────────────────────────────────────────────────────────────────
  const filtered = submissions.filter((s) => {
    const q      = search.toLowerCase();
    const matchQ = !q || s.student_id.toLowerCase().includes(q) || s.filename.toLowerCase().includes(q);
    const matchF = filterStatus === "all" || s.status === filterStatus;
    return matchQ && matchF;
  });

  const completedCount  = submissions.filter((s) => s.status === "completed").length;
  const processingCount = submissions.filter((s) => s.status === "pending" || s.status === "processing").length;
  const studentsCount   = [...new Set(submissions.map((s) => s.student_id))].length;

  // Parse selected scores for detail panel
  const selectedScores = selected ? parseScores(selected.scores) : null;
  let selectedRaw = null;
  try { selectedRaw = selected?.scores ? JSON.parse(selected.scores) : null; } catch {}

  return (
    <TeacherLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">Teacher Dashboard 👨‍🏫</h1>
            <p className="text-slate-400 mt-1">Upload individual student audio and track performance</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleRefresh}
              className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 text-sm transition"
            >
              ↻ Sync Results
            </button>
            <button
              onClick={async () => {
                await markAllRead("teacher");
                setUnread(0);
                setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
              }}
              className="relative p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition"
            >
              <span className="text-2xl">🔔</span>
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {unread}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* INFO BANNER */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-blue-300 text-sm font-semibold">Single student upload</p>
            <p className="text-slate-400 text-xs mt-0.5">
              This page is for uploading audio for one student at a time. For multi-speaker debates →{" "}
              <a href="/teacher/debates" className="text-cyan-400 underline font-semibold">Debate Sessions</a>
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students",    value: studentsCount,      color: "#22d3ee" },
            { label: "Total Submissions", value: submissions.length, color: "#a78bfa" },
            { label: "Completed",         value: completedCount,     color: "#22c55e" },
            { label: "Processing",        value: processingCount,    color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* UPLOAD PANEL */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
            <h2 className="text-xl font-bold text-white">⬆ Upload Audio</h2>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">Student ID</label>
              <input
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                placeholder="e.g. STU71E02F"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition text-sm"
              />
              <p className="text-slate-600 text-xs mt-1">
                Find IDs in the{" "}
                <a href="/teacher/students" className="text-purple-400 underline">Students page</a>
              </p>
            </div>

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">Language</label>
              <div className="flex flex-wrap gap-2">
                {LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    onClick={() => setLanguage(l.code)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
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

            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">Audio File</label>
              <input
                type="file"
                accept=".mp3,.wav,.m4a,.flac,.ogg,.webm,.mp4"
                onChange={(e) => setFile(e.target.files[0])}
                className="w-full text-slate-400 text-xs file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:bg-purple-600 file:text-white file:cursor-pointer"
              />
              {file && <p className="text-green-400 text-xs mt-1">✅ {file.name}</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={startRecording}
                disabled={recording}
                className="flex-1 py-2 rounded-xl bg-red-600/80 hover:bg-red-600 disabled:opacity-40 text-white text-sm font-medium transition"
              >
                {recording ? "🔴 Recording..." : "⏺ Record"}
              </button>
              <button
                onClick={stopRecording}
                disabled={!recording}
                className="flex-1 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-40 text-white text-sm font-medium transition"
              >
                ⏹ Stop
              </button>
            </div>

            <button
              onClick={handleUpload}
              disabled={uploading || !file || !studentId.trim()}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold transition"
            >
              {uploading ? "⏳ Uploading..." : "Upload & Analyze"}
            </button>
          </div>

          {/* SUBMISSIONS TABLE */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
              <h2 className="text-white font-bold flex-1">🎓 Student Submissions</h2>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search..."
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500 w-32"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs focus:outline-none"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <button
                onClick={handleRefresh}
                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-slate-400 text-xs hover:bg-white/10"
              >
                ↻ Refresh
              </button>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 sticky top-0 bg-slate-900/80">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">File</th>
                    <th className="text-left p-3">Lang</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Score</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center text-slate-500 py-10">No submissions yet</td>
                    </tr>
                  ) : (
                    filtered.map((s) => {
                      const scores  = parseScores(s.scores);
                      const overall = scores?.overall_score ?? null;
                      return (
                        <tr
                          key={s.job_id}
                          onClick={() => setSelected(s)}
                          className={`border-b border-white/5 hover:bg-white/5 transition cursor-pointer ${
                            selected?.job_id === s.job_id ? "bg-purple-500/10 border-l-2 border-purple-500" : ""
                          }`}
                        >
                          <td className="p-3 text-cyan-400 font-mono text-xs">{s.student_id}</td>
                          <td className="p-3 text-slate-400 text-xs max-w-[120px] truncate" title={s.filename}>{s.filename}</td>
                          <td className="p-3 text-slate-500 text-xs uppercase">{s.language}</td>
                          <td className="p-3">
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                              s.status === "completed"    ? "border-green-500/40 text-green-400 bg-green-500/10"
                              : s.status === "processing" ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                              : s.status === "failed"     ? "border-red-500/40 text-red-400 bg-red-500/10"
                              : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                            }`}>
                              {s.status}
                            </span>
                          </td>
                          <td className="p-3">
                            {overall !== null
                              ? <span className="font-bold text-sm" style={{ color: scoreColor(overall) }}>{overall}</span>
                              : <span className="text-slate-600">—</span>}
                          </td>
                          <td className="p-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex gap-2">
                              <button
                                onClick={() => setSelected(s)}
                                className="text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 transition"
                              >
                                View
                              </button>
                              <button
                                onClick={() => handleDelete(s.job_id)}
                                className="text-xs px-2 py-1 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 transition"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* ── DETAIL PANEL ── */}
        {selected && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-white font-bold text-lg">
                  🔬 {selected.student_id} — Analysis
                </h2>
                <p className="text-slate-500 text-xs mt-0.5 uppercase">
                  {selected.language} · {selected.filename}
                </p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-sm">
                ✕ Close
              </button>
            </div>

            {selectedScores ? (
              <>
                {/* SCORE GRID */}
                <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                  {METRICS.map((key) => {
                    const val = selectedScores[key];
                    return (
                      <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-3 text-center">
                        <div className="text-slate-400 text-xs capitalize mb-1">{key}</div>
                        <div className="text-2xl font-bold" style={{ color: scoreColor(val) }}>
                          {val ?? "—"}
                        </div>
                        <div className="mt-1.5 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${val ?? 0}%`, background: scoreColor(val) }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* OVERALL SCORE BANNER */}
                <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-xl p-4">
                  <div>
                    <div className="text-slate-400 text-xs mb-0.5">Overall Score</div>
                    <div className="text-4xl font-black" style={{ color: scoreColor(selectedScores.overall_score) }}>
                      {selectedScores.overall_score ?? "—"}
                    </div>
                  </div>
                  <div className="flex-1 h-3 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${selectedScores.overall_score ?? 0}%`,
                        background: scoreColor(selectedScores.overall_score),
                      }}
                    />
                  </div>
                  <div className="text-sm font-bold" style={{ color: scoreColor(selectedScores.overall_score) }}>
                    {selectedScores.overall_score >= 80 ? "Excellent"
                      : selectedScores.overall_score >= 60 ? "Good"
                      : selectedScores.overall_score >= 40 ? "Average"
                      : "Needs Work"}
                  </div>
                </div>

                {/* PRONUNCIATION CORRECTIONS — wrong → right */}
                {selectedRaw?.corrections?.length > 0 && (
                  <div className="bg-white/5 border border-red-500/20 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-3">
                      ⚠️ Pronunciation Corrections ({selectedRaw.corrections.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedRaw.corrections.map((c, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-lg p-3 text-sm flex-wrap"
                        >
                          {/* WRONG */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-red-500 uppercase tracking-wider font-bold">Wrong</span>
                            <span className="text-red-400 line-through font-mono font-bold">{c.wrong}</span>
                          </div>

                          <span className="text-slate-500 text-lg">→</span>

                          {/* RIGHT */}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-green-500 uppercase tracking-wider font-bold">Right</span>
                            <span className="text-green-400 font-mono font-bold">{c.correct}</span>
                          </div>

                          {/* CONTEXT */}
                          {c.context && (
                            <span className="text-slate-500 text-xs ml-auto italic">
                              "...{c.context}..."
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* CORRECTED TEXT */}
                    {selectedRaw?.corrected_text && (
                      <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-lg">
                        <div className="text-green-400 text-xs font-bold uppercase tracking-wider mb-1.5">
                          ✅ Corrected Version
                        </div>
                        <p className="text-slate-300 text-sm leading-relaxed">
                          {selectedRaw.corrected_text}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* AI SUMMARY — shown AFTER corrections */}
                {selectedRaw?.summary && (
                  <div className="bg-white/5 border border-purple-500/20 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-2">🤖 AI Summary</h3>
                    <p className="text-slate-300 text-sm leading-relaxed">{selectedRaw.summary}</p>
                  </div>
                )}

                {/* TRANSCRIPTION */}
                {selected.transcription && (
                  <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                    <h3 className="text-white font-bold mb-2">📝 Transcription</h3>
                    <p
                      className="text-slate-300 text-sm leading-relaxed"
                      style={{
                        fontFamily:
                          "'Noto Sans Telugu', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Kannada', 'Inter', sans-serif",
                      }}
                    >
                      {selected.transcription}
                    </p>
                  </div>
                )}

                {/* ACTION BUTTONS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSendReport(selected)}
                    disabled={sending || sentIds.has(selected.job_id)}
                    className={`w-full py-3 rounded-xl font-bold text-sm transition flex items-center justify-center gap-2 ${
                      sentIds.has(selected.job_id)
                        ? "bg-green-600/20 border border-green-500/30 text-green-400 cursor-default"
                        : "bg-gradient-to-r from-violet-600 to-cyan-600 text-white hover:opacity-90"
                    } disabled:opacity-50`}
                  >
                    {sentIds.has(selected.job_id)
                      ? "✅ Report Sent to " + selected.student_id
                      : sending
                      ? "⏳ Sending..."
                      : "📨 Send Report to Student (" + selected.student_id + ")"}
                  </button>

                  <button
                    onClick={() => handleDownloadPDF(selected)}
                    className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-sm transition flex items-center justify-center gap-2"
                  >
                    📥 Download PDF
                  </button>
                </div>

                {/* SENT CONFIRMATION */}
                {sentIds.has(selected.job_id) && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                    <p className="text-green-400 text-xs">
                      ✅ Report saved to database —{" "}
                      <span className="font-bold">{selected.student_id}</span> will see it in their
                      "Reports from Teacher" section when they log in.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-10 text-slate-500">
                {selected.status === "processing" || selected.status === "pending"
                  ? (
                    <div>
                      <div className="text-4xl mb-3 animate-spin">⏳</div>
                      <p>Analysis in progress...</p>
                      <p className="text-xs mt-2 text-slate-600">Click ↻ Sync Results to check for updates</p>
                    </div>
                  )
                  : selected.status === "failed"
                  ? "❌ Processing failed — try re-uploading"
                  : "⏳ Waiting to be processed"}
              </div>
            )}
          </div>
        )}

        {/* NOTIFICATIONS */}
        {notifications.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">🔔 Recent Notifications</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.slice(0, 10).map((n) => (
                <div
                  key={n.id}
                  className={`p-3 rounded-xl border text-sm ${
                    n.is_read
                      ? "border-white/10 text-slate-500"
                      : "border-purple-500/30 text-slate-300 bg-purple-500/5"
                  }`}
                >
                  {!n.is_read && (
                    <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2" />
                  )}
                  {n.message}
                  <span className="text-slate-600 text-xs ml-2">
                    {new Date(n.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
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