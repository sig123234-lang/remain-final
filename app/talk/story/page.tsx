import StoryClientPage from "./story-client";

export default async function StoryPage({
  searchParams,
}: {
  searchParams: Promise<{
    elderId?: string;
  }>;
}) {
  const params = await searchParams;

  return (
    <StoryClientPage
      elderId={params.elderId}
    />
  );
}
