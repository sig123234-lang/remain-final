import { dbGetElder } from "@/lib/db-read-ops";
import { getSupabaseServiceRoleClient } from "@/lib/supabase/admin";
import TodayClientPage from "./today-client";

function getTalkDisplayName(
  fullName: string,
  displayName?: string | null
) {
  if (displayName?.trim()) {
    return displayName;
  }

  return fullName.endsWith("어르신")
    ? fullName
    : `${fullName} 어르신`;
}

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{
    elderId?: string;
  }>;
}) {
  const params = await searchParams;
  const elderId = params.elderId;
  let elderName = "김영자 어르신";

  if (elderId) {
    try {
      const supabase =
        getSupabaseServiceRoleClient();
      const elder = await dbGetElder(
        supabase,
        elderId
      );

      elderName = getTalkDisplayName(
        elder.full_name,
        elder.display_name
      );
    } catch {
      elderName = "김영자 어르신";
    }
  }

  return (
    <TodayClientPage
      elderId={elderId}
      elderName={elderName}
    />
  );
}
