import {

  NavLink

} from "react-router-dom";

import {

  LayoutDashboard,
  Users,
  Mic,
  FileText,
  BarChart3,
  User,
  LogOut,

} from "lucide-react";

import {

  useAuth

} from "../../../context/AuthContext";

const menuItems = [

  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/teacher",
  },

  {
    title: "Students",
    icon: Users,
    path: "/teacher/students",
  },

  {
    title: "Debate Sessions",
    icon: Mic,
    path: "/teacher/debates",
  },

  {
    title: "Reports",
    icon: FileText,
    path: "/teacher/reports",
  },

  {
    title: "Analytics",
    icon: BarChart3,
    path: "/teacher/analytics",
  },

  {
    title: "Profile",
    icon: User,
    path: "/teacher/profile",
  },
];

export default function TeacherSidebar() {

  const {

    logout

  } = useAuth();

  return (

    <div
      className="
        w-[280px]
        min-h-screen
        bg-[#111827]
        border-r
        border-white/10
        flex
        flex-col
        justify-between
        p-6
      "
    >

      {/* TOP */}
      <div>

        {/* LOGO */}
        <div
          className="
            mb-10
          "
        >

          <h1
            className="
              text-4xl
              font-extrabold
              bg-gradient-to-r
              from-cyan-400
              to-violet-400
              bg-clip-text
              text-transparent
            "
          >
            SYNYCS
          </h1>

          <p
            className="
              text-slate-400
              mt-2
            "
          >
            Teacher Panel
          </p>

        </div>

        {/* MENU */}
        <div
          className="
            space-y-3
          "
        >

          {
            menuItems.map((item) => {

              const Icon = item.icon;

              return (

                <NavLink

                  key={item.title}

                  to={item.path}

                  className={({ isActive }) =>

                    `
                      flex
                      items-center
                      gap-4
                      px-5
                      py-4
                      rounded-2xl
                      transition-all

                      ${
                        isActive

                        ? "bg-cyan-600 text-white"

                        : "hover:bg-white/5 text-slate-300"
                      }
                    `
                  }
                >

                  <Icon size={22} />

                  <span
                    className="
                      font-medium
                    "
                  >
                    {item.title}
                  </span>

                </NavLink>
              );
            })
          }

        </div>

      </div>

      {/* LOGOUT */}
      <button

        onClick={logout}

        className="
          flex
          items-center
          gap-4
          px-5
          py-4
          rounded-2xl
          bg-red-500/20
          hover:bg-red-500/30
          text-red-400
          transition-all
        "
      >

        <LogOut size={22} />

        <span
          className="
            font-medium
          "
        >
          Logout
        </span>

      </button>

    </div>
  );
}