---
glob: "src/**"
description: All localStorage and cache keys must use userScopedKey() to prevent cross-account data leakage
---

# User-Scoped Keys

All localStorage keys, cache keys, and Zustand persist keys must be user-scoped using `userScopedKey()` from `@/utils/user-scoped-key`.

## Why

v1 had unscoped global keys (`apex-user-profile-cache`, `apex-users`) that leaked data across accounts when a user logged out and another logged in on the same device. This is a cross-account data leakage bug.

## Rule

```typescript
// WRONG — bare key, leaks across accounts
localStorage.setItem('apex-user-profile', JSON.stringify(profile));
const item = localStorage.getItem('apex-user-profile');

// RIGHT — user-scoped key
import { userScopedKey } from '@/utils/user-scoped-key';
localStorage.setItem(userScopedKey('user-profile', userId), JSON.stringify(profile));
const item = localStorage.getItem(userScopedKey('user-profile', userId));
```

## Zustand persist

When using Zustand `persist` middleware, the key must include the user ID:

```typescript
// WRONG
persist(store, { name: 'workout-store' })

// RIGHT
persist(store, { name: userScopedKey('workout-store', userId) })
```

## Logout cleanup

On logout, clear all user-scoped keys for the current user. Don't clear other users' keys (they might log back in).
