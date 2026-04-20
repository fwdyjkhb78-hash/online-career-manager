import { Navigate } from "react-router-dom";
import { getUser } from "./auth";

export default function OwnerRoute({ children }) {
  const user = getUser();

  if (!user || user.role !== "owner") {
    return <Navigate to="/" />;
  }

  return children;
}