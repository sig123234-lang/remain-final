"use client";

import {
  useCallback,
  useEffect,
  useRef,
} from "react";

type StartRecordingOptions = {
  /** 침묵 감지 시 자동으로 호출. 자동 stopRecording 결과를 받고 싶으면 onSilence 에서 stopRecording() 다시 호출. */
  onSilence?: () => void;
  /** 침묵으로 판정할 dB 임계 (기본 -52, 작은 방 잡음 기준). 더 작으면 둔감 (소음에 안 끊김). */
  silenceThresholdDb?: number;
  /** 임계 이하가 이만큼 (ms) 지속되면 onSilence 발동 (기본 2500ms). */
  silenceMs?: number;
  /** 첫 발화(임계 초과) 가 이만큼 지속 후에야 침묵 감지를 켠다 (기본 600ms). 시작 직후 헛침묵 무시. */
  minSpeechMs?: number;
  /** 최대 listening 시간 (기본 90s). 초과 시 onSilence 강제 발동. */
  maxListeningMs?: number;
};

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

  // VAD 관련 ref
  const audioContextRef =
    useRef<AudioContext | null>(null);
  const analyserRef =
    useRef<AnalyserNode | null>(null);
  const vadRafIdRef = useRef<number | null>(null);
  const onSilenceCalledRef = useRef(false);
  const onSilenceRef = useRef<
    (() => void) | null
  >(null);
  const speechStartedRef = useRef<number | null>(
    null
  );
  const lastVoiceTsRef = useRef<number>(0);
  const startTsRef = useRef<number>(0);

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined";

  const teardownVad = useCallback(() => {
    if (vadRafIdRef.current !== null) {
      cancelAnimationFrame(
        vadRafIdRef.current
      );
      vadRafIdRef.current = null;
    }
    try {
      analyserRef.current?.disconnect();
    } catch {
      /* noop */
    }
    analyserRef.current = null;
    if (audioContextRef.current) {
      try {
        void audioContextRef.current.close();
      } catch {
        /* noop */
      }
      audioContextRef.current = null;
    }
    onSilenceRef.current = null;
    onSilenceCalledRef.current = false;
    speechStartedRef.current = null;
    lastVoiceTsRef.current = 0;
    startTsRef.current = 0;
  }, []);

  /**
   * 마이크 권한 받고 녹음 시작. options.onSilence 가 있으면 VAD 도 같이 켬.
   */
  const startRecording = useCallback(
    async (
      options: StartRecordingOptions = {}
    ): Promise<boolean> => {
      if (!isSupported) return false;
      if (
        recorderRef.current &&
        recorderRef.current.state ===
          "recording"
      ) {
        return true;
      }

      const silenceThresholdDb =
        options.silenceThresholdDb ?? -52;
      const silenceMs =
        options.silenceMs ?? 2500;
      const minSpeechMs =
        options.minSpeechMs ?? 600;
      const maxListeningMs =
        options.maxListeningMs ?? 90_000;

      try {
        const stream =
          await navigator.mediaDevices.getUserMedia(
            { audio: true }
          );
        streamRef.current = stream;

        // MediaRecorder 시작
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
          teardownVad();
        };
        recorderRef.current = recorder;
        recorder.start();

        // VAD 시작 (onSilence 가 있을 때만)
        if (options.onSilence) {
          onSilenceRef.current =
            options.onSilence;
          onSilenceCalledRef.current = false;
          speechStartedRef.current = null;
          startTsRef.current = Date.now();

          const AudioCtor =
            (
              window as unknown as {
                AudioContext?: typeof AudioContext;
                webkitAudioContext?: typeof AudioContext;
              }
            ).AudioContext ||
            (
              window as unknown as {
                webkitAudioContext?: typeof AudioContext;
              }
            ).webkitAudioContext;
          if (AudioCtor) {
            const ctx = new AudioCtor();
            // iOS Safari 는 user gesture 안에서 resume 해야 동작
            if (ctx.state === "suspended") {
              try {
                await ctx.resume();
              } catch {
                /* noop */
              }
            }
            audioContextRef.current = ctx;
            const source =
              ctx.createMediaStreamSource(
                stream
              );
            const analyser =
              ctx.createAnalyser();
            analyser.fftSize = 512;
            analyser.smoothingTimeConstant = 0.8;
            source.connect(analyser);
            analyserRef.current = analyser;

            const buffer = new Uint8Array(
              analyser.fftSize
            );

            const loop = () => {
              if (
                !analyserRef.current ||
                !onSilenceRef.current
              ) {
                return;
              }
              analyserRef.current.getByteTimeDomainData(
                buffer
              );
              // RMS dB 계산
              let sum = 0;
              for (
                let i = 0;
                i < buffer.length;
                i += 1
              ) {
                const x =
                  (buffer[i] - 128) / 128;
                sum += x * x;
              }
              const rms = Math.sqrt(
                sum / buffer.length
              );
              const db =
                20 *
                Math.log10(
                  Math.max(rms, 1e-7)
                );

              const now = Date.now();
              if (db > silenceThresholdDb) {
                // 발화 중
                if (
                  speechStartedRef.current ===
                  null
                ) {
                  speechStartedRef.current =
                    now;
                }
                lastVoiceTsRef.current = now;
              } else if (
                speechStartedRef.current !==
                  null &&
                lastVoiceTsRef.current -
                  speechStartedRef.current >=
                  minSpeechMs &&
                now - lastVoiceTsRef.current >=
                  silenceMs &&
                !onSilenceCalledRef.current
              ) {
                // 충분히 말한 뒤 (lastVoiceTs - speechStarted >= minSpeechMs)
                // 침묵 N초 지속 → onSilence. 짧은 헛소리(<600ms) 후 침묵은 무시돼서
                // 어르신이 실수로 짧은 소리만 내도 chat 으로 빈 발화가 가지 않는다.
                onSilenceCalledRef.current =
                  true;
                const cb =
                  onSilenceRef.current;
                onSilenceRef.current = null;
                cb?.();
                return;
              }

              // 최대 listening 시간 초과 → 강제 종료
              if (
                now - startTsRef.current >=
                  maxListeningMs &&
                !onSilenceCalledRef.current
              ) {
                onSilenceCalledRef.current =
                  true;
                const cb =
                  onSilenceRef.current;
                onSilenceRef.current = null;
                cb?.();
                return;
              }

              vadRafIdRef.current =
                requestAnimationFrame(loop);
            };
            vadRafIdRef.current =
              requestAnimationFrame(loop);
          }
        }

        return true;
      } catch (error) {
        console.warn(
          "MediaRecorder start failed",
          error
        );
        teardownVad();
        return false;
      }
    },
    [isSupported, teardownVad]
  );

  /**
   * 녹음 종료 + audio blob 반환. 자동(VAD) 종료든 수동 호출이든 둘 다 OK.
   */
  const stopRecording =
    useCallback(async (): Promise<Blob | null> => {
      const recorder = recorderRef.current;
      if (
        !recorder ||
        recorder.state === "inactive"
      ) {
        teardownVad();
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
            teardownVad();
          }
          // 안전 timeout — 5초 안에 onstop 안 오면 null
          window.setTimeout(() => {
            if (stopPromiseRef.current) {
              stopPromiseRef.current.resolve(
                null
              );
              stopPromiseRef.current = null;
              teardownVad();
            }
          }, 5000);
        }
      );
    }, [teardownVad]);

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
      teardownVad();
    };
  }, [teardownVad]);

  return {
    isSupported,
    startRecording,
    stopRecording,
  };
}
