const SOUND_FILENAMES = [
  'insulto-1.mp3',
  'insulto-2.mp3',
  'insulto-3.mp3',
  'insulto-4.mp3',
  'insulto-5.mp3',
  'insulto-6.mp3',
  'insulto-7.mp3',
];

const ENGINE_LOOP_FILENAME = 'motor-loop.mp3';
const KEY_PRESS_FILENAME = 'tecla-arriba.mp3';

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

    // 1) Sonido continuo del carro / mototaxi
    this.engineAudio = new Audio(buildSoundUrl(ENGINE_LOOP_FILENAME));
    this.engineAudio.preload = 'auto';
    this.engineAudio.loop = true;
    this.engineAudio.volume = 0.25;

    // 2) Sonido al oprimir la tecla arriba / levantar rueda
    this.keyPressAudio = new Audio(buildSoundUrl(KEY_PRESS_FILENAME));
    this.keyPressAudio.preload = 'auto';
    this.keyPressAudio.volume = 0.75;

    this.bag = [];
    this.currentAudio = null;
    // En el constructor(), junto a this.unlocked = false:
    this.unlocked = false;
    this.enginePlayPromise = null;
    // En el constructor():
    this.engineVolume = 0.55;
    this.engineChannels = [0, 1].map(() => {
      const audio = new Audio(buildSoundUrl(ENGINE_LOOP_FILENAME));
      audio.preload = 'auto';
      audio.loop = false;
      audio.volume = 0;
      return audio;
    });
    this.activeEngineIdx = 0;
    this.engineRunning = false;
    this.engineMonitorId = null;
    this.crossfadeSec = 0.35;
  }

  unlockAll() {
    if (this.unlocked) return;

    const unlockList = [...this.pool, this.keyPressAudio];

    unlockList.forEach((audio) => {
      if (!audio) return;
      const prevMuted = audio.muted;
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = prevMuted;
        })
        .catch(() => {
          audio.muted = prevMuted;
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
        // Ignorar si el audio aún no estaba listo
      }
      this.currentAudio = null;
    }
  }
 _clearEngineMonitor() {
    if (this.engineMonitorId !== null) {
      window.clearInterval(this.engineMonitorId);
      this.engineMonitorId = null;
    }
  }

  _playChannelWithFade(idx, fadeInDuration = 0.25) {
    const audio = this.engineChannels[idx];
    if (!audio) return;

    audio.muted = false;
    audio.currentTime = 0;
    audio.volume = fadeInDuration > 0 ? 0.01 : this.engineVolume;

    const p = audio.play();
    if (p && typeof p.catch === 'function') {
      p.catch((err) => {
        if (err && err.name !== 'AbortError') {
          console.warn('No se pudo reproducir el canal del motor:', err);
        }
      });
    }

    if (fadeInDuration > 0) {
      const steps = 10;
      const intervalMs = (fadeInDuration * 1000) / steps;
      let step = 0;
      const timer = window.setInterval(() => {
        step += 1;
        if (!this.engineRunning) {
          window.clearInterval(timer);
          return;
        }
        const ratio = Math.min(1, step / steps);
        audio.volume = Math.max(0, Math.min(this.engineVolume, ratio * this.engineVolume));
        if (step >= steps) {
          window.clearInterval(timer);
        }
      }, intervalMs);
    }
  }

  startEngineLoop() {
    if (this.engineRunning) return;
    this.engineRunning = true;
    this._clearEngineMonitor();

    this.activeEngineIdx = 0;
    this._playChannelWithFade(0, 0.2);

    this.engineMonitorId = window.setInterval(() => {
      if (!this.engineRunning) return;

      const current = this.engineChannels[this.activeEngineIdx];
      if (!current || !Number.isFinite(current.duration) || current.duration <= 0) {
        return;
      }

      const remaining = current.duration - current.currentTime;
      if (remaining <= this.crossfadeSec && !current.dataset.fadingOut) {
        current.dataset.fadingOut = '1';

        const nextIdx = this.activeEngineIdx === 0 ? 1 : 0;
        const nextAudio = this.engineChannels[nextIdx];
        if (nextAudio) {
          delete nextAudio.dataset.fadingOut;
        }

        // Bajar volumen del canal saliente suavemente
        const fadeOutSteps = 8;
        const stepMs = (this.crossfadeSec * 1000) / fadeOutSteps;
        let outStep = 0;
        const startVol = current.volume;

        const fadeOutTimer = window.setInterval(() => {
          outStep += 1;
          current.volume = Math.max(0, startVol * (1 - outStep / fadeOutSteps));
          if (outStep >= fadeOutSteps) {
            window.clearInterval(fadeOutTimer);
            try {
              current.pause();
              current.currentTime = 0;
            } catch {
              // Ignorar
            }
            delete current.dataset.fadingOut;
          }
        }, stepMs);

        // Arrancar el siguiente canal con fade-in
        this.activeEngineIdx = nextIdx;
        this._playChannelWithFade(nextIdx, this.crossfadeSec);
      }
    }, 60);
  }

  stopEngineLoop() {
    this.engineRunning = false;
    this._clearEngineMonitor();

    this.engineChannels.forEach((audio) => {
      if (!audio) return;
      delete audio.dataset.fadingOut;
      try {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 0;
      } catch {
        // Ignorar
      }
    });
  }
  playKeyPress() {
    if (!this.keyPressAudio) return;
    try {
      this.keyPressAudio.currentTime = 0;
      this.keyPressAudio.play().catch((err) => {
        console.warn('No se pudo reproducir el sonido de tecla:', err);
      });
    } catch {
      // Ignorar si aún no estaba listo
    }
  }
}

export const audioManager = new AudioManager();