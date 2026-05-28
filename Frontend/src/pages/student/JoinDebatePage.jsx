import { useState, useEffect, useRef } from "react";

import StudentLayout from "../../components/layout/student/StudentLayout";

import { useAuth } from "../../context/AuthContext";

import {

  joinDebateRoom,
  getDebateRoom

} from "../../services/audioService";

import {

  getStudentReports

} from "../../services/reportService";

import {

  scoreColor

} from "../../utils/scoreHelpers";


const SPEAKER_COLORS = [

  "#ff375f",
  "#30d158",
  "#0a84ff",
  "#ff9f0a",
  "#bf5af2",
  "#64d2ff",
];


export default function JoinDebatePage() {

  const { user } = useAuth();

  const [code, setCode] = useState("");

  const [joining, setJoining] = useState(false);

  const [room, setRoom] = useState(null);

  const [error, setError] = useState("");

  const [polling, setPolling] = useState(false);

  const [report, setReport] = useState(null);

  const [checkingReport, setCheckingReport] = useState(false);

  const pollRef = useRef(null);


  useEffect(() => {

    return () => clearInterval(pollRef.current);

  }, []);


  // JOIN ROOM
  async function handleJoin() {

    const trimmed =
      code.trim().toUpperCase();

    if (!trimmed) {

      return setError(
        "Please enter a room code"
      );
    }

    if (!trimmed.startsWith("DEB-")) {

      return setError(
        "Invalid code format"
      );
    }

    setJoining(true);

    setError("");

    try {

      const data = await joinDebateRoom(

        trimmed,
        user.studentId,
        user.name
      );

      setRoom(data);

      if (
        data.status === "completed"
      ) {

        checkForMyReport();

      } else {

        startPollingRoom(trimmed);
      }

    }

    catch (e) {

      setError(

        e.response?.data?.detail ||

        "Could not join room"
      );
    }

    finally {

      setJoining(false);
    }
  }


  // POLLING
  function startPollingRoom(roomCode) {

    setPolling(true);

    clearInterval(pollRef.current);

    pollRef.current = setInterval(

      async () => {

        try {

          const data =
            await getDebateRoom(
              roomCode
            );

          setRoom(data);

          if (
            data.status === "completed"
          ) {

            clearInterval(
              pollRef.current
            );

            setPolling(false);

            checkForMyReport();
          }

        }

        catch (e) {

          console.error(e);
        }

      },

      5000
    );
  }


  // CHECK REPORT
  async function checkForMyReport() {

    setCheckingReport(true);

    try {

      const reports =
        await getStudentReports(
          user.studentId
        );

      if (reports?.length > 0) {

        setReport(reports[0]);
      }

    }

    catch (e) {

      console.error(e);
    }

    finally {

      setCheckingReport(false);
    }
  }


  // FORMAT CODE
  function formatCode(value) {

    const clean = value

      .toUpperCase()

      .replace(
        /[^A-Z0-9-]/g,
        ""
      );

    setCode(clean);
  }


  const METRICS = [

    "pronunciation",
    "fluency",
    "grammar",
    "confidence",
    "clarity",
    "communication",
  ];


  return (

    <StudentLayout>

      <div className="space-y-8 max-w-3xl mx-auto">

        {/* HEADER */}
        <div>

          <h1 className="text-5xl font-black text-white mb-3">

            🎭 Join Debate

          </h1>

          <p className="text-slate-400 text-lg">

            Join live debate sessions and receive AI feedback.

          </p>

        </div>


        {/* JOIN FORM */}
        {!room && (

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-6">

            <div className="text-center">

              <div className="text-6xl mb-4">

                🎤

              </div>

              <p className="text-slate-400">

                Enter debate room code

              </p>

            </div>

            <input

              value={code}

              onChange={(e) =>
                formatCode(e.target.value)
              }

              placeholder="DEB-XXXXXX"

              className="
                w-full
                bg-white/5
                border
                border-white/10
                rounded-2xl
                px-5
                py-5
                text-center
                text-2xl
                font-mono
                text-white
                tracking-widest
                outline-none
              "
            />

            {error && (

              <p className="text-red-400 text-center">

                {error}

              </p>
            )}

            <button

              onClick={handleJoin}

              disabled={joining}

              className="
                w-full
                py-4
                rounded-2xl
                bg-gradient-to-r
                from-violet-600
                to-cyan-600
                hover:opacity-90
                transition
                text-white
                font-black
                text-lg
              "
            >

              {
                joining

                ? "⏳ Joining..."

                : "🚀 Join Debate"
              }

            </button>

          </div>
        )}


        {/* WAITING */}
        {room && room.status === "waiting" && (

          <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-3xl p-8 text-center">

            <div className="text-5xl mb-4">

              ⏳

            </div>

            <h2 className="text-white text-3xl font-black mb-2">

              Waiting for Teacher

            </h2>

            <p className="text-slate-400">

              Room: {room.code}

            </p>

            <p className="text-slate-400 mt-2">

              Teacher: {room.teacher_name}

            </p>

            <button

              onClick={() =>
                startPollingRoom(
                  room.code
                )
              }

              className="
                mt-5
                px-6
                py-3
                rounded-2xl
                bg-white/5
                border
                border-white/10
                text-white
                hover:bg-white/10
                transition
              "
            >

              {
                polling

                ? "🔄 Checking..."

                : "↻ Refresh Status"
              }

            </button>

          </div>
        )}


        {/* RECORDING */}
        {room && room.status === "recording" && (

          <div className="bg-red-500/10 border border-red-500/20 rounded-3xl p-10 text-center">

            <div className="w-5 h-5 rounded-full bg-red-500 animate-ping mx-auto mb-5" />

            <h2 className="text-white text-3xl font-black">

              🔴 Debate Live

            </h2>

            <p className="text-slate-400 mt-3">

              Speak clearly. AI is analyzing your communication.

            </p>

          </div>
        )}


        {/* COMPLETED */}
        {room && room.status === "completed" && !report && (

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-3xl p-8 text-center">

            <div className="text-5xl mb-4">

              📊

            </div>

            <h2 className="text-white text-3xl font-black">

              Debate Completed

            </h2>

            <p className="text-slate-400 mt-3">

              Waiting for your teacher report.

            </p>

            <button

              onClick={checkForMyReport}

              disabled={checkingReport}

              className="
                mt-5
                px-6
                py-3
                rounded-2xl
                bg-purple-600
                hover:bg-purple-700
                text-white
                font-bold
                transition
              "
            >

              {
                checkingReport

                ? "⏳ Checking..."

                : "🔍 Check Report"
              }

            </button>

          </div>
        )}


        {/* REPORT */}
        {report && (

          <div className="space-y-5">

            {/* SUCCESS */}
            <div className="bg-green-500/10 border border-green-500/20 rounded-3xl p-8 text-center">

              <div className="text-5xl mb-3">

                🎉

              </div>

              <h2 className="text-white text-3xl font-black">

                Report Received

              </h2>

              <p className="text-slate-400 mt-2">

                Sent by {report.sent_by}

              </p>

            </div>


            {/* OVERALL SCORE */}
            {report.report_data?.scores && (

              <div className="bg-white/5 border border-white/10 rounded-3xl p-8 text-center">

                <div className="text-slate-400 mb-2">

                  Overall Score

                </div>

                <div

                  className="text-7xl font-black"

                  style={{

                    color: scoreColor(

                      report.report_data.scores
                        .overall_score
                    )
                  }}
                >

                  {
                    report.report_data.scores
                      .overall_score || "--"
                  }

                </div>

              </div>
            )}


            {/* METRICS */}
            {report.report_data?.scores && (

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">

                {METRICS.map(

                  (metric, i) => {

                    const value =
                      report.report_data
                        .scores[metric];

                    return (

                      <div

                        key={metric}

                        className="
                          bg-white/5
                          border
                          border-white/10
                          rounded-2xl
                          p-5
                        "
                      >

                        <div className="text-slate-400 capitalize text-sm mb-2">

                          {metric}

                        </div>

                        <div

                          className="text-4xl font-black"

                          style={{

                            color:

                              SPEAKER_COLORS[
                                i %
                                SPEAKER_COLORS.length
                              ]
                          }}
                        >

                          {value || "--"}

                        </div>

                        <div className="mt-3 h-2 rounded-full bg-white/10 overflow-hidden">

                          <div

                            className="h-full rounded-full"

                            style={{

                              width: `${value || 0}%`,

                              background:

                                SPEAKER_COLORS[
                                  i %
                                  SPEAKER_COLORS.length
                                ]
                            }}
                          />

                        </div>

                      </div>
                    );
                  }
                )}

              </div>
            )}


            {/* SUMMARY */}
            {report.report_data?.summary && (

              <div className="bg-white/5 border border-purple-500/20 rounded-3xl p-6">

                <h3 className="text-white text-xl font-bold mb-3">

                  🤖 AI Summary

                </h3>

                <p className="text-slate-300 leading-relaxed">

                  {report.report_data.summary}

                </p>

              </div>
            )}


            {/* VIEW REPORTS */}
            <a

              href="/student/reports"

              className="
                block
                w-full
                py-4
                rounded-2xl
                bg-white/5
                border
                border-white/10
                text-center
                text-white
                hover:bg-white/10
                transition
                font-semibold
              "
            >

              📊 View All Reports

            </a>

          </div>
        )}


        {/* LEAVE ROOM */}
        {room && (

          <button

            onClick={() => {

              setRoom(null);

              setCode("");

              setReport(null);

              clearInterval(
                pollRef.current
              );
            }}

            className="
              w-full
              py-3
              rounded-2xl
              bg-white/5
              border
              border-white/10
              text-slate-400
              hover:text-white
              hover:bg-white/10
              transition
            "
          >

            ← Leave Room

          </button>
        )}

      </div>

    </StudentLayout>
  );
}