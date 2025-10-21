/**
 * App Component - Phase 4.4
 *
 * Main application component with routing.
 * Sets up public and protected routes with React Router.
 */

import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { ROUTES } from "@/lib/constants/routes";
import { HomePage } from "@/pages/HomePage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { Route, Routes } from "react-router-dom";

function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path={ROUTES.LOGIN} element={<LoginPage />} />
      <Route path={ROUTES.REGISTER} element={<RegisterPage />} />
      <Route path={ROUTES.VERIFY_EMAIL} element={<VerifyEmailPage />} />

      {/* Protected routes */}
      <Route
        path={ROUTES.HOME}
        element={
          <AuthGuard>
            <HomePage />
          </AuthGuard>
        }
      />
    </Routes>
  );
}

export default App;
