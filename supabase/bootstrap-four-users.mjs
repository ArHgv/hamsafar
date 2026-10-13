// Run only on a trusted administrator's machine. Never import into the web app.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const names = ['آرین', 'عارف', 'ساج', 'دلارام'];
const users = [1, 2, 3, 4].map((number) => ({
  email: process.env[`BOOTSTRAP_USER_${number}_EMAIL`]?.trim(),
  password: process.env[`BOOTSTRAP_USER_${number}_PASSWORD`],
  name: names[number - 1],
  number,
}));

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

if (!url || !key || !URL.canParse(url) || new URL(url).protocol !== 'https:') {
  fail('Set SUPABASE_URL (HTTPS) and SUPABASE_SERVICE_ROLE_KEY locally. No accounts created.');
} else if (
  users.some(
    ({ email, password }) =>
      !email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
      !password ||
      password.length < 12 ||
      password.length > 128,
  ) ||
  new Set(users.map(({ email }) => email.toLowerCase())).size !== 4
) {
  fail(
    'Set four distinct email addresses and four passwords (12–128 characters) in BOOTSTRAP_USER_1_EMAIL / BOOTSTRAP_USER_1_PASSWORD through USER_4. Choose the passwords yourself; none are supplied. No accounts created.',
  );
} else {
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  console.log(
    'Passwords are chosen by you in environment variables; they are never printed or saved.',
  );
  for (const { email, password, number } of users) {
    try {
      const { error } = await client.auth.admin.createUser({
        email,
        password,
        // Keep email ownership verification in the ordinary signup flow.
        // Admin provisioning is only for addresses verified out of band.
        email_confirm: true,
        user_metadata: { name },
      });
      if (error) {
        fail(
          `Account ${number}: creation failed (status ${error.status ?? 'unknown'}). Check Supabase Auth users. Earlier accounts may already exist; no existing passwords were reset.`,
        );
        break;
      }
      console.log(
        `Account ${number} (${name}) created: ${email}. Password: the value YOU selected; share privately and have the owner change it.`,
      );
    } catch {
      fail(
        `Account ${number}: request failed. Check Supabase Auth users before retrying; creation may have completed. No credentials logged.`,
      );
      break;
    }
  }
}
