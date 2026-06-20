# Trainer Ops Feature Rules

> Applies when working in `src/features/trainer-ops/`.

## What this feature owns

- Client management (CRUD, profiles)
- Program assignment and templates
- Trainer-client relationship management
- Multi-trainer data isolation
- Cross-trainer client file sharing (secure)

## Standing rules

1. **Multi-trainer data isolation.** A trainer can only see their own clients, programs, and workouts. Enforced by RLS (trainer_id = auth.uid()). This is a beta must-have.

2. **Client count authority.** v1 had two competing counting authorities (one in the sync layer, one in the UI). v2 has ONE: the database count via Supabase query. No client-side recounting.

3. **Program assignment.** Programs are assigned to clients by the trainer. Assignment creates a record in the `program_assignments` table with trainer_id, client_id, program_id, and status.

4. **Cross-trainer client file sharing.** A client's data can be shared with another trainer ONLY through an explicit sharing record. Never expose data to trainers who don't own the client and don't have a sharing record. Enforced by RLS.

5. **Client profile.** Contains: name, email, phone, notes, photo, training history. All scoped to the trainer. No global client list.

6. **No `fetchAllUsersFromSupabase()`.** Same as auth rules — never query all users. Query clients by trainer_id.
