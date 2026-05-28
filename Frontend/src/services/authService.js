import API from "./api";

export async function registerUser(name, email, password, role) {
  const response = await API.post("/auth/register", {
    name,
    email,
    password,
    role,
  });
  return response.data;
}

export async function loginUser(email, password, role) {
  const response = await API.post("/auth/login", {
    email,
    password,
    role,
  });
  return response.data;
}

export async function updateProfile(userId, profileData) {
  const response = await API.patch(`/auth/profile/${userId}`, profileData);
  return response.data;
}

export async function getProfile(studentId) {
  const response = await API.get(`/auth/profile/${studentId}`);
  return response.data;
}



export async function forgotPassword(email) {
  const response = await API.post("/auth/forgot-password", { email });
  return response.data;
}

export async function resetPassword(token, newPassword) {
  const response = await API.post("/auth/reset-password", {
    token,
    new_password: newPassword,
  });
  return response.data;
}