type VoiceStatus = "waiting" | "speaking" | "listening" | "thinking";

type VoiceActionButtonProps = {
  status: VoiceStatus;
  onClick: () => void;
};

export default function VoiceActionButton({
  status,
  onClick,
}: VoiceActionButtonProps) {
  const label = {
    waiting: "대화 시작하기",
    speaking: "말 끊고 답하기",
    // 자동 침묵 감지로 다음 턴으로 넘어가지만, 어르신이 직접 누르면 즉시 마침.
    listening: "다 말씀하셨으면 눌러주세요",
    thinking: "생각하고 있어요",
  };

  if (status === "listening") {
    return (
      <>
        <style>{`
          @keyframes waveMove {
            0% { transform: translateX(-45%); }
            100% { transform: translateX(180%); }
          }

          @keyframes pulseBar {
            0%, 100% {
              transform: scaleY(0.35);
              opacity: 0.45;
            }
            50% {
              transform: scaleY(1);
              opacity: 1;
            }
          }
        `}</style>

        <button
          onClick={onClick}
          aria-label="듣고 있는 중 — 누르면 바로 마칠 수 있어요"
          className="relative flex h-28 w-full items-center justify-between overflow-hidden rounded-[36px] bg-[#8ba77c] px-7 text-white shadow-[0_22px_50px_rgba(99,125,86,0.34)] ring-2 ring-white/40 active:scale-[0.99]"
        >
          <div className="absolute inset-0 opacity-40">
            <div className="absolute left-[-40%] top-0 h-full w-[80%] animate-[waveMove_2.3s_linear_infinite] rounded-full bg-white/40 blur-xl" />
            <div className="absolute left-[-20%] top-2 h-20 w-[70%] animate-[waveMove_1.7s_linear_infinite] rounded-full bg-white/30 blur-lg" />
          </div>

          <div className="relative z-10 flex items-center gap-1.5">
            {[...Array(6)].map((_, i) => (
              <span
                key={i}
                className="h-10 w-2 rounded-full bg-white"
                style={{
                  animation: `pulseBar ${0.55 + i * 0.08}s ease-in-out infinite`,
                }}
              />
            ))}
          </div>

          <span className="relative z-10 text-[18px] font-black leading-[1.3] text-right">
            {label.listening}
            <br />
            <span className="text-[12px] font-semibold opacity-90">
              잠깐 멈추셔도 다음으로 넘어가요
            </span>
          </span>
        </button>
      </>
    );
  }

  if (status === "thinking") {
    return (
      <>
        <style>{`
          @keyframes softThinking {
            0%, 100% { transform: translateX(-10%); opacity: 0.35; }
            50% { transform: translateX(10%); opacity: 0.75; }
          }
        `}</style>

        <button
          disabled
          className="relative flex h-20 w-full items-center justify-center overflow-hidden rounded-[34px] bg-[#9caf91] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.24)]"
        >
          <div
            className="absolute h-full w-[70%] rounded-full bg-white/25 blur-xl"
            style={{ animation: "softThinking 2s ease-in-out infinite" }}
          />

          <span className="relative z-10">
            {label.thinking}
          </span>
        </button>
      </>
    );
  }

  return (
    <button
      onClick={onClick}
      className="flex h-20 w-full items-center justify-center rounded-[34px] bg-[#8ba77c] text-[22px] font-black text-white shadow-[0_18px_42px_rgba(99,125,86,0.3)] active:scale-[0.99]"
    >
      {label[status]}
    </button>
  );
}
