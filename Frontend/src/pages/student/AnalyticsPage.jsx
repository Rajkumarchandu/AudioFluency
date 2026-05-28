import { useState, useEffect, useRef } from "react";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { getStudentTrends } from "../../services/analyticsService";
import { getStudentStatus } from "../../services/audioService";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";

const METRICS = [
  { key: "pronunciation", label: "Pronunciation", icon: "🗣", color: "#ff375f" },
  { key: "fluency",       label: "Fluency",       icon: "💬", color: "#30d158" },
  { key: "grammar",       label: "Grammar",       icon: "📖", color: "#0a84ff" },
  { key: "confidence",    label: "Confidence",    icon: "💪", color: "#ff9f0a" },
  { key: "clarity",       label: "Clarity",       icon: "🔊", color: "#bf5af2" },
  { key: "communication", label: "Communication", icon: "🤝", color: "#64d2ff" },
];

function FitnessRing({ value = 0, size = 180, strokeWidth = 22, color = "#ff375f", label, icon, subtitle }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const dash = (progress / 100) * circumference;

  const trackRef = useRef(null);
  const progressRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [animated, setAnimated] = useState(false);

  // Initial mount animation
  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 150);
    return () => clearTimeout(t);
  }, [value]);

  // Hover: spin the ring
  useEffect(() => {
    if (!progressRef.current) return;
    if (hovered) {
      progressRef.current.style.transition = "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1), filter 0.3s";
      progressRef.current.style.strokeDashoffset = circumference;
      const t = setTimeout(() => {
        progressRef.current.style.strokeDashoffset = circumference - dash;
      }, 50);
      return () => clearTimeout(t);
    }
  }, [hovered]);

  const offset = animated ? circumference - dash : circumference;

  return (
    <div
      className="flex flex-col items-center gap-3 cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          style={{ transform: "rotate(-90deg)" }}
        >
          {/* Outer glow layer when hovered */}
          {hovered && (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth + 6}
              strokeOpacity={0.12}
            />
          )}

          {/* Background track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color + "25"}
            strokeWidth={strokeWidth}
          />

          {/* Progress arc */}
          <circle
            ref={progressRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated
                ? "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)"
                : "none",
              filter: hovered
                ? `drop-shadow(0 0 12px ${color}) drop-shadow(0 0 24px ${color}88)`
                : `drop-shadow(0 0 6px ${color}88)`,
            }}
          />

          {/* End cap dot */}
          {progress > 2 && (() => {
            const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
            const cx = size / 2 + radius * Math.cos(angle);
            const cy = size / 2 + radius * Math.sin(angle);
            return (
              <circle
                cx={cx} cy={cy}
                r={strokeWidth / 2}
                fill={color}
                style={{
                  filter: hovered
                    ? `drop-shadow(0 0 8px ${color})`
                    : "none",
                  transition: "filter 0.3s",
                }}
              />
            );
          })()}
        </svg>

        {/* Center content */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.08)" : "scale(1)" }}
        >
          <span style={{ fontSize: size * 0.13 }}>{icon}</span>
          <span
            className="font-black text-white"
            style={{
              fontSize: size * 0.24,
              lineHeight: 1,
              color: hovered ? color : "white",
              transition: "color 0.3s",
              textShadow: hovered ? `0 0 20px ${color}` : "none",
            }}
          >
            {value ?? 0}
          </span>
          {subtitle && (
            <span className="text-slate-500 mt-0.5" style={{ fontSize: size * 0.08 }}>
              {subtitle}
            </span>
          )}
        </div>
      </div>

      {/* Label below */}
      <div className="text-center">
        <div
          className="text-sm font-semibold transition-colors duration-300"
          style={{ color: hovered ? color : "#94a3b8" }}
        >
          {label}
        </div>
      </div>
    </div>
  );
}

