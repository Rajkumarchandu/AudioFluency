import {

  Bell,
  Search,

} from "lucide-react";

import {

  useAuth

} from "../../../context/AuthContext";

export default function StudentNavbar() {

  const {

    user

  } = useAuth();

  return (

    <div
      className="
        w-full
        h-[90px]
        bg-[#111827]
        border-b
        border-white/10
        flex
        items-center
        justify-between
        px-8
      "
    >

      {/* SEARCH */}
      <div
        className="
          relative
          w-[400px]
        "
      >

        <Search
          size={20}
          className="
            absolute
            left-4
            top-1/2
            -translate-y-1/2
            text-slate-400
          "
        />

        <input

          type="text"

          placeholder="Search sessions, reports..."

          className="
            w-full
            bg-white/5
            border
            border-white/10
            rounded-2xl
            py-4
            pl-12
            pr-5
            outline-none
            text-white
            placeholder:text-slate-500
            focus:border-violet-500
            transition-all
          "
        />

      </div>

      {/* RIGHT SECTION */}
      <div
        className="
          flex
          items-center
          gap-5
        "
      >

        {/* NOTIFICATION */}
        <button
          className="
            relative
            w-14
            h-14
            rounded-2xl
            bg-white/5
            border
            border-white/10
            flex
            items-center
            justify-center
            hover:bg-white/10
            transition-all
          "
        >

          <Bell
            size={22}
            className="text-white"
          />

          {/* DOT */}
          <span
            className="
              absolute
              top-3
              right-3
              w-3
              h-3
              bg-red-500
              rounded-full
            "
          />

        </button>

        {/* PROFILE */}
        <div
          className="
            flex
            items-center
            gap-4
            bg-white/5
            border
            border-white/10
            px-5
            py-3
            rounded-2xl
          "
        >

          {/* AVATAR */}
          <div
            className="
              w-12
              h-12
              rounded-full
              bg-gradient-to-r
              from-violet-500
              to-cyan-500
              flex
              items-center
              justify-center
              font-bold
              text-lg
            "
          >

            {
              user?.email?.charAt(0)?.toUpperCase()
            }

          </div>

          {/* USER INFO */}
          <div>

            <h3
              className="
                font-semibold
                text-white
              "
            >
              {user?.email}
            </h3>

            <p
              className="
                text-sm
                text-slate-400
              "
            >
              Student
            </p>

          </div>

        </div>

      </div>

    </div>
  );
}