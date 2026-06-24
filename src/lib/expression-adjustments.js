export function applySmileCorrection(expressions = {}, face = null) {
  const smile = face?.metrics?.smile ?? 0;
  const happy = expressions.happy ?? 0;
  const negativeMax = Math.max(
    expressions.angry ?? 0,
    expressions.sad ?? 0,
    expressions.fear ?? 0,
    expressions.disgust ?? 0,
  );
  const classifierSmileEvidence = happy >= 0.12 && negativeMax < 0.78
    ? Math.min(0.78, (happy - 0.08) * 4.2)
    : 0;
  const positiveEvidence = Math.max(smile, classifierSmileEvidence);

  if (positiveEvidence < 0.18) return expressions;

  const strength = Math.min(1, (positiveEvidence - 0.18) / 0.52);
  const corrected = { ...expressions };

  corrected.happy = Math.max(corrected.happy ?? 0, 0.62 + strength * 0.28);
  corrected.angry = (corrected.angry ?? 0) * (1 - strength * 0.9);
  corrected.sad = (corrected.sad ?? 0) * (1 - strength * 0.86);
  corrected.fear = (corrected.fear ?? 0) * (1 - strength * 0.72);
  corrected.disgust = (corrected.disgust ?? 0) * (1 - strength * 0.72);
  corrected.neutral = (corrected.neutral ?? 0) * (1 - strength * 0.42);
  corrected.positiveAssist = positiveEvidence;

  return corrected;
}
