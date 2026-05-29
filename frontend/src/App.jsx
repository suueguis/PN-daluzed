import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Login";
import useAuthStore from "./store/authStore";

function parseJwt(token) {
  try {
    const payload = token.split(".")[1];
    return JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
  } catch {
    return null;
  }
}

function App() {
  const { accessToken, isLoading, setAuth, clearAuth } = useAuthStore();

  useEffect(() => {
    axios
      .post("/api/v1/auth/token/refresh/", {}, { withCredentials: true })
      .then(({ data }) => {
        const claims = parseJwt(data.access);
        if (claims?.username && claims?.role) {
          setAuth({ access: data.access, username: claims.username, role: claims.role });
        } else {
          clearAuth();
        }
      })
      .catch(() => clearAuth());
  }, []);

  if (isLoading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!accessToken ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={
            accessToken ? (
              <h1 className="p-10 font-crushed text-4xl">
                ¡Panel de Control de Daluzed!
              </h1>
            ) : (
              <Navigate to="/login" />
            )
          }
        />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
