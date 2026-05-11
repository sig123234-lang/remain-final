"use client";

import { useEffect, useRef, useState } from "react";

import BottomTab from "@/components/talk/BottomTab";
import Header from "@/components/talk/Header";
import SeasonalOrb from "@/components/talk/SeasonalOrb";
import VoiceActionButton from "@/components/talk/VoiceActionButton";

import {
  createSession,
  addMessage,
} from "@/services/sessionService";

type AiStatus =
  | "waiting"
  | "speaking"
  | "listening"
  | "thinking";

type Message = {
  role: "assistant" | "user";
  content: string;
};

const firstQuestion =
  "초등학교 다니실 때 겨울 되면 자주 먹던 음식 기억나세요?";

const TEST_ELDER_ID =
  "8dc55e51-7b82-4e4b-8331-1b6824ed153f";

export default function StoryPage() {
  const [status, setStatus] =
    useState<AiStatus>("waiting");

  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [currentQuestion, setCurrentQuestion] =
    useState(firstQuestion);

  const [lastAnswer, setLastAnswer] =
    useState("");

  const [messages, setMessages] =
    useState<Message[]>([
      {
        role: "assistant",
        content: firstQuestion,
      },
    ]);

  const [sessionState, setSessionState] =
    useState({
      turnCount: 0,
      currentPerson: "",
      currentScene: "",
      currentLifePeriod: "",
      depthLevel: 1,
      consecutiveRefusals: 0,
    });

  const [aiState, setAiState] =
    useState({
      depthLevel: 1,
      riskLevel: "low",
      action: "continue",
      facilitatorNote: "",
    });

  const recognitionRef = useRef<any>(null);

  const lastAnswerRef = useRef("");

  const speak = (text: string) => {
    if (typeof window === "undefined")
      return;

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
      startListening();
    };

    window.speechSynthesis.speak(
      utterance
    );
  };

  const startListening = () => {
    if (typeof window === "undefined")
      return;

    const SpeechRecognition =
      (window as any)
        .SpeechRecognition ||
      (window as any)
        .webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "이 브라우저에서는 음성 인식이 지원되지 않아요."
      );

      setStatus("waiting");

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "ko-KR";

    recognition.interimResults = true;

    recognition.continuous = true;

    recognition.onresult = (
      event: any
    ) => {
      let transcript = "";

      for (
        let i = event.resultIndex;
        i < event.results.length;
        i++
      ) {
        transcript +=
          event.results[i][0]
            .transcript;
      }

      lastAnswerRef.current =
        transcript;

      setLastAnswer(transcript);
    };

    recognition.onerror = () => {
      setStatus("waiting");
    };

    recognitionRef.current =
      recognition;

    recognition.start();
  };

  const stopListening = async () => {
    recognitionRef.current?.stop();

    recognitionRef.current = null;

    const cleanAnswer =
      lastAnswerRef.current.trim();

    setStatus("thinking");

    if (!cleanAnswer) {
      setLastAnswer("");

      lastAnswerRef.current = "";

      setTimeout(() => {
        speak(
          "괜찮아요. 천천히 생각나시는 만큼 말씀해 주세요."
        );
      }, 400);

      return;
    }

    const updatedMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: cleanAnswer,
      },
    ];

    setMessages(updatedMessages);

    if (sessionId) {
      await addMessage({
        sessionId,
        elderId: TEST_ELDER_ID,
        role: "user",
        content: cleanAnswer,
      });

      console.log(
        "사용자 메시지 저장 완료"
      );
    }

    try {
      const response = await fetch(
        "/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            messages: updatedMessages,
            sessionState,
          }),
        }
      );

      const data =
        await response.json();

      console.log(
        "AI Structured Response:",
        data
      );

      const aiMessage =
        data.speech ||
        "이야기를 조금 더 들려주세요.";

      setAiState({
        depthLevel:
          data.depthLevel || 1,

        riskLevel:
          data.riskLevel || "low",

        action:
          data.action || "continue",

        facilitatorNote:
          data.facilitatorNote || "",
      });

      if (sessionId) {
        await addMessage({
          sessionId,
          elderId: TEST_ELDER_ID,
          role: "assistant",
          content: aiMessage,
        });

        console.log(
          "AI 메시지 저장 완료"
        );
      }

      const finalMessages: Message[] = [
        ...updatedMessages,
        {
          role: "assistant",
          content: aiMessage,
        },
      ];

      setMessages(finalMessages);

      setCurrentQuestion(aiMessage);

      setLastAnswer("");

      lastAnswerRef.current = "";

      setSessionState((prev) => ({
        ...prev,

        turnCount:
          prev.turnCount + 1,

        depthLevel:
          data.depthLevel || 1,
      }));

      setTimeout(() => {
        speak(aiMessage);
      }, 500);
    } catch (error) {
      console.error(error);

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

      setStatus("listening");

      startListening();

      return;
    }

    if (status === "listening") {
      stopListening();
    }
  };

  useEffect(() => {
    const initializeSession =
      async () => {
        try {
          const session =
            await createSession({
              elderId:
                TEST_ELDER_ID,
            });

          setSessionId(session.id);

          console.log(
            "세션 생성 완료:",
            session
          );
        } catch (error) {
          console.error(
            "세션 생성 실패:",
            error
          );
        }
      };

    initializeSession();

    return () => {
      window.speechSynthesis.cancel();

      recognitionRef.current?.stop();
    };
  }, []);

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#fff4e5_0%,#f6ead9_45%,#edf3e8_100%)] px-6 pt-6 text-[#3d3128]">
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-32">
        
        <Header subtitle="편안하게 이야기를 이어가볼까요?" />

        <main className="flex flex-1 flex-col items-center pt-10">
          
          <div className="mt-6">
            <SeasonalOrb
              status={status}
              season="spring"
            />
          </div>

          <div className="mt-10 text-center">
            
            <p className="text-sm font-bold text-[#8a715c]">
              이야기 도우미가 여쭤볼게요
            </p>

            <h3 className="mt-5 text-[34px] font-black leading-[1.5] tracking-tight">
              {currentQuestion}
            </h3>

            <p className="mt-6 text-[17px] leading-[1.8] text-[#6f5d50]">
              
              {status === "waiting" &&
                "준비되시면 시작해 주세요."}

              {status === "speaking" &&
                "제가 먼저 천천히 말씀드릴게요."}

              {status ===
                "listening" &&
                "말씀을 듣고 있어요."}

              {status ===
                "thinking" &&
                "말씀을 정리하고 있어요."}
            </p>

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

          <div className="mt-8 w-full rounded-[26px] bg-white/75 p-5 shadow-sm ring-1 ring-white/90">
            
            <h3 className="text-sm font-black text-[#8a715c]">
              현재 인터뷰 상태
            </h3>

            <div className="mt-4 space-y-2 text-sm text-[#5f5248]">
              
              <p>
                현재 턴:
                <span className="ml-2 font-bold">
                  {sessionState.turnCount}
                </span>
              </p>

              <p>
                깊이 레벨:
                <span className="ml-2 font-bold">
                  L{aiState.depthLevel}
                </span>
              </p>

              <p>
                위험도:
                <span className="ml-2 font-bold uppercase">
                  {aiState.riskLevel}
                </span>
              </p>

              <p>
                현재 액션:
                <span className="ml-2 font-bold">
                  {aiState.action}
                </span>
              </p>
            </div>

            {aiState.facilitatorNote && (
              <div className="mt-4 rounded-[18px] bg-[#faf6ef] p-4">
                
                <p className="text-xs font-bold text-[#8a7463]">
                  진행자 메모
                </p>

                <p className="mt-2 text-sm leading-[1.6] text-[#6f5d50]">
                  {aiState.facilitatorNote}
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <BottomTab />
    </div>
  );
}