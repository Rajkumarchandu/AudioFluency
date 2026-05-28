import { useState, useEffect } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { useAuth } from "../../context/AuthContext";
import { getStudentStatus } from "../../services/audioService";
import { parseScores, scoreColor, scoreLabel } from "../../utils/scoreHelpers";
import { generateSessionReport, generateOverallReport } from "../../utils/reportGenerator";
import { sendReportToStudent } from "../../services/reportService";

export default function TeacherReportsPage() {
  const { user } = useAuth();
  const [submissions, setSubmissions] = useState(() =>
    JSON.parse(localStorage.getItem("teacher_submissions") || "[]")
  );
  const [selected, setSelected]     = useState(null);
  const [search, setSearch]         = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [sending, setSending]       = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast]           = useState(null);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  const completed = submissions.filter((s) => s.status === "completed");
  const students  = [...new Set(submissions.map((s) => s.student_id))];

  const filtered = submissions.filter((s) => {
    const q = search.toLowerCase();
    const matchQ = !q || s.student_id.toLowerCase().includes(q) || s.filename.toLowerCase().includes(q);
    const matchF = filterStatus === "all" || s.status === filterStatus;
    return matchQ && matchF;
  });

  async function handleSendReport(s) {
    setSending(true);
    try {
      let raw = null;
      try { raw = s.scores ? JSON.parse(s.scores) : null; } catch {}
      await sendReportToStudent(
        s.student_id, user?.name || "Teacher",
        {
          session: s.job_id, student_id: s.student_id,
          language: s.language, filename: s.filename,
          transcription: s.transcription,
          scores: raw?.overall || null,
          summary: raw?.summary || "",
          corrections: raw?.corrections || [],
          corrected_text: raw?.corrected_text || "",
          sent_at: new Date().toISOString(),
        },
        "session", s.job_id
      );
      showToast(`Report sent to ${s.student_id}`);
    } catch (e) {
      showToast("Failed to send", "err");
    } finally {
      setSending(false);
    }
  }

  function handleDownloadSession(s, idx) {
    setGenerating(true);
    let raw = null;
    try { raw = s.scores ? JSON.parse(s.scores) : null; } catch {}
    setTimeout(() => {
      generateSessionReport({
        session: idx + 1, language: s.language,
        filename: s.filename, transcription: s.transcription,
        _rawScores: raw, ...parseScores(s.scores),
        overall_score: parseScores(s.scores)?.overall_score,
      }, s.student_id, s.student_id);
      setGenerating(false);
    }, 100);
  }

  function handleDownloadAll(studentId) {
    const studentSessions = submissions
      .filter((s) => s.student_id === studentId && s.status === "completed")
      .map((s, i) => {
        let raw = null;
        try { raw = s.scores ? JSON.parse(s.scores) : null; } catch {}
        return {
          session: i + 1, language: s.language, filename: s.filename,
          transcription: s.transcription, _rawScores: raw,
          ...parseScores(s.scores), overall_score: parseScores(s.scores)?.overall_score,
        };
      });
    if (studentSessions.length === 0) return showToast("No completed sessions", "err");
    setGenerating(true);
    setTimeout(() => {
      generateOverallReport(studentSessions, studentId, studentId);
      setGenerating(false);
    }, 100);
  }

  return (
    <TeacherLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">📑 Reports</h1>
            <p className="text-slate-400 mt-1">
              {completed.length} completed · {students.length} students
            </p>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Submissions", value: submissions.length, color: "#a78bfa" },
            { label: "Completed",         value: completed.length,   color: "#22c55e" },
            { label: "Students",          value: students.length,    color: "#22d3ee" },
            { label: "Pending",           value: submissions.filter((s) => s.status === "pending" || s.status === "processing").length, color: "#f59e0b" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              <div className="text-2xl font-bold" style={{ color }}>{value}</div>
              <div className="text-slate-400 text-xs mt-1">{label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* TABLE */}
          <div className="lg:col-span-2 bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-3 flex-wrap">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by student ID or file..."
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-xs"
              >
                <option value="all">All</option>
                <option value="completed">Completed</option>
                <option value="processing">Processing</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-white/10 sticky top-0 bg-slate-900">
                  <tr className="text-slate-400 text-xs uppercase tracking-wider">
                    <th className="text-left p-3">Student</th>
                    <th className="text-left p-3">Language</th>
                    <th className="text-left p-3">Status</th>
                    <th className="text-left p-3">Score</th>
                    <th className="text-left p-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-slate-500 py-10">
                        No submissions found
                      </td>
                    </tr>
                  ) : filtered.map((s, i) => {
                    const scores  = parseScores(s.scores);
                    const overall = scores?.overall_score ?? null;
                    return (
                      <tr
                        key={s.job_id}
                        onClick={() => setSelected(s)}
                        className={`border-b border-white/5 cursor-pointer transition ${
                          selected?.job_id === s.job_id ? "bg-purple-500/10" : "hover:bg-white/5"
                        }`}
                      >
                        <td className="p-3 text-cyan-400 font-mono text-xs">{s.student_id}</td>
                        <td className="p-3 text-slate-500 text-xs uppercase">{s.language || "—"}</td>
                        <td className="p-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${
                            s.status === "completed"   ? "border-green-500/40 text-green-400 bg-green-500/10"
                            : s.status === "processing" ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                            : s.status === "failed"     ? "border-red-500/40 text-red-400 bg-red-500/10"
                            : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-3">
                          {overall !== null
                            ? <span className="font-bold" style={{ color: scoreColor(overall) }}>{overall}</span>
                            : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                            {s.status === "completed" && (
                              <>
                                <button
                                  onClick={() => handleSendReport(s)}
                                  disabled={sending}
                                  className="text-xs px-2 py-1 rounded-lg bg-purple-600/20 border border-purple-500/30 text-purple-400 hover:bg-purple-600/40 transition"
                                >
                                  📨 Send
                                </button>
                                <button
                                  onClick={() => handleDownloadSession(s, i)}
                                  disabled={generating}
                                  className="text-xs px-2 py-1 rounded-lg bg-blue-600/20 border border-blue-500/30 text-blue-400 hover:bg-blue-600/40 transition"
                                >
                                  📥 PDF
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* DETAIL */}
          <div>
            {selected ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4 sticky top-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-white font-bold">{selected.student_id}</h3>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-xs">✕</button>
                </div>

                {parseScores(selected.scores) && (
                  <div className="grid grid-cols-2 gap-2">
                    {["pronunciation","fluency","grammar","confidence","clarity","communication"].map((key) => {
                      const val = parseScores(selected.scores)?.[key];
                      return (
                        <div key={key} className="bg-white/5 rounded-xl p-3 text-center">
                          <div className="text-slate-500 text-xs capitalize">{key}</div>
                          <div className="text-xl font-bold" style={{ color: scoreColor(val) }}>{val ?? "—"}</div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {selected.scores && JSON.parse(selected.scores)?.summary && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-white text-xs font-bold mb-1">🤖 AI Summary</div>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {JSON.parse(selected.scores).summary}
                    </p>
                  </div>
                )}

                {selected.transcription && (
                  <div className="bg-white/5 rounded-xl p-3">
                    <div className="text-white text-xs font-bold mb-1">📝 Transcription</div>
                    <p className="text-slate-400 text-xs leading-relaxed line-clamp-4">
                      {selected.transcription}
                    </p>
                  </div>
                )}

                {/* ALL SESSIONS PDF for this student */}
                <button
                  onClick={() => handleDownloadAll(selected.student_id)}
                  disabled={generating}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 text-white font-bold text-sm transition disabled:opacity-50"
                >
                  📑 Download All Sessions PDF
                </button>
              </div>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-10 text-center">
                <div className="text-4xl mb-3">📋</div>
                <p className="text-slate-400 text-sm">Click a row to see details</p>
              </div>
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