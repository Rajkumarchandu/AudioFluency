import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "react-toastify";
import { registerUser } from "../../services/authService";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "student",
  });

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!form.name.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!form.email.trim()) {
      toast.error("Please enter your email");
      return;
    }
    if (form.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const data = await registerUser(
        form.name,
        form.email,
        form.password,
        form.role
      );

      toast.success(
        `Registration successful! Your Student ID: ${data.student_id || "N/A"}`
      );

      // Redirect to login after 2 seconds
      setTimeout(() => navigate("/login"), 2000);

    } catch (error) {
      toast.error(error.response?.data?.detail || "Registration failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* LOGO */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white tracking-wide">
            SYN<span className="text-purple-500">YCS</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            Audio Fluency System
          </p>
        </div>

        {/* CARD */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-8">

          <h2 className="text-2xl font-bold text-white mb-1">
            Create Account
          </h2>
          <p className="text-slate-400 text-sm mb-6">
            Fill in your details to get started
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* ROLE SELECTOR */}
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-2 block">
                I am a
              </label>
              <div className="grid grid-cols-2 gap-3">
                {["student", "teacher"].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm({ ...form, role: r })}
                    className={`py-3 rounded-xl border font-semibold capitalize transition ${
                      form.role === r
                        ? "bg-purple-600 border-purple-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                    }`}
                  >
                    {r === "student" ? "🎓 Student" : "👨‍🏫 Teacher"}
                  </button>
                ))}
              </div>
            </div>

            {/* NAME */}
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                Full Name
              </label>
              <input
                type="text"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Arjun Kumar"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* EMAIL */}
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* PASSWORD */}
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 6 characters"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* CONFIRM PASSWORD */}
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                Confirm Password
              </label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repeat your password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition"
              />
            </div>

            {/* SUBMIT */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white font-bold text-lg transition mt-2"
            >
              {loading ? "⏳ Creating account..." : "Create Account →"}
            </button>

          </form>

          {/* LOGIN LINK */}
          <p className="text-center text-slate-500 text-sm mt-6">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-purple-400 hover:text-purple-300 font-medium"
            >
              Sign in
            </Link>
          </p>

          {/* NOTE FOR STUDENTS */}
          {form.role === "student" && (
            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
              <p className="text-blue-400 text-xs text-center">
                💡 A unique Student ID will be auto-generated for you after registration
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}