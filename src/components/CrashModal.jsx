import { audioManager } from '../utils/audioManager';

export function CrashModal({
  meters = 0,
  bestMeters = 0,
  isNewRecord = false,
  title = 'Suspensión Destruida en Neiva',
  message = '',
  reasonText = '',
  onRetry,
}) {
  const safeMeters = Math.max(0, Math.floor(meters));
  const safeBest = Math.max(safeMeters, Math.floor(bestMeters));

  const handleRetryClick = (event) => {
    event.stopPropagation();
    audioManager.stopCurrent();
    if (onRetry) {
      onRetry();
    }
  };

  return (
    <div
      className="crash-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Fin de la partida"
    >
      <div className="crash-modal__card">
        {isNewRecord && (
          <span className="crash-modal__badge">¡NUEVO RÉCORD!</span>
        )}

        <h2 className="crash-modal__title">{title}</h2>
        {reasonText && <p className="crash-modal__reason">{reasonText}</p>}
        {message && <p className="crash-modal__message">{message}</p>}

        <div className="crash-modal__stats">
          <div className="crash-modal__stat">
            <span>RECORRIDO</span>
            <strong>{safeMeters} m</strong>
          </div>
          <div className="crash-modal__stat">
            <span>RÉCORD</span>
            <strong>{safeBest} m</strong>
          </div>
        </div>

        <button
          type="button"
          className="crash-modal__retry"
          onClick={handleRetryClick}
        >
          ¡OTRA VEZ![cite: 3]
        </button>
      </div>
    </div>
  );
}