// Big hero ring — like the main Move ring in Apple Fitness
function HeroRing({ value = 0, color = "#ff375f", label = "Overall", size = 260 }) {
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(Math.max(value, 0), 100);
  const dash = (progress / 100) * circumference;

  const progressRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 200);
    return () => clearTimeout(t);
  }, [value]);

  useEffect(() => {
    if (!progressRef.current || !hovered) return;
    progressRef.current.style.transition = "stroke-dashoffset 0.7s cubic-bezier(0.4,0,0.2,1)";
    progressRef.current.style.strokeDashoffset = circumference;
    const t = setTimeout(() => {
      if (progressRef.current)
        progressRef.current.style.strokeDashoffset = circumference - dash;
    }, 60);
    return () => clearTimeout(t);
  }, [hovered]);

  const offset = animated ? circumference - dash : circumference;

  // Score rating text
  const rating =
    value >= 80 ? "Excellent" :
    value >= 60 ? "Good" :
    value >= 40 ? "Average" : "Needs Work";

  return (
    <div
      className="flex flex-col items-center gap-4 cursor-pointer select-none"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
          {/* Outer glow when hovered */}
          {hovered && (
            <circle
              cx={size / 2} cy={size / 2} r={radius}
              fill="none" stroke={color}
              strokeWidth={strokeWidth + 10}
              strokeOpacity={0.1}
            />
          )}
          {/* Track */}
          <circle
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color + "20"}
            strokeWidth={strokeWidth}
          />
          {/* Progress */}
          <circle
            ref={progressRef}
            cx={size / 2} cy={size / 2} r={radius}
            fill="none" stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: animated
                ? "stroke-dashoffset 1.6s cubic-bezier(0.4,0,0.2,1)"
                : "none",
              filter: hovered
                ? `drop-shadow(0 0 16px ${color}) drop-shadow(0 0 32px ${color}66)`
                : `drop-shadow(0 0 10px ${color}88)`,
            }}
          />
          {/* End dot */}
          {progress > 2 && (() => {
            const angle = ((progress / 100) * 360 - 90) * (Math.PI / 180);
            const cx = size / 2 + radius * Math.cos(angle);
            const cy = size / 2 + radius * Math.sin(angle);
            return (
              <circle cx={cx} cy={cy} r={strokeWidth / 2} fill={color}
                style={{ filter: hovered ? `drop-shadow(0 0 10px ${color})` : "none", transition: "filter 0.3s" }}
              />
            );
          })()}
        </svg>

        {/* Center */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center transition-transform duration-300"
          style={{ transform: hovered ? "scale(1.05)" : "scale(1)" }}
        >
          <span
            className="font-black text-white"
            style={{
              fontSize: size * 0.22,
              lineHeight: 1,
              color: hovered ? color : "white",
              transition: "color 0.3s",
              textShadow: hovered ? `0 0 30px ${color}` : "none",
            }}
          >
            {value}
          </span>
          <span
            className="text-sm font-medium mt-1 transition-colors duration-300"
            style={{ color: hovered ? color : "#64748b" }}
          >
            {rating}
          </span>
        </div>
      </div>

      <div className="text-center">
        <div className="text-white font-bold text-lg">{label}</div>
        <div className="text-slate-500 text-sm">out of 100</div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [trends, setTrends] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  useEffect(() => {
    if (user?.studentId) fetchAll();
  }, [user]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [statusData, trendsData] = await Promise.all([
        getStudentStatus(user.studentId).catch(() => []),
        getStudentTrends(user.studentId).catch(() => null),
      ]);
      const completed = statusData
        .filter((r) => r.status === "completed")
        .map((r, i) => ({
          session: i + 1,
          language: r.language,
          filename: r.filename,
          job_id: r.job_id,
          ...parseScores(r.scores),
        }));
      setSessions(completed);
      setTrends(trendsData);
      if (completed.length > 0) setSelectedSession(completed[completed.length - 1]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const averages = sessions.length
    ? Object.fromEntries(
        [...METRICS.map((m) => m.key), "overall_score"].map((key) => [
          key,
          Math.round(sessions.reduce((a, s) => a + (s[key] ?? 0), 0) / sessions.length),
        ])
      )
    : null;

  const improvement =
    sessions.length >= 2
      ? (sessions[sessions.length - 1]?.overall_score ?? 0) - (sessions[0]?.overall_score ?? 0)
      : null;

  return (
    <StudentLayout>
      <div className="space-y-10">

        {/* HEADER */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-white">📈 Analytics</h1>
            <p className="text-slate-400 mt-1">Hover over any ring to animate</p>
          </div>
          <button
            onClick={fetchAll}
            className="px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 text-sm transition"
          >
            ↻ Refresh
          </button>
        </div>

        {loading ? (
          <div className="text-center py-24 text-slate-500">Loading analytics...</div>
        ) : sessions.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-16 text-center">
            <div className="text-6xl mb-4">🎯</div>
            <p className="text-slate-400 text-lg">No completed sessions yet.</p>
          </div>
        ) : (
          <>
            {/* SECTION 1 — AVERAGE HERO + METRIC RINGS */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <h2 className="text-white font-bold text-lg mb-8">
                🏅 Overall Average — All Sessions
              </h2>
              <div className="flex flex-col lg:flex-row items-center gap-12">

                {/* BIG HERO RING */}
                <div className="shrink-0">
                  <HeroRing
                    value={averages?.overall_score ?? 0}
                    color="#ff375f"
                    label="Average Score"
                    size={260}
                  />
                </div>

                {/* 6 METRIC RINGS */}
                <div className="grid grid-cols-3 gap-8 flex-1">
                  {METRICS.map((m) => (
                    <FitnessRing
                      key={m.key}
                      value={averages?.[m.key] ?? 0}
                      size={130}
                      strokeWidth={14}
                      color={m.color}
                      label={m.label}
                      icon={m.icon}
                    />
                  ))}
                </div>
              </div>

              {/* Quick stats row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 pt-8 border-t border-white/10">
                {[
                  { label: "Total Sessions", value: sessions.length, color: "#a78bfa" },
                  { label: "Best Score", value: Math.max(...sessions.map((s) => s.overall_score ?? 0)), color: "#30d158" },
                  { label: "Latest Score", value: sessions[sessions.length - 1]?.overall_score ?? "—", color: "#64d2ff" },
                  {
                    label: "Improvement",
                    value: improvement !== null ? (improvement >= 0 ? `+${improvement}` : `${improvement}`) : "—",
                    color: improvement > 0 ? "#30d158" : improvement < 0 ? "#ff375f" : "#94a3b8",
                  },
                ].map(({ label, value, color }) => (
                  <div key={label} className="text-center">
                    <div className="text-2xl font-bold" style={{ color }}>{value}</div>
                    <div className="text-slate-500 text-xs mt-1">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* SECTION 2 — PER SESSION RINGS */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
              <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
                <h2 className="text-white font-bold text-lg">
                  🎯 Session Detail — Hover to Animate
                </h2>
                {/* Session tabs */}
                <div className="flex gap-2 flex-wrap">
                  {sessions.map((s) => (
                    <button
                      key={s.job_id}
                      onClick={() => setSelectedSession(s)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                        selectedSession?.job_id === s.job_id
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                      }`}
                    >
                      #{s.session}
                      <span className="ml-1.5" style={{ color: scoreColor(s.overall_score) }}>
                        {s.overall_score}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {selectedSession && (
                <>
                  <div className="text-slate-400 text-sm mb-8 uppercase tracking-wider">
                    Session #{selectedSession.session} ·{" "}
                    <span className="uppercase">{selectedSession.language || "—"}</span>
                  </div>

                  <div className="flex flex-col lg:flex-row items-center gap-12">
                    {/* Hero ring for this session */}
                    <div className="shrink-0">
                      <HeroRing
                        key={selectedSession.job_id + "-hero"}
                        value={selectedSession.overall_score ?? 0}
                        color="#ff375f"
                        label={`Session #${selectedSession.session}`}
                        size={240}
                      />
                    </div>

                    {/* 6 rings for this session */}
                    <div className="grid grid-cols-3 gap-8 flex-1">
                      {METRICS.map((m) => (
                        <FitnessRing
                          key={m.key + selectedSession.job_id}
                          value={selectedSession[m.key] ?? 0}
                          size={130}
                          strokeWidth={14}
                          color={m.color}
                          label={m.label}
                          icon={m.icon}
                        />
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* SECTION 3 — PROGRESS DOTS */}
            {sessions.length >= 2 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-white font-bold mb-6">📅 Progress Across Sessions</h2>
                <div className="space-y-5">
                  {[{ key: "overall_score", label: "Overall", color: "#ffffff", icon: "🎯" }, ...METRICS].map((m) => {
                    const values = sessions.map((s) => s[m.key] ?? 0);
                    return (
                      <div key={m.key} className="flex items-center gap-4">
                        <div className="text-xs text-slate-400 w-28 shrink-0 text-right">
                          {m.icon} {m.label}
                        </div>
                        <div className="flex-1 relative h-10 flex items-center">
                          <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
                            <polyline
                              points={values.map((v, i) => {
                                const x = sessions.length === 1 ? 50 : (i / (sessions.length - 1)) * 100;
                                const y = 80 - (v / 100) * 60;
                                return `${x}%,${y}%`;
                              }).join(" ")}
                              fill="none"
                              stroke={m.color + "33"}
                              strokeWidth="1.5"
                            />
                          </svg>
                          {values.map((v, i) => {
                            const left = sessions.length === 1 ? 50 : (i / (sessions.length - 1)) * 100;
                            const bottom = (v / 100) * 60;
                            return (
                              <div
                                key={i}
                                className="absolute w-3 h-3 rounded-full border-2 border-slate-900 group"
                                title={`Session ${i + 1}: ${v}`}
                                style={{
                                  left: `${left}%`,
                                  bottom: `${bottom}%`,
                                  background: m.color,
                                  boxShadow: `0 0 8px ${m.color}88`,
                                  transform: "translateX(-50%)",
                                  transition: "transform 0.2s",
                                }}
                              />
                            );
                          })}
                        </div>
                        <div className="text-xs font-bold w-8 text-right shrink-0" style={{ color: m.color }}>
                          {values[values.length - 1]}
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex items-center gap-4 mt-2">
                    <div className="w-28 shrink-0" />
                    <div className="flex-1 flex justify-between px-1">
                      {sessions.map((s) => (
                        <div key={s.job_id} className="text-xs text-slate-600">#{s.session}</div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* RECOMMENDATIONS */}
            {trends?.recommendations?.length > 0 && (
              <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                <h2 className="text-white font-bold mb-4">💡 Recommendations</h2>
                <div className="space-y-3">
                  {trends.recommendations.map((r, i) => (
                    <div key={i} className={`p-4 rounded-2xl border ${
                      r.priority === "high"
                        ? "border-red-500/30 bg-red-500/5"
                        : "border-yellow-500/30 bg-yellow-500/5"
                    }`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.priority === "high" ? "bg-red-500/20 text-red-400" : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          {r.priority?.toUpperCase()}
                        </span>
                        <span className="text-white text-sm font-medium capitalize">{r.area}</span>
                        <span className="text-xs ml-auto" style={{ color: scoreColor(r.score) }}>
                          Score: {r.score}
                        </span>
                      </div>
                      <p className="text-slate-300 text-sm">{r.tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </StudentLayout>
  );
}