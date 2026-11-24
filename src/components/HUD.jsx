export function HUD({ meters = 0, bestMeters = 0, wheelieBalance = 0 }) {
  const safeMeters = Math.max(0, Math.floor(meters));
  const safeBest = Math.max(safeMeters, Math.floor(bestMeters));
  const clampedBalance = Math.max(0, Math.min(100, Math.round(wheelieBalance)));
  const isDanger = clampedBalance >= 78;

  return (
    <header className="hud" aria-label="Indicadores de carrera">
      <div className="hud__stats">
        <div className="hud__stat">
          <span className="hud__label">DISTANCIA</span>
          <strong className="hud__value">{safeMeters} m</strong>
        </div>

        <div className="hud__stat">
          <span className="hud__label">RÉCORD</span>
          <strong className="hud__value hud__value--gold">{safeBest} m</strong>
        </div>
      </div>

      <div className="hud__balance">
        <div className="hud__balance-header">
          <span className="hud__label">WHEELIE</span>
          <span
            className={`hud__balance-pct ${
              isDanger ? 'hud__balance-pct--danger' : ''
            }`}
          >
            {clampedBalance}%
          </span>
        </div>

        <div
          className="hud__bar"
          role="progressbar"
          aria-valuenow={clampedBalance}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div
            className={`hud__bar-fill ${
              isDanger ? 'hud__bar-fill--danger' : ''
            }`}
            style={{ width: `${clampedBalance}%` }}
          />
        </div>
      </div>
    </header>
  );
}