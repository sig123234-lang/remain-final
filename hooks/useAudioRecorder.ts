"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

/**
 * 어르신 음성을 audio blob 으로 녹음. 정지 시 blob 을 반환해서 Whisper 같은
 * 서버 STT 로 전송한다. 화면 표시용 transcript 는 별도의 Web Speech API
 * (useBrowserSpeechTranscriber) 로 미리보기 — 어르신이 자기 말이 들어오는 걸
 * 시각 피드백으로 확인하게 하기 위함이고, 진짜 chat 입력으로 보내지는 텍스트는
 * 정지 시 Whisper 결과를 우선 사용한다.
 *
 * MediaRecorder 호환:
 *  - Chrome / Edge: webm/opus 기본
 *  - iOS Safari 14.3+: mp4/aac
 *  - Samsung Internet: webm/opus
 *  → Whisper 는 위 셋 다 받음
 */
function pickMimeType(): string {
  if (typeof window === "undefined") return "";
  if (typeof MediaRecorder === "undefined")
    return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/mp4;codecs=mp4a.40.2",
    "audio/ogg;codecs=opus",
  ];
  for (const m of candidates) {
    if (MediaRecorder.isTypeSupported(m)) {
      return m;
    }
  }
  return "";
}

export function useAudioRecorder() {
  const recorderRef =
    useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef =
    useRef<MediaStream | null>(null);
  const stopPromiseRef = useRef<{
    resolve: (blob: Blob | null) => void;
  } | null>(null);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  /**
   * 마이크 권한 받고 녹음 시작. 이미 녹음 중이면 noop.
   * 반환값은 시작 성공 여부.
   */
  const startRecording =
    useCallback(async (): Promise<boolean> => {
      if (!isSupported) return false;
      if (
        recorderRef.current &&
        recorderRef.current.state ===
          "recording"
      ) {
        return true;
      }
      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            { audio: true }
          );
        streamRef.current = stream;
        const mimeType = pickMimeType();
        const recorder = new MediaRecorder(
          stream,
          mimeType
            ? { mimeType }
            : undefined
        );
        chunksRef.current = [];
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };
        recorder.onstop = () => {
          const blob = new Blob(
            chunksRef.current,
            {
              type:
                recorder.mimeType ||
                "audio/webm",
            }
          );
          chunksRef.current = [];
          stopPromiseRef.current?.resolve(blob);
          stopPromiseRef.current = null;
          // mic 끄기
          streamRef.current
            ?.getTracks()
            .forEach((t) => t.stop());
          streamRef.current = null;
        };
        recorderRef.current = recorder;
        recorder.start();
        return true;
      } catch (error) {
        console.warn(
          "MediaRecorder start failed",
          error
        );
        return false;
      }
    }, [isSupported]);

  /**
   * 녹음 종료 + audio blob 반환. 녹음 중이 아니면 null.
   */
  const stopRecording =
    useCallback(async (): Promise<Blob | null> => {
      const recorder = recorderRef.current;
      if (
        !recorder ||
        recorder.state === "inactive"
      ) {
        return null;
      }
      return new Promise<Blob | null>(
        (resolve) => {
          stopPromiseRef.current = { resolve };
          try {
            recorder.stop();
          } catch {
            resolve(null);
            stopPromiseRef.current = null;
          }
          // 안전 타이머 — MediaRecorder.onstop 이 어떤 사유로든 안 발동하면
          // 5초 후에 null 로 resolve.
          window.setTimeout(() => {
            if (stopPromiseRef.current) {
              stopPromiseRef.current.resolve(
                null
              );
              stopPromiseRef.current = null;
            }
          }, 5000);
        }
      );
    }, []);

  // 페이지 이탈 시 마이크 정리
  useEffect(() => {
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        /* noop */
      }
      streamRef.current
        ?.getTracks()
        .forEach((t) => t.stop());
      streamRef.current = null;
      recorderRef.current = null;
      stopPromiseRef.current = null;
    };
  }, []);

  return {
    isSupported,
    startRecording,
    stopRecording,
  };
}
