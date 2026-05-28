import StudentSidebar
from "./StudentSidebar";

import StudentNavbar
from "./StudentNavbar";

export default function StudentLayout({

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
      <StudentSidebar />

      {/* MAIN */}
      <div
        className="
          flex-1
          flex
          flex-col
        "
      >

        {/* NAVBAR */}
        <StudentNavbar />

        {/* PAGE CONTENT */}
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