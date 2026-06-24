export function createSmoother({ windowMs = 2400, minSamples = 6, holdMs = 1600 } = {}) {
  let samples = [];
  let lastFace = null;
  let lastFaces = [];
  let lastExpressions = {};
  let lastConfidence = 0;
  let lastSeenAt = 0;

  return {
    add(result) {
      const now = performance.now();
      samples.push({ ...result, now });
      samples = samples.filter((sample) => now - sample.now <= windowMs);

      const faceSamples = samples.filter((sample) => sample.face);
      if (!faceSamples.length) {
        const canHold = lastFace && now - lastSeenAt <= holdMs;
        return {
          face: canHold ? lastFace : null,
          faces: canHold ? lastFaces : [],
          expressions: canHold ? lastExpressions : {},
          confidence: canHold ? lastConfidence * 0.72 : 0,
          locked: false,
          held: canHold,
        };
      }

      const expressionTotals = {};
      for (const sample of faceSamples) {
        for (const [key, value] of Object.entries(sample.expressions ?? {})) {
          expressionTotals[key] = (expressionTotals[key] ?? 0) + value;
        }
      }

      const expressions = {};
      for (const [key, total] of Object.entries(expressionTotals)) {
        expressions[key] = total / faceSamples.length;
      }

      const latest = faceSamples[faceSamples.length - 1];
      const confidence = faceSamples.reduce((sum, sample) => sum + (sample.confidence ?? 0), 0) / faceSamples.length;
      lastFace = latest.face;
      lastFaces = latest.faces ?? (latest.face ? [latest.face] : []);
      lastExpressions = expressions;
      lastConfidence = confidence;
      lastSeenAt = now;

      return {
        face: latest.face,
        faces: latest.faces ?? (latest.face ? [latest.face] : []),
        expressions,
        confidence,
        locked: faceSamples.length >= minSamples && confidence > 0.45,
        held: false,
      };
    },
    reset() {
      samples = [];
      lastFace = null;
      lastFaces = [];
      lastExpressions = {};
      lastConfidence = 0;
      lastSeenAt = 0;
    },
  };
}
