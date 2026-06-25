import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Gauge, Maximize, Pause, Play, RefreshCw } from 'lucide-react';
import { createRoot } from 'react-dom/client';
import { CameraFeed } from './components/camera-feed/CameraFeed.jsx';
import { DiagnosticsPanel } from './components/diagnostics-panel/DiagnosticsPanel.jsx';
import { BackendSamplePanel } from './components/backend-sample/BackendSamplePanel.jsx';
import { LedSimulator } from './components/led-simulator/LedSimulator.jsx';
import { SentimentOverlay } from './components/sentiment-overlay/SentimentOverlay.jsx';
import { SentimentResult } from './components/sentiment-result/SentimentResult.jsx';
import { applySmileCorrection } from './lib/expression-adjustments.js';
import { createFaceSample, createFrameSample, sendFaceSampleToBackend, sendFrameToBackend } from './lib/face-sampler.js';
import { getDominantExpression, mapExpressionToSentiment, neutralSentiment } from './lib/sentiment-map.js';
import { createSmoother } from './lib/smoothing.js';
import './styles/global.css';

const isTestMode = new URLSearchParams(window.location.search).get('mode') === 'test';

function createBackendFeatureTestResult(primaryFace) {
  const face = primaryFace ?? {
    x: 410,
    y: 130,
    width: 420,
    height: 470,
    landmarks: {
      leftEye: { x: 545, y: 330 },
      rightEye: { x: 735, y: 330 },
      nose: { x: 640, y: 450 },
      mouth: { x: 640, y: 505 },
      leftMouth: { x: 584, y: 505 },
      rightMouth: { x: 696, y: 505 },
      brow: { x: 640, y: 272 },
    },
  };
  const secondary = {
    x: face.x + face.width * 1.12,
    y: face.y + face.height * 0.18,
    width: face.width * 0.46,
    height: face.height * 0.5,
    confidence: 0.72,
    landmarks: {
      leftEye: { x: face.x + face.width * 1.27, y: face.y + face.height * 0.36 },
      rightEye: { x: face.x + face.width * 1.43, y: face.y + face.height * 0.36 },
      nose: { x: face.x + face.width * 1.35, y: face.y + face.height * 0.47 },
      mouth: { x: face.x + face.width * 1.35, y: face.y + face.height * 0.57 },
      leftMouth: { x: face.x + face.width * 1.31, y: face.y + face.height * 0.57 },
      rightMouth: { x: face.x + face.width * 1.39, y: face.y + face.height * 0.57 },
      brow: { x: face.x + face.width * 1.35, y: face.y + face.height * 0.29 },
    },
  };

  return {
    engine: 'backend-yunet-test',
    latencyMs: 14,
    faces: [
      { ...face, confidence: 0.93 },
      secondary,
    ],
  };
}

