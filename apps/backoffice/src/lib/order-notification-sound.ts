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

export function unlockOrderNotificationSound(): void {
  const context = getAudioContext();
  if (context === null || context.state !== "suspended") {
    return;
  }

  void context.resume();
}

function playChime(context: AudioContext) {
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

export function playOrderNotificationSound(): void {
  const context = getAudioContext();
  if (context === null) {
    return;
  }

  if (context.state === "suspended") {
    void context.resume().then(() => {
      if (context.state === "running") {
        playChime(context);
      }
    });
    return;
  }

  playChime(context);
}
