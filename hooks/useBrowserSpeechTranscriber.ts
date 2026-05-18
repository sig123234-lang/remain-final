"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type StartListeningOptions = {
  onError?: (error: string) => void;
};

/** persisted 의 끝과 next 의 시작이 겹치는 가장 긴 길이만큼 next 를 잘라낸다. */
function joinWithSuffixDedup(
  persisted: string,
  next: string
) {
  if (!persisted) return next;
  if (!next) return persisted;
  const maxOverlap = Math.min(
    persisted.length,
    next.length
  );
  let overlap = 0;
  for (let len = maxOverlap; len > 0; len -= 1) {
    if (
      persisted.endsWith(next.substring(0, len))
    ) {
      overlap = len;
      break;
    }
  }
  const sep =
    overlap === 0 && persisted && next
      ? " "
      : "";
  return (
    persisted + sep + next.substring(overlap)
  );
}

export function useBrowserSpeechTranscriber() {
  const recognitionRef =
    useRef<SpeechRecognition | null>(null);
  const finalTranscriptRef = useRef("");
  /** 마지막 onresult에서 계산한 전체 전사(확정+임시) — stop 시 React state보다 최신 */
  const latestCombinedTranscriptRef = useRef("");
  /** 사용자가 명시적으로 stopListening 호출했는지. true면 onerror=aborted 가 정상 흐름이라 노출 안 함. */
  const manualStopRef = useRef(false);
  /** 자동 재시작으로 인스턴스가 새로 생길 때 이전까지의 final 을 보존. */
  const persistedTextRef = useRef("");
  const [transcript, setTranscript] =
    useState("");
  const isSupported =
    typeof window !== "undefined" &&
    Boolean(
      window.SpeechRecognition ??
        window.webkitSpeechRecognition
    );

  const resetTranscript = useCallback(() => {
    finalTranscriptRef.current = "";
    persistedTextRef.current = "";
    latestCombinedTranscriptRef.current = "";
    setTranscript("");
  }, []);

  const startListening = useCallback(
    function start(
      options: StartListeningOptions = {},
      preserveTranscript = false
    ): boolean {
      if (typeof window === "undefined") {
        return false;
      }

      const recognitionCtor =
        window.SpeechRecognition ??
        window.webkitSpeechRecognition;

      if (!recognitionCtor) {
        options.onError?.(
          "이 브라우저에서는 음성 인식이 지원되지 않아요."
        );
        return false;
      }

      // 이전 인스턴스 정리.
      const previous = recognitionRef.current;
      recognitionRef.current = null;
      if (previous) {
        try {
          previous.stop();
        } catch {
          /* 이미 종료된 상태 가능 */
        }
      }

      if (preserveTranscript) {
        // 자동 재시작 — 이전까지의 final 을 persisted 로 옮기고 새 인스턴스는
        // 빈 finalTranscriptRef 로 시작. 새 인스턴스가 같은 단어를 다시 emit 해도
        // joinWithSuffixDedup 이 persisted suffix 와 겹치는 부분을 잘라낸다.
        if (finalTranscriptRef.current) {
          persistedTextRef.current =
            joinWithSuffixDedup(
              persistedTextRef.current,
              finalTranscriptRef.current
            );
        }
        finalTranscriptRef.current = "";
      } else {
        resetTranscript();
      }
      manualStopRef.current = false;

      const recognition = new recognitionCtor();

      recognition.lang = "ko-KR";
      recognition.interimResults = true;
      // 어르신이 충분히 생각하고 말할 수 있도록, 침묵 동안에도 마이크를 끄지 않는다.
      // 자동 종료를 막아 발화 중간의 긴 호흡이 인식 종료로 이어지지 않게 한다.
      // 흐름 종료는 어르신이 명시적으로 정지 버튼을 눌러 stopListening() 을 호출했을 때만.
      recognition.continuous = true;

      recognition.onresult = (event) => {
        // 모바일 STT (Samsung Chrome 등) 는 같은 발화에서도 여러 result 가
        // isFinal=true 로 들어오는데, 각 transcript 가 "직전 텍스트 + 이번 단어"
        // 처럼 누적 prefix 형태로 도착한다.
        //   results[0]: "스팸이"
        //   results[1]: "스팸이 존나"
        //   results[2]: "스팸이 존나 많이"
        // 이걸 단순히 += 로 합치면 "스팸이 스팸이 존나 스팸이 존나 많이" 처럼
        // 같은 발화가 중복 누적된다. 그래서 prefix-dedup 으로 정리한다:
        // 어떤 final 의 트림 텍스트가 다른 더 긴 final 의 prefix 면 그 짧은 건 버린다.
        const finalSegments: string[] = [];
        let interimText = "";

        for (
          let index = 0;
          index < event.results.length;
          index += 1
        ) {
          const result = event.results[index];
          const segment = (
            result[0]?.transcript ?? ""
          ).trim();

          if (!segment) {
            continue;
          }

          if (result.isFinal) {
            finalSegments.push(segment);
          } else {
            interimText += segment;
          }
        }

        // prefix-dedup: 다른 더 긴 segment 의 시작 부분이면 제거.
        // 이러면 누적 prefix 형태로 들어와도 가장 완전한 한 줄만 남는다.
        const deduped = finalSegments.filter(
          (text, idx) =>
            !finalSegments.some(
              (other, j) =>
                j !== idx &&
                other.length > text.length &&
                other.startsWith(text)
            )
        );
        const finalText = deduped.join(" ").trim();

        finalTranscriptRef.current = finalText;
        // persisted + 현재 인스턴스 final + interim. persisted 와 새 final 사이는
        // suffix-prefix overlap dedup (자동 재시작 시 같은 단어가 다시 emit 되는 케이스).
        const persistedPlusFinal =
          joinWithSuffixDedup(
            persistedTextRef.current,
            finalText
          );
        const combined = (
          persistedPlusFinal +
          (persistedPlusFinal && interimText
            ? " "
            : "") +
          interimText
        ).trim();

        latestCombinedTranscriptRef.current =
          combined;
        setTranscript(combined);
      };

      recognition.onerror = (event) => {
        // 사용자가 명시적으로 stopListening() 호출하면 브라우저가 자동으로
        // onerror = "aborted" 를 발동시킨다. 정상 흐름이라 화면에 노출하지 않는다.
        if (manualStopRef.current) {
          return;
        }

        const errorCode = event.error || "";

        // 시스템 사유로 인식이 중단된 경우 (다른 앱이 마이크 점유, 백그라운드 전환 등).
        // 사용자에게 "aborted" 라는 영어 원문을 노출하지 말고 silently 무시한다.
        if (errorCode === "aborted") {
          return;
        }

        // 권한·하드웨어·언어 미지원 같은 치명적 에러는 자동 재시작하면 무한 루프.
        // manualStop 으로 강제 표시해서 onend 의 자동 재시작 분기를 막는다.
        const fatalErrors = [
          "not-allowed",
          "service-not-allowed",
          "audio-capture",
          "language-not-supported",
        ];
        if (fatalErrors.includes(errorCode)) {
          manualStopRef.current = true;
          recognitionRef.current = null;
        }

        // 알려진 에러 코드를 사람이 이해할 수 있는 한국어 안내로 변환.
        let friendly = event.message || "";
        if (errorCode === "no-speech") {
          friendly =
            "잘 안 들렸어요. 다시 한 번 말씀해 주시겠어요?";
        } else if (
          errorCode === "audio-capture"
        ) {
          friendly =
            "마이크에 접근하지 못했어요. 권한을 확인해 주세요.";
        } else if (
          errorCode === "not-allowed" ||
          errorCode === "service-not-allowed"
        ) {
          friendly =
            "마이크 사용 권한이 필요해요. 브라우저 설정에서 허용해 주세요.";
        } else if (
          errorCode === "language-not-supported"
        ) {
          friendly =
            "이 기기에서는 한국어 음성 인식이 지원되지 않아요.";
        } else if (errorCode === "network") {
          friendly =
            "인터넷 연결이 불안정해서 음성 인식을 못 했어요.";
        }

        if (!friendly) {
          friendly =
            "음성 인식 중 문제가 생겼어요. 다시 시도해 주세요.";
        }

        options.onError?.(friendly);
      };

      recognition.onend = () => {
        if (manualStopRef.current) {
          return;
        }
        if (
          recognitionRef.current !== recognition
        ) {
          return;
        }
        // 어르신이 답하다 뜸을 들이면 모바일 OS 가 SpeechRecognition 을 자동 종료한다.
        // 사용자가 정지 버튼을 누르지 않은 상태면 = 아직 답하는 중. 새 인스턴스로
        // 즉시 재개해서 마이크가 닫히지 않게 한다. preserveTranscript=true 로 호출해
        // 그동안 받은 final 을 persistedTextRef 로 옮기고, 자동 재시작 후 새 final 이
        // 이전 단어를 다시 emit 해도 joinWithSuffixDedup 가 중복을 잘라낸다.
        window.setTimeout(() => {
          if (manualStopRef.current) return;
          start(options, true);
        }, 0);
      };

      recognitionRef.current = recognition;
      try {
        recognition.start();
      } catch {
        // start() 가 InvalidStateError 를 던지는 경우 (이미 시작됨)
        recognitionRef.current = null;
        options.onError?.(
          "음성 인식을 시작하지 못했어요. 잠시 후 다시 시도해 주세요."
        );
        return false;
      }

      return true;
    },
    [resetTranscript]
  );

  const stopListening = useCallback(() => {
    manualStopRef.current = true;
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    return latestCombinedTranscriptRef.current.trim();
  }, []);

  useEffect(() => {
    return () => {
      manualStopRef.current = true;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    isSupported,
    transcript,
    resetTranscript,
    startListening,
    stopListening,
  };
}
