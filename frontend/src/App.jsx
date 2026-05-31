import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
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
  }, [setAuth, clearAuth]);

  if (isLoading) return null;

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={!accessToken ? <Login /> : <Navigate to="/dashboard" replace />}
        />
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard"     element={<Dashboard />} />
          <Route path="/perfil"        element={<Perfil />} />
          <Route path="/catalogo/*"    element={<Placeholder name="Catálogo" />} />
          <Route path="/inventario/*"  element={<Placeholder name="Inventario" />} />
          <Route path="/recepcion/*"   element={<Placeholder name="Recepción" />} />
          <Route path="/produccion/*"  element={<Placeholder name="Producción" />} />
          <Route path="/alertas/*"     element={<Placeholder name="Alertas" />} />
        </Route>
        <Route path="*" element={<Navigate to={accessToken ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

function Placeholder({ name }) {
  return (
    <div className="rounded-2xl border border-dashed border-peach-300 bg-white px-6 py-12 text-center">
      <h2 className="font-crushed text-2xl text-wine-900">{name}</h2>
      <p className="mt-2 text-sm text-wine-700">Módulo en construcción.</p>
    </div>
  );
}

export default App;
