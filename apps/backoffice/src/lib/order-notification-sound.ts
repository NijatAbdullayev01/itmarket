/** Short two-tone WAV (data URI) — HTMLAudioElement works in background tabs after unlock. */
function buildNotificationChimeDataUri(): string {
  const sampleRate = 22_050;
  const durationSec = 0.62;
  const sampleCount = Math.floor(sampleRate * durationSec);
  const dataSize = sampleCount * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  for (let i = 0; i < sampleCount; i += 1) {
    const t = i / sampleRate;
    let sample = 0;
    if (t < 0.16) {
      const envelope = Math.min(1, t / 0.02) * Math.max(0, 1 - (t - 0.08) / 0.08);
      sample = Math.sin(2 * Math.PI * 880 * t) * envelope * 0.45;
    } else if (t >= 0.14 && t < 0.58) {
      const local = t - 0.14;
      const envelope =
        Math.min(1, local / 0.02) * Math.max(0, 1 - (local - 0.28) / 0.16);
      sample = Math.sin(2 * Math.PI * 1174.66 * t) * envelope * 0.4;
    }
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + i * 2, Math.round(clamped * 0x7fff), true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:audio/wav;base64,${btoa(binary)}`;
}

const NOTIFICATION_CHIME_DATA_URI =
  typeof window === "undefined" ? "" : buildNotificationChimeDataUri();

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (audioContext === null) {
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (AudioContextCtor === undefined) {
      return null;
    }
    audioContext = new AudioContextCtor();
  }

  return audioContext;
}

function playWebAudioChime(context: AudioContext) {
  const start = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(0.22, start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.65);

  const firstTone = context.createOscillator();
  firstTone.type = "sine";
  firstTone.frequency.setValueAtTime(880, start);
  firstTone.connect(gain);
  firstTone.start(start);
  firstTone.stop(start + 0.16);

  const secondTone = context.createOscillator();
  secondTone.type = "sine";
  secondTone.frequency.setValueAtTime(1174.66, start + 0.14);
  secondTone.connect(gain);
  secondTone.start(start + 0.14);
  secondTone.stop(start + 0.58);
}

function playWebAudioFallback() {
  const context = getAudioContext();
  if (context === null) {
    return;
  }

  if (context.state === "suspended") {
    void context.resume().then(() => {
      if (context.state === "running") {
        playWebAudioChime(context);
      }
    });
    return;
  }

  playWebAudioChime(context);
}

/**
 * Brauzer autoplay kilidini açır — ilk klik/klavişdən sonra
 * digər tabda da HTMLAudio bildiriş səsi işləyə bilər.
 */
export function unlockOrderNotificationSound(): void {
  if (typeof window !== "undefined" && NOTIFICATION_CHIME_DATA_URI !== "") {
    try {
      const unlockAudio = new Audio(NOTIFICATION_CHIME_DATA_URI);
      unlockAudio.volume = 0.001;
      void unlockAudio
        .play()
        .then(() => {
          unlockAudio.pause();
          unlockAudio.currentTime = 0;
        })
        .catch(() => {});
    } catch {
      // Ignore unlock failures; later play may still work after another gesture.
    }
  }

  const context = getAudioContext();
  if (context === null || context.state !== "suspended") {
    return;
  }

  void context.resume();
}

export function playOrderNotificationSound(): void {
  // Prefer HTMLAudio — continues when the backoffice tab is in the background.
  if (typeof window !== "undefined" && NOTIFICATION_CHIME_DATA_URI !== "") {
    try {
      const audio = new Audio(NOTIFICATION_CHIME_DATA_URI);
      void audio.play().catch(() => {
        playWebAudioFallback();
      });
      return;
    } catch {
      // Fall through to Web Audio.
    }
  }

  playWebAudioFallback();
}
