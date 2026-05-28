import {

  Navigate,
  Outlet,

} from "react-router-dom";

import {

  useAuth

} from "../../context/AuthContext";

export default function ProtectedRoute({

  role

}) {

  const {

    user

  } = useAuth();

  // NOT LOGGED IN
  if (!user) {

    return (
      <Navigate to="/login" />
    );
  }

  // WRONG ROLE
  if (user.role !== role) {

    return (
      <Navigate to="/login" />
    );
  }

  // ACCESS ALLOWED
  return <Outlet />;
}