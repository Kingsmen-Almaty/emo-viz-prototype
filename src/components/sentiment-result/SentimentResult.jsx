import React from 'react';

export function SentimentResult({ tracking, sentiment }) {
  return (
    <div className="sentimentResult" data-testid="sentiment-result">
      <span>{tracking.phase === 'idle' ? 'Ambient prompt' : tracking.phase}</span>
      <strong>{tracking.message}</strong>
      <small>{sentiment.copy}</small>
    </div>
  );
}
