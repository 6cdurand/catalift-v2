# Messaging Feature Rules

> Applies when working in `src/features/messaging/`.

## What this feature owns

- Trainer-client messaging (text + photos)
- Real-time message delivery
- Message history
- Photo upload to Supabase Storage
- Notification badge (unread count)

## Standing rules

1. **Photo upload to Supabase Storage.** Photos are uploaded to a `message-attachments` bucket. The bucket has RLS: only the sender and recipient can read. The message record stores the storage path, not the photo itself.

2. **Real-time subscriptions must clean up.** v1 had real-time subscription leaks. v2: every `supabase.channel()` subscription must be cleaned up on unmount. Use `useEffect` cleanup or a custom hook that handles it.

3. **Notification badge.** v1's badge didn't clear because there was no `read_at` / `seen_at` timestamp. v2: messages have a `read_at` timestamp. The unread count is `WHERE read_at IS NULL AND recipient_id = auth.uid()`. When the user opens the chat, mark messages as read.

4. **Message ordering.** Messages are ordered by `created_at` ascending. Never rely on insertion order — use the timestamp.

5. **No fire-and-forget sends.** Sending a message is `await`ed. If it fails, show the user an error and retry. Never silently drop a message.

6. **Offline support.** If the user is offline, queue the message in Zustand and sync when back online. Show a "sending..." state, not a blank state.
