import { useState, useEffect } from "react";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { getStudentStatus, deleteAudio } from "../../services/audioService";
import { parseScores, scoreColor, scoreLabel } from "../../utils/scoreHelpers";
import { generateSessionReport, generateOverallReport } from "../../utils/reportGenerator";

const METRICS = [
  { key: "pronunciation", label: "Pronunciation", icon: "🗣" },
  { key: "fluency",       label: "Fluency",       icon: "💬" },
  { key: "grammar",       label: "Grammar",       icon: "📖" },
  { key: "confidence",    label: "Confidence",    icon: "💪" },
  { key: "clarity",       label: "Clarity",       icon: "🔊" },
  { key: "communication", label: "Communication", icon: "🤝" },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [records,    setRecords]    = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [selected,   setSelected]   = useState(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => { if (user?.studentId) fetchRecords(); }, [user]);

  async function fetchRecords() {
    setLoading(true);
    try {
      const data = await getStudentStatus(user.studentId);
      setRecords(data);
      if (data.length > 0) setSelected(data[0]);
    } catch (e) { setRecords([]); }
    finally { setLoading(false); }
  }

  async function handleDelete(jobId) {
    try {
      await deleteAudio(jobId);
      const updated = records.filter((r) => r.job_id !== jobId);
      setRecords(updated);
      if (selected?.job_id === jobId) setSelected(updated[0] || null);
    } catch (e) {}
  }

  function buildSession(r, index) {
    const scores = parseScores(r.scores);
    let rawScores = null;
    try { rawScores = r.scores ? JSON.parse(r.scores) : null; } catch {}
    return { session: index + 1, job_id: r.job_id, language: r.language,
      filename: r.filename, transcription: r.transcription, _rawScores: rawScores, ...scores };
  }

  function handleGenerateSession() {
    if (!selected) return;
    setGenerating(true);
    const idx = records.findIndex((r) => r.job_id === selected.job_id);
    setTimeout(() => { generateSessionReport(buildSession(selected, idx), user?.name, user?.studentId); setGenerating(false); }, 100);
  }

  function handleGenerateOverall() {
    setGenerating(true);
    const completed = records.filter((r) => r.status === "completed").map((r, i) => buildSession(r, i));
    setTimeout(() => { generateOverallReport(completed, user?.name, user?.studentId); setGenerating(false); }, 100);
  }

  function getParsed() {
    try { return selected?.scores ? JSON.parse(selected.scores) : null; } catch { return null; }
  }

  const scores         = selected ? parseScores(selected.scores) : null;
  const completedCount = records.filter((r) => r.status === "completed").length;

  return (
    <StudentLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">📊 My Reports</h1>
            <p className="text-slate-400 mt-1">Detailed analysis of all your sessions</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={handleGenerateSession}
              disabled={!selected || selected.status !== "completed" || generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-semibold text-sm transition"
            >
              📄 Export This Session
            </button>
            <button
              onClick={handleGenerateOverall}
              disabled={completedCount === 0 || generating}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-600 hover:opacity-90 disabled:opacity-40 text-white font-semibold text-sm transition"
            >
              📑 Export All Sessions
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SESSION LIST */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="text-white font-bold">All Sessions</h2>
              <button onClick={fetchRecords} className="text-slate-400 text-sm hover:text-white">↻</button>
            </div>
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading...</div>
            ) : records.length === 0 ? (
              <div className="p-8 text-center text-slate-500">No reports yet</div>
            ) : (
              <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
                {records.map((r, i) => {
                  const s = parseScores(r.scores);
                  const overall = s?.overall_score ?? null;
                  return (
                    <div
                      key={r.job_id}
                      onClick={() => setSelected(r)}
                      className={`p-4 cursor-pointer transition ${
                        selected?.job_id === r.job_id ? "bg-purple-500/10 border-l-2 border-purple-500" : "hover:bg-white/5"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">Session #{i + 1}</span>
                        {overall !== null && (
                          <span className="text-sm font-bold" style={{ color: scoreColor(overall) }}>{overall}/100</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs uppercase">{r.language || "—"}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          r.status === "completed" ? "text-green-400 bg-green-500/10"
                          : r.status === "failed"  ? "text-red-400 bg-red-500/10"
                          : "text-yellow-400 bg-yellow-500/10"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                      {overall !== null && (
                        <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${overall}%`, background: scoreColor(overall) }} />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* REPORT DETAIL */}
          <div className="lg:col-span-2 space-y-4">
            {selected ? (
              <>
                {/* HEADER */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-3">
                  <div>
                    <div className="text-white font-bold text-lg">Session Report</div>
                    <div className="text-slate-400 text-sm mt-0.5">
                      {selected.filename} · <span className="uppercase">{selected.language}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {scores && (
                      <div className="text-center">
                        <div className="text-3xl font-bold" style={{ color: scoreColor(scores.overall_score) }}>
                          {scores.overall_score}
                        </div>
                        <div className="text-slate-400 text-xs">{scoreLabel(scores.overall_score)}</div>
                      </div>
                    )}
                    <button
                      onClick={handleGenerateSession}
                      disabled={selected.status !== "completed" || generating}
                      className="text-xs px-3 py-1.5 rounded-lg bg-purple-600/30 border border-purple-500/40 text-purple-300 hover:bg-purple-600/50 disabled:opacity-40 transition"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => handleDelete(selected.job_id)}
                      className="text-xs px-3 py-1.5 rounded-lg bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 transition"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>

                {/* SCORE METRICS */}
                {scores ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {METRICS.map(({ key, label, icon }) => (
                      <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span>{icon}</span>
                          <span className="text-slate-400 text-xs">{label}</span>
                        </div>
                        <div className="text-3xl font-bold" style={{ color: scoreColor(scores[key]) }}>
                          {scores[key] ?? "—"}
                        </div>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${scores[key] ?? 0}%`, background: scoreColor(scores[key]) }} />
                        </div>
                        <div className="text-xs mt-1" style={{ color: scoreColor(scores[key]) }}>
                          {scoreLabel(scores[key])}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center text-slate-500">
                    {selected.status === "processing" ? "⏳ Analysis in progress..." : "No score data available"}
                  </div>
                )}

                {/* AI SUMMARY */}
                {getParsed()?.summary && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-2">🤖 AI Summary</h3>
                    <p className="text-slate-300 leading-relaxed">{getParsed().summary}</p>
                  </div>
                )}

                {/* TOPIC */}
                {getParsed()?.topic?.primary_topic && (
                  <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">🎯 Topic: {getParsed().topic.primary_topic}</h3>
                    <p className="text-slate-400 text-sm">{getParsed().topic.summary}</p>
                  </div>
                )}

                {/* EMOTION */}
                {getParsed()?.emotion?.dominant_emotion && (
                  <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-2">🎭 Emotion: <span className="capitalize font-normal text-yellow-400">{getParsed().emotion.dominant_emotion}</span></h3>
                    <p className="text-slate-400 text-sm">{getParsed().emotion.emotion_summary}</p>
                  </div>
                )}

                {/* GRAMMAR */}
                {getParsed()?.grammar_check?.error_count > 0 && (
                  <div className="bg-white/5 border border-orange-500/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">📖 Grammar — {getParsed().grammar_check.error_count} issues</h3>
                    <div className="space-y-2">
                      {getParsed().grammar_check.errors?.slice(0, 5).map((err, i) => (
                        <div key={i} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                          <div className="text-orange-400 text-xs font-semibold mb-1">{err.message}</div>
                          <div className="text-slate-500 text-xs italic">"{err.context}"</div>
                          {err.suggestions?.length > 0 && (
                            <div className="flex gap-2 mt-1 flex-wrap">
                              {err.suggestions.slice(0, 2).map((s, j) => (
                                <span key={j} className="text-green-400 text-xs font-mono bg-green-500/10 px-2 py-0.5 rounded">{s}</span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    {getParsed().grammar_check.corrected_text && (
                      <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <div className="text-green-400 text-xs font-semibold mb-1 uppercase">Corrected Version</div>
                        <p className="text-slate-300 text-sm">{getParsed().grammar_check.corrected_text}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* PRONUNCIATION CORRECTIONS */}
                {getParsed()?.corrections?.length > 0 && (
                  <div className="bg-white/5 border border-red-500/20 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">⚠️ Pronunciation Corrections ({getParsed().corrections.length})</h3>
                    <div className="space-y-2">
                      {getParsed().corrections.map((c, i) => (
                        <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-sm">
                          <span className="text-red-400 line-through font-mono">{c.wrong}</span>
                          <span className="text-slate-400">→</span>
                          <span className="text-green-400 font-mono font-bold">{c.correct}</span>
                          <span className="text-slate-500 text-xs ml-auto italic">"{c.context}"</span>
                        </div>
                      ))}
                    </div>
                    {getParsed()?.corrected_text && (
                      <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                        <div className="text-green-400 text-xs font-semibold mb-1 uppercase">Corrected Version</div>
                        <p className="text-slate-300 text-sm">{getParsed().corrected_text}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* TRANSCRIPTION */}
                {selected.transcription && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">📝 Full Transcription</h3>
                    <p className="text-slate-300 leading-relaxed text-sm">{selected.transcription}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                <div className="text-4xl mb-3">📊</div>
                <p className="text-slate-400">Select a session to view the report</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  );
}