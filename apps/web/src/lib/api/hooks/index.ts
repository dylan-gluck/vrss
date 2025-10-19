/**
 * API Hooks - Phase 4.3
 *
 * Centralized exports for all TanStack Query hooks.
 * These hooks provide type-safe, cached access to RPC procedures.
 */

// Auth hooks
export { useLogin, useRegister, useLogout, useSession, useAuth } from './useAuth';

// Post hooks
export {
  useCreatePost,
  usePost,
  useUpdatePost,
  useDeletePost,
  useLikePost,
  useUnlikePost,
} from './usePost';

// Feed hooks
export { useFeed } from './useFeed';

// User hooks
export { useUserProfile, useUpdateProfile } from './useUser';

// Social hooks
export { useFollow, useUnfollow, useFollowers, useFollowing } from './useSocial';
