/**
 * Auth Store Re-export - Phase 4.4
 *
 * Re-exports the auth store from lib for feature-based organization.
 * This maintains backwards compatibility while following ADR-006.
 */

export { useAuthStore, type User } from "@/lib/store/authStore";
