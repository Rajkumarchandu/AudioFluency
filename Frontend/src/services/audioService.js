import API from "./api";

// Upload audio file for a student
export async function uploadAudio(file, studentId, language = "hi") {
  const formData = new FormData();
  formData.append("file", file);

  const response = await API.post(
    `/upload-audio?student_id=${studentId}&language=${language}`,
    formData,
    {
      headers: { "Content-Type": "multipart/form-data" },
    }
  );
  return response.data;
}

// Get all submissions + scores for a student
export async function getStudentStatus(studentId) {
  const response = await API.get(`/status/${studentId}`);
  return response.data;
}

// Delete a specific job
export async function deleteAudio(jobId) {
  const response = await API.delete(`/audio/${jobId}`);
  return response.data;
}

// Delete all records for a student
export async function deleteStudentAudio(studentId) {
  const response = await API.delete(`/audio/student/${studentId}`);
  return response.data;
}

// DEBATE SESSION
export async function uploadDebateAudio(file, language, sessionTitle) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await API.post(
    `/debate/upload?language=${language}&session_title=${encodeURIComponent(sessionTitle)}`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return response.data;
}

export async function getDebateStatus(jobId) {
  const response = await API.get(`/debate/status/${jobId}`);
  return response.data;
}


// DEBATE ROOMS
export async function createDebateRoom(title, teacherId, teacherName, language) {
  const response = await API.post("/debate/create", {
    title, teacher_id: teacherId, teacher_name: teacherName, language
  });
  return response.data;
}

export async function joinDebateRoom(code, studentId, studentName) {
  const response = await API.post(`/debate/join/${code}`, {
    student_id: studentId, student_name: studentName
  });
  return response.data;
}

export async function getDebateRoom(code) {
  const response = await API.get(`/debate/room/${code}`);
  return response.data;
}

export async function getTeacherRooms(teacherId) {
  const response = await API.get(`/debate/teacher/${teacherId}/rooms`);
  return response.data;
}

export async function updateRoomStatus(code, status) {
  const response = await API.patch(`/debate/room/${code}/status`, { status });
  return response.data;
}