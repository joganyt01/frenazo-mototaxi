const SOUND_FILENAMES = [
  'insulto-1.mp3',
  'insulto-2.mp3',
  'insulto-3.mp3',
  'insulto-4.mp3',
  'insulto-5.mp3',
  'insulto-6.mp3',
  'insulto-7.mp3',
];

function buildSoundUrl(filename) {
  const base = import.meta.env.BASE_URL || '/';
  const normalizedBase = base.endsWith('/') ? base : `${base}/`;
  return `${normalizedBase}sounds/${filename}`;
}

class AudioManager {
  constructor() {
    this.pool = SOUND_FILENAMES.map((filename) => {
      const audio = new Audio(buildSoundUrl(filename));
      audio.preload = 'auto';
      return audio;
    });
    this.bag = [];
    this.currentAudio = null;
    this.unlocked = false;
  }

  unlockAll() {
    if (this.unlocked) return;

    this.pool.forEach((audio) => {
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
    });

    this.unlocked = true;
  }

  refillBag() {
    const indices = this.pool.map((_, idx) => idx);
    for (let i = indices.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = indices[i];
      indices[i] = indices[j];
      indices[j] = temp;
    }
    this.bag = indices;
  }

  playRandomInsult() {
    this.stopCurrent();

    if (this.pool.length === 0) return;

    if (this.bag.length === 0) {
      this.refillBag();
    }

    const nextIndex = this.bag.pop();
    const selectedAudio = this.pool[nextIndex];
    if (!selectedAudio) return;

    this.currentAudio = selectedAudio;
    this.currentAudio.currentTime = 0;
    this.currentAudio.play().catch((err) => {
      console.warn('No se pudo reproducir el audio de insulto:', err);
    });
  }

  stopCurrent() {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignorar si el audio aún no estaba iniciado
      }
      this.currentAudio = null;
    }
  }
}

export const audioManager = new AudioManager();