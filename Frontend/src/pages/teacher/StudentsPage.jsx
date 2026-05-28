import { useState, useEffect } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";
import { getStudentStatus } from "../../services/audioService";
import { sendReportToStudent } from "../../services/reportService";
import { parseScores, scoreColor, scoreLabel } from "../../utils/scoreHelpers";
import { generateSessionReport, generateOverallReport } from "../../utils/reportGenerator";

export default function StudentsPage() {
  const { user } = useAuth();
  const [students, setStudents]       = useState([]);
  const [loading, setLoading]         = useState(true);
  const [selected, setSelected]       = useState(null);
  const [sessions, setSessions]       = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [search, setSearch]           = useState("");
  const [sending, setSending]         = useState(false);
  const [toast, setToast]             = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  useEffect(() => { fetchStudents(); }, []);

  async function fetchStudents() {
    setLoading(true);
    try {
      const response = await API.get("/auth/students");
      setStudents(response.data);
    } catch (e) {
      // Fallback: pull from submissions in localStorage
      const subs = JSON.parse(localStorage.getItem("teacher_submissions") || "[]");
      const ids  = [...new Set(subs.map((s) => s.student_id))];
      const fallback = ids.map((id) => ({
        student_id: id,
        name: id,
        email: "—",
        role: "student",
        created_at: null,
      }));
      setStudents(fallback);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSessions(studentId) {
    setSessionsLoading(true);
    setSessions([]);
    try {
      const data = await getStudentStatus(studentId);
      setSessions(data);
    } catch (e) {
      setSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  }

  function handleSelectStudent(s) {
    setSelected(s);
    fetchSessions(s.student_id);
  }

  async function handleSendSessionReport(session, idx) {
    setSending(true);
    try {
      let rawScores = null;
      try { rawScores = session.scores ? JSON.parse(session.scores) : null; } catch {}

      await sendReportToStudent(
        selected.student_id,
        user?.name || "Teacher",
        {
          session:        session.job_id,
          student_id:     selected.student_id,
          language:       session.language,
          filename:       session.filename,
          transcription:  session.transcription,
          scores:         rawScores?.overall || null,
          summary:        rawScores?.summary || "",
          corrections:    rawScores?.corrections || [],
          corrected_text: rawScores?.corrected_text || "",
          sent_at:        new Date().toISOString(),
        },
        "session",
        session.job_id
      );
      showToast(`Session #${idx + 1} report sent to ${selected.student_id}`);
    } catch (e) {
      showToast("Failed to send report", "err");
    } finally {
      setSending(false);
    }
  }

  async function handleSendOverallReport() {
    if (!selected || sessions.length === 0) return;
    setSending(true);
    try {
      const completed = sessions.filter((s) => s.status === "completed");
      const avgScore = completed.length
        ? Math.round(completed.reduce((a, s) => {
            const sc = parseScores(s.scores);
            return a + (sc?.overall_score ?? 0);
          }, 0) / completed.length)
        : 0;

      await sendReportToStudent(
        selected.student_id,
        user?.name || "Teacher",
        {
          student_id:    selected.student_id,
          total_sessions: sessions.length,
          completed:     completed.length,
          avg_score:     avgScore,
          sessions:      completed.map((s, i) => ({
            session:      i + 1,
            language:     s.language,
            scores:       parseScores(s.scores),
            transcription: s.transcription,
          })),
          sent_at: new Date().toISOString(),
        },
        "overall",
        null
      );
      showToast(`Overall report sent to ${selected.student_id}`);
    } catch (e) {
      showToast("Failed to send overall report", "err");
    } finally {
      setSending(false);
    }
  }

  function handleDownloadOverall() {
    if (!selected || sessions.length === 0) return;
    const completed = sessions
      .filter((s) => s.status === "completed")
      .map((s, i) => {
        let raw = null;
        try { raw = s.scores ? JSON.parse(s.scores) : null; } catch {}
        return {
          session: i + 1,
          language: s.language,
          filename: s.filename,
          transcription: s.transcription,
          _rawScores: raw,
          ...parseScores(s.scores),
          overall_score: parseScores(s.scores)?.overall_score,
        };
      });
    generateOverallReport(completed, selected.name || selected.student_id, selected.student_id);
  }

  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return !q || s.student_id?.toLowerCase().includes(q) || s.name?.toLowerCase().includes(q) || s.email?.toLowerCase().includes(q);
  });

  const completedSessions = sessions.filter((s) => s.status === "completed");
  const avgScore = completedSessions.length
    ? Math.round(completedSessions.reduce((a, s) => a + (parseScores(s.scores)?.overall_score ?? 0), 0) / completedSessions.length)
    : null;

  return (
    <TeacherLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-bold text-white">👨‍🎓 Students</h1>
          <p className="text-slate-400 mt-1">All registered students with their session history</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* STUDENT LIST */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                onClick={fetchStudents}
                className="text-slate-400 hover:text-white text-sm transition"
              >
                ↻
              </button>
            </div>

            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading students...</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-slate-500 text-sm">No students found</p>
              </div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {filtered.map((s) => (
                  <div
                    key={s.student_id}
                    onClick={() => handleSelectStudent(s)}
                    className={`p-4 cursor-pointer transition ${
                      selected?.student_id === s.student_id
                        ? "bg-purple-500/10 border-l-2 border-purple-500"
                        : "hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                        {(s.name || s.student_id || "?")[0].toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-sm font-medium truncate">
                          {s.name || s.student_id}
                        </div>
                        <div className="text-slate-500 text-xs font-mono">{s.student_id}</div>
                        {s.email && s.email !== "—" && (
                          <div className="text-slate-600 text-xs truncate">{s.email}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* STUDENT DETAIL */}
          <div className="lg:col-span-2 space-y-5">
            {!selected ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-16 text-center">
                <div className="text-5xl mb-4">👈</div>
                <p className="text-slate-400">Select a student to view their sessions</p>
              </div>
            ) : (
              <>
                {/* STUDENT HEADER */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-600 to-cyan-600 flex items-center justify-center text-white font-black text-xl">
                        {(selected.name || selected.student_id || "?")[0].toUpperCase()}
                      </div>
                      <div>
                        <h2 className="text-white font-bold text-xl">
                          {selected.name || selected.student_id}
                        </h2>
                        <p className="text-slate-400 text-sm font-mono">{selected.student_id}</p>
                        {selected.email && selected.email !== "—" && (
                          <p className="text-slate-500 text-xs">{selected.email}</p>
                        )}
                      </div>
                    </div>

                    {/* QUICK STATS */}
                    <div className="flex gap-4">
                      {[
                        { label: "Sessions", value: sessions.length, color: "#a78bfa" },
                        { label: "Completed", value: completedSessions.length, color: "#22c55e" },
                        { label: "Avg Score", value: avgScore ?? "—", color: scoreColor(avgScore) },
                      ].map(({ label, value, color }) => (
                        <div key={label} className="text-center">
                          <div className="text-xl font-bold" style={{ color }}>{value}</div>
                          <div className="text-slate-500 text-xs">{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* ACTION BUTTONS */}
                  <div className="flex gap-3 mt-5 flex-wrap">
                    <button
                      onClick={handleSendOverallReport}
                      disabled={sending || completedSessions.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 disabled:opacity-40 text-white font-semibold text-sm transition"
                    >
                      📨 Send Overall Report
                    </button>
                    <button
                      onClick={handleDownloadOverall}
                      disabled={completedSessions.length === 0}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 disabled:opacity-40 text-sm font-semibold transition"
                    >
                      📥 Download Overall PDF
                    </button>
                  </div>
                </div>

                {/* SESSIONS LIST */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/10">
                    <h3 className="text-white font-bold">📋 Session History</h3>
                  </div>

                  {sessionsLoading ? (
                    <div className="p-8 text-center text-slate-500">Loading sessions...</div>
                  ) : sessions.length === 0 ? (
                    <div className="p-8 text-center">
                      <div className="text-3xl mb-2">🎤</div>
                      <p className="text-slate-500 text-sm">No sessions yet for this student</p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {sessions.map((s, i) => {
                        const scores  = parseScores(s.scores);
                        const overall = scores?.overall_score ?? null;
                        return (
                          <div key={s.job_id} className="p-5">
                            <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
                              <div>
                                <div className="text-white font-semibold">Session #{i + 1}</div>
                                <div className="text-slate-500 text-xs mt-0.5 uppercase">
                                  {s.language || "—"} · {s.filename}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                {overall !== null && (
                                  <div className="text-center">
                                    <div className="text-xl font-bold" style={{ color: scoreColor(overall) }}>
                                      {overall}
                                    </div>
                                    <div className="text-xs" style={{ color: scoreColor(overall) }}>
                                      {scoreLabel(overall)}
                                    </div>
                                  </div>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full border ${
                                  s.status === "completed"   ? "border-green-500/40 text-green-400 bg-green-500/10"
                                  : s.status === "processing" ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                                  : s.status === "failed"     ? "border-red-500/40 text-red-400 bg-red-500/10"
                                  : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                                }`}>
                                  {s.status}
                                </span>
                              </div>
                            </div>

                            {/* METRIC BARS */}
                            {scores && (
                              <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-3">
                                {["pronunciation","fluency","grammar","confidence","clarity","communication"].map((key) => (
                                  <div key={key} className="text-center">
                                    <div className="text-xs text-slate-500 mb-1 capitalize">{key.slice(0,4)}</div>
                                    <div className="font-bold text-sm" style={{ color: scoreColor(scores[key]) }}>
                                      {scores[key] ?? "—"}
                                    </div>
                                    <div className="mt-1 h-1 bg-white/10 rounded-full overflow-hidden">
                                      <div
                                        className="h-full rounded-full"
                                        style={{ width: `${scores[key] ?? 0}%`, background: scoreColor(scores[key]) }}
                                      />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* TRANSCRIPTION PREVIEW */}
                            {s.transcription && (
                              <p className="text-slate-500 text-xs italic mb-3 line-clamp-1">
                                "{s.transcription}"
                              </p>
                            )}

                            {/* PER-SESSION ACTIONS */}
                            {s.status === "completed" && (
                              <div className="flex gap-2 flex-wrap">
                                <button
                                  onClick={() => handleSendSessionReport(s, i)}
                                  disabled={sending}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white text-xs font-semibold transition disabled:opacity-50"
                                >
                                  📨 Send Report
                                </button>
                                <button
                                  onClick={() => {
                                    let raw = null;
                                    try { raw = s.scores ? JSON.parse(s.scores) : null; } catch {}
                                    generateSessionReport(
                                      {
                                        session: i + 1,
                                        language: s.language,
                                        filename: s.filename,
                                        transcription: s.transcription,
                                        _rawScores: raw,
                                        ...scores,
                                        overall_score: scores?.overall_score,
                                      },
                                      selected.name || selected.student_id,
                                      selected.student_id
                                    );
                                  }}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 text-xs font-semibold transition"
                                >
                                  📥 PDF
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* TOAST */}
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