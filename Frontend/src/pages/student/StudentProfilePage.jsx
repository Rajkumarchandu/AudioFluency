import { useState, useEffect } from "react";
import StudentLayout from "../../components/layout/student/StudentLayout";
import { useAuth } from "../../context/AuthContext";
import { getStudentTrends } from "../../services/analyticsService";
import { getStudentStatus } from "../../services/audioService";
import { parseScores, scoreColor } from "../../utils/scoreHelpers";
import API from "../../services/api";

export default function StudentProfilePage() {
  const { user, login } = useAuth();
  const [profile, setProfile] = useState({
    name:      user?.name || "",
    email:     user?.email || "",
    studentId: user?.studentId || "",
    phone:     "",
    college:   "",
    course:    "",
    year:      "",
    bio:       "",
  });
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [loading, setLoading]   = useState(true);
  const [toast, setToast]       = useState(null);
  const [avgScores, setAvgScores] = useState(null);
  const [sessionCount, setSessionCount] = useState(0);
  const [userId, setUserId]     = useState(null);

  useEffect(() => {
    if (user?.studentId) {
      fetchProfile();
      fetchStats();
    }
  }, [user]);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchProfile() {
    setLoading(true);
    try {
      const data = await API.get(`/auth/profile/${user.studentId}`);
      const p = data.data;
      setUserId(p.id);
      setProfile({
        name:      p.name || "",
        email:     p.email || "",
        studentId: p.student_id || "",
        phone:     p.phone || "",
        college:   p.college || "",
        course:    p.course || "",
        year:      p.year || "",
        bio:       p.bio || "",
      });
    } catch (e) {
      // fallback to auth context
      setProfile((prev) => ({
        ...prev,
        name:  user?.name || "",
        email: user?.email || "",
        studentId: user?.studentId || "",
      }));
    } finally {
      setLoading(false);
    }
  }

  async function fetchStats() {
    try {
      const [statusData, trendsData] = await Promise.all([
        getStudentStatus(user.studentId).catch(() => []),
        getStudentTrends(user.studentId).catch(() => null),
      ]);
      setSessionCount(statusData.filter((s) => s.status === "completed").length);
      if (trendsData?.averages) setAvgScores(trendsData.averages);
    } catch (e) {}
  }

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    if (!userId) return showToast("Cannot update — user ID not found", "err");
    setSaving(true);
    try {
      const data = await API.patch(`/auth/profile/${userId}`, {
        name:    profile.name,
        phone:   profile.phone,
        college: profile.college,
        course:  profile.course,
        year:    profile.year,
        bio:     profile.bio,
      });

      // Update localStorage so navbar shows new name
      const stored = JSON.parse(localStorage.getItem("synycs_user") || "{}");
      stored.name = data.data.name;
      localStorage.setItem("synycs_user", JSON.stringify(stored));

      setEditing(false);
      showToast("Profile updated successfully!");
    } catch (e) {
      showToast(e.response?.data?.detail || "Update failed", "err");
    } finally {
      setSaving(false);
    }
  }

  const METRICS = [
    { key: "pronunciation", label: "Pronunciation", color: "#ff375f" },
    { key: "fluency",       label: "Fluency",       color: "#30d158" },
    { key: "grammar",       label: "Grammar",       color: "#0a84ff" },
    { key: "confidence",    label: "Confidence",    color: "#ff9f0a" },
    { key: "clarity",       label: "Clarity",       color: "#bf5af2" },
    { key: "communication", label: "Communication", color: "#64d2ff" },
  ];

  return (
    <StudentLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">👤 My Profile</h1>
            <p className="text-slate-400 mt-1">Manage your personal and academic information</p>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); fetchProfile(); }}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 transition font-semibold text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 transition font-semibold text-sm text-white"
                >
                  {saving ? "⏳ Saving..." : "✅ Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 transition font-semibold text-sm text-white"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading profile...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT — AVATAR + QUICK INFO */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 flex items-center justify-center text-4xl font-black text-white mb-4 shadow-xl">
                  {(profile.name || "?")[0].toUpperCase()}
                </div>
                <h2 className="text-white font-bold text-xl">{profile.name || "—"}</h2>
                <p className="text-slate-400 text-sm mt-1">{profile.course || "Student"}</p>
                <div className="mt-4 w-full space-y-2">
                  {[
                    { label: "Student ID",  value: profile.studentId },
                    { label: "Year",        value: profile.year || "—" },
                    { label: "College",     value: profile.college || "—" },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white/5 rounded-xl p-3 text-left">
                      <div className="text-slate-500 text-xs">{label}</div>
                      <div className="text-white text-sm font-medium mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* STATS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-3">📊 Quick Stats</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Sessions Done</span>
                    <span className="text-purple-400 font-bold">{sessionCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400 text-sm">Avg Overall</span>
                    <span className="font-bold" style={{ color: scoreColor(avgScores?.overall_score) }}>
                      {avgScores?.overall_score ?? "—"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT — FORM */}
            <div className="lg:col-span-2 space-y-5">

              {/* PERSONAL INFO */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold text-lg mb-5">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name",    name: "name",    type: "text",  placeholder: "Your full name" },
                    { label: "Email",        name: "email",   type: "email", placeholder: "your@email.com", disabled: true },
                    { label: "Phone",        name: "phone",   type: "text",  placeholder: "+91 9876543210" },
                    { label: "Course",       name: "course",  type: "text",  placeholder: "B.Tech CSE" },
                    { label: "College",      name: "college", type: "text",  placeholder: "University name" },
                    { label: "Year",         name: "year",    type: "text",  placeholder: "1st / 2nd / 3rd / 4th" },
                  ].map(({ label, name, type, placeholder, disabled }) => (
                    <div key={name}>
                      <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                        {label}
                      </label>
                      <input
                        type={type}
                        name={name}
                        value={profile[name] || ""}
                        onChange={handleChange}
                        disabled={!editing || disabled}
                        placeholder={placeholder}
                        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition ${
                          editing && !disabled
                            ? "bg-white/10 border border-purple-500/50 text-white placeholder-slate-500 focus:border-purple-400"
                            : "bg-white/5 border border-white/10 text-slate-300"
                        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  ))}
                </div>

                {/* BIO */}
                <div className="mt-4">
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={profile.bio || ""}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="Tell us about yourself..."
                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition resize-none ${
                      editing
                        ? "bg-white/10 border border-purple-500/50 text-white placeholder-slate-500 focus:border-purple-400"
                        : "bg-white/5 border border-white/10 text-slate-300"
                    }`}
                  />
                </div>
              </div>

              {/* PERFORMANCE METRICS */}
              {avgScores && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                  <h3 className="text-white font-bold text-lg mb-5">🎯 Average Performance</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {METRICS.map(({ key, label, color }) => (
                      <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
                        <div className="text-slate-400 text-xs mb-1">{label}</div>
                        <div className="text-2xl font-bold" style={{ color }}>
                          {avgScores[key] ?? "—"}
                        </div>
                        <div className="mt-2 h-1.5 bg-white/10 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${avgScores[key] ?? 0}%`, background: color }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl text-white text-sm font-medium shadow-xl ${
          toast.type === "err" ? "bg-red-600" : "bg-green-600"
        }`}>
          {toast.msg}
        </div>
      )}
    </StudentLayout>
  );
}