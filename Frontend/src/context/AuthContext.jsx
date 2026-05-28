import { createContext, useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { loginUser } from "../services/authService";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const navigate = useNavigate();
  const [user, setUser] = useState(
    () => JSON.parse(localStorage.getItem("synycs_user") || "null")
  );

  const login = async (email, password, role) => {
    try {
      const data = await loginUser(email, password, role);

      const userData = {
        name:      data.name,
        email:     data.email,
        role:      data.role,
        studentId: data.student_id,
      };

      setUser(userData);
      localStorage.setItem("synycs_user", JSON.stringify(userData));
      toast.success(`Welcome back, ${data.name}!`);

      if (role === "student") {
        navigate("/student");
      } else {
        navigate("/teacher");
      }
    } catch (error) {
      toast.error(error.response?.data?.detail || "Login failed.");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("synycs_user");
    toast.info("Logged out");
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}