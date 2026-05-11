"use client";

type OrbStatus =
  | "waiting"
  | "speaking"
  | "listening"
  | "thinking";

type OrbSeason =
  | "spring"
  | "summer"
  | "autumn"
  | "winter";

type SeasonalOrbProps = {
  status?: OrbStatus;
  season?: OrbSeason;
  showText?: boolean;
};

const seasonConfig = {
  spring: {
    gradient:
      "from-[#ffe7d6] via-[#fff3e6] to-[#edf7ea]",
    particle: "bg-[#ffd6df]",
    glow: "bg-[#ffe8d2]/60",
  },

  summer: {
    gradient:
      "from-[#ffe8b8] via-[#fff2d6] to-[#f6f7d9]",
    particle: "bg-[#ffe08a]",
    glow: "bg-[#fff1b3]/60",
  },

  autumn: {
    gradient:
      "from-[#ffd7ba] via-[#ffe7cf] to-[#fff3e2]",
    particle: "bg-[#ffb37a]",
    glow: "bg-[#ffd2ae]/60",
  },

  winter: {
    gradient:
      "from-[#eef4ff] via-[#f8fbff] to-[#ffffff]",
    particle: "bg-white",
    glow: "bg-[#dfeeff]/70",
  },
};

const statusConfig = {
  waiting: {
    title: "편안하게 기다리고 있어요",
    subtitle: "천천히 시작해볼까요?",
    speed1: "6s",
    speed2: "5s",
    glow: "bg-[#fff2de]/30",
  },

  speaking: {
    title: "이야기하고 있어요",
    subtitle: "천천히 들려드릴게요",
    speed1: "2.8s",
    speed2: "2.2s",
    glow: "bg-[#ffe2c7]/40",
  },

  listening: {
    title: "듣고 있어요",
    subtitle: "편하게 말씀해주세요",
    speed1: "3.4s",
    speed2: "2.7s",
    glow: "bg-[#e7f4e1]/40",
  },

  thinking: {
    title: "생각하고 있어요",
    subtitle: "말씀을 정리하고 있어요",
    speed1: "5s",
    speed2: "4.2s",
    glow: "bg-[#f7d9b8]/30",
  },
};

export default function SeasonalOrb({
  status = "waiting",
  season = "spring",
  showText = true,
}: SeasonalOrbProps) {
  const currentSeason =
    seasonConfig[season];

  const current =
    statusConfig[status] ||
    statusConfig.waiting;

  return (
    <>
      <style>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.88;
          }

          50% {
            transform: scale(1.06);
            opacity: 1;
          }
        }

        @keyframes floatParticle {
          0% {
            transform: translateY(0px);
            opacity: 0;
          }

          20% {
            opacity: 1;
          }

          100% {
            transform: translateY(-26px);
            opacity: 0;
          }
        }

        @keyframes glowPulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.4;
          }

          50% {
            transform: scale(1.08);
            opacity: 0.75;
          }
        }

        @keyframes slowRotate {
          0% {
            transform: rotate(0deg);
          }

          100% {
            transform: rotate(360deg);
          }
        }
      `}</style>

      <div className="flex flex-col items-center">
        
        {/* Orb */}
        <div className="relative flex h-56 w-56 items-center justify-center">
          
          {/* Glow */}
          <div
            className={`absolute h-56 w-56 rounded-full blur-3xl ${current.glow}`}
            style={{
              animation:
                "glowPulse 5s ease-in-out infinite",
            }}
          />

          {/* Outer */}
          <div
            className={`absolute h-44 w-44 rounded-full border-[15px] border-white/35`}
            style={{
              animation: `breathe ${current.speed1} ease-in-out infinite`,
            }}
          />

          {/* Middle */}
          <div
            className={`absolute h-36 w-36 rounded-full border-[10px] border-white/30`}
            style={{
              animation: `breathe ${current.speed2} ease-in-out infinite`,
            }}
          />

          {/* Core */}
          <div
            className={`relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${currentSeason.gradient} shadow-[0_18px_60px_rgba(255,255,255,0.5)]`}
            style={{
              animation:
                status === "thinking"
                  ? "slowRotate 12s linear infinite"
                  : `breathe ${current.speed1} ease-in-out infinite`,
            }}
          >
            
            {/* Inner Glow */}
            <div
              className={`absolute inset-2 rounded-full ${currentSeason.glow} blur-xl`}
            />

            {/* Particles */}
            <div className="absolute inset-0 overflow-hidden rounded-full">
              
              {[...Array(8)].map((_, i) => (
                <span
                  key={i}
                  className={`absolute h-2.5 w-2.5 rounded-full ${currentSeason.particle}`}
                  style={{
                    left: `${15 + i * 9}%`,
                    bottom: `${10 + (i % 3) * 8}%`,
                    animation: `floatParticle ${
                      3 + i * 0.4
                    }s ease-in-out infinite`,
                    animationDelay: `${i * 0.3}s`,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {showText && (
          <div className="mt-6 text-center">
            <h3 className="text-[22px] font-black text-[#4f4035]">
              {current.title}
            </h3>

            <p className="mt-2 text-[15px] text-[#8a7463]">
              {current.subtitle}
            </p>
          </div>
        )}
      </div>
    </>
  );
}
