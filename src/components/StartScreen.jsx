import { audioManager } from '../utils/audioManager';

export function StartScreen({ bestMeters = 0, onStart }) {
  const handleStartClick = (event) => {
    event.stopPropagation();
    audioManager.unlockAll();
    audioManager.startEngineLoop();
    if (onStart) {
      onStart();
    }
  };

  return (
   <section className="start-screen" aria-label="Pantalla de inicio">
  <div className="start-screen__card">
    <span className="start-screen__badge">ONE-TAP • NEIVA EDITION</span>
    <h1 className="start-screen__title">
      El Frenazo del Mototaxi
      <span>El Cráter de Neiva</span>
    </h1>
    <p className="start-screen__subtitle">
      Mantén presionado para levantar la rueda (wheelie) y cruzar huecos, zanjas y charcos. ¡No te vayas de espaldas ni caigas de trompa!
    </p>

    <ul className="start-screen__rules">
      <li>
        <strong>Mantén (Toque / Clic / Espacio):</strong> Levanta la rueda delantera y frena suave.
      </li>
      <li>
        <strong>Suelta a tiempo:</strong> Aterriza pasado el hueco o la zanja.
      </li>
      <li>
        <strong>Cuidado:</strong> Si mantienes demasiado, te vas de espaldas. Si caes al hueco, ¡suena el reclamo!
      </li>
    </ul>

    {bestMeters > 0 && (
      <div className="start-screen__record">
        Récord actual: <strong>{Math.floor(bestMeters)} m</strong>
      </div>
    )}

  

    <button
      type="button"
      className="start-screen__cta"
      onClick={handleStartClick}
    >
      ¡ARRANCAR MOTOTAXI!
    </button>
  </div>
</section>
  );
}