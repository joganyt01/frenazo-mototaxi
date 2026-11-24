import { useEffect, useRef, useState } from 'react';
import { audioManager } from '../utils/audioManager';
import {
  createInitialRoadState,
  ensureRoadAhead,
  PIXELS_PER_METER,
} from '../utils/roadGenerator';

const ROAD_HEIGHT = 76;
const START_X = 110;
const BASE_SPEED = 225; // px/seg
const MAX_EXTRA_SPEED = 145; // aumento progresivo

export function GameCanvas({
  isPlaying,
  isHolding,
  runId = 0,
  onHudUpdate,
  onCrash,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const videoRef = useRef(null);

  const [cameraStatus, setCameraStatus] = useState('loading'); // 'loading' | 'ready' | 'fallback'

  const isPlayingRef = useRef(isPlaying);
  const isHoldingRef = useRef(isHolding);
  const onHudUpdateRef = useRef(onHudUpdate);
  const onCrashRef = useRef(onCrash);
  const crashedRef = useRef(false);
  const prevHoldingRef = useRef(false);

  const gameStateRef = useRef({
    x: START_X,
    speed: BASE_SPEED,
    wheelie: 0, // 0 (plano) -> 100 (volteado de espaldas)
    yLift: 0, // elevación visual ligera al hacer wheelie
    road: createInitialRoadState(),
    shakeTime: 0,
    shakeIntensity: 0,
    flyingCargo: [],
    spawnedCargo: false,
    crashReason: 'CRATER_HIT',
  });

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

 // Actualiza el useEffect de isHolding por este:
  useEffect(() => {
    const wasHolding = prevHoldingRef.current;
    prevHoldingRef.current = isHolding;
    isHoldingRef.current = isHolding;

    if (!wasHolding && isHolding && isPlaying && !crashedRef.current) {
      audioManager.playKeyPress();
    }
  }, [isHolding, isPlaying]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
    onCrashRef.current = onCrash;
  }, [onHudUpdate, onCrash]);


  useEffect(() => {
    crashedRef.current = false;
    gameStateRef.current = {
      x: START_X,
      speed: BASE_SPEED,
      wheelie: 0,
      yLift: 0,
      road: createInitialRoadState(),
      shakeTime: 0,
      shakeIntensity: 0,
      flyingCargo: [],
      spawnedCargo: false,
      crashReason: 'CRATER_HIT',
    };

    if (onHudUpdateRef.current) {
      onHudUpdateRef.current({ meters: 0, wheelieBalance: 0 });
    }
  }, [runId]);

  // Activar cámara de fondo tipo filtro / TikTok
  useEffect(() => {
    let activeStream = null;
    let cancelled = false;

    const startCamera = async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        if (!cancelled) setCameraStatus('fallback');
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'user',
            width: { ideal: 720 },
            height: { ideal: 1280 },
          },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        activeStream = stream;
        const videoEl = videoRef.current;
        if (videoEl) {
          videoEl.srcObject = stream;
          await videoEl.play().catch(() => {});
        }
        setCameraStatus('ready');
      } catch {
        if (!cancelled) {
          setCameraStatus('fallback');
        }
      }
    };

    startCamera();

    return () => {
      cancelled = true;
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return undefined;

    const ctx = canvas.getContext('2d');
    if (!ctx) return undefined;

    let rafId = null;
    let lastTime = performance.now();
    let lastHudEmit = 0;

    const syncSize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(300, Math.floor(rect.width));
      const height = Math.max(420, Math.floor(rect.height));

      if (
        canvas.width !== Math.floor(width * dpr) ||
        canvas.height !== Math.floor(height * dpr)
      ) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
      }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return { width, height };
    };

    let viewport = syncSize();
    const handleResize = () => {
      viewport = syncSize();
    };
    window.addEventListener('resize', handleResize);

    const spawnFlyingCargo = (screenX, roadY, flipBackward) => {
      const dir = flipBackward ? -1 : 1;
      gameStateRef.current.flyingCargo = [
        {
          label: 'BULTO',
          color: '#d97706',
          w: 28,
          h: 22,
          x: screenX - 10,
          y: roadY - 46,
          vx: dir * (130 + Math.random() * 90),
          vy: -(340 + Math.random() * 140),
          angle: 0,
          va: dir * 9,
        },
        {
          label: 'CANASTA',
          color: '#ef4444',
          w: 26,
          h: 18,
          x: screenX + 4,
          y: roadY - 54,
          vx: dir * (170 + Math.random() * 110),
          vy: -(390 + Math.random() * 130),
          angle: 0.4,
          va: -dir * 11,
        },
        {
          label: 'PARRILLERO',
          color: '#38bdf8',
          w: 22,
          h: 30,
          x: screenX - 22,
          y: roadY - 58,
          vx: dir * (95 + Math.random() * 85),
          vy: -(310 + Math.random() * 120),
          angle: -0.2,
          va: dir * 7.5,
        },
      ];
    };

    const triggerCrash = (reasonCode, screenX, roadY) => {
      if (crashedRef.current) return;
      crashedRef.current = true;

      const state = gameStateRef.current;
      state.crashReason = reasonCode;
      state.shakeTime = 0.45;
      state.shakeIntensity = 12;

      if (!state.spawnedCargo) {
        state.spawnedCargo = true;
        spawnFlyingCargo(screenX, roadY, reasonCode === 'WHEELIE_FLIP');
      }

      audioManager.playRandomInsult();
      audioManager.stopEngineLoop();

      const meters = Math.max(0, (state.x - START_X) / PIXELS_PER_METER);
      if (onHudUpdateRef.current) {
        onHudUpdateRef.current({
          meters,
          wheelieBalance: state.wheelie,
        });
      }

      if (onCrashRef.current) {
        onCrashRef.current({
          meters,
          reasonCode,
        });
      }
    };

    const drawCameraBackground = (width, roadY) => {
      const video = videoRef.current;
      const hasLiveVideo =
        video &&
        video.readyState >= 2 &&
        video.videoWidth > 0 &&
        video.videoHeight > 0;

      if (hasLiveVideo) {
        const vw = video.videoWidth;
        const vh = video.videoHeight;
        const scale = Math.max(width / vw, roadY / vh);
        const drawW = vw * scale;
        const drawH = vh * scale;
        const offsetX = (width - drawW) / 2;
        const offsetY = (roadY - drawH) / 2;

        // Efecto espejo natural para cámara frontal tipo filtro/TikTok
        ctx.save();
        ctx.translate(width / 2, 0);
        ctx.scale(-1, 1);
        ctx.translate(-width / 2, 0);
        ctx.drawImage(video, offsetX, offsetY, drawW, drawH);
        ctx.restore();

        // Capa oscura suave para mejorar legibilidad del mototaxi y los huecos
        ctx.fillStyle = 'rgba(9, 13, 22, 0.36)';
        ctx.fillRect(0, 0, width, roadY);
        return;
      }

      // Respaldo si aún carga o no hay permiso de cámara
      const skyGrad = ctx.createLinearGradient(0, 0, 0, roadY);
      skyGrad.addColorStop(0, '#0f172a');
      skyGrad.addColorStop(0.65, '#1e293b');
      skyGrad.addColorStop(1, '#334155');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, width, roadY);
    };

    const step = (now) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;

      const { width, height } = viewport;
      const roadY = height - ROAD_HEIGHT;
      const state = gameStateRef.current;

      if (state.shakeTime > 0) {
        state.shakeTime = Math.max(0, state.shakeTime - dt);
      }

      if (isPlayingRef.current && !crashedRef.current) {
        const metersNow = Math.max(0, (state.x - START_X) / PIXELS_PER_METER);
        const speedBoost = Math.min(MAX_EXTRA_SPEED, metersNow * 1.15);
        const holdingNow = isHoldingRef.current;

        // Frenado ligero al levantar rueda; avance normal al soltar
        const targetSpeed = holdingNow
          ? (BASE_SPEED + speedBoost) * 0.78
          : BASE_SPEED + speedBoost;
        state.speed += (targetSpeed - state.speed) * Math.min(1, dt * 10);
        state.x += state.speed * dt;

        ensureRoadAhead(state.road, state.x, width + 900);

        // Física de wheelie (mantener sube, soltar baja)
        if (holdingNow) {
          state.wheelie = Math.min(108, state.wheelie + 74 * dt);
        } else {
          state.wheelie = Math.max(0, state.wheelie - 88 * dt);
        }

        state.yLift = (Math.min(100, state.wheelie) / 100) * 16;

        const cameraX = state.x - Math.min(120, width * 0.22);
        const motoScreenX = state.x - cameraX;

        // 1. ¿Se fue de espaldas?
        if (state.wheelie >= 100) {
          triggerCrash('WHEELIE_FLIP', motoScreenX, roadY);
        }

        // 2. Colisión con huecos, zanjas y charcos
        const frontWheelX = state.x + 28;
        const frontWheelCleared = state.wheelie >= 32;

        if (!crashedRef.current && !frontWheelCleared) {
          const obstacles = state.road.obstacles;
          for (let i = 0; i < obstacles.length; i += 1) {
            const obs = obstacles[i];
            const entryX = obs.x + 6;
            const exitX = obs.x + obs.width - 6;
            if (frontWheelX >= entryX && frontWheelX <= exitX) {
              triggerCrash(obs.reasonCode, motoScreenX, roadY);
              break;
            }
          }
        }

        if (now - lastHudEmit > 75) {
          lastHudEmit = now;
          if (onHudUpdateRef.current) {
            onHudUpdateRef.current({
              meters: Math.max(0, (state.x - START_X) / PIXELS_PER_METER),
              wheelieBalance: Math.min(100, state.wheelie),
            });
          }
        }
      }

      // Actualizar carga voladora si hubo choque
      if (state.flyingCargo.length > 0) {
        for (let i = 0; i < state.flyingCargo.length; i += 1) {
          const item = state.flyingCargo[i];
          item.vy += 980 * dt;
          item.x += item.vx * dt;
          item.y += item.vy * dt;
          item.angle += item.va * dt;
        }
      }

      // --- DIBUJADO ---
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      if (state.shakeTime > 0) {
        const mag = state.shakeIntensity * (state.shakeTime / 0.45);
        const dx = (Math.random() - 0.5) * 2 * mag;
        const dy = (Math.random() - 0.5) * 2 * mag;
        ctx.translate(dx, dy);
      }

      // Fondo con cámara en vivo (o respaldo oscuro si no hay cámara)
      drawCameraBackground(width, roadY);

      const cameraX = state.x - Math.min(120, width * 0.22);

      // Asfalto base sobre la parte inferior
      ctx.fillStyle = 'rgba(24, 24, 27, 0.92)';
      ctx.fillRect(0, roadY, width, ROAD_HEIGHT);

      // Línea amarilla central de calle
      ctx.fillStyle = '#facc15';
      const dashSpan = 64;
      const dashOffset = -(cameraX % dashSpan);
      for (let x = dashOffset - dashSpan; x < width + dashSpan; x += dashSpan) {
        ctx.fillRect(x, roadY + 28, 34, 5);
      }

      // Dibujar huecos, zanjas y charcos sobre el asfalto
      const obstacles = state.road.obstacles;
      for (let i = 0; i < obstacles.length; i += 1) {
        const obs = obstacles[i];
        const sx = obs.x - cameraX;
        if (sx + obs.width < -50 || sx > width + 50) continue;

        if (obs.type === 'puddle') {
          ctx.fillStyle = '#0284c7';
          ctx.fillRect(sx, roadY + 2, obs.width, 18);
          ctx.fillStyle = '#38bdf8';
          ctx.fillRect(sx + 6, roadY + 4, obs.width - 12, 6);
        } else {
          ctx.fillStyle = '#09090b';
          ctx.fillRect(sx, roadY, obs.width, obs.depth);

          ctx.strokeStyle = '#fb923c';
          ctx.lineWidth = 2.5;
          ctx.strokeRect(sx, roadY, obs.width, obs.depth);
        }
      }

      // Dibujar mototaxi
      const motoScreenX = state.x - cameraX;
      const engineVib =
        isPlayingRef.current && !crashedRef.current
          ? Math.sin(now * 0.045) * 1.5
          : 0;
      const pivotX = motoScreenX - 18;
      const pivotY = roadY - 12 - state.yLift + engineVib;
      const tiltAngle = -((Math.min(105, state.wheelie) / 100) * 0.72);

      ctx.save();
      ctx.translate(pivotX, pivotY);
      ctx.rotate(tiltAngle);

      // Cabina / carrocería del mototaxi
      ctx.fillStyle = isHoldingRef.current ? '#facc15' : '#f97316';
      ctx.fillRect(-14, -30, 52, 24);
      ctx.fillStyle = '#fef08a';
      ctx.fillRect(14, -26, 18, 12);

      // Carga encima si aún no ha chocado
      if (!state.spawnedCargo) {
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-10, -40, 22, 10);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(14, -38, 14, 8);
      }

      // Rueda trasera (pivote)
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Rueda delantera
      ctx.fillStyle = '#18181b';
      ctx.beginPath();
      ctx.arc(38, 0, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#e4e4e7';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.restore();

      // Carga volando por los aires al chocar
      for (let i = 0; i < state.flyingCargo.length; i += 1) {
        const item = state.flyingCargo[i];
        ctx.save();
        ctx.translate(item.x, item.y);
        ctx.rotate(item.angle);
        ctx.fillStyle = item.color;
        ctx.fillRect(-item.w / 2, -item.h / 2, item.w, item.h);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 8px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(item.label, 0, 3);
        ctx.restore();
      }

      ctx.restore();

      rafId = requestAnimationFrame(step);
    };

    rafId = requestAnimationFrame(step);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div ref={containerRef} className="game-canvas-box">
      <video
        ref={videoRef}
        muted
        playsInline
        autoPlay
        style={{ display: 'none' }}
      />
      <canvas ref={canvasRef} className="game-canvas-box__canvas" />
      {cameraStatus === 'fallback' && (
        <div className="camera-badge">Cámara no activa — modo respaldo</div>
      )}
    </div>
  );
}