"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import SeasonalOrb from "@/components/talk/SeasonalOrb";
import VoiceActionButton from "@/components/talk/VoiceActionButton";
import { useBrowserSpeechTranscriber } from "@/hooks/useBrowserSpeechTranscriber";
import { useSessionRuntime } from "@/hooks/useSessionRuntime";

export default function StoryClientPage({
  elderId,
}: {
  elderId?: string;
}) {
  const {
    currentQuestion,
    currentState,
    error,
    status,
    setStatus,
    processUserTurn,
  } = useSessionRuntime({
    elderId,
  });

  const {
    isSupported,
    transcript,
    startListening,
    stopListening,
    resetTranscript,
  } = useBrowserSpeechTranscriber();
  const [browserError, setBrowserError] =
    useState<string | null>(null);
  const spokenCommandRef =
    useRef<string | null>(null);
  const activeCommandId =
    currentState.activeCommandId;

  const speak = useCallback(
    (text: string) => {
      if (typeof window === "undefined") {
        return;
      }

      window.speechSynthesis.cancel();

      const utterance =
        new SpeechSynthesisUtterance(text);

      utterance.lang = "ko-KR";
      utterance.rate = 0.82;
      utterance.pitch = 1;

      utterance.onstart = () => {
        setStatus("speaking");
      };

      utterance.onend = () => {
        setStatus("listening");

        startListening((message) => {
          setBrowserError(message);
          setStatus("waiting");
        });
      };

      window.speechSynthesis.speak(
        utterance
      );
    },
    [setStatus, startListening]
  );

  const startListeningFromUi = () => {
    if (!isSupported) {
      setBrowserError(
        "이 브라우저에서는 음성 인식이 지원되지 않아요."
      );
      return;
    }

    setBrowserError(null);
    setStatus("listening");

    startListening((message) => {
      setBrowserError(message);
      setStatus("waiting");
    });
  };

  const stopListeningFromUi =
    async () => {
      const finalTranscript =
        stopListening();

      setStatus("thinking");

      if (!finalTranscript) {
        resetTranscript();

        setTimeout(() => {
          speak(
            "괜찮아요. 천천히 생각나시는 만큼 말씀해 주세요."
          );
        }, 400);
        return;
      }

      try {
        const result =
          await processUserTurn(
            finalTranscript
          );

        resetTranscript();

        if (result?.ttsText) {
          setTimeout(() => {
            speak(result.ttsText);
          }, 500);
        } else {
          setStatus("waiting");
        }
      } catch (caughtError) {
        resetTranscript();
        setBrowserError(
          caughtError instanceof Error
            ? caughtError.message
            : "대화를 이어가지 못했어요."
        );

        setTimeout(() => {
          speak(
            "잠시 연결이 불안정해요. 다시 한번 이야기해볼까요?"
          );
        }, 500);
      }
    };

  const handleVoiceButton = () => {
    if (status === "waiting") {
      speak(currentQuestion);
      return;
    }

    if (status === "speaking") {
      window.speechSynthesis.cancel();
      startListeningFromUi();
      return;
    }

    if (status === "listening") {
      void stopListeningFromUi();
    }
  };

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (
      !activeCommandId ||
      activeCommandId ===
        spokenCommandRef.current ||
      status === "speaking" ||
      status === "listening" ||
      status === "thinking"
    ) {
      return;
    }

    spokenCommandRef.current =
      activeCommandId;

    setTimeout(() => {
      speak(currentQuestion);
    }, 300);
  }, [
    currentQuestion,
    activeCommandId,
    speak,
    status,
  ]);

  const lastAnswer = transcript;

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        <Header subtitle="편안하게 이야기를 이어가볼까요?" />

        <main className="flex flex-1 flex-col items-center pt-10">
          <div className="mt-6">
            <SeasonalOrb
              status={status}
              season="spring"
              showText={false}
            />
          </div>

          <div className="mt-10 text-center">
            <p className="text-sm font-bold text-[#8a715c]">
              이야기 도우미가 여쭤볼게요
            </p>

            <h3 className="mt-5 text-[34px] font-black leading-[1.5] tracking-tight">
              {currentQuestion}
            </h3>

            {(browserError || error) && (
              <div className="mt-6 rounded-[24px] bg-[#fff2ef] px-5 py-4 text-left shadow-sm ring-1 ring-[#f1d4c9]">
                <p className="text-sm leading-[1.7] text-[#7a564f]">
                  {browserError || error}
                </p>
              </div>
            )}

            {lastAnswer && (
              <div className="mt-6 rounded-[24px] bg-[#fffaf2]/92 px-5 py-4 shadow-sm ring-1 ring-white/90">
                <p className="text-sm font-bold text-[#8a7463]">
                  들은 이야기
                </p>

                <p className="mt-2 text-[17px] leading-[1.7] text-[#6f5d50]">
                  {lastAnswer}
                </p>
              </div>
            )}
          </div>

          <div className="mt-10 w-full">
            <VoiceActionButton
              status={status}
              onClick={handleVoiceButton}
            />
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}
