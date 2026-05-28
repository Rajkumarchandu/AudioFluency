import API from "./api";

// Send report to student — saves to database so student sees it on login
export async function sendReportToStudent(studentId, sentBy, reportData, reportType, audioFileId) {
  const response = await API.post("/reports/send", {
    student_id:    studentId,
    sent_by:       sentBy,
    audio_file_id: audioFileId || null,
    report_type:   reportType || "session",
    report_data:   reportData,
  });
  return response.data;
}

// Get reports sent to a student — from database
export async function getStudentReports(studentId) {
  const response = await API.get(`/reports/student/${studentId}`);
  return response.data;
}

export async function markReportRead(reportId) {
  const response = await API.patch(`/reports/${reportId}/read`);
  return response.data;
}

export async function deleteReport(reportId) {
  const response = await API.delete(`/reports/${reportId}`);
  return response.data;
}