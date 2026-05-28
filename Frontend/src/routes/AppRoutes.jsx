import {
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// =========================
// AUTH PAGES
// =========================
import LoginPage from "../pages/auth/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";
import ResetPasswordPage from "../pages/auth/ResetPasswordPage";

// =========================
// STUDENT PAGES
// =========================
import StudentDashboard from "../pages/student/StudentDashboard";
import LiveSessionPage from "../pages/student/LiveSessionPage";
import ReportsPage from "../pages/student/ReportsPage";
import AnalyticsPage from "../pages/student/AnalyticsPage";
import NotificationsPage from "../pages/student/NotificationsPage";
import StudentProfilePage from "../pages/student/StudentProfilePage";
import SessionHistoryPage from "../pages/student/SessionHistoryPage";
import AnalysisPage from "../pages/student/AnalysisPage";
import JoinDebatePage from "../pages/student/JoinDebatePage";

// =========================
// TEACHER PAGES
// =========================
import TeacherDashboard from "../pages/teacher/TeacherDashboard";
import StudentsPage from "../pages/teacher/StudentsPage";
import DebateSessionPage from "../pages/teacher/DebateSessionPage";
import TeacherReportsPage from "../pages/teacher/TeacherReportsPage";
import TeacherAnalyticsPage from "../pages/teacher/TeacherAnalyticsPage";
import TeacherProfilePage from "../pages/teacher/TeacherProfilePage";
import GeneratePDFPage from "../pages/teacher/GeneratePDFPage";
import LiveMonitoringPage from "../pages/teacher/LiveMonitoringPage";
import StudentReviewPage from "../pages/teacher/StudentReviewPage";

// =========================
// PROTECTED ROUTE
// =========================
import ProtectedRoute from "../components/auth/ProtectedRoute";

export default function AppRoutes() {

  return (

    <Routes>

      {/* DEFAULT */}
      <Route
        path="/"
        element={<Navigate to="/login" />}
      />

      {/* ========================= */}
      {/* AUTH ROUTES */}
      {/* ========================= */}

      <Route
        path="/login"
        element={<LoginPage />}
      />

      <Route
        path="/register"
        element={<RegisterPage />}
      />

      <Route
        path="/forgot-password"
        element={<ForgotPasswordPage />}
      />

      <Route
        path="/reset-password"
        element={<ResetPasswordPage />}
      />


      {/* ========================= */}
      {/* STUDENT ROUTES */}
      {/* ========================= */}

      <Route

        path="/student"

        element={
          <ProtectedRoute role="student" />
        }
      >

        {/* DASHBOARD */}
        <Route
          index
          element={<StudentDashboard />}
        />

        {/* LIVE SESSION */}
        <Route
          path="live-session"
          element={<LiveSessionPage />}
        />

        {/* REPORTS */}
        <Route
          path="reports"
          element={<ReportsPage />}
        />

        {/* ANALYTICS */}
        <Route
          path="analytics"
          element={<AnalyticsPage />}
        />

        {/* NOTIFICATIONS */}
        <Route
          path="notifications"
          element={<NotificationsPage />}
        />

        {/* PROFILE */}
        <Route
          path="profile"
          element={<StudentProfilePage />}
        />

        {/* SESSION HISTORY */}
        <Route
          path="history"
          element={<SessionHistoryPage />}
        />

        {/* ANALYSIS */}
        <Route
          path="analysis/:audioId"
          element={<AnalysisPage />}
        />

        {/* JOIN DEBATE */}
        <Route
          path="join-debate"
          element={<JoinDebatePage />}
        />

      </Route>


      {/* ========================= */}
      {/* TEACHER ROUTES */}
      {/* ========================= */}

      <Route

        path="/teacher"

        element={
          <ProtectedRoute role="teacher" />
        }
      >

        {/* DASHBOARD */}
        <Route
          index
          element={<TeacherDashboard />}
        />

        {/* STUDENTS */}
        <Route
          path="students"
          element={<StudentsPage />}
        />

        {/* DEBATE SESSION */}
        <Route
          path="debates"
          element={<DebateSessionPage />}
        />

        {/* REPORTS */}
        <Route
          path="reports"
          element={<TeacherReportsPage />}
        />

        {/* ANALYTICS */}
        <Route
          path="analytics"
          element={<TeacherAnalyticsPage />}
        />

        {/* PROFILE */}
        <Route
          path="profile"
          element={<TeacherProfilePage />}
        />

        {/* PDF GENERATOR */}
        <Route
          path="generate-pdf"
          element={<GeneratePDFPage />}
        />

        {/* LIVE MONITOR */}
        <Route
          path="live-monitor"
          element={<LiveMonitoringPage />}
        />

        {/* STUDENT REVIEW */}
        <Route
          path="review/:studentId"
          element={<StudentReviewPage />}
        />

      </Route>


      {/* ========================= */}
      {/* FALLBACK */}
      {/* ========================= */}

      <Route
        path="*"
        element={<Navigate to="/login" />}
      />

    </Routes>
  );
}