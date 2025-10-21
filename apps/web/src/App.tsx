/**
 * App Component - Phase 4.4
 *
 * Main application component with routing.
 * Sets up public and protected routes with React Router.
 */

import { Route, Routes } from "react-router-dom";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { HomePage } from "@/pages/HomePage";
import { VerifyEmailPage } from "@/pages/VerifyEmailPage";
import { AuthGuard } from "@/features/auth/components/AuthGuard";
import { ROUTES } from "@/lib/constants/routes";

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
