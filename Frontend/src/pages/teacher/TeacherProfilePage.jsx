import { useState, useEffect } from "react";
import TeacherLayout from "../../components/layout/teacher/TeacherLayout";
import { useAuth } from "../../context/AuthContext";
import API from "../../services/api";

export default function TeacherProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState({
    name:    user?.name || "",
    email:   user?.email || "",
    phone:   "",
    college: "",
    bio:     "",
  });
  const [userId, setUserId]   = useState(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast]     = useState(null);
  const [stats, setStats]     = useState({ students: 0, submissions: 0 });

  useEffect(() => {
    fetchProfile();
    loadStats();
  }, []);

  function showToast(msg, type = "ok") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function fetchProfile() {
    setLoading(true);
    try {
      const res = await API.get(`/auth/teacher-profile/${user?.email}`);
      const p = res.data;
      setUserId(p.id);
      setProfile({
        name:    p.name || "",
        email:   p.email || "",
        phone:   p.phone || "",
        college: p.college || "",
        bio:     p.bio || "",
      });
    } catch (e) {
      setProfile((prev) => ({
        ...prev,
        name:  user?.name || "",
        email: user?.email || "",
      }));
    } finally {
      setLoading(false);
    }
  }

  function loadStats() {
    const subs = JSON.parse(localStorage.getItem("teacher_submissions") || "[]");
    const students = new Set(subs.map((s) => s.student_id)).size;
    setStats({ students, submissions: subs.length });
  }

  function handleChange(e) {
    setProfile({ ...profile, [e.target.name]: e.target.value });
  }

  async function handleSave() {
    if (!userId) return showToast("Cannot update — user ID not found", "err");
    setSaving(true);
    try {
      await API.patch(`/auth/profile/${userId}`, {
        name:    profile.name,
        phone:   profile.phone,
        college: profile.college,
        bio:     profile.bio,
      });
      const stored = JSON.parse(localStorage.getItem("synycs_user") || "{}");
      stored.name = profile.name;
      localStorage.setItem("synycs_user", JSON.stringify(stored));
      setEditing(false);
      showToast("Profile updated successfully!");
    } catch (e) {
      showToast(e.response?.data?.detail || "Update failed", "err");
    } finally {
      setSaving(false);
    }
  }

  return (
    <TeacherLayout>
      <div className="space-y-8">

        {/* HEADER */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-4xl font-bold text-white">👨‍🏫 Teacher Profile</h1>
            <p className="text-slate-400 mt-1">Manage your account information</p>
          </div>
          <div className="flex gap-3">
            {editing ? (
              <>
                <button
                  onClick={() => { setEditing(false); fetchProfile(); }}
                  className="px-5 py-2.5 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 font-semibold text-sm transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-semibold text-sm transition"
                >
                  {saving ? "⏳ Saving..." : "✅ Save Changes"}
                </button>
              </>
            ) : (
              <button
                onClick={() => setEditing(true)}
                className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold text-sm transition"
              >
                ✏️ Edit Profile
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT */}
            <div className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 flex flex-col items-center text-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-500 to-violet-600 flex items-center justify-center text-4xl font-black text-white mb-4">
                  {(profile.name || "T")[0].toUpperCase()}
                </div>
                <h2 className="text-white font-bold text-xl">{profile.name}</h2>
                <p className="text-slate-400 text-sm mt-1">Teacher</p>
                <div className="mt-4 w-full space-y-2">
                  <div className="bg-white/5 rounded-xl p-3 text-left">
                    <div className="text-slate-500 text-xs">Email</div>
                    <div className="text-white text-sm font-medium mt-0.5 break-all">{profile.email}</div>
                  </div>
                  {profile.college && (
                    <div className="bg-white/5 rounded-xl p-3 text-left">
                      <div className="text-slate-500 text-xs">Institution</div>
                      <div className="text-white text-sm font-medium mt-0.5">{profile.college}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* STATS */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                <h3 className="text-white font-bold mb-3">📊 My Stats</h3>
                <div className="space-y-2">
                  {[
                    { label: "Students Managed", value: stats.students, color: "#22d3ee" },
                    { label: "Total Submissions", value: stats.submissions, color: "#a78bfa" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="flex justify-between items-center">
                      <span className="text-slate-400 text-sm">{label}</span>
                      <span className="font-bold text-lg" style={{ color }}>{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* RIGHT — FORM */}
            <div className="lg:col-span-2">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                <h3 className="text-white font-bold text-lg mb-5">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name",    name: "name",    type: "text",  placeholder: "Your full name" },
                    { label: "Email",        name: "email",   type: "email", placeholder: "your@email.com", disabled: true },
                    { label: "Phone",        name: "phone",   type: "text",  placeholder: "+91 9876543210" },
                    { label: "Institution",  name: "college", type: "text",  placeholder: "University / School name" },
                  ].map(({ label, name, type, placeholder, disabled }) => (
                    <div key={name}>
                      <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">{label}</label>
                      <input
                        type={type}
                        name={name}
                        value={profile[name] || ""}
                        onChange={handleChange}
                        disabled={!editing || disabled}
                        placeholder={placeholder}
                        className={`w-full rounded-xl px-4 py-3 text-sm outline-none transition ${
                          editing && !disabled
                            ? "bg-white/10 border border-purple-500/50 text-white placeholder-slate-500"
                            : "bg-white/5 border border-white/10 text-slate-300"
                        } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-4">
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">Bio</label>
                  <textarea
                    name="bio"
                    rows={4}
                    value={profile.bio || ""}
                    onChange={handleChange}
                    disabled={!editing}
                    placeholder="Tell us about yourself..."
                    className={`w-full rounded-xl px-4 py-3 text-sm outline-none resize-none transition ${
                      editing
                        ? "bg-white/10 border border-purple-500/50 text-white placeholder-slate-500"
                        : "bg-white/5 border border-white/10 text-slate-300"
                    }`}
                  />
                </div>
              </div>
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