/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FootPoint, GameMode } from '../types/game';

// MediaPipe global interfaces
interface MPResults {
  poseLandmarks?: { x: number; y: number; z: number; visibility?: number }[];
}

interface MPPoseInstance {
  setOptions(options: {
    modelComplexity?: number;
    smoothLandmarks?: boolean;
    minDetectionConfidence?: number;
    minTrackingConfidence?: number;
  }): void;
  onResults(fn: (results: MPResults) => void): void;
  send(input: { image: HTMLVideoElement | HTMLCanvasElement }): Promise<void>;
  close(): Promise<void>;
}

declare global {
  interface Window {
    Pose?: new (config: { locateFile: (file: string) => string }) => MPPoseInstance;
    Camera?: new (
      videoElement: HTMLVideoElement,
      options: {
        onFrame: () => Promise<void>;
        width?: number;
        height?: number;
      }
    ) => {
      start: () => Promise<void>;
      stop: () => void;
    };
  }
}

export interface PlayerSkeleton {
  playerId: 'P1' | 'P2' | 'SINGLE';
  landmarks: { x: number; y: number; visibility: number }[];
}

export type PoseCallback = (data: {
  footPoints: FootPoint[];
  allLandmarks?: { x: number; y: number; visibility: number }[];
  skeletons?: PlayerSkeleton[];
}) => void;

export class PoseTrackerManager {
  private mode: GameMode = '1P';
  private poseSingle: MPPoseInstance | null = null;
  private poseP1: MPPoseInstance | null = null;
  private poseP2: MPPoseInstance | null = null;

  private cropCanvasP1: HTMLCanvasElement | null = null;
  private cropCtxP1: CanvasRenderingContext2D | null = null;
  private cropCanvasP2: HTMLCanvasElement | null = null;
  private cropCtxP2: CanvasRenderingContext2D | null = null;

  private lastFootPointsP1: FootPoint[] = [];
  private lastFootPointsP2: FootPoint[] = [];
  private lastLandmarksP1: { x: number; y: number; visibility: number }[] = [];
  private lastLandmarksP2: { x: number; y: number; visibility: number }[] = [];
  private lastP1DetectionTime = 0;
  private lastP2DetectionTime = 0;

  private camera: { start: () => Promise<void>; stop: () => void } | null = null;
  private isRunning = false;
  private isStarting = false;
  private videoElement: HTMLVideoElement | null = null;
  private onResultsCallback: PoseCallback | null = null;
  private canvasWidth = 640;
  private canvasHeight = 480;
  private mediaStream: MediaStream | null = null;
  private fallbackAnimFrame: number | null = null;
  private boundVisibilityHandler: (() => void) | null = null;
  private isProcessingFrame = false;

  public async initialize(
    video: HTMLVideoElement,
    callback: PoseCallback,
    canvasW: number,
    canvasH: number,
    initialMode: GameMode = '1P'
  ): Promise<boolean> {
    this.videoElement = video;
    this.onResultsCallback = callback;
    this.canvasWidth = canvasW;
    this.canvasHeight = canvasH;
    this.mode = initialMode;

    // Attach visibility listener to resume video play if backgrounded
    if (!this.boundVisibilityHandler) {
      this.boundVisibilityHandler = () => {
        if (document.visibilityState === 'visible' && this.isRunning && this.videoElement) {
          if (this.videoElement.paused) {
            this.videoElement.play().catch(() => {});
          }
        }
      };
      document.addEventListener('visibilitychange', this.boundVisibilityHandler);
    }

    // Wait for window.Pose if scripts are still resolving
    let attempts = 0;
    while (!window.Pose && attempts < 35) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.Pose) {
      console.warn('MediaPipe Pose script not found on window. Will fall back to manual/simulated kick mode.');
      return false;
    }

