import React from 'react';
import { expressionOrder } from '../../lib/sentiment-map.js';

export function DiagnosticsPanel({ tracking, sentiment }) {
  return (
    <section className="diagnosticsPanel" data-testid="diagnostics-panel">
      <header>
        <span>Real-time calculation</span>
        <strong>{sentiment.label}</strong>
      </header>
      <div className="metricGrid">
        <span>phase</span>
        <strong>{tracking.held ? 'reacquiring' : tracking.phase}</strong>
        <span>confidence</span>
        <strong>{Math.round(tracking.confidence * 100)}%</strong>
        <span>faces</span>
        <strong>{tracking.faces?.length ?? (tracking.face ? 1 : 0)}</strong>
        <span>pattern</span>
        <strong>{sentiment.pattern}</strong>
        {tracking.expressions?.positiveAssist ? (
          <>
            <span>positive assist</span>
            <strong>{Math.round(tracking.expressions.positiveAssist * 100)}%</strong>
          </>
        ) : null}
      </div>
      <div className="bars">
        {expressionOrder.map((expression) => {
          const value = tracking.expressions[expression] ?? 0;
          return (
            <div className="barRow" key={expression}>
              <span>{expression}</span>
              <div className="barTrack">
                <div className="barFill" style={{ width: `${Math.round(value * 100)}%`, background: sentiment.colour }} />
              </div>
              <strong>{Math.round(value * 100)}</strong>
            </div>
          );
        })}
      </div>
    </section>
  );
}
