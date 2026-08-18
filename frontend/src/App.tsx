import { Routes, Route, Navigate } from "react-router-dom";
import type { JSX } from "react";
import Layout from "./components/Layout";
import NotFound from "./pages/NotFound";
import EditGameForm from "./pages/EditGameForm";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Games from "./pages/Games";
import Users from "./pages/Users";
import Team from "./pages/Team";
import Build from "./pages/Build";
import Settings from "./pages/Settings";
import PrivateRoute from "./components/PrivateRoute";
import { AuthProvider, useAuth } from "./context/AuthContext";

function AdminRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  if (user?.role !== "admin" && user?.role !== "super-admin") return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/games" element={<Games />} />
          <Route path="/users" element={<AdminRoute><Users /></AdminRoute>} />
          <Route path="/team" element={<AdminRoute><Team /></AdminRoute>} />
          <Route path="/build" element={<Build />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/edit/:fileName" element={<EditGameForm />} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}