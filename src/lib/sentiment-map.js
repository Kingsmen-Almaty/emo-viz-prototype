export const neutralSentiment = {
  expression: 'neutral',
  label: 'Thoughtful',
  score: 0,
  colour: '#bfe8ff',
  accent: '#f7fbff',
  pattern: 'breathing-gradient',
  copy: 'Calm, reflective, undecided',
};

export const sentimentMap = {
  happy: {
    label: 'Excited',
    colour: '#ffd36a',
    accent: '#fff7d6',
    pattern: 'bloom',
    copy: 'Hopeful, positive, enthusiastic',
  },
  surprise: {
    label: 'Curious',
    colour: '#56e9ff',
    accent: '#ff62d4',
    pattern: 'expanding-pulse',
    copy: 'Amazed, intrigued, open to possibility',
  },
  neutral: neutralSentiment,
  sad: {
    label: 'Concerned',
    colour: '#6ea8d8',
    accent: '#a8dae7',
    pattern: 'downward-fade',
    copy: 'Worried about impact, ethics, society',
  },
  fear: {
    label: 'Anxious',
    colour: '#a88cff',
    accent: '#b7f7ff',
    pattern: 'soft-shimmer',
    copy: 'Uneasy, cautious, uncertain',
  },
  angry: {
    label: 'Resistant',
    colour: '#ff4d3f',
    accent: '#ff9b3d',
    pattern: 'heavy-pulse',
    copy: 'Frustrated, opposed, uncomfortable',
  },
  disgust: {
    label: 'Distrustful',
    colour: '#9dce57',
    accent: '#ffbf54',
    pattern: 'broken-fade',
    copy: 'Skeptical, rejecting, distrustful',
  },
};

const aliases = {
  surprised: 'surprise',
  fearful: 'fear',
  disgusted: 'disgust',
  sadness: 'sad',
  happiness: 'happy',
};

export const expressionOrder = ['happy', 'surprise', 'neutral', 'sad', 'fear', 'angry', 'disgust'];
const expressionKeys = new Set(expressionOrder);

export function mapExpressionToSentiment(expression, score = 0) {
  const key = aliases[expression] ?? expression ?? 'neutral';
  const sentiment = sentimentMap[key] ?? neutralSentiment;
  return { ...sentiment, expression: key, score };
}

export function getDominantExpression(expressions = {}) {
  const entries = Object.entries(expressions)
    .filter(([key, value]) => expressionKeys.has(key) && Number.isFinite(value));
  if (!entries.length) return null;
  const [name, score] = entries.sort((a, b) => b[1] - a[1])[0];
  return { name, score };
}