    try {
      if (this.mode === '2P') {
        this.initTwoPlayerInstances();
      } else {
        this.initSinglePlayerInstance();
      }
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose instances:', err);
      return false;
    }
  }

  private createPoseInstance(complexity: number): MPPoseInstance | null {
    if (!window.Pose) return null;
    const instance = new window.Pose({
      locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
    });
    instance.setOptions({
      modelComplexity: complexity,
      smoothLandmarks: true,
      minDetectionConfidence: 0.45,
      minTrackingConfidence: 0.45,
    });
    return instance;
  }

  private initSinglePlayerInstance() {
    if (!this.poseSingle) {
      this.poseSingle = this.createPoseInstance(1);
      if (this.poseSingle) {
        this.poseSingle.onResults(this.handlePoseResultsSingle);
      }
    }
  }

  private initTwoPlayerInstances() {
    this.ensureCropCanvases();

    // Player 1 Pose Instance (Lite model for fast dual inference)
    if (!this.poseP1) {
      this.poseP1 = this.createPoseInstance(0);
      if (this.poseP1) {
        this.poseP1.onResults(this.handlePoseResultsP1);
      }
    }

    // Player 2 Pose Instance (Lite model for fast dual inference)
    if (!this.poseP2) {
      this.poseP2 = this.createPoseInstance(0);
      if (this.poseP2) {
        this.poseP2.onResults(this.handlePoseResultsP2);
      }
    }
  }

  private ensureCropCanvases() {
    if (!this.cropCanvasP1) {
      this.cropCanvasP1 = document.createElement('canvas');
      this.cropCanvasP1.width = 384;
      this.cropCanvasP1.height = 384;
      this.cropCtxP1 = this.cropCanvasP1.getContext('2d', { willReadFrequently: true });
    }
    if (!this.cropCanvasP2) {
      this.cropCanvasP2 = document.createElement('canvas');
      this.cropCanvasP2.width = 384;
      this.cropCanvasP2.height = 384;
      this.cropCtxP2 = this.cropCanvasP2.getContext('2d', { willReadFrequently: true });
    }
  }

  public setMode(mode: GameMode) {
    if (this.mode === mode) return;
    this.mode = mode;

    if (mode === '2P') {
      this.initTwoPlayerInstances();
    } else {
      this.initSinglePlayerInstance();
    }
  }

  public updateCanvasDimensions(w: number, h: number) {
    this.canvasWidth = w;
    this.canvasHeight = h;
  }

  public isStreamActive(): boolean {
    if (!this.isRunning || !this.videoElement) return false;
    const stream = (this.videoElement.srcObject as MediaStream) || this.mediaStream;
    if (!stream || !stream.active) return false;
    return stream.getVideoTracks().some((track) => track.readyState === 'live');
  }

  public async startCamera(): Promise<boolean> {
    if (!this.videoElement) return false;

    // If already running and stream is live, do not recreate or flash camera
    if (this.isStreamActive()) {
      this.isRunning = true;
      return true;
    }

    if (this.isStarting) {
      return this.isRunning;
    }

    this.isStarting = true;

    try {
      this.stop();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280, max: 1920 },
          height: { ideal: 720, max: 1080 },
          facingMode: 'user',
          frameRate: { ideal: 30, max: 60 },
        },
        audio: false,
      });

      this.mediaStream = stream;
      this.videoElement.srcObject = stream;

      stream.getVideoTracks().forEach((track) => {
        track.onended = () => {
          console.warn('Camera video track ended');
          this.isRunning = false;
        };
      });

      await this.videoElement.play().catch((err) => {
        console.warn('videoElement.play() deferred:', err);
      });

      this.isRunning = true;
      this.startFrameLoop();
      return true;
    } catch (err) {
      console.warn('Standard camera start failed, attempting MediaPipe Camera fallback:', err);
      if (window.Camera && this.videoElement && (this.poseSingle || this.poseP1)) {
        try {
          this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
              if (this.isRunning) {
                await this.processCurrentFrame();
              }
            },
            width: 1280,
            height: 720,
          });
          await this.camera.start();
          this.isRunning = true;
          return true;
        } catch (subErr) {
          console.error('All camera start attempts failed:', subErr);
          this.isRunning = false;
          return false;
        }
      }
      this.isRunning = false;
      return false;
    } finally {
      this.isStarting = false;
    }
  }

  private startFrameLoop() {
    const processFrame = async () => {
      if (!this.isRunning) return;

      if (!this.isProcessingFrame) {
        this.isProcessingFrame = true;
        try {
          await this.processCurrentFrame();
        } catch {
          // Graceful frame drop
        } finally {
          this.isProcessingFrame = false;
        }
      }

      if (this.isRunning) {
        this.fallbackAnimFrame = requestAnimationFrame(processFrame);
      }
    };

    this.fallbackAnimFrame = requestAnimationFrame(processFrame);
  }

  private async processCurrentFrame() {
    if (
      !this.videoElement ||
      this.videoElement.paused ||
      this.videoElement.readyState < 2
    ) {
      return;
    }

    if (this.mode === '2P') {
      await this.processTwoPlayerFrame();
    } else {
      await this.processSinglePlayerFrame();
    }
  }

  private async processSinglePlayerFrame() {
    if (this.poseSingle && this.videoElement) {
      await this.poseSingle.send({ image: this.videoElement });
    }
  }

  private async processTwoPlayerFrame() {
    if (!this.videoElement) return;
    const vw = this.videoElement.videoWidth || 640;
    const vh = this.videoElement.videoHeight || 480;
    if (vw <= 0 || vh <= 0) return;

    this.ensureCropCanvases();
    if (!this.cropCanvasP1 || !this.cropCtxP1 || !this.cropCanvasP2 || !this.cropCtxP2) return;

    // Mirrored Display Logic:
    // User screen LEFT is Player 1 -> In raw camera frame, this corresponds to the RIGHT half: [0.40, 1.0]
    const cropP1StartX = Math.floor(vw * 0.40);
    const cropP1Width = vw - cropP1StartX; // 0.60 * vw
    this.cropCtxP1.drawImage(
      this.videoElement,
      cropP1StartX,
      0,
      cropP1Width,
      vh,
      0,
      0,
      this.cropCanvasP1.width,
      this.cropCanvasP1.height
    );

    // User screen RIGHT is Player 2 -> In raw camera frame, this corresponds to the LEFT half: [0.0, 0.60]
    const cropP2StartX = 0;
    const cropP2Width = Math.floor(vw * 0.60);
    this.cropCtxP2.drawImage(
      this.videoElement,
      cropP2StartX,
      0,
      cropP2Width,
      vh,
      0,
      0,
      this.cropCanvasP2.width,
      this.cropCanvasP2.height
    );

    // Sequentially process both instances to prevent WASM/WebGL memory conflict
    if (this.poseP1) {
      try {
        await this.poseP1.send({ image: this.cropCanvasP1 });
      } catch {
        // Safe ignore
      }
    }

    if (this.poseP2) {
      try {
        await this.poseP2.send({ image: this.cropCanvasP2 });
      } catch {
        // Safe ignore
      }
    }

    this.emitCombinedResults();
  }

  private handlePoseResultsSingle = (results: MPResults) => {
    if (!this.isRunning || !results.poseLandmarks || !this.onResultsCallback) return;

    const landmarks = results.poseLandmarks;
    const footPoints: FootPoint[] = [];

    const keyFootIndices = [
      { index: 27, name: 'Left Ankle' },
      { index: 28, name: 'Right Ankle' },
      { index: 31, name: 'Left Toe' },
      { index: 32, name: 'Right Toe' },
    ];

    keyFootIndices.forEach(({ index, name }) => {
      const lm = landmarks[index];
      if (lm) {
        const visibility = lm.visibility ?? 1.0;
        // Mirrored coordinate: (1 - normX)
        const x = (1 - lm.x) * this.canvasWidth;
        const y = lm.y * this.canvasHeight;

        footPoints.push({
          index,
          name,
          x,
          y,
          normX: lm.x,
          normY: lm.y,
          visibility,
          playerId: 'P1',
        });
      }
    });

    const simplifiedLandmarks = landmarks.map((lm) => ({
      x: lm.x,
      y: lm.y,
      visibility: lm.visibility ?? 1.0,
    }));

    this.onResultsCallback({
      footPoints,
      allLandmarks: simplifiedLandmarks,
      skeletons: [{ playerId: 'SINGLE', landmarks: simplifiedLandmarks }],
    });
  };

  private handlePoseResultsP1 = (results: MPResults) => {
    if (!this.isRunning || !results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;
    this.lastP1DetectionTime = performance.now();

    // Map from crop [0.40, 1.0] of raw video to full screen coordinates
    // rawVideoX = 0.40 + lm.x * 0.60
    // screenX = (1 - rawVideoX) * canvasWidth
    const mappedFoot: FootPoint[] = [];
    const keyFootIndices = [
      { index: 27, name: 'P1 Left Ankle' },
      { index: 28, name: 'P1 Right Ankle' },
      { index: 31, name: 'P1 Left Toe' },
      { index: 32, name: 'P1 Right Toe' },
    ];

    keyFootIndices.forEach(({ index, name }) => {
      const lm = landmarks[index];
      if (lm) {
        const visibility = lm.visibility ?? 1.0;
        const fullNormX = 0.40 + lm.x * 0.60;
        const x = (1 - fullNormX) * this.canvasWidth;
        const y = lm.y * this.canvasHeight;

        mappedFoot.push({
          index,
          name,
          x,
          y,
          normX: fullNormX,
          normY: lm.y,
          visibility,
          playerId: 'P1',
        });
      }
    });

    this.lastFootPointsP1 = mappedFoot;
    this.lastLandmarksP1 = landmarks.map((lm) => ({
      x: 0.40 + lm.x * 0.60,
      y: lm.y,
      visibility: lm.visibility ?? 1.0,
    }));
  };

  private handlePoseResultsP2 = (results: MPResults) => {
    if (!this.isRunning || !results.poseLandmarks) return;
    const landmarks = results.poseLandmarks;
    this.lastP2DetectionTime = performance.now();

    // Map from crop [0.0, 0.60] of raw video to full screen coordinates
    // rawVideoX = 0.0 + lm.x * 0.60
    // screenX = (1 - rawVideoX) * canvasWidth
    const mappedFoot: FootPoint[] = [];
    const keyFootIndices = [
      { index: 27, name: 'P2 Left Ankle' },
      { index: 28, name: 'P2 Right Ankle' },
      { index: 31, name: 'P2 Left Toe' },
      { index: 32, name: 'P2 Right Toe' },
    ];

    keyFootIndices.forEach(({ index, name }) => {
      const lm = landmarks[index];
      if (lm) {
        const visibility = lm.visibility ?? 1.0;
        const fullNormX = 0.0 + lm.x * 0.60;
        const x = (1 - fullNormX) * this.canvasWidth;
        const y = lm.y * this.canvasHeight;

        mappedFoot.push({
          index,
          name,
          x,
          y,
          normX: fullNormX,
          normY: lm.y,
          visibility,
          playerId: 'P2',
        });
      }
    });

    this.lastFootPointsP2 = mappedFoot;
    this.lastLandmarksP2 = landmarks.map((lm) => ({
      x: 0.0 + lm.x * 0.60,
      y: lm.y,
      visibility: lm.visibility ?? 1.0,
    }));
  };

  private emitCombinedResults() {
    if (!this.onResultsCallback) return;
    const now = performance.now();
    const GRACE_PERIOD_MS = 400;

    const p1Valid = now - this.lastP1DetectionTime < GRACE_PERIOD_MS;
    const p2Valid = now - this.lastP2DetectionTime < GRACE_PERIOD_MS;

    const feet: FootPoint[] = [
      ...(p1Valid ? this.lastFootPointsP1 : []),
      ...(p2Valid ? this.lastFootPointsP2 : []),
    ];

    const skeletons: PlayerSkeleton[] = [];
    if (p1Valid && this.lastLandmarksP1.length > 0) {
      skeletons.push({ playerId: 'P1', landmarks: this.lastLandmarksP1 });
    }
    if (p2Valid && this.lastLandmarksP2.length > 0) {
      skeletons.push({ playerId: 'P2', landmarks: this.lastLandmarksP2 });
    }

    this.onResultsCallback({
      footPoints: feet,
      allLandmarks: this.lastLandmarksP1.length > 0 ? this.lastLandmarksP1 : this.lastLandmarksP2,
      skeletons,
    });
  }

  public stop() {
    this.isRunning = false;

    if (this.fallbackAnimFrame !== null) {
      cancelAnimationFrame(this.fallbackAnimFrame);
      this.fallbackAnimFrame = null;
    }

    if (this.camera) {
      try {
        this.camera.stop();
      } catch {
        // Safe ignore
      }
      this.camera = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Safe ignore
        }
      });
      this.mediaStream = null;
    }

    if (this.videoElement && this.videoElement.srcObject) {
      const stream = this.videoElement.srcObject as MediaStream;
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Safe ignore
        }
      });
      this.videoElement.srcObject = null;
    }
  }

  public destroy() {
    this.stop();
    if (this.boundVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.boundVisibilityHandler);
      this.boundVisibilityHandler = null;
    }
    if (this.poseSingle) {
      try {
        this.poseSingle.close();
      } catch {
        // Safe ignore
      }
      this.poseSingle = null;
    }
    if (this.poseP1) {
      try {
        this.poseP1.close();
      } catch {
        // Safe ignore
      }
      this.poseP1 = null;
    }
    if (this.poseP2) {
      try {
        this.poseP2.close();
      } catch {
        // Safe ignore
      }
      this.poseP2 = null;
    }
    this.cropCanvasP1 = null;
    this.cropCtxP1 = null;
    this.cropCanvasP2 = null;
    this.cropCtxP2 = null;
    this.videoElement = null;
    this.onResultsCallback = null;
  }
}
