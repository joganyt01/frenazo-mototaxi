export const PIXELS_PER_METER = 48;

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function createObstacle({ id, type, x, width, depth, reasonCode, label }) {
  return {
    id,
    type,
    x,
    width,
    depth,
    reasonCode,
    label,
  };
}

function buildSegmentObstacles(startX, metersAhead, seqRef) {
  const obstacles = [];
  let cursorX = startX;

  // Curva de dificultad según distancia: 0 (suave) -> 1 (alta)
  const difficulty = Math.min(1, metersAhead / 180);

  const minGap = 250 - difficulty * 85;
  const maxGap = 390 - difficulty * 115;

  for (let i = 0; i < 6; i += 1) {
    cursorX += randomBetween(minGap, maxGap);
    seqRef.current += 1;
    const id = `obs-${seqRef.current}`;

    const roll = Math.random();

    if (metersAhead < 12) {
      // Primeros metros: hueco estándar amigable
      obstacles.push(
        createObstacle({
          id,
          type: 'crater',
          x: cursorX,
          width: randomBetween(62, 78),
          depth: 22,
          reasonCode: 'CRATER_HIT',
          label: 'Cráter',
        })
      );
      cursorX += 70;
    } else if (roll < 0.34 - difficulty * 0.1) {
      // Hueco estándar
      const width = randomBetween(66, 88 + difficulty * 18);
      obstacles.push(
        createObstacle({
          id,
          type: 'crater',
          x: cursorX,
          width,
          depth: 24,
          reasonCode: 'CRATER_HIT',
          label: 'Cráter',
        })
      );
      cursorX += width;
    } else if (roll < 0.62) {
      // Zanja de obra inconclusa (ancha)
      const width = randomBetween(112, 155 + difficulty * 35);
      obstacles.push(
        createObstacle({
          id,
          type: 'trench',
          x: cursorX,
          width,
          depth: 28,
          reasonCode: 'TRENCH_SINK',
          label: 'Zanja',
        })
      );
      cursorX += width;
    } else if (roll < 0.84) {
      // Doble cráter seguido (tap - pausa - tap)
      const firstWidth = randomBetween(56, 70);
      const bridgeWidth = randomBetween(68, 86);
      const secondWidth = randomBetween(58, 74);

      obstacles.push(
        createObstacle({
          id: `${id}-a`,
          type: 'crater',
          x: cursorX,
          width: firstWidth,
          depth: 24,
          reasonCode: 'DOUBLE_CRATER',
          label: 'Doble 1',
        })
      );

      obstacles.push(
        createObstacle({
          id: `${id}-b`,
          type: 'crater',
          x: cursorX + firstWidth + bridgeWidth,
          width: secondWidth,
          depth: 25,
          reasonCode: 'DOUBLE_CRATER',
          label: 'Doble 2',
        })
      );

      cursorX += firstWidth + bridgeWidth + secondWidth;
    } else {
      // Charco engañoso con trampa profunda
      const width = randomBetween(84, 115);
      obstacles.push(
        createObstacle({
          id,
          type: 'puddle',
          x: cursorX,
          width,
          depth: 26,
          reasonCode: 'CHARCO_TRAP',
          label: 'Charco',
        })
      );
      cursorX += width;
    }
  }

  return {
    obstacles,
    nextStartX: cursorX + 120,
  };
}

export function createInitialRoadState() {
  const seqRef = { current: 0 };
  const firstBatch = buildSegmentObstacles(520, 0, seqRef);
  const secondBatch = buildSegmentObstacles(firstBatch.nextStartX, 35, seqRef);

  return {
    obstacles: [...firstBatch.obstacles, ...secondBatch.obstacles],
    generatedUntilX: secondBatch.nextStartX,
    seqRef,
  };
}

export function ensureRoadAhead(roadState, currentX, lookaheadPx = 1200) {
  while (roadState.generatedUntilX < currentX + lookaheadPx) {
    const metersAhead = Math.max(0, roadState.generatedUntilX / PIXELS_PER_METER);
    const batch = buildSegmentObstacles(
      roadState.generatedUntilX,
      metersAhead,
      roadState.seqRef
    );
    roadState.obstacles.push(...batch.obstacles);
    roadState.generatedUntilX = batch.nextStartX;
  }

  // Limpiar obstáculos muy atrás para mantener el rendimiento fluido
  const pruneBeforeX = currentX - 450;
  if (roadState.obstacles.length > 30) {
    roadState.obstacles = roadState.obstacles.filter(
      (obs) => obs.x + obs.width >= pruneBeforeX
    );
  }
}