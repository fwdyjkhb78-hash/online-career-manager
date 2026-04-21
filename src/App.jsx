import { useNavigate } from "react-router-dom";
import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import ProtectedRoute from "./ProtectedRoute";
import OwnerRoute from "./OwnerRoute";

import Home from "./pages/Home";
import Admin from "./pages/Admin";

export default function App() {
  return (
    <Routes>

      <Route path="/login" element={<Login />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin"
        element={
          <OwnerRoute>
            <Admin />
          </OwnerRoute>
        }
      />

    </Routes>
  );
}