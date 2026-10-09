"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Activity, Bot, CheckCircle2, Loader2, Mic, MonitorUp, PictureInPicture2, Radio, ScreenShare, Send, Square, Volume2 } from "lucide-react";
import { getWsBaseUrl } from "@/lib/config";
import { liveMeetingAssist, LiveMeetingAssistResponse } from "@/lib/meetings";
import { buildLocalLiveAssist } from "@/lib/liveAssist";
import { useDocumentPip } from "@/lib/useDocumentPip";
import { saveOperationRecord } from "@/lib/operations";
import { ensureBrseTodoProject, upsertMeetingActionTodos } from "@/lib/brseTodo";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/AppModal";
import { useUiLanguage } from "@/components/LanguageProvider";
import { getLocaleString } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";

export type RecordingMode = "mic" | "system" | "mixed" | "screenVideo";
type LiveAssistMode = "assist" | "explain" | "reply" | "memo";

interface LiveRecordingPanelProps {
  language: string;
  template: string;
  initialMode?: RecordingMode;
  whisperModel?: string;
  onClose: () => void;
  onFinished: (jobId: string) => void;
}

type ModeConfig = {
  id: RecordingMode;
  title: string;
  helper: string;
  icon: typeof Mic;
};

const getRecordingModes = (t: any): ModeConfig[] => [
  {
    id: "mic",
    title: t("recorder.mic"),
    helper: t("recorder.micHelper"),
    icon: Mic,
  },
  {
    id: "system",
    title: t("recorder.system"),
    helper: t("recorder.systemHelper"),
    icon: Volume2,
  },
  {
    id: "mixed",
    title: t("recorder.mixed"),
    helper: t("recorder.mixedHelper"),
    icon: Radio,
  },
  {
    id: "screenVideo",
    title: t("recorder.video"),
    helper: t("recorder.videoHelper"),
    icon: ScreenShare,
  },
];

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript: string };
  }>;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

function getRecorderMimeType(hasVideo: boolean) {
  const candidates = hasVideo
    ? ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]
    : ["audio/webm;codecs=opus", "audio/webm"];
  return candidates.find((item) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(item));
}

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop());
}

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours) return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function speechLang(language: any) {
  return getLocaleString(language);
}

