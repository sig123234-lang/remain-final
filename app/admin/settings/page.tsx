export default function AdminSettingsPage() {
  return (
    <div className="min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-black tracking-tight">
          운영 설정
        </h1>
        <p className="mt-2 text-[#6f5d50]">
          STT, TTS, AI, realtime 운영 상태를 확인하는 영역입니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {[
            ["STT", "browser SpeechRecognition 연결 중"],
            ["TTS", "Web Speech API 기반"],
            ["AI", "OpenAI chat route 사용 중"],
            ["Realtime", "Supabase channel 구독 사용 중"],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-[28px] bg-white p-6 shadow-sm"
            >
              <p className="text-sm text-[#8a7463]">
                {label}
              </p>
              <p className="mt-2 text-lg font-semibold text-[#2d2a26]">
                {value}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
