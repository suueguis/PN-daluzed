import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Perfil from "./pages/Perfil";
import CatalogoLayout from "./pages/catalogo/CatalogoLayout";
import UnidadesPage from "./pages/catalogo/UnidadesPage";
import ProveedoresPage from "./pages/catalogo/ProveedoresPage";
import MateriasPrimasPage from "./pages/catalogo/MateriasPrimasPage";
import ProductosTerminadosPage from "./pages/catalogo/ProductosTerminadosPage";
import PresentacionesPage from "./pages/catalogo/PresentacionesPage";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import AlertasLayout from "./pages/alertas/AlertasLayout";
import AlertasActivasPage from "./pages/alertas/AlertasActivasPage";
import AlertasReordenPage from "./pages/alertas/AlertasReordenPage";
import AlertasVencimientoPage from "./pages/alertas/AlertasVencimientoPage";
import AlertasProduccionPage from "./pages/alertas/AlertasProduccionPage";
import useAuthStore from "./store/authStore";
import InventarioLayout from "./pages/inventario/InventarioLayout";
import StockPage from "./pages/inventario/StockPage";
import LotesPage from "./pages/inventario/LotesPage";
import BodegasPage from "./pages/inventario/BodegasPage";
import TrasladosPage from "./pages/inventario/TrasladosPage";
import DevolucionesPage from "./pages/inventario/DevolucionesPage";
import DescartesPage from "./pages/inventario/DescartesPage";
import RecepcionLayout from "./pages/recepcion/RecepcionLayout";
import OrdenesPage from "./pages/recepcion/OrdenesPage";
import NuevaOrdenPage from "./pages/recepcion/NuevaOrdenPage";
import RecepcionesPage from "./pages/recepcion/RecepcionesPage";
import NuevaRecepcionPage from "./pages/recepcion/NuevaRecepcionPage";
import DetalleRecepcionPage from "./pages/recepcion/DetalleRecepcionPage";
import ProduccionLayout from "./pages/produccion/ProduccionLayout";
import UsuariosPage from "./pages/admin/UsuariosPage";
import RoleGate from "./components/RoleGate";

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
          <Route path="/catalogo"      element={<CatalogoLayout />}>
            <Route index element={<Navigate to="materias-primas" replace />} />
            <Route path="unidades"            element={<UnidadesPage />} />
            <Route path="proveedores"         element={<ProveedoresPage />} />
            <Route path="materias-primas"     element={<MateriasPrimasPage />} />
            <Route path="productos-terminados" element={<ProductosTerminadosPage />} />
            <Route path="presentaciones"      element={<PresentacionesPage />} />
          </Route>
          <Route path="/inventario"    element={<InventarioLayout />}>
            <Route index element={<Navigate to="stock" replace />} />
            <Route path="stock"        element={<StockPage />} />
            <Route path="lotes"        element={<LotesPage />} />
            <Route path="bodegas"      element={<BodegasPage />} />
            <Route path="traslados"    element={<TrasladosPage />} />
            <Route path="devoluciones" element={<DevolucionesPage />} />
            <Route path="descartes"    element={<DescartesPage />} />
          </Route>
          <Route path="/recepcion"     element={<RecepcionLayout />}>
            <Route index element={<Navigate to="ordenes" replace />} />
            <Route path="ordenes"              element={<OrdenesPage />} />
            <Route path="ordenes/nueva"        element={<NuevaOrdenPage />} />
            <Route path="recepciones"          element={<RecepcionesPage />} />
            <Route path="recepciones/nueva"    element={<NuevaRecepcionPage />} />
            <Route path="recepciones/:id"      element={<DetalleRecepcionPage />} />
          </Route>
          <Route path="/produccion/*"  element={<ProduccionLayout />} />
          <Route path="/alertas"       element={<AlertasLayout />}>
            <Route index                       element={<AlertasActivasPage />} />
            <Route path="reorden"              element={<AlertasReordenPage />} />
            <Route path="vencimiento"          element={<AlertasVencimientoPage />} />
            <Route path="produccion-vencida"   element={<AlertasProduccionPage />} />
          </Route>
          <Route
            path="/admin/usuarios"
            element={
              <RoleGate allowed={['ADMIN']} fallback={<Navigate to="/dashboard" replace />}>
                <UsuariosPage />
              </RoleGate>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to={accessToken ? "/dashboard" : "/login"} replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
