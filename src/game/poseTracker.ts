/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FootPoint } from '../types/game';

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
  send(input: { image: HTMLVideoElement }): Promise<void>;
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

export type PoseCallback = (data: {
  footPoints: FootPoint[];
  allLandmarks?: { x: number; y: number; visibility: number }[];
}) => void;

export class PoseTrackerManager {
  private pose: MPPoseInstance | null = null;
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

  public async initialize(
    video: HTMLVideoElement,
    callback: PoseCallback,
    canvasW: number,
    canvasH: number
  ): Promise<boolean> {
    this.videoElement = video;
    this.onResultsCallback = callback;
    this.canvasWidth = canvasW;
    this.canvasHeight = canvasH;

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
    while (!window.Pose && attempts < 30) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      attempts++;
    }

    if (!window.Pose) {
      console.warn('MediaPipe Pose script not found on window. Will fall back to manual/simulated kick mode.');
      return false;
    }

    try {
      this.pose = new window.Pose({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });

      this.pose.setOptions({
        modelComplexity: 1,
        smoothLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      this.pose.onResults(this.handlePoseResults);
      return true;
    } catch (err) {
      console.error('Failed to initialize MediaPipe Pose:', err);
      return false;
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
      // Avoid overlapping requests
      return this.isRunning;
    }

    this.isStarting = true;

    try {
      // Clean up any stale streams before requesting a fresh one
      this.stop();

      // Priority 1: Native getUserMedia gives best reliability, track lifecycle events, and zero flickering
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

      // Handle stream track ending unexpectedly (e.g. user revoked permissions or device unplugged)
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

      // Pump frames reliably into MediaPipe Pose
      let isProcessingFrame = false;
      const processFrame = async () => {
        if (!this.isRunning) return;

        if (
          this.pose &&
          this.videoElement &&
          !this.videoElement.paused &&
          this.videoElement.readyState >= 2 &&
          !isProcessingFrame
        ) {
          isProcessingFrame = true;
          try {
            await this.pose.send({ image: this.videoElement });
          } catch {
            // Drop frame gracefully if pose busy
          } finally {
            isProcessingFrame = false;
          }
        }

        if (this.isRunning) {
          this.fallbackAnimFrame = requestAnimationFrame(processFrame);
        }
      };

      this.fallbackAnimFrame = requestAnimationFrame(processFrame);
      return true;
    } catch (err) {
      console.warn('Standard camera start failed, attempting MediaPipe Camera fallback:', err);
      // Fallback: window.Camera if native approach had an issue
      if (window.Camera && this.videoElement && this.pose) {
        try {
          this.camera = new window.Camera(this.videoElement, {
            onFrame: async () => {
              if (this.isRunning && this.pose && this.videoElement && !this.videoElement.paused) {
                try {
                  await this.pose.send({ image: this.videoElement });
                } catch {
                  // Ignore
                }
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
    if (this.pose) {
      try {
        this.pose.close();
      } catch {
        // Safe ignore
      }
      this.pose = null;
    }
    this.videoElement = null;
    this.onResultsCallback = null;
  }

  private handlePoseResults = (results: MPResults) => {
    if (!this.isRunning || !results.poseLandmarks || !this.onResultsCallback) return;

    const landmarks = results.poseLandmarks;
    const footPoints: FootPoint[] = [];

    // Focus on:
    // 27: LEFT_ANKLE, 28: RIGHT_ANKLE, 31: LEFT_FOOT_INDEX, 32: RIGHT_FOOT_INDEX
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
    });
  };
}
