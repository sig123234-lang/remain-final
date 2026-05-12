import {
  createClient,
  type SupabaseClient,
} from "@supabase/supabase-js";

let serviceClient:
  | SupabaseClient
  | null = null;

/**
 * 서버 전용. RLS를 우회해 세션/메시지 등을 기록합니다.
 * `SUPABASE_SERVICE_ROLE_KEY`는 브라우저 번들에 포함되면 안 됩니다.
 */
export function getSupabaseServiceRoleClient() {
  if (serviceClient) {
    return serviceClient;
  }

  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Server Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  serviceClient = createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  );

  return serviceClient;
}
