import { useCallback, useEffect, useState } from 'react';
import { CrashModal } from './components/CrashModal';
import { GameCanvas } from './components/GameCanvas';
import { HUD } from './components/HUD';
import { StartScreen } from './components/StartScreen';
import { audioManager } from './utils/audioManager';
import {
  getCrashReasonText,
  getCrashTitle,
  getRandomCrashMessage,
} from './utils/crashTitles';
import './App.css';

const BEST_STORAGE_KEY = 'frenazo_mototaxi_best_meters';

function loadBestMeters() {
  try {
    const raw = window.localStorage.getItem(BEST_STORAGE_KEY);
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
  } catch {
    return 0;
  }
}

function saveBestMeters(meters) {
  try {
    window.localStorage.setItem(BEST_STORAGE_KEY, String(Math.floor(meters)));
  } catch {
    // Ignorar errores de almacenamiento privado
  }
}

export function App() {
  // 'START' | 'READY_TAP' | 'PLAYING' | 'CRASHED'
  const [gameState, setGameState] = useState('START');
  const [isHolding, setIsHolding] = useState(false);
  const [runId, setRunId] = useState(0);
  const [attemptCount, setAttemptCount] = useState(0);

  const [meters, setMeters] = useState(0);
  const [bestMeters, setBestMeters] = useState(() => loadBestMeters());
  const [wheelieBalance, setWheelieBalance] = useState(0);

  const [crashSummary, setCrashSummary] = useState({
    meters: 0,
    isNewRecord: false,
    title: '',
    message: '',
    reasonText: '',
  });

  const handleStartGame = useCallback(() => {
    audioManager.unlockAll();
    audioManager.stopCurrent();
    audioManager.startEngineLoop();
    setMeters(0);
    setWheelieBalance(0);
    setIsHolding(false);
    setRunId((prev) => prev + 1);
    setGameState('READY_TAP');
  }, []);

  const handleFirstTapLaunch = useCallback((holdAfterStart = true) => {
    setGameState((prev) => {
      if (prev !== 'READY_TAP') return prev;
      setIsHolding(Boolean(holdAfterStart));
      return 'PLAYING';
    });
  }, []);

  const handleRetryGame = useCallback(() => {
    audioManager.stopCurrent();
    audioManager.startEngineLoop();
    setMeters(0);
    setWheelieBalance(0);
    setIsHolding(false);
    setRunId((prev) => prev + 1);
    setGameState('READY_TAP');
  }, []);

  const handleHudUpdate = useCallback(({ meters: nextMeters, wheelieBalance: nextWheelie }) => {
    setMeters(nextMeters);
    setWheelieBalance(nextWheelie);
  }, []);

  const handleCrash = useCallback(
    ({ meters: crashMeters, reasonCode }) => {
      setIsHolding(false);
      setGameState('CRASHED');

      const finalMeters = Math.max(0, Math.floor(crashMeters));
      const previousBest = loadBestMeters();
      const beatRecord = finalMeters > previousBest && finalMeters > 0;
      const updatedBest = beatRecord ? finalMeters : previousBest;

      if (beatRecord) {
        saveBestMeters(updatedBest);
        setBestMeters(updatedBest);
      }

      const nextAttempt = attemptCount + 1;
      setAttemptCount(nextAttempt);

      setCrashSummary({
        meters: finalMeters,
        isNewRecord: beatRecord,
        title: getCrashTitle(finalMeters, reasonCode),
        message: getRandomCrashMessage(nextAttempt),
        reasonText: getCrashReasonText(reasonCode),
      });
    },
    [attemptCount]
  );

  // Controles de teclado (Espacio / Flecha arriba)
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.repeat) return;
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        if (gameState === 'READY_TAP') {
          event.preventDefault();
          handleFirstTapLaunch(true);
        } else if (gameState === 'PLAYING') {
          event.preventDefault();
          setIsHolding(true);
        }
      }
    };

    const onKeyUp = (event) => {
      if (event.code === 'Space' || event.code === 'ArrowUp') {
        setIsHolding(false);
      }
    };

    const onWindowBlur = () => {
      setIsHolding(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onWindowBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
    };
  }, [gameState, handleFirstTapLaunch]);

  const handleStagePointerDown = (event) => {
    if (event.target.closest('button')) return;

    if (gameState === 'READY_TAP') {
      handleFirstTapLaunch(true);
      return;
    }

    if (gameState === 'PLAYING') {
      setIsHolding(true);
    }
  };

  const releaseHold = () => {
    setIsHolding(false);
  };

  return (
    <main
      className="app-shell"
      onPointerDown={handleStagePointerDown}
      onPointerUp={releaseHold}
      onPointerCancel={releaseHold}
      onPointerLeave={releaseHold}
    >
      <div className="game-stage">
        {gameState !== 'START' && (
          <HUD
            meters={meters}
            bestMeters={bestMeters}
            wheelieBalance={wheelieBalance}
          />
        )}

        <GameCanvas
          isPlaying={gameState === 'PLAYING'}
          isHolding={gameState === 'PLAYING' ? isHolding : false}
          runId={runId}
          onHudUpdate={handleHudUpdate}
          onCrash={handleCrash}
        />

        {gameState === 'READY_TAP' && (
          <div className="center-tap-overlay" aria-live="polite">
            <img
              src={`${import.meta.env.BASE_URL}images/tap-gesture.gif`}
              alt="Haz tap hacia arriba para comenzar"
              className="center-tap-overlay__gif"
            />
            <span className="center-tap-overlay__label">
              ¡Haz tap hacia arriba para arrancar!
            </span>
          </div>
        )}

        {gameState === 'START' && (
          <StartScreen
            bestMeters={bestMeters}
            onStart={handleStartGame}
          />
        )}

        {gameState === 'CRASHED' && (
          <CrashModal
            meters={crashSummary.meters}
            bestMeters={bestMeters}
            isNewRecord={crashSummary.isNewRecord}
            title={crashSummary.title}
            message={crashSummary.message}
            reasonText={crashSummary.reasonText}
            onRetry={handleRetryGame}
          />
        )}
      </div>
    </main>
  );
}

export default App;