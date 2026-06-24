export { useSession } from "./hooks/use-session";
export { useRequireAuth } from "./hooks/use-require-auth";
export { logout } from "./api/logout";
export { readUserMode, syncUserModeToProfile } from "./api/user-mode";
export { roleFromProfileRow } from "./api/resolve-role";
export { upsertProfile, type ProfileUpdate } from "./api/profile";
export {
  verifyInviteToken,
  acceptInvite,
  type InviteVerifyResult,
} from "./api/invite";
export { AuthShell } from "./components/AuthShell";
export type { UserRole, CataliftUser } from "./types";