function App() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const lastFeatureBackendAtRef = useRef(0);
  const lastBackendAtRef = useRef(0);
  const backendFeatureResultRef = useRef(null);
  const backendExpressionsRef = useRef(null);
  const smootherRef = useRef(createSmoother({ windowMs: 3000, minSamples: 5, holdMs: 2400 }));
  const frameRef = useRef(0);
  const [cameraState, setCameraState] = useState(isTestMode ? 'test-feed' : 'starting');
  const [modelState] = useState('python-local');
  const [featureEngineState, setFeatureEngineState] = useState('backend-yunet-ready');
  const [emotionEngine, setEmotionEngine] = useState('ferplus-assisted');
  const [emotionEngineState, setEmotionEngineState] = useState('ferplus-assisted-ready');
  const [backendSample, setBackendSample] = useState(null);
  const [backendStatus, setBackendStatus] = useState('idle');
  const [tracking, setTracking] = useState({
    phase: 'idle',
    face: null,
    faces: [],
    expressions: {},
    confidence: 0,
    message: 'How do you feel about the future of AI?',
    timestamp: Date.now(),
  });
  const [isPaused, setIsPaused] = useState(false);
  const resetTracking = useCallback(() => {
    smootherRef.current.reset();
    backendFeatureResultRef.current = null;
    backendExpressionsRef.current = null;
    lastFeatureBackendAtRef.current = 0;
    lastBackendAtRef.current = 0;
    setBackendStatus('idle');
    setTracking({
      phase: 'idle',
      face: null,
      faces: [],
      expressions: {},
      confidence: 0,
      held: false,
      message: 'How do you feel about the future of AI?',
      timestamp: Date.now(),
    });
  }, []);

  const activeSentiment = useMemo(() => {
    const dominant = getDominantExpression(tracking.expressions);
    return dominant ? mapExpressionToSentiment(dominant.name, dominant.score) : neutralSentiment;
  }, [tracking.expressions]);

  const detectFrame = useCallback(async () => {
    const video = videoRef.current;

    if (!video || isPaused) {
      frameRef.current = window.requestAnimationFrame(detectFrame);
      return;
    }

    if (video.readyState >= 2) {
      const result = {
        face: null,
        faces: [],
        expressions: {},
        confidence: 0,
        trackedCenter: null,
      };

      if (performance.now() - lastFeatureBackendAtRef.current > 260) {
        const frameSample = createFrameSample(video, { width: 640, quality: 0.64 });
        if (frameSample) {
          lastFeatureBackendAtRef.current = performance.now();
          try {
            const backendFeatureResult = isTestMode
              ? createBackendFeatureTestResult(result.face)
              : await sendFrameToBackend(frameSample);
            backendFeatureResultRef.current = backendFeatureResult;
            setFeatureEngineState(`${backendFeatureResult.engine ?? 'opencv-yunet'} ${backendFeatureResult.latencyMs ?? 0}ms ${backendFeatureResult.faces?.length ?? 0} faces`);
          } catch (error) {
            console.warn('Backend feature placement failed.', error);
            setFeatureEngineState('backend-yunet-offline');
          }
        }
      }

      if (backendFeatureResultRef.current?.faces) {
        const faces = backendFeatureResultRef.current.faces;
        result.faces = faces;
        result.face = faces[0] ?? null;
        result.confidence = faces[0]?.confidence ?? 0;
        result.trackedCenter = faces[0]
          ? { x: faces[0].x + faces[0].width / 2, y: faces[0].y + faces[0].height / 2 }
          : null;
      }

      if (result.face && performance.now() - lastBackendAtRef.current > 700) {
        const sample = createFaceSample(video, result.face, { size: 192, quality: 0.7 });
        if (sample) {
          setBackendSample(sample);
          lastBackendAtRef.current = performance.now();

          setBackendStatus('sending');
          try {
            const backendResult = isTestMode
              ? {
                expressions: emotionEngine === 'ferplus-assisted'
                  ? { happy: 0.12, surprise: 0.04, neutral: 0.2, sad: 0.58, fear: 0.03, angry: 0.03, disgust: 0 }
                  : { happy: 0.18, surprise: 0.04, neutral: 0.64, sad: 0.09, fear: 0.02, angry: 0.03, disgust: 0 },
                latencyMs: 18,
                engine: emotionEngine === 'ferplus-assisted' ? 'backend-assisted-test' : 'backend-ferplus-test',
              }
              : await sendFaceSampleToBackend(sample, { mode: emotionEngine });
            backendExpressionsRef.current = backendResult.expressions;
            setEmotionEngineState(`${backendResult.engine ?? 'python-backend'} ${backendResult.latencyMs ?? 0}ms`);
            setBackendStatus(`${backendResult.latencyMs ?? 0}ms`);
          } catch (error) {
            console.warn('Backend emotion analysis failed.', error);
            setBackendStatus('offline');
            setEmotionEngineState('backend-offline');
          }
        }
      }

      const expressions = backendExpressionsRef.current ?? result.expressions;
      const adjustedExpressions = applySmileCorrection(expressions, result.face);
      const detection = { ...result, expressions: adjustedExpressions };
      const smoothed = smootherRef.current.add(detection);
      const dominant = getDominantExpression(smoothed.expressions);
      const sentiment = dominant ? mapExpressionToSentiment(dominant.name, dominant.score) : neutralSentiment;
      const hasFace = Boolean(smoothed.face);

      setTracking({
        phase: hasFace ? (smoothed.held ? 'tracking' : (smoothed.locked ? 'result' : 'reading')) : 'idle',
        face: smoothed.face,
        faces: smoothed.faces ?? (smoothed.face ? [smoothed.face] : []),
        expressions: smoothed.expressions,
        confidence: smoothed.confidence,
        held: smoothed.held,
        message: hasFace
          ? `You seem ${sentiment.label} about the future of AI.`
          : 'How do you feel about the future of AI?',
        timestamp: Date.now(),
      });
    }

    frameRef.current = window.requestAnimationFrame(detectFrame);
  }, [emotionEngine, isPaused]);

  useEffect(() => {
    frameRef.current = window.requestAnimationFrame(detectFrame);
    return () => window.cancelAnimationFrame(frameRef.current);
  }, [detectFrame]);

  return (
    <main className="appShell" data-testid="emo-viz-app">
      <section className="experienceStage" aria-label="Emo Viz live camera sentiment prototype">
        <CameraFeed
          ref={videoRef}
          isTestMode={isTestMode}
          onStateChange={setCameraState}
          isPaused={isPaused}
        />
        <SentimentOverlay
          ref={canvasRef}
          videoRef={videoRef}
          tracking={tracking}
          sentiment={activeSentiment}
          isTestMode={isTestMode}
        />
        <div className="topPrompt">
          <span>Emo Viz</span>
          <strong>How do you feel about the future of AI?</strong>
        </div>
        <SentimentResult tracking={tracking} sentiment={activeSentiment} />
        <div className="stageControls" aria-label="Prototype controls">
          <button type="button" onClick={() => setIsPaused((value) => !value)} title={isPaused ? 'Resume' : 'Pause'}>
            {isPaused ? <Play size={18} /> : <Pause size={18} />}
          </button>
          <button type="button" onClick={resetTracking} title="Reset">
            <RefreshCw size={18} />
          </button>
          <button type="button" onClick={() => document.documentElement.requestFullscreen?.()} title="Fullscreen">
            <Maximize size={18} />
          </button>
        </div>
      </section>

      <aside className="sidePanel" aria-label="Sentiment calculation panel">
        <div className="statusStrip">
          <span><Camera size={16} /> {cameraState}</span>
          <span><Gauge size={16} /> {modelState}</span>
        </div>
        <div className="engineSelect">
          <span>Feature placement</span>
          <strong>Python YuNet multi-face</strong>
          <small data-testid="feature-engine-status">{featureEngineState}</small>
        </div>
        <label className="engineSelect">
          <span>Emotion detection option</span>
          <select
            value={emotionEngine}
            onChange={(event) => {
              resetTracking();
              setEmotionEngine(event.target.value);
            }}
            data-testid="emotion-engine-select"
            aria-label="Emotion detection option"
          >
            <option value="ferplus-assisted">Python FER+ + YuNet assist</option>
            <option value="ferplus-raw">Python FER+ raw</option>
          </select>
          <small data-testid="emotion-engine-status">{emotionEngineState}</small>
        </label>
        <BackendSamplePanel sample={backendSample} status={backendStatus} />
        <DiagnosticsPanel tracking={tracking} sentiment={activeSentiment} />
        <LedSimulator sentiment={activeSentiment} phase={tracking.phase} />
      </aside>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<App />);
