import TeacherSidebar
from "./TeacherSidebar";

import TeacherNavbar
from "./TeacherNavbar";

export default function TeacherLayout({

  children

}) {

  return (

    <div
      className="
        min-h-screen
        bg-[#0B1120]
        flex
        text-white
      "
    >

      {/* SIDEBAR */}
      <TeacherSidebar />

      {/* MAIN */}
      <div
        className="
          flex-1
          flex
          flex-col
        "
      >

        {/* NAVBAR */}
        <TeacherNavbar />

        {/* CONTENT */}
        <div
          className="
            flex-1
            p-8
            overflow-y-auto
          "
        >

          {children}

        </div>

      </div>

    </div>
  );
}