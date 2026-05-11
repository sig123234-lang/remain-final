import StoryClientPage from "./story-client";

import { REMAIN_DEFAULT_ELDER_ID } from "@/lib/remain-config";

export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    elderId?: string;
  }>;
}) {
  const params = await searchParams;
  const elderId =
    params.elderId ||
    REMAIN_DEFAULT_ELDER_ID;

  return (
    <StoryClientPage
      elderId={elderId}
    />
  );
}
