import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();

  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole]         = useState("student");
  const [loading, setLoading]   = useState(false);
  const [showPass, setShowPass] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await login(email, password, role);
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#050816] overflow-hidden relative text-white grid grid-cols-1 lg:grid-cols-2">

      {/* GLOW */}
      <div className="absolute top-[-200px] left-[-200px] w-[500px] h-[500px] bg-violet-700/30 blur-[180px] rounded-full" />
      <div className="absolute bottom-[-200px] right-[-200px] w-[500px] h-[500px] bg-cyan-500/20 blur-[180px] rounded-full" />

      {/* LEFT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: -100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="hidden lg:flex items-center justify-center p-10 relative"
      >
        <div className="w-full h-full rounded-[40px] bg-white/5 border border-white/10 backdrop-blur-2xl flex flex-col items-center justify-center overflow-hidden relative p-12 text-center">
          <div className="absolute w-[450px] h-[450px] bg-violet-600/20 blur-[120px] rounded-full" />
          <motion.img
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2 }}
            src="https://cdn-icons-png.flaticon.com/512/4712/4712027.png"
            alt="AI"
            className="w-[55%] z-10 drop-shadow-[0_0_50px_rgba(139,92,246,0.8)] mb-8"
          />
          <h2 className="text-3xl font-black text-white z-10 mb-2">SYNYCS</h2>
          <p className="text-slate-400 text-sm z-10 leading-relaxed max-w-xs">
            Audio Fluency Capture & Analysis System
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 z-10 w-full max-w-xs">
            {[
              { icon: "🎙", label: "Record" },
              { icon: "🤖", label: "Analyze" },
              { icon: "📊", label: "Improve" },
            ].map(({ icon, label }) => (
              <div key={label} className="bg-white/5 rounded-2xl p-3 text-center border border-white/10">
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-slate-400 text-xs">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* RIGHT SIDE */}
      <motion.div
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 1 }}
        className="flex items-center justify-center p-6 lg:p-12 relative z-10"
      >
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[40px] p-10 shadow-[0_0_50px_rgba(139,92,246,0.25)]"
        >
          {/* TITLE */}
          <h1 className="text-5xl font-extrabold mb-1 bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SYNYCS
          </h1>
          <p className="text-slate-400 mb-8 text-sm">
            Audio Fluency Capture & Analysis System
          </p>

          {/* ROLE SELECTOR */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {["student", "teacher"].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className={`py-3 rounded-2xl border font-semibold capitalize transition ${
                  role === r
                    ? "bg-violet-600 border-violet-500 text-white"
                    : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                }`}
              >
                {r === "student" ? "🎓 Student" : "👨‍🏫 Teacher"}
              </button>
            ))}
          </div>

          {/* EMAIL */}
          <div className="mb-5">
            <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
              Email
            </label>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 rounded-2xl bg-white/10 border border-white/10 outline-none text-white placeholder:text-slate-400 focus:border-violet-500 transition"
            />
          </div>

          {/* PASSWORD WITH SHOW/HIDE */}
          <div className="mb-2">
            <label className="text-slate-400 text-xs uppercase tracking-wider mb-1 block">
              Password
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full p-4 pr-14 rounded-2xl bg-white/10 border border-white/10 outline-none text-white placeholder:text-slate-400 focus:border-violet-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition text-xl select-none"
                tabIndex={-1}
              >
                {showPass ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          {/* FORGOT PASSWORD */}
          <div className="flex justify-end mb-8">
            <Link
              to="/forgot-password"
              className="text-violet-400 hover:text-violet-300 text-sm transition"
            >
              Forgot password?
            </Link>
          </div>

          {/* LOGIN BUTTON */}
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 font-bold text-lg shadow-lg disabled:opacity-50 transition text-white"
          >
            {loading ? "⏳ Signing in..." : "Login →"}
          </motion.button>

          {/* REGISTER LINK */}
          <p className="text-center text-slate-500 text-sm mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-violet-400 hover:text-violet-300 font-medium">
              Register here
            </Link>
          </p>

        </form>
      </motion.div>
    </div>
  );
}