import React, { forwardRef, useEffect, useRef } from 'react';

export const CameraFeed = forwardRef(function CameraFeed({ isTestMode, onStateChange, isPaused }, ref) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const video = ref.current;
    let stream;
    let cancelled = false;

    async function startCamera() {
      if (!video || isTestMode) return;
      try {
        onStateChange('requesting-camera');
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'user',
          },
          audio: false,
        });
        if (cancelled) return;
        video.srcObject = stream;
        await video.play();
        onStateChange('camera-live');
      } catch (error) {
        console.error('Camera startup failed', error);
        onStateChange('camera-blocked');
      }
    }

    startCamera();
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [isTestMode, onStateChange, ref]);

  useEffect(() => {
    if (!isTestMode) return undefined;
    const video = ref.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');
    const stream = canvas.captureStream(30);
    let frame = 0;
    let raf = 0;
    canvas.width = 1280;
    canvas.height = 720;
    video.srcObject = stream;
    video.play();
    onStateChange('test-feed');

    const draw = () => {
      if (!isPaused) {
        frame += 1;
        const t = frame / 60;
        const gradient = context.createLinearGradient(0, 0, 1280, 720);
        gradient.addColorStop(0, '#c8b4a5');
        gradient.addColorStop(0.55, '#785d55');
        gradient.addColorStop(1, '#f5efe7');
        context.fillStyle = gradient;
        context.fillRect(0, 0, 1280, 720);

        context.save();
        context.translate(Math.sin(t) * 10, Math.cos(t * 0.7) * 6);
        context.fillStyle = '#d8b6a0';
        context.beginPath();
        context.ellipse(640, 375, 245, 315, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#2f3943';
        context.beginPath();
        context.ellipse(545, 330, 42, 22, 0, 0, Math.PI * 2);
        context.ellipse(735, 330, 42, 22, 0, 0, Math.PI * 2);
        context.fill();
        context.fillStyle = '#805b59';
        context.beginPath();
        context.ellipse(640, 505, 86, 16 + Math.sin(t * 1.3) * 4, 0, 0, Math.PI * 2);
        context.fill();
        context.strokeStyle = 'rgba(255,255,255,0.18)';
        context.lineWidth = 5;
        context.beginPath();
        context.moveTo(620, 350);
        context.lineTo(595, 450);
        context.lineTo(660, 455);
        context.stroke();
        context.restore();
      }

      raf = window.requestAnimationFrame(draw);
    };

    draw();
    return () => {
      window.cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => track.stop());
    };
  }, [isPaused, isTestMode, onStateChange, ref]);

  return (
    <>
      <video
        ref={ref}
        className="cameraVideo"
        data-testid="camera-feed"
        playsInline
        muted
        autoPlay
      />
      {isTestMode ? <canvas ref={canvasRef} className="hiddenCanvas" aria-hidden="true" /> : null}
    </>
  );
});
