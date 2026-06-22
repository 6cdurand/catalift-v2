export type UserRole = "client" | "trainer";

export interface CataliftUser {
  id: string;
  email: string;
  mode: UserRole;
}
