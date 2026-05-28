import API from "./api";

// Get trend data and improvement over time for a student
export async function getStudentTrends(studentId) {
  const response = await API.get(`/trends/${studentId}`);
  return response.data;
}