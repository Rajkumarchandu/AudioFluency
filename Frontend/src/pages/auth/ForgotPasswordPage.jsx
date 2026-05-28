import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { forgotPassword } from "../../services/authService";

export default function ForgotPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return setError("Please enter your email");
    setLoading(true);
    setError("");
    try {
      await forgotPassword(email.trim());
      setSent(true);
    } catch (e) {
      setError(e.response?.data?.detail || "Something went wrong. Try again.");
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

          {!sent ? (
            <>
              {/* HEADER */}
              <div className="mb-8">
                <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent mb-2">
                  SYNYCS
                </h1>
                <h2 className="text-white font-bold text-2xl mt-4">Forgot Password?</h2>
                <p className="text-slate-400 text-sm mt-2">
                  Enter your registered email and we'll send you a reset link.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none text-white placeholder:text-slate-400 focus:border-violet-500 transition"
                  />
                  {error && <p className="text-red-400 text-sm mt-2">{error}</p>}
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-lg text-white shadow-lg disabled:opacity-50 transition"
                >
                  {loading ? "⏳ Sending..." : "📧 Send Reset Link"}
                </button>
              </form>
            </>
          ) : (
            /* SUCCESS STATE */
            <div className="text-center py-4">
              <div className="text-6xl mb-4">📬</div>
              <h2 className="text-white font-bold text-2xl mb-3">Check Your Email!</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                We've sent a password reset link to
              </p>
              <p className="text-white font-semibold mb-6">{email}</p>
              <p className="text-slate-500 text-xs mb-8">
                The link expires in 30 minutes. Check your spam folder if you don't see it.
              </p>
              <button
                onClick={() => { setSent(false); setEmail(""); }}
                className="text-violet-400 hover:text-violet-300 text-sm transition"
              >
                ← Try a different email
              </button>
            </div>
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