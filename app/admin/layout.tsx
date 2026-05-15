import AdminNav from "@/components/admin/AdminNav";

// admin 영역은 절대 캐싱하지 않는다. proxy.ts 가 쿠키로 인증을 가르고,
// 페이지 자체가 실시간 운영 데이터를 보여주므로 edge cache 가 stale 응답을
// 띄우는 일이 생기지 않게 강제 동적 렌더.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AdminLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    return (
      <main className="min-h-screen bg-[#f5f1ea]">
        <AdminNav />
        {children}
      </main>
    );
  }
