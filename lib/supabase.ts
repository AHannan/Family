/** The one Supabase client the app uses.
 *
 *  Everything still runs in the browser - there are no API routes and no server
 *  components doing data work - so this is a plain browser client holding its
 *  session in localStorage, next to the family data it syncs.
 *
 *  `supabase()` returns null when the keys are not configured. That is a
 *  supported state, not a bug: the app is meant to keep working on a device
 *  that cannot reach the network, and a missing key is treated the same as a
 *  network that is down. Callers check for null and fall back to local-only.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

let client: SupabaseClient | null | undefined;

export function supabase(): SupabaseClient | null {
  if (client !== undefined) return client;
  if (!url || !key) {
    client = null;
    return client;
  }
  client = createClient(url, key, {
    auth: {
      // The session has to survive a reload: somebody who opened the app from a
      // link should not be asked for the password again on every visit.
      persistSession: true,
      autoRefreshToken: true,
      // Nothing arrives back through a URL fragment - there is no OAuth and no
      // magic link, only a password typed into the sign-in screen.
      detectSessionInUrl: false,
    },
  });
  return client;
}

/** Whether a cloud is configured at all, for wording that must not lie. */
export function cloudConfigured(): boolean {
  return !!(url && key);
}
