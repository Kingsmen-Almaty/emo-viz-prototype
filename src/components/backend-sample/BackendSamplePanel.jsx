import React from 'react';

export function BackendSamplePanel({ sample, status }) {
  return (
    <section className="samplePanel" data-testid="backend-sample-panel">
      <header>
        <span>Backend sample</span>
        <strong>{status}</strong>
      </header>
      <div className="samplePreview">
        {sample?.dataUrl ? (
          <img src={sample.dataUrl} alt="Small face crop sent to backend" data-testid="backend-sample-image" />
        ) : (
          <div className="samplePlaceholder">waiting for face</div>
        )}
      </div>
      <div className="sampleMeta">
        <span>{sample ? `${sample.width}x${sample.height}` : '192x192'}</span>
        <span>{sample ? `${Math.round(sample.bytes / 1024)} KB JPEG` : 'no sample yet'}</span>
      </div>
    </section>
  );
}
