export default function TalkLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <main className="min-h-screen bg-[#f3efe7]">
        {children}
      </main>
    );
  }