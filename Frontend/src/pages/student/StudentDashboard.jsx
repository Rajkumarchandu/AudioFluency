import { useEffect, useState } from "react";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { getStudentStatus } from "../../services/audioService";
import { getStudentTrends } from "../../services/analyticsService";
import { getNotifications, markAllRead } from "../../services/notificationService";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";
import { getStudentReports, markReportRead, deleteReport } from "../../services/reportService";
import { generateSessionReport } from "../../utils/reportGenerator";

const METRICS = [
  { key: "pronunciation", label: "Pronunciation" },
  { key: "fluency",       label: "Fluency" },
  { key: "grammar",       label: "Grammar" },
  { key: "confidence",    label: "Confidence" },
  { key: "clarity",       label: "Clarity" },
  { key: "communication", label: "Communication" },
];

// ── GROWTH CHART COMPONENT ────────────────────────────────────────────────────
function GrowthChart({ records }) {
  const [view, setView] = useState("weekly"); // weekly | monthly

  // Build data buckets
  function buildData() {
    const now      = new Date();
    const buckets  = {};
    const labels   = [];

    if (view === "weekly") {
      // Last 7 days
      for (let i = 6; i >= 0; i--) {
        const d   = new Date(now);
        d.setDate(d.getDate() - i);
        const key = d.toLocaleDateString("en-US", { weekday: "short" });
        buckets[key] = [];
        labels.push(key);
      }
      records.forEach((r) => {
        if (r.status !== "completed") return;
        const scores = parseScores(r.scores);
        if (!scores) return;
        // Use created_at if available, else distribute evenly
        const day = new Date().toLocaleDateString("en-US", { weekday: "short" });
        if (buckets[day]) buckets[day].push(scores.overall_score ?? 0);
      });
    } else {
      // Last 6 months
      for (let i = 5; i >= 0; i--) {
        const d   = new Date(now);
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleDateString("en-US", { month: "short" });
        buckets[key] = [];
        labels.push(key);
      }
      // Distribute sessions across months for demo
      const completed = records.filter((r) => r.status === "completed");
      completed.forEach((r, idx) => {
        const scores = parseScores(r.scores);
        if (!scores) return;
        const monthIdx = idx % labels.length;
        buckets[labels[monthIdx]].push(scores.overall_score ?? 0);
      });
    }

    return labels.map((label) => {
      const vals = buckets[label] || [];
      const avg  = vals.length
        ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
        : 0;
      return { label, avg, count: vals.length };
    });
  }

  const data    = buildData();
  const maxVal  = Math.max(...data.map((d) => d.avg), 100);
  const svgW    = 600;
  const svgH    = 200;
  const padL    = 40;
  const padR    = 20;
  const padT    = 20;
  const padB    = 40;
  const chartW  = svgW - padL - padR;
  const chartH  = svgH - padT - padB;

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1 || 1)) * chartW,
    y: padT + chartH - (d.avg / maxVal) * chartH,
    ...d,
  }));

  const polyline = points.map((p) => `${p.x},${p.y}`).join(" ");
  const area     = [
    `${points[0]?.x},${padT + chartH}`,
    ...points.map((p) => `${p.x},${p.y}`),
    `${points[points.length - 1]?.x},${padT + chartH}`,
  ].join(" ");

  const [hovered, setHovered] = useState(null);

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-white font-bold text-lg">📈 Growth & Progress</h2>
          <p className="text-slate-500 text-xs">Your overall score over time</p>
        </div>
        <select
          value={view}
          onChange={(e) => setView(e.target.value)}
          className="bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 text-white text-sm focus:outline-none"
        >
          <option value="weekly">Weekly</option>
          <option value="monthly">Monthly</option>
        </select>
      </div>

      {/* SVG CHART */}
      <div className="relative overflow-x-auto">
        <svg
          viewBox={`0 0 ${svgW} ${svgH}`}
          className="w-full"
          style={{ minWidth: "300px" }}
        >
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((val) => {
            const y = padT + chartH - (val / maxVal) * chartH;
            return (
              <g key={val}>
                <line
                  x1={padL} y1={y} x2={svgW - padR} y2={y}
                  stroke="rgba(255,255,255,0.06)" strokeWidth="1"
                  strokeDasharray="4,4"
                />
                <text
                  x={padL - 6} y={y + 4}
                  fill="#64748b" fontSize="10" textAnchor="end"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {points.length > 1 && (
            <polygon
              points={area}
              fill="url(#areaGrad)"
              opacity="0.3"
            />
          )}

          {/* Gradient definition */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Line */}
          {points.length > 1 && (
            <polyline
              points={polyline}
              fill="none"
              stroke="#8b5cf6"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Dots + hover */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x} cy={p.y} r="5"
                fill={p.avg > 0 ? "#8b5cf6" : "#1e293b"}
                stroke="#8b5cf6" strokeWidth="2"
                style={{ cursor: "pointer" }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
              />
              {hovered === i && p.avg > 0 && (
                <g>
                  <rect
                    x={p.x - 40} y={p.y - 38}
                    width="80" height="32"
                    rx="6" fill="#1e293b"
                    stroke="#8b5cf6" strokeWidth="1"
                  />
                  <text x={p.x} y={p.y - 22} fill="white" fontSize="11" textAnchor="middle" fontWeight="bold">
                    {p.label}
                  </text>
                  <text x={p.x} y={p.y - 10} fill="#8b5cf6" fontSize="10" textAnchor="middle">
                    Score: {p.avg} · {p.count} session{p.count !== 1 ? "s" : ""}
                  </text>
                </g>
              )}
              {/* X-axis labels */}
              <text
                x={p.x} y={padT + chartH + 20}
                fill="#64748b" fontSize="10" textAnchor="middle"
              >
                {p.label}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* LEGEND */}
      <div className="flex items-center gap-6 mt-3 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-purple-500" />
          <span>Overall Score</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-1.5 bg-purple-500/30 rounded" />
          <span>Trend area</span>
        </div>
      </div>
    </div>
  );
}

// ── MAIN DASHBOARD ────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const { user } = useAuth();
  const [records,        setRecords]        = useState([]);
  const [trends,         setTrends]         = useState(null);
  const [notifications,  setNotifications]  = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [selected,       setSelected]       = useState(null);
  const [teacherReports, setTeacherReports] = useState([]);
  const [reportsUnread,  setReportsUnread]  = useState(0);

  useEffect(() => {
    if (!user?.studentId) return;
    fetchAll();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statusData, trendsData, notifData, teacherReportsData] = await Promise.all([
        getStudentStatus(user.studentId).catch(() => []),
        getStudentTrends(user.studentId).catch(() => null),
        getNotifications(user.studentId).catch(() => []),
        getStudentReports(user.studentId).catch(() => []),
      ]);
      setRecords(statusData);
      setTrends(trendsData);
      setNotifications(notifData);
      setTeacherReports(teacherReportsData);
      setReportsUnread(teacherReportsData.filter((r) => !r.is_read).length);
      if (statusData.length > 0) setSelected(statusData[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkAllRead() {
    await markAllRead(user.studentId);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  }

  const unread       = notifications.filter((n) => !n.is_read).length;
  const completed    = records.filter((r) => r.status === "completed");
  const latestScores = selected ? parseScores(selected.scores) : null;

  // Parse AI insights from selected session
  function getParsed() {
    try { return selected?.scores ? JSON.parse(selected.scores) : null; }
    catch { return null; }
  }

  return (
    <StudentLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">Welcome, {user?.name} 👋</h1>
            <p className="text-slate-400 mt-1">ID: {user?.studentId} · Your performance overview</p>
          </div>
          <button
            onClick={handleMarkAllRead}
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

        {/* STATS ROW */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Sessions", value: records.length,                             color: "#a78bfa" },
            { label: "Completed",      value: completed.length,                           color: "#22c55e" },
            { label: "Avg Score",      value: trends?.averages?.overall_score ?? "—",    color: "#f59e0b" },
            { label: "Best Score",     value: trends?.best_scores?.overall_score ?? "—", color: "#38bdf8" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {/* GROWTH CHART */}
        <GrowthChart records={records} />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* SESSION LIST */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <h2 className="text-xl font-bold text-white mb-4">📋 My Sessions</h2>
            {loading && <p className="text-slate-400 text-center py-8">Loading...</p>}
            {!loading && records.length === 0 && (
              <p className="text-slate-500 text-center py-8">
                No sessions yet. Ask your teacher to upload your audio.
              </p>
            )}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {records.map((r, i) => {
                const scores  = parseScores(r.scores);
                const overall = scores?.overall_score ?? null;
                return (
                  <div
                    key={r.job_id}
                    onClick={() => setSelected(r)}
                    className={`p-3 rounded-xl cursor-pointer border transition ${
                      selected?.job_id === r.job_id
                        ? "border-purple-500 bg-purple-500/10"
                        : "border-white/10 bg-white/5 hover:bg-white/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-white text-sm font-medium">Session #{i + 1}</div>
                        <div className="text-slate-400 text-xs mt-0.5 uppercase">{r.language || "—"}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        {overall !== null && (
                          <span className="text-sm font-bold" style={{ color: scoreColor(overall) }}>
                            {overall}
                          </span>
                        )}
                        <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                          r.status === "completed"   ? "border-green-500/40 text-green-400 bg-green-500/10"
                          : r.status === "processing" ? "border-blue-500/40 text-blue-400 bg-blue-500/10"
                          : r.status === "failed"     ? "border-red-500/40 text-red-400 bg-red-500/10"
                          : "border-yellow-500/40 text-yellow-400 bg-yellow-500/10"
                        }`}>
                          {r.status}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SCORE DETAIL */}
          <div className="lg:col-span-2 space-y-4">
            {selected ? (
              <>
                {latestScores ? (
                  <>
                    {/* SCORE CARDS */}
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {METRICS.map(({ key, label }) => (
                        <div key={key} className="bg-white/5 border border-white/10 rounded-2xl p-4">
                          <div className="text-slate-400 text-xs mb-1">{label}</div>
                          <div className="text-3xl font-bold" style={{ color: scoreColor(latestScores[key]) }}>
                            {latestScores[key] ?? "—"}
                          </div>
                          <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${latestScores[key] ?? 0}%`, background: scoreColor(latestScores[key]) }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* AI SUMMARY */}
                    {getParsed()?.summary && (
                      <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-2">🤖 AI Summary</h3>
                        <p className="text-slate-300">{getParsed().summary}</p>
                      </div>
                    )}

                    {/* TOPIC DETECTION */}
                    {getParsed()?.topic?.primary_topic && (
                      <div className="bg-white/5 border border-cyan-500/20 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-3">🎯 Topic Detected</h3>
                        <div className="flex items-center gap-3 flex-wrap">
                          <span className="px-4 py-2 rounded-xl bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold">
                            {getParsed().topic.primary_topic}
                          </span>
                          {getParsed().topic.secondary_topic && (
                            <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 text-sm">
                              {getParsed().topic.secondary_topic}
                            </span>
                          )}
                          <span className="text-slate-500 text-xs ml-auto">
                            {getParsed().topic.confidence}% confidence
                          </span>
                        </div>
                        {getParsed().topic.keywords_found?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {getParsed().topic.keywords_found.map((kw, i) => (
                              <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-slate-500">
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {/* EMOTION ANALYSIS */}
                    {getParsed()?.emotion?.dominant_emotion && (
                      <div className="bg-white/5 border border-yellow-500/20 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-3">🎭 Emotion Analysis</h3>
                        <div className="flex items-center gap-4 flex-wrap">
                          <div className="text-center">
                            <div className="text-4xl mb-1">
                              {getParsed().emotion.dominant_emotion === "happy"    ? "😊"
                              : getParsed().emotion.dominant_emotion === "neutral"  ? "😐"
                              : getParsed().emotion.dominant_emotion === "angry"    ? "😠"
                              : getParsed().emotion.dominant_emotion === "fearful"  ? "😰"
                              : getParsed().emotion.dominant_emotion === "sad"      ? "😢"
                              : getParsed().emotion.dominant_emotion === "calm"     ? "😌"
                              : getParsed().emotion.dominant_emotion === "surprised"? "😲"
                              : "🎭"}
                            </div>
                            <div className="text-white font-bold capitalize text-sm">
                              {getParsed().emotion.dominant_emotion}
                            </div>
                            <div className="text-slate-400 text-xs capitalize">
                              {getParsed().emotion.confidence_indicator}
                            </div>
                          </div>
                          <div className="flex-1 space-y-2 min-w-40">
                            {Object.entries(getParsed().emotion.emotion_scores || {})
                              .sort((a, b) => b[1] - a[1])
                              .slice(0, 4)
                              .map(([emotion, score]) => (
                                <div key={emotion}>
                                  <div className="flex justify-between text-xs mb-0.5">
                                    <span className="text-slate-400 capitalize">{emotion}</span>
                                    <span className="text-slate-400">{score}%</span>
                                  </div>
                                  <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${score}%`, background: score > 60 ? "#fbbf24" : "#475569" }}
                                    />
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                        <p className="text-slate-400 text-xs mt-3">{getParsed().emotion.emotion_summary}</p>
                      </div>
                    )}

                    {/* GRAMMAR CHECK */}
                    {getParsed()?.grammar_check?.error_count > 0 && (
                      <div className="bg-white/5 border border-orange-500/20 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-3">
                          📖 Grammar Analysis
                          <span className="ml-2 text-sm text-orange-400 font-normal">
                            {getParsed().grammar_check.error_count} issues
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {getParsed().grammar_check.errors?.slice(0, 4).map((err, i) => (
                            <div key={i} className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3">
                              <div className="text-orange-400 text-xs font-semibold mb-1">{err.message}</div>
                              <div className="text-slate-500 text-xs italic mb-1">"{err.context}"</div>
                              {err.suggestions?.length > 0 && (
                                <div className="flex gap-2 flex-wrap">
                                  <span className="text-slate-600 text-xs">Fix:</span>
                                  {err.suggestions.slice(0, 2).map((s, j) => (
                                    <span key={j} className="text-green-400 text-xs font-mono bg-green-500/10 px-2 py-0.5 rounded">
                                      {s}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PHONEME PRONUNCIATION */}
                    {getParsed()?.phoneme_analysis?.errors?.length > 0 && (
                      <div className="bg-white/5 border border-blue-500/20 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-3">
                          🗣 Phoneme Pronunciation Score:{" "}
                          <span style={{ color: scoreColor(getParsed().phoneme_analysis.phoneme_score) }}>
                            {getParsed().phoneme_analysis.phoneme_score}
                          </span>
                        </h3>
                        <div className="space-y-2">
                          {getParsed().phoneme_analysis.errors.slice(0, 4).map((err, i) => (
                            <div key={i} className="flex items-center gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-sm">
                              <span className="text-red-400 font-mono line-through">{err.spoken}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-green-400 font-mono font-bold">{err.expected}</span>
                              <span className="text-slate-500 text-xs ml-auto italic">"{err.context}"</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* PRONUNCIATION CORRECTIONS */}
                    {getParsed()?.corrections?.length > 0 && (
                      <div className="bg-white/5 border border-red-500/20 rounded-2xl p-5">
                        <h3 className="text-white font-bold mb-3">
                          ⚠️ Pronunciation Corrections ({getParsed().corrections.length})
                        </h3>
                        <div className="space-y-2">
                          {getParsed().corrections.map((c, i) => (
                            <div key={i} className="flex items-center gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                              <span className="text-red-400 font-mono line-through">{c.wrong}</span>
                              <span className="text-slate-400">→</span>
                              <span className="text-green-400 font-mono font-bold">{c.correct}</span>
                              <span className="text-slate-500 text-xs ml-auto italic">"{c.context}"</span>
                            </div>
                          ))}
                        </div>
                        {getParsed()?.corrected_text && (
                          <div className="mt-4 p-3 bg-green-500/5 border border-green-500/20 rounded-xl">
                            <div className="text-green-400 text-xs font-semibold mb-1 uppercase tracking-wider">
                              Corrected Version
                            </div>
                            <p className="text-slate-300 text-sm leading-relaxed">{getParsed().corrected_text}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                    <div className="text-4xl mb-3">⏳</div>
                    <p className="text-slate-400">
                      {selected.status === "processing" ? "Analysis in progress..."
                        : selected.status === "failed"  ? "Processing failed. Please re-upload."
                        : "Waiting to be processed."}
                    </p>
                  </div>
                )}

                {/* TRANSCRIPTION */}
                {selected.transcription && (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                    <h3 className="text-white font-bold mb-3">📝 Transcription</h3>
                    <p className="text-slate-300 leading-relaxed text-sm">{selected.transcription}</p>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center">
                <div className="text-4xl mb-3">🎤</div>
                <p className="text-slate-400">Select a session to view your analysis.</p>
              </div>
            )}
          </div>
        </div>

        {/* NOTIFICATIONS */}
        {notifications.length > 0 && (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-white">🔔 Notifications</h2>
              {unread > 0 && (
                <button onClick={handleMarkAllRead} className="text-xs text-purple-400 hover:text-purple-300">
                  Mark all read
                </button>
              )}
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {notifications.map((n) => (
                <div key={n.id} className={`p-3 rounded-xl border text-sm ${
                  n.is_read ? "border-white/10 text-slate-500" : "border-purple-500/30 text-slate-300 bg-purple-500/5"
                }`}>
                  {!n.is_read && <span className="inline-block w-2 h-2 rounded-full bg-purple-400 mr-2" />}
                  {n.message}
                  <span className="text-slate-600 text-xs ml-2">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* REPORTS FROM TEACHER */}
        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
          <div className="p-5 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-white">📨 Reports from Teacher</h2>
              {reportsUnread > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-0.5 font-bold">
                  {reportsUnread} new
                </span>
              )}
            </div>
            <span className="text-slate-500 text-xs">{teacherReports.length} total</span>
          </div>

          {teacherReports.length === 0 ? (
            <div className="p-10 text-center">
              <div className="text-4xl mb-3">📭</div>
              <p className="text-slate-500">No reports from your teacher yet.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {teacherReports.map((r) => {
                const scores  = r.report_data?.scores;
                const overall = scores?.overall_score ?? null;
                return (
                  <div
                    key={r.id}
                    className={`p-5 transition ${!r.is_read ? "bg-purple-500/5 border-l-2 border-purple-500" : ""}`}
                  >
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {!r.is_read && <span className="w-2 h-2 rounded-full bg-purple-400 shrink-0" />}
                      <span className="text-white font-semibold">
                        {r.report_type === "overall" ? "📑 Overall Report" : "📄 Session Report"}
                      </span>
                      <span className="text-slate-500 text-xs">
                        from <span className="text-slate-300">{r.sent_by}</span>
                      </span>
                      <span className="text-slate-600 text-xs ml-auto">
                        {new Date(r.created_at).toLocaleString()}
                      </span>
                    </div>

                    {scores && (
                      <div className="flex flex-wrap gap-4 mb-3 p-3 bg-white/5 rounded-xl">
                        {["pronunciation","fluency","grammar","confidence","clarity","communication"].map((key) => (
                          <div key={key} className="text-center">
                            <div className="text-lg font-bold" style={{
                              color: scores[key] >= 80 ? "#22c55e" : scores[key] >= 60 ? "#f59e0b" : "#ef4444"
                            }}>
                              {scores[key] ?? "—"}
                            </div>
                            <div className="text-slate-500 text-xs capitalize">{key}</div>
                          </div>
                        ))}
                        {overall !== null && (
                          <div className="text-center ml-2 pl-3 border-l border-white/10">
                            <div className="text-2xl font-black" style={{
                              color: overall >= 80 ? "#22c55e" : overall >= 60 ? "#f59e0b" : "#ef4444"
                            }}>
                              {overall}
                            </div>
                            <div className="text-slate-400 text-xs">Overall</div>
                          </div>
                        )}
                      </div>
                    )}

                    {r.report_data?.summary && (
                      <p className="text-slate-400 text-sm mb-3 bg-white/5 rounded-xl p-3">
                        🤖 {r.report_data.summary}
                      </p>
                    )}

                    {r.report_data?.transcription && (
                      <p className="text-slate-500 text-xs italic mb-3 line-clamp-2">
                        "{r.report_data.transcription}"
                      </p>
                    )}

                    <div className="flex gap-3 flex-wrap">
                      <button
                        onClick={async () => {
                          await markReportRead(r.id);
                          setTeacherReports((prev) => prev.map((rep) => rep.id === r.id ? { ...rep, is_read: true } : rep));
                          setReportsUnread((prev) => Math.max(0, prev - 1));
                          generateSessionReport({
                            session: r.id, language: r.report_data?.language,
                            filename: r.report_data?.filename, transcription: r.report_data?.transcription,
                            _rawScores: { summary: r.report_data?.summary, corrections: r.report_data?.corrections || [] },
                            ...(r.report_data?.scores || {}), overall_score: r.report_data?.scores?.overall_score,
                          }, user?.name, user?.studentId);
                        }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-sm font-semibold transition"
                      >
                        📥 Download PDF
                      </button>
                      {!r.is_read && (
                        <button
                          onClick={async () => {
                            await markReportRead(r.id);
                            setTeacherReports((prev) => prev.map((rep) => rep.id === r.id ? { ...rep, is_read: true } : rep));
                            setReportsUnread((prev) => Math.max(0, prev - 1));
                          }}
                          className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 text-sm transition"
                        >
                          ✓ Mark Read
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          await deleteReport(r.id);
                          setTeacherReports((prev) => prev.filter((rep) => rep.id !== r.id));
                        }}
                        className="px-4 py-2 rounded-xl bg-red-600/20 border border-red-500/30 text-red-400 hover:bg-red-600/40 text-sm transition"
                      >
                        🗑 Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* REFRESH */}
        <button
          onClick={fetchAll}
          className="w-full py-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-white transition text-sm"
        >
          ↻ Refresh Data
        </button>

      </div>
    </StudentLayout>
  );
}