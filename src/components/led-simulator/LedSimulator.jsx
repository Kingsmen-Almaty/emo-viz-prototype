import React from 'react';

export function LedSimulator({ sentiment, phase }) {
  return (
    <section className="ledPanel" data-testid="led-simulator" style={{ '--led-colour': sentiment.colour, '--led-accent': sentiment.accent }}>
      <header>
        <span>LED mesh</span>
        <strong>{phase === 'idle' ? 'ambient' : sentiment.pattern}</strong>
      </header>
      <div className={`ledGrid ledGrid--${sentiment.pattern}`}>
        {Array.from({ length: 96 }, (_, index) => (
          <i key={index} style={{ '--delay': `${(index % 12) * 80}ms`, '--level': `${0.18 + ((index * 17) % 70) / 100}` }} />
        ))}
      </div>
    </section>
  );
}
