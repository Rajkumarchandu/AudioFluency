import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Mic,
  FileText,
  BarChart3,
  User,
  LogOut,
  Swords,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";

const menuItems = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/student",
  },
  {
    title: "Live Session",
    icon: Mic,
    path: "/student/live-session",
  },
  {
    title: "Join Debate",
    icon: Swords,
    path: "/student/join-debate",
    highlight: true,
  },
  {
    title: "Reports",
    icon: FileText,
    path: "/student/reports",
  },
  {
    title: "Analytics",
    icon: BarChart3,
    path: "/student/analytics",
  },
  {
    title: "Profile",
    icon: User,
    path: "/student/profile",
  },
];

export default function StudentSidebar() {
  const { logout } = useAuth();

  return (
    <div className="w-[280px] min-h-screen bg-[#111827] border-r border-white/10 flex flex-col justify-between p-6">

      {/* TOP */}
      <div>

        {/* LOGO */}
        <div className="mb-10">
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
            SYNYCS
          </h1>
          <p className="text-slate-400 mt-2">Student Panel</p>
        </div>

        {/* MENU */}
        <div className="space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.title}
                to={item.path}
                end={item.path === "/student"}
                className={({ isActive }) =>
                  `flex items-center gap-4 px-5 py-4 rounded-2xl transition-all duration-300 ${
                    isActive
                      ? "bg-violet-600 text-white"
                      : item.highlight
                      ? "bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20"
                      : "hover:bg-white/5 text-slate-300"
                  }`
                }
              >
                <Icon size={22} />
                <span className="font-medium">{item.title}</span>
                {item.highlight && (
                  <span className="ml-auto text-xs bg-cyan-500/20 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
                    LIVE
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>

      {/* LOGOUT */}
      <button
        onClick={logout}
        className="flex items-center gap-4 px-5 py-4 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
      >
        <LogOut size={22} />
        <span className="font-medium">Logout</span>
      </button>

    </div>
  );
}