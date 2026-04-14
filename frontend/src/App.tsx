import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import LoginPage from "./routes/LoginPage";
import IntakePage from "./routes/IntakePage";
import RoadmapPage from "./routes/RoadmapPage";
import DashboardPage from "./routes/DashboardPage";
import Navbar from "./components/Navbar";

const App: React.FC = () => {
  return (
    <AuthProvider>
      <>
      <Navbar />
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/intake"
          element={
            <ProtectedRoute>
              <IntakePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roadmap/:clientId"
          element={
            <ProtectedRoute>
              <RoadmapPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
      </>
    </AuthProvider>
  );
};

export default App;


