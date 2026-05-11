export default function AdminFamilyPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-black tracking-tight">
          보호자 연결
        </h1>
        <p className="mt-2 text-[#6f5d50]">
          보호자용 전달 내용을 관리하는 운영 영역입니다.
        </p>

        <div className="mt-8 rounded-[28px] bg-white p-6 shadow-sm">
          <p className="text-lg leading-8 text-[#5f5a53]">
            현재는 family 요약 화면과 분리된 운영 패널만 준비되어 있습니다.
            이후 보호자별 링크, 공유 권한, 리포트 발송 기능을 이 영역에 연결하면
            됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
