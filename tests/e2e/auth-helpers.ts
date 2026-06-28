// E2E auth helpers for establishing real authenticated sessions

import { type Page } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Load env vars from .env.local (Playwright doesn't auto-load Next.js env files)
function loadEnvVars() {
  const envPath = path.resolve(__dirname, '../../.env.local');
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf-8');
    const lines = envContent.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = match[2];
      }
    }
  }
}

loadEnvVars();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const TEST_USER_EMAIL = 'e2e+workout@catalift.test';
const TEST_USER_PASSWORD = 'TestPassword123!';

/**
 * Signs in the dedicated test user via the app's login UI.
 * Email confirmation is disabled on staging, so sign-in works immediately.
 */
export async function signInTestUser(page: Page): Promise<void> {
  // Ensure user exists by trying to sign up (will fail if exists, that's OK)
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  await supabase.auth.signUp({
    email: TEST_USER_EMAIL,
    password: TEST_USER_PASSWORD,
  });
  // Ignore errors — user might already exist

  // Navigate to login page and sign in via UI
  await page.goto('/login');
  await page.waitForLoadState('networkidle');

  // Fill in credentials
  await page.getByLabel('Email').fill(TEST_USER_EMAIL);
  await page.getByLabel('Password').fill(TEST_USER_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();

  // Wait for navigation to complete (should redirect to / or /workout after login)
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
  await page.waitForLoadState('networkidle');
}
