import { useState, useEffect } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";

const METRICS = [
  { key: "pronunciation", label: "Pronunciation", color: "#ff375f" },
  { key: "fluency",       label: "Fluency",       color: "#30d158" },
  { key: "grammar",       label: "Grammar",       color: "#0a84ff" },
  { key: "confidence",    label: "Confidence",    color: "#ff9f0a" },
  { key: "clarity",       label: "Clarity",       color: "#bf5af2" },
  { key: "communication", label: "Communication", color: "#64d2ff" },
];

export default function TeacherAnalyticsPage() {
  const [submissions] = useState(() =>
    JSON.parse(localStorage.getItem("teacher_submissions") || "[]")
  );

  const completed = submissions.filter((s) => s.status === "completed");
  const students  = [...new Set(submissions.map((s) => s.student_id))];

  // Class averages
  const classAvg = METRICS.reduce((acc, m) => {
    const vals = completed
      .map((s) => parseScores(s.scores)?.[m.key])
      .filter((v) => v !== null && v !== undefined);
    acc[m.key] = vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null;
    return acc;
  }, {});
  const overallVals = completed
    .map((s) => parseScores(s.scores)?.overall_score)
    .filter(Boolean);
  const classOverall = overallVals.length
    ? Math.round(overallVals.reduce((a, b) => a + b, 0) / overallVals.length)
    : null;

  // Per-student averages
  const studentStats = students.map((sid) => {
    const sSubs = completed.filter((s) => s.student_id === sid);
    const scores = sSubs.map((s) => parseScores(s.scores)?.overall_score).filter(Boolean);
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const best = scores.length ? Math.max(...scores) : null;
    return { studentId: sid, sessions: sSubs.length, avg, best };
  }).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0));

  return (
    <TeacherLayout>
      <div className="space-y-6">

        {/* HEADER */}
        <div>
          <h1 className="text-4xl font-bold text-white">📈 Analytics</h1>
          <p className="text-slate-400 mt-1">Class-wide performance overview</p>
        </div>

        {/* CLASS STATS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Students",    value: students.length,    color: "#22d3ee" },
            { label: "Total Sessions",    value: submissions.length, color: "#a78bfa" },
            { label: "Completed",         value: completed.length,   color: "#22c55e" },
            { label: "Class Avg Score",   value: classOverall ?? "—", color: scoreColor(classOverall) },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white/5 border border-white/10 rounded-2xl p-5 text-center">
              <div className="text-3xl font-bold" style={{ color }}>{value}</div>
              <div className="text-slate-400 text-sm mt-1">{label}</div>
            </div>
          ))}
        </div>

        {completed.length === 0 ? (
          <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
            <div className="text-5xl mb-4">📊</div>
            <p className="text-slate-400">No completed sessions yet to analyze.</p>
          </div>
        ) : (
          <>
            {/* CLASS METRIC AVERAGES */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
              <h2 className="text-white font-bold mb-5">📊 Class Average — All Metrics</h2>
              <div className="space-y-3">
                {METRICS.map(({ key, label, color }) => {
                  const val = classAvg[key] ?? 0;
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-white text-sm font-medium">{label}</span>
                        <span className="text-sm font-bold" style={{ color: scoreColor(val) }}>{val}</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${val}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* STUDENT LEADERBOARD */}
            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-white font-bold">🏆 Student Leaderboard</h2>
              </div>
              <div className="divide-y divide-white/5">
                {studentStats.map((s, i) => (
                  <div key={s.studentId} className="p-4 flex items-center gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                      style={{
                        background: i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "rgba(255,255,255,0.1)",
                        color: i < 3 ? "#000" : "#fff",
                      }}
                    >
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-white font-medium font-mono text-sm">{s.studentId}</div>
                      <div className="text-slate-500 text-xs">{s.sessions} session{s.sessions !== 1 ? "s" : ""}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold" style={{ color: scoreColor(s.avg) }}>
                        {s.avg ?? "—"}
                      </div>
                      <div className="text-slate-500 text-xs">avg</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-400">{s.best ?? "—"}</div>
                      <div className="text-slate-500 text-xs">best</div>
                    </div>
                    <div className="w-24">
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${s.avg ?? 0}%`, background: scoreColor(s.avg) }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </TeacherLayout>
  );
}