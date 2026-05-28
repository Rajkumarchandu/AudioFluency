import { useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { resetPassword } from "../../services/authService";

export default function ResetPasswordPage() {
  const [searchParams]          = useSearchParams();
  const token                   = searchParams.get("token");
  const navigate                = useNavigate();

  const [password, setPassword]         = useState("");
  const [confirm, setConfirm]           = useState("");
  const [showPass, setShowPass]         = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [success, setSuccess]           = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) return setError("Password must be at least 6 characters");
    if (password !== confirm) return setError("Passwords do not match");
    if (!token) return setError("Invalid or missing reset token");

    setLoading(true);
    setError("");
    try {
      await resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate("/login"), 3000);
    } catch (e) {
      setError(e.response?.data?.detail || "Reset failed. The link may have expired.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#050816] flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-violet-700/30 blur-[180px] rounded-full" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-cyan-500/20 blur-[180px] rounded-full" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-[0_0_50px_rgba(139,92,246,0.25)]">

          {success ? (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">✅</div>
              <h2 className="text-white font-bold text-2xl mb-3">Password Reset!</h2>
              <p className="text-slate-400 text-sm">
                Your password has been updated successfully.
              </p>
              <p className="text-slate-500 text-xs mt-2">
                Redirecting to login in 3 seconds...
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  SYNYCS
                </h1>
                <h2 className="text-white font-bold text-2xl mt-4">Reset Password</h2>
                <p className="text-slate-400 text-sm mt-2">Enter your new password below.</p>
              </div>

              {!token && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-4 mb-5">
                  <p className="text-red-400 text-sm text-center">
                    Invalid reset link. Please request a new one.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">

                {/* NEW PASSWORD */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                    New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPass ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full p-4 pr-12 rounded-2xl bg-white/10 border border-white/10 outline-none text-white placeholder:text-slate-400 focus:border-violet-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-lg"
                    >
                      {showPass ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {/* CONFIRM PASSWORD */}
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      required
                      className="w-full p-4 pr-12 rounded-2xl bg-white/10 border border-white/10 outline-none text-white placeholder:text-slate-400 focus:border-violet-500 transition"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-lg"
                    >
                      {showConfirm ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p className="text-red-400 text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-lg text-white shadow-lg disabled:opacity-50 transition"
                >
                  {loading ? "⏳ Resetting..." : "🔐 Reset Password"}
                </button>
              </form>
            </>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-slate-500 hover:text-slate-300 text-sm transition">
              ← Back to Login
            </Link>
          </div>
        </div>
      </motion.div>
    </div>
  );
}