export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <main className="min-h-screen bg-[#f5f1ea]">
        {children}
      </main>
    );
  }