import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let browserClient:
  | SupabaseClient
  | null = null;

export function getSupabaseBrowserClient() {
  if (browserClient) {
    return browserClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env
      .NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      "Supabase browser client is not configured."
    );
  }

  browserClient = createClient(
    supabaseUrl,
    supabaseKey
  );

  return browserClient;
}
