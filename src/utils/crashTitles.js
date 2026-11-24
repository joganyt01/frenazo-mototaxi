const CRASH_MESSAGES = [
  'En las calles de Neiva ese hueco ya es patrimonio del barrio.',
  'Con este calorón de Neiva y ese frenazo, hasta el mototaxi pidió agua.',
  'Los bultos y el parrillero ya están pidiendo pista por toda Neiva.',
  'Se calculó a ojo de buen cubero y ganó el cráter.',
  'La suspensión pidió vacaciones anticipadas y sin sueldo.',
  'Ni el mototaxista más veterano de Neiva frena tan seco.',
  'Ese wheelie prometía portada en Neiva, pero terminó en zanja.',
];

export function getCrashReasonText(reasonCode) {
  switch (reasonCode) {
    case 'WHEELIE_FLIP':
      return 'Te pasaste con el toque y el mototaxi se fue de espaldas.';
    case 'TRENCH_SINK':
      return 'La zanja era larga y soltaste la rueda antes de cruzar.';
    case 'CHARCO_TRAP':
      return 'Ese charco inocente escondía un hueco traicionero.';
    case 'DOUBLE_CRATER':
      return 'Te faltó ritmo en el doble cráter (tap - pausa - tap).';
    case 'CRATER_HIT':
    default:
      return 'La rueda delantera se clavó en el borde del hueco.';
  }
}

export function getCrashTitle(meters = 0, reasonCode = 'CRATER_HIT') {
  const safeMeters = Math.max(0, Math.floor(meters));

  if (reasonCode === 'WHEELIE_FLIP') {
    return '¡Caballito Olímpico de Espaldas!';
  }

  if (safeMeters < 15) {
    return 'Explorador Oficial de Cráteres de Neiva';
  }
  if (safeMeters < 40) {
    return 'Suspensión Destruida en Neiva';
  }
  if (safeMeters < 80) {
    return 'Cazador de Zanjas Opitas';
  }
  if (safeMeters < 140) {
    return 'Campeón del Asfalto Roto de Neiva';
  }
  return 'Leyenda Sobreviviente de las Calles de Neiva';
}

export function getRandomCrashMessage(attemptCount = 0) {
  if (CRASH_MESSAGES.length === 0) return '¡A darle otra vez!';
  const index = Math.abs(attemptCount) % CRASH_MESSAGES.length;
  return CRASH_MESSAGES[index];
}