export function LiveRecordingPanel({ language, template, initialMode = "mixed", whisperModel, onClose, onFinished }: LiveRecordingPanelProps) {
  const { t } = useUiLanguage();
  const [mode, setMode] = useState<RecordingMode>(initialMode);
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState(t("recorder.selectMode"));
  const [partialTranscript, setPartialTranscript] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [liveAssist, setLiveAssist] = useState<LiveMeetingAssistResponse>(buildLocalLiveAssist("", t));
  const [liveQuestion, setLiveQuestion] = useState("");
  const [assistMode, setAssistMode] = useState<LiveAssistMode>("assist");
  const [isAskingLiveAi, setIsAskingLiveAi] = useState(false);
  const [aiOffline, setAiOffline] = useState(false);
  const [speechStatus, setSpeechStatus] = useState(t("recorder.speechStatus"));
  const [systemAudioStatus, setSystemAudioStatus] = useState(t("recorder.systemAudioStatus"));
  const [pushStatus, setPushStatus] = useState("");
  const [duration, setDuration] = useState(0);
  const [jobId, setJobId] = useState("");
  const [recordedChunks, setRecordedChunks] = useState(0);
  const { pipWindow, openPip, closePip, isSupported: pipSupported } = useDocumentPip();

  const socketRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recorderStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const displayStreamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoMemoTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const lastFinalSpeechRef = useRef("");
  const finishedRef = useRef(false);
  const jobIdRef = useRef("");
  const liveTranscriptRef = useRef("");
  const partialTranscriptRef = useRef("");

  async function buildMixedAudioStream(streams: MediaStream[]) {
    const audioStreams = streams.filter((stream) => stream.getAudioTracks().length > 0);
    if (audioStreams.length === 0) return new MediaStream();

    const AudioContextCtor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) {
      const fallback = new MediaStream();
      audioStreams.forEach((stream) => stream.getAudioTracks().forEach((track) => fallback.addTrack(track)));
      return fallback;
    }

    const audioContext = new AudioContextCtor();
    audioContextRef.current = audioContext;
    const destination = audioContext.createMediaStreamDestination();
    audioStreams.forEach((stream) => {
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(destination);
    });
    return destination.stream;
  }

  async function createRecordingStream(nextMode: RecordingMode) {
    if (nextMode === "mic") {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      setSystemAudioStatus(t("recorder.micOnlyHint"));
      return { stream: micStream, hasVideo: false, title: "Mic voice recording" };
    }

    const displayStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    displayStreamRef.current = displayStream;
    displayStream.getVideoTracks().forEach((track) => {
      track.onended = () => {
        if (mediaRecorderRef.current?.state === "recording") stopRecording();
      };
    });
    const hasSystemAudio = displayStream.getAudioTracks().length > 0;
    setSystemAudioStatus(hasSystemAudio ? t("recorder.systemAudioBắt") : t("recorder.systemAudioChưa"));

    if (nextMode === "system") {
      if (!hasSystemAudio) {
        stopStream(displayStream);
        throw new Error(t("recorder.noSystemAudioError"));
      }
      const audioOnly = new MediaStream(displayStream.getAudioTracks());
      return { stream: audioOnly, hasVideo: false, title: "Screen audio recording" };
    }

    if (nextMode === "mixed") {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      if (!hasSystemAudio) {
        setSystemAudioStatus(t("recorder.systemAudioMissingMicOk"));
      }
      const mixedAudio = await buildMixedAudioStream([displayStream, micStream]);
      if (mixedAudio.getAudioTracks().length === 0) {
        throw new Error(t("recorder.noAudioError"));
      }
      return { stream: mixedAudio, hasVideo: false, title: "Mic and screen audio recording" };
    }

    const streamsForAudio = [displayStream];
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = micStream;
      streamsForAudio.push(micStream);
    } catch {
      setStatus(t("recorder.videoNoMic"));
    }
    const mixedAudio = await buildMixedAudioStream(streamsForAudio);
    if (!hasSystemAudio && mixedAudio.getAudioTracks().length > 0) {
      setSystemAudioStatus(t("recorder.videoNoSystemAudio"));
    }
    const videoStream = new MediaStream([
      ...displayStream.getVideoTracks(),
      ...mixedAudio.getAudioTracks(),
    ]);
    return { stream: videoStream, hasVideo: true, title: "Screen video recording" };
  }

  async function startRecording() {
    try {
      setStatus(t("recorder.statusPermission"));
      setPartialTranscript("");
      setLiveTranscript("");
      liveTranscriptRef.current = "";
      partialTranscriptRef.current = "";
      setLiveAssist(buildLocalLiveAssist("", t));
      setLiveQuestion("");
      setPushStatus("");
      setSpeechStatus(t("recorder.speechStartingError"));
      setSystemAudioStatus(t("recorder.systemAudioBắt"));
      setDuration(0);
      setRecordedChunks(0);
      setJobId("");
      jobIdRef.current = "";
      finishedRef.current = false;

      const recording = await createRecordingStream(mode);
      recorderStreamRef.current = recording.stream;

      const clientId = Math.random().toString(36).slice(2);
      const params = new URLSearchParams({
        language,
        template,
        kind: mode,
        title: recording.title,
        ...(whisperModel ? { whisper_model: whisperModel } : {}),
      });
      const socket = new WebSocket(`${getWsBaseUrl()}/meetings/ws/${clientId}?${params.toString()}`);
      socketRef.current = socket;

      socket.onopen = () => {
        const mimeType = getRecorderMimeType(recording.hasVideo);
        const recorder = new MediaRecorder(recording.stream, mimeType ? { mimeType } : undefined);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(event.data);
            setRecordedChunks((current) => current + 1);
          }
        };

        recorder.start(recording.hasVideo ? 5000 : 2000);
        setIsRecording(true);
        setStatus(recording.hasVideo ? t("recorder.statusVideoRecording") : t("recorder.statusRecording"));
        startBrowserSpeechRecognition();
        timerRef.current = setInterval(() => setDuration((current) => current + 1), 1000);
        autoMemoTimerRef.current = setInterval(() => {
          const context = `${liveTranscriptRef.current}\n${partialTranscriptRef.current}`.trim();
          if (context.length > 80) void askLiveAi("memo", "");
        }, 45000);
      };

      socket.onmessage = (event) => {
        let data: { type?: string; text?: string; job_id?: string };
        try {
          data = JSON.parse(event.data) as { type?: string; text?: string; job_id?: string };
        } catch {
          return; // Ignore malformed/non-JSON frames instead of throwing in the handler.
        }
        if (data.type === "init" && data.job_id) {
          setJobId(data.job_id);
          jobIdRef.current = data.job_id;
        }
        if (data.type === "partial" && data.text) {
          partialTranscriptRef.current = data.text;
          setPartialTranscript(data.text);
          appendLiveTranscript(data.text);
        }
      };

      socket.onclose = () => {
        stopUI();
        if (!finishedRef.current && jobIdRef.current) {
          finishedRef.current = true;
          onFinished(jobIdRef.current);
        }
      };

      socket.onerror = () => {
        setStatus(t("recorder.statusError"));
        stopRecording();
      };
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t("recorder.statusStartError"));
      cleanupMedia();
    }
  }

  function appendLiveTranscript(text: string) {
    const cleaned = text.trim();
    if (!cleaned) return;
    setLiveTranscript((current) => {
      const next = current.includes(cleaned) ? current : `${current}${current ? "\n" : ""}${cleaned}`;
      liveTranscriptRef.current = next;
      setLiveAssist(buildLocalLiveAssist(next, t));
      return next;
    });
  }

  function startBrowserSpeechRecognition() {
    const SpeechRecognitionCtor = (
      window as typeof window & {
        SpeechRecognition?: SpeechRecognitionConstructor;
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).SpeechRecognition || (
      window as typeof window & {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      setSpeechStatus(t("recorder.speechNotAvailable"));
      return;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      speechRecognitionRef.current = recognition;
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLang(language);
      recognition.onresult = (event) => {
        let interim = "";
        let finalText = "";
        for (let index = event.resultIndex; index < event.results.length; index += 1) {
          const result = event.results[index];
          const text = result[0]?.transcript ?? "";
          if (result.isFinal) finalText += text;
          else interim += text;
        }
        if (finalText.trim() && finalText.trim() !== lastFinalSpeechRef.current) {
          lastFinalSpeechRef.current = finalText.trim();
          appendLiveTranscript(finalText.trim());
        }
        if (interim.trim()) {
          partialTranscriptRef.current = interim.trim();
          setPartialTranscript(interim.trim());
        }
      };
      recognition.onerror = () => setSpeechStatus(t("recorder.speechError"));
      recognition.onend = () => {
        if (mediaRecorderRef.current?.state === "recording") {
          try {
            recognition.start();
          } catch {
            setSpeechStatus(t("recorder.speechStopped"));
          }
        }
      };
      recognition.start();
      setSpeechStatus(t("recorder.speechListening"));
    } catch {
      setSpeechStatus(t("recorder.speechStartingError"));
    }
  }

  function stopBrowserSpeechRecognition() {
    const recognition = speechRecognitionRef.current;
    speechRecognitionRef.current = null;
    if (recognition) {
      recognition.onend = null;
      try {
        recognition.stop();
      } catch {
        // Browser may already have stopped recognition.
      }
    }
  }

  async function askLiveAi(nextMode: LiveAssistMode = assistMode, question = liveQuestion) {
    const context = liveTranscriptRef.current || partialTranscriptRef.current || liveTranscript || partialTranscript;
    if ((!context.trim() && !question.trim()) || isAskingLiveAi) return;
    setIsAskingLiveAi(true);
    try {
      const data = await liveMeetingAssist(context, question, language, nextMode);
      setLiveAssist(data);
      setAiOffline(false);
    } catch {
      setLiveAssist(buildLocalLiveAssist(`${context}\n${question}`, t));
      setAiOffline(true);
    } finally {
      setIsAskingLiveAi(false);
    }
  }

  function cleanupMedia() {
    stopStream(recorderStreamRef.current);
    stopStream(micStreamRef.current);
    stopStream(displayStreamRef.current);
    void audioContextRef.current?.close().catch(() => undefined);
    recorderStreamRef.current = null;
    micStreamRef.current = null;
    displayStreamRef.current = null;
    audioContextRef.current = null;
  }

  function stopRecording() {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    cleanupMedia();
    stopBrowserSpeechRecognition();
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.close();
    }
    stopUI();
  }

  function stopUI() {
    setIsRecording(false);
    setStatus(t("recorder.statusFinished"));
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoMemoTimerRef.current) clearInterval(autoMemoTimerRef.current);
    stopBrowserSpeechRecognition();
  }

  useEffect(() => {
    return () => {
      if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.close();
      cleanupMedia();
      stopBrowserSpeechRecognition();
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoMemoTimerRef.current) clearInterval(autoMemoTimerRef.current);
    };
  }, []);

  function currentMeetingRef() {
    return {
      id: jobId || jobIdRef.current || `live-${Date.now()}`,
      title: activeMode?.title ? `Live ${activeMode.title}` : "Live Meeting Note",
      created_at: new Date().toISOString(),
    };
  }

  function pushLiveItemsToTodo() {
    const tasks = [
      ...liveAssist.suggestions,
      ...liveAssist.reply_drafts,
      ...liveAssist.explanations.filter((item) => /action|todo|対応|確認|依頼|risk|issue|block|課題|問題/i.test(item)),
    ]
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
    if (!tasks.length) {
      setPushStatus(t("recorder.pushTodoEmpty"));
      return;
    }
    const project = ensureBrseTodoProject("Live meeting");
    const count = upsertMeetingActionTodos(
      project.id,
      currentMeetingRef(),
      tasks.map((task) => ({ task, status: "Open" }))
    );
    setPushStatus(t("recorder.pushTodoSuccess").replace("{count}", String(count)).replace("{name}", project.name));
  }

  async function pushLiveQuestionsToOperations() {
    const questions = liveAssist.questions.map((item) => item.trim()).filter(Boolean).slice(0, 5);
    if (!questions.length) {
      setPushStatus(t("recorder.pushQnaEmpty"));
      return;
    }
    let ok = 0;
    for (const question of questions) {
      const saved = await saveOperationRecord({
        type: "qna",
        title: question.slice(0, 120),
        status: "Open",
        priority: "Medium",
        owner: "BrSE",
        dueDate: "",
        customerOwner: "",
        projectName: "Live meeting",
        fieldA: question,
        fieldB: `Created from Meeting Note live copilot (${currentMeetingRef().title}).`,
        fieldC: "",
        fieldD: "",
        fieldE: liveTranscript.slice(-800),
      });
      if (saved) ok += 1;
    }
    setPushStatus(t("recorder.pushQnaSuccess").replace("{count}", String(ok)).replace("{total}", String(questions.length)));
  }

  // Sync the selected mode only when the recorder is (re)opened with a new
  // initial mode. Depending on `isRecording` here previously reset the user's
  // chosen mode back to `initialMode` ("mixed") the moment a recording stopped.
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  const activeMode = getRecordingModes(t).find((item) => item.id === mode) ?? getRecordingModes(t)[0];
  const ActiveIcon = activeMode.icon;

  return (
    <AppModal
      open
      onClose={onClose}
      title="Meeting Note Recorder"
      description={status}
      icon={
        <ActiveIcon
          className={cn(
            "h-5 w-5",
            isRecording && "animate-pulse text-red-500"
          )}
        />
      }
      size="2xl"
      tone={isRecording ? "danger" : "primary"}
      closeDisabled={isRecording}
      className="h-full max-h-[86vh]"
      bodyClassName="min-h-0 flex-1 p-0 max-h-none"
    >
        <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto p-5 xl:grid-cols-[minmax(0,1fr)_340px_340px]">
          <section className="space-y-4">
            <div className="grid gap-2 sm:grid-cols-2">
              {getRecordingModes(t).map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setMode(item.id)}
                    disabled={isRecording}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      mode === item.id
                        ? "border-primary/45 bg-primary/15"
                        : "border-[var(--brse-panel-border)] bg-background/55 hover:border-primary/35"
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <Icon className="h-4 w-4 text-primary" />
                      {item.title}
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-textMuted">{item.helper}</span>
                  </button>
                );
              })}
            </div>

            <div className="rounded-2xl border border-[var(--brse-panel-border)] bg-background/35 p-6">
              <div className="flex flex-col items-center gap-4">
                <div className="font-mono text-5xl font-bold tracking-widest text-ink">{formatDuration(duration)}</div>
                <div className="flex h-8 items-end justify-center gap-1">
                  {[16, 28, 20, 34, 18, 30, 22, 26].map((height, index) => (
                    <div
                      key={`${height}-${index}`}
                      className={cn("w-1 rounded-full bg-primary/70", isRecording ? "animate-pulse" : "opacity-35")}
                      style={{ height }}
                    />
                  ))}
                </div>
                <div className="flex gap-3">
                  {!isRecording ? (
                    <Button size="lg" className="h-14 rounded-full px-6 shadow-xl" onClick={startRecording}>
                      <MonitorUp className="mr-2 h-5 w-5" />
                      {t("recorder.start")}
                    </Button>
                  ) : (
                    <Button size="lg" variant="danger" className="h-14 rounded-full px-6 shadow-xl" onClick={stopRecording}>
                      <Square className="mr-2 h-5 w-5" />
                      {t("recorder.stop")}
                    </Button>
                  )}
                  {isRecording && pipSupported ? (
                    <Button
                      size="lg"
                      variant="outline"
                      className="h-14 rounded-full px-5 shadow-xl"
                      onClick={() => (pipWindow ? closePip() : void openPip())}
                      title={t("recorder.popoutTitle")}
                    >
                      <PictureInPicture2 className="mr-2 h-5 w-5" />
                      {pipWindow ? t("recorder.popoutClose") : t("recorder.popoutOpen")}
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

          </section>

          <aside className="space-y-4">
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                <Activity className="h-3 w-3" />
                Live Transcript Preview
              </div>
              <p className="min-h-40 whitespace-pre-wrap rounded-lg border border-[var(--brse-panel-border)] bg-surface/60 px-3 py-2 text-sm italic leading-6 text-ink">
                {partialTranscript || t("recorder.previewPlaceholder")}
              </p>
              <p className="mt-2 text-[11px] text-textMuted">{speechStatus}</p>
              <p className="mt-1 text-[11px] text-textMuted">{systemAudioStatus}</p>
            </div>

            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-primary">
                  <Bot className="h-3 w-3" />
                  Real-time memo
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-2"
                  onClick={() => askLiveAi("memo")}
                  disabled={isAskingLiveAi || !(liveTranscript || partialTranscript).trim()}
                >
                  {isAskingLiveAi ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bot className="h-3.5 w-3.5" />}
                  AI refine
                </Button>
              </div>
              <div className="grid gap-2">
                {(liveAssist.memo.length ? liveAssist.memo : [t("recorder.memoPlaceholder")]).map((item, index) => (
                  <p key={`${item}-${index}`} className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/70 px-3 py-2 text-sm leading-6 text-ink">
                    {item}
                  </p>
                ))}
              </div>
            </div>
          </aside>

          <aside className="space-y-4">
            <div className="rounded-xl border border-primary/25 bg-primary/10 p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                  <Bot className="h-4 w-4" />
                  Live AI Copilot
                </div>
                {aiOffline ? (
                  <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[10px] font-semibold text-amber-200">
                    AI offline · local
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(["assist", "explain", "reply", "memo"] as LiveAssistMode[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => {
                      setAssistMode(item);
                      askLiveAi(item);
                    }}
                    disabled={isAskingLiveAi}
                    className={cn(
                      "rounded-lg border px-2 py-2 text-xs font-semibold capitalize transition",
                      assistMode === item ? "border-primary/45 bg-primary/20 text-primary" : "border-[var(--brse-panel-border)] bg-surface/70 text-textMuted hover:text-ink"
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <form
                className="mt-3 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  askLiveAi("assist");
                }}
              >
                <input
                  value={liveQuestion}
                  onChange={(event) => setLiveQuestion(event.target.value)}
                  placeholder={t("recorder.aiPlaceholder")}
                  className="min-w-0 flex-1 rounded-md border border-[var(--brse-panel-border)] bg-background px-3 py-2 text-xs text-ink outline-none focus:border-primary"
                />
                <Button type="submit" size="icon" className="h-9 w-9" disabled={isAskingLiveAi || (!liveQuestion.trim() && !(liveTranscript || partialTranscript).trim())}>
                  {isAskingLiveAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </form>

              <div className="mt-4 space-y-3">
                <LiveAssistList title={t("recorder.suggestions")} items={liveAssist.suggestions} empty={t("recorder.suggestionsEmpty")} />
                <LiveAssistList title={t("recorder.replyDrafts")} items={liveAssist.reply_drafts} empty={t("recorder.replyDraftsEmpty")} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={pushLiveItemsToTodo}>
                  {t("recorder.pushTodo")}
                </Button>
                <Button type="button" variant="outline" size="sm" className="h-9 text-xs" onClick={pushLiveQuestionsToOperations}>
                  {t("recorder.pushQna")}
                </Button>
              </div>
              {pushStatus ? <p className="mt-2 text-xs leading-5 text-primary">{pushStatus}</p> : null}
            </div>

            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                <Bot className="h-4 w-4 text-primary" />
                Context Watch
              </div>
              <div className="space-y-3">
                <LiveAssistList title={t("recorder.explanations")} items={liveAssist.explanations} empty={t("recorder.explanationsEmpty")} />
                <LiveAssistList title={t("recorder.questions")} items={liveAssist.questions} empty={t("recorder.questionsEmpty")} />
              </div>
            </div>
          </aside>

          <section className="grid gap-3 xl:col-span-3 xl:grid-cols-3">
            <div className="rounded-xl border border-[var(--brse-panel-border)] bg-background/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{t("recorder.recordingStatus")}</p>
              <div className="mt-3 grid gap-2 text-sm text-textMuted">
                <p><span className="font-semibold text-ink">Mode:</span> {activeMode.title}</p>
                <p><span className="font-semibold text-ink">Chunks:</span> {recordedChunks}</p>
                <p><span className="font-semibold text-ink">Job:</span> {jobId || t("recorder.waiting")}</p>
                <p><span className="font-semibold text-ink">Auto memo:</span> {t("recorder.autoMemoInterval")}</p>
              </div>
            </div>

            <div className="rounded-xl border border-matcha/25 bg-matcha/10 p-4 text-sm leading-6 text-matcha">
              <div className="mb-2 flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-4 w-4" />
                {t("recorder.afterStop")}
              </div>
              <p>{t("recorder.afterStopDesc")}</p>
            </div>

            <div className="rounded-xl border border-amber-300/25 bg-amber-300/10 p-4 text-xs leading-5 text-amber-200">
              <p className="font-semibold">{t("recorder.systemAudioHint")}</p>
              <p className="mt-1">{t("recorder.systemAudioDesc")}</p>
              <p className="mt-2">{t("recorder.safeModeHint")}</p>
            </div>
          </section>
        </div>
        {pipWindow
          ? createPortal(
              <LivePipContent
                t={t}
                duration={duration}
                partialTranscript={partialTranscript}
                liveAssist={liveAssist}
                assistMode={assistMode}
                setAssistMode={setAssistMode}
                askLiveAi={askLiveAi}
                liveQuestion={liveQuestion}
                setLiveQuestion={setLiveQuestion}
                isAskingLiveAi={isAskingLiveAi}
                aiOffline={aiOffline}
              />,
              pipWindow.document.body,
            )
          : null}
    </AppModal>
  );
}

interface LivePipContentProps {
  t: ReturnType<typeof useUiLanguage>["t"];
  duration: number;
  partialTranscript: string;
  liveAssist: LiveMeetingAssistResponse;
  assistMode: LiveAssistMode;
  setAssistMode: (mode: LiveAssistMode) => void;
  askLiveAi: (nextMode?: LiveAssistMode, question?: string) => void;
  liveQuestion: string;
  setLiveQuestion: (value: string) => void;
  isAskingLiveAi: boolean;
  aiOffline: boolean;
}

function LivePipContent({
  t,
  duration,
  partialTranscript,
  liveAssist,
  assistMode,
  setAssistMode,
  askLiveAi,
  liveQuestion,
  setLiveQuestion,
  isAskingLiveAi,
  aiOffline,
}: LivePipContentProps) {
  return (
    <div className="flex h-screen flex-col gap-3 overflow-y-auto bg-background p-3 text-ink">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          <Radio className="h-4 w-4 animate-pulse text-red-500" />
          Live Copilot
        </span>
        <span className="font-mono text-sm font-bold text-ink">{formatDuration(duration)}</span>
      </div>

      <div className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/60 p-2.5">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Live Transcript</div>
        <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-xs italic leading-5 text-ink">
          {partialTranscript || t("recorder.previewPlaceholder")}
        </p>
      </div>

      <div className="rounded-lg border border-[var(--brse-panel-border)] bg-surface/60 p-2.5">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">Real-time memo</div>
        <div className="grid gap-1.5">
          {(liveAssist.memo.length ? liveAssist.memo : [t("recorder.memoPlaceholder")]).slice(0, 5).map((item, index) => (
            <p key={`${item}-${index}`} className="rounded-md border border-[var(--brse-panel-border)] bg-background/60 px-2 py-1.5 text-xs leading-5 text-ink">
              {item}
            </p>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-primary/25 bg-primary/10 p-2.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Live AI Copilot</span>
          {aiOffline ? (
            <span className="rounded-full border border-amber-300/40 bg-amber-300/15 px-2 py-0.5 text-[9px] font-semibold text-amber-200">
              AI offline · local
            </span>
          ) : null}
        </div>
        <div className="grid grid-cols-4 gap-1">
          {(["assist", "explain", "reply", "memo"] as LiveAssistMode[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setAssistMode(item);
                askLiveAi(item);
              }}
              disabled={isAskingLiveAi}
              className={cn(
                "rounded-md border px-1 py-1 text-[10px] font-semibold capitalize transition",
                assistMode === item ? "border-primary/45 bg-primary/20 text-primary" : "border-[var(--brse-panel-border)] bg-surface/70 text-textMuted"
              )}
            >
              {item}
            </button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(event) => {
            event.preventDefault();
            askLiveAi("assist");
          }}
        >
          <input
            value={liveQuestion}
            onChange={(event) => setLiveQuestion(event.target.value)}
            placeholder={t("recorder.aiPlaceholder")}
            className="min-w-0 flex-1 rounded-md border border-[var(--brse-panel-border)] bg-background px-2 py-1.5 text-xs text-ink outline-none focus:border-primary"
          />
          <Button type="submit" size="icon" className="h-8 w-8" disabled={isAskingLiveAi}>
            {isAskingLiveAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        <div className="mt-2 space-y-2">
          <LiveAssistList title={t("recorder.suggestions")} items={liveAssist.suggestions} empty={t("recorder.suggestionsEmpty")} />
          <LiveAssistList title={t("recorder.replyDrafts")} items={liveAssist.reply_drafts} empty={t("recorder.replyDraftsEmpty")} />
        </div>
      </div>
    </div>
  );
}

function LiveAssistList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.14em] text-textMuted">{title}</p>
      <div className="space-y-1.5">
        {(items.length ? items : [empty]).slice(0, 4).map((item, index) => (
          <p key={`${title}-${index}-${item}`} className="rounded-md border border-[var(--brse-panel-border)] bg-surface/75 px-2.5 py-2 text-xs leading-5 text-ink">
            {item}
          </p>
        ))}
      </div>
    </div>
  );
}
