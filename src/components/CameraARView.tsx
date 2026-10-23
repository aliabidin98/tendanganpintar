/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ARCanvasRenderer, PlayerRenderGroup, PlayerSkeleton } from '../game/canvasRenderer';
import { PoseTrackerManager } from '../game/poseTracker';
import { soundEngine } from '../game/audio';
import { checkFootBallCollision } from '../game/collision';
import { GameHUD } from './GameHUD';
import { ErrorBoundary } from './ErrorBoundary';
import {
  QuizQuestion,
  Ball,
  FootPoint,
  GameSettings,
  PlayerSessionState,
  GoalkeeperState,
  GameMode,
} from '../types/game';

interface CameraARViewProps {
  settings: GameSettings;
  questionBank: QuizQuestion[];
  onGameFinished: (players: PlayerSessionState[]) => void;
  onQuit: () => void;
  onToggleSound: () => void;
  onToggleSkeleton: () => void;
}

// Compute geometry and initial coordinates for balls and goalkeeper
function computeArenaPositions(
  player: PlayerSessionState,
  mode: GameMode,
  w: number,
  h: number
): { balls: Ball[]; goalkeeper: GoalkeeperState } {
  const is2P = mode === '2P';
  const isP1 = player.playerId === 'P1';

  const safeW = Math.max(w, 400);
  const safeH = Math.max(h, 400);

  let goalX: number;
  let goalW: number;
  const goalY: number = Math.max(14, safeH * 0.07);
  let goalH: number;

  let ballXA: number;
  let ballXB: number;
  const ballY: number = safeH * 0.74;
  let ballRadius: number;

  if (!is2P) {
    goalW = Math.min(safeW * 0.62, 500);
    goalH = Math.min(safeH * 0.27, 175);
    goalX = (safeW - goalW) / 2;

    ballRadius = Math.max(38, Math.min(52, safeW * 0.055));
    ballXA = safeW * 0.26;
    ballXB = safeW * 0.74;
  } else {
    const halfW = safeW / 2;
    goalW = Math.min(halfW * 0.76, 310);
    goalH = Math.min(safeH * 0.25, 155);

    ballRadius = Math.max(30, Math.min(44, halfW * 0.09));

    if (isP1) {
      goalX = halfW * 0.5 - goalW / 2;
      ballXA = halfW * 0.28;
      ballXB = halfW * 0.76;
    } else {
      goalX = halfW + halfW * 0.5 - goalW / 2;
      ballXA = halfW + halfW * 0.24;
      ballXB = halfW + halfW * 0.72;
    }
  }

  const keeperBaseX = goalX + goalW / 2;
  const keeperBaseY = goalY + goalH - 12;

  const updatedKeeper: GoalkeeperState = {
    ...player.goalkeeper,
    x: keeperBaseX,
    y: keeperBaseY,
    baseX: keeperBaseX,
    baseY: keeperBaseY,
    targetX: keeperBaseX,
    targetY: keeperBaseY,
  };

  const q = player.currentQuestion;
  const balls: Ball[] = [
    {
      id: 'A',
      optionLetter: 'A',
      label: q ? q.optionA : 'A',
      x: ballXA,
      y: ballY,
      baseX: ballXA,
      baseY: ballY,
      startX: ballXA,
      startY: ballY,
      radius: ballRadius,
      isCorrect: q ? q.correctOption === 'A' : true,
      state: 'idle',
      vx: 0,
      vy: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flightProgress: 0,
    },
    {
      id: 'B',
      optionLetter: 'B',
      label: q ? q.optionB : 'B',
      x: ballXB,
      y: ballY,
      baseX: ballXB,
      baseY: ballY,
      startX: ballXB,
      startY: ballY,
      radius: ballRadius,
      isCorrect: q ? q.correctOption === 'B' : false,
      state: 'idle',
      vx: 0,
      vy: 0,
      scale: 1,
      rotation: 0,
      opacity: 1,
      flightProgress: 0,
    },
  ];

  return { balls, goalkeeper: updatedKeeper };
}

const CameraARViewInner: React.FC<CameraARViewProps> = ({
  settings,
  questionBank,
  onGameFinished,
  onQuit,
  onToggleSound,
  onToggleSkeleton,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const rendererRef = useRef<ARCanvasRenderer | null>(null);
  const trackerRef = useRef<PoseTrackerManager | null>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [feetDetectedCount, setFeetDetectedCount] = useState<number>(0);
  const feetDetectedCountRef = useRef<number>(0);
  const [timeLeft, setTimeLeft] = useState(settings.durationSeconds);

  const onGameFinishedRef = useRef(onGameFinished);
  onGameFinishedRef.current = onGameFinished;
  const hasFinishedRef = useRef(false);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const cameraActiveRef = useRef(cameraActive);
  cameraActiveRef.current = cameraActive;

  const feetPointsRef = useRef<FootPoint[]>([]);
  const skeletonsRef = useRef<PlayerSkeleton[]>([]);
  const allLandmarksRef = useRef<{ x: number; y: number; visibility: number }[]>([]);

  // Sound sync
  useEffect(() => {
    soundEngine.enabled = settings.soundEnabled;
  }, [settings.soundEnabled]);

  // Keep ref to question bank for random picks
  const questionPoolRef = useRef<QuizQuestion[]>([...questionBank]);
  useEffect(() => {
    questionPoolRef.current = [...questionBank];
  }, [questionBank]);

  const getNextRandomQuestion = useCallback((excludeId?: string): QuizQuestion => {
    const pool = questionPoolRef.current;
    if (pool.length === 0) {
      return {
        id: 'q_fallback',
        category: 'Umum',
        question: 'Planet terbesar di tata surya adalah...',
        optionA: 'Jupiter',
        optionB: 'Mars',
        correctOption: 'A',
        explanation: 'Jupiter adalah planet terbesar.',
      };
    }
    const candidates = excludeId ? pool.filter((q) => q.id !== excludeId) : pool;
    const list = candidates.length > 0 ? candidates : pool;
    const idx = Math.floor(Math.random() * list.length);
    return list[idx];
  }, []);

  // Players Session States - initialized immediately with valid arena coordinates
  const [players, setPlayers] = useState<PlayerSessionState[]>(() => {
    const initW = typeof window !== 'undefined' && window.innerWidth > 0 ? window.innerWidth : 800;
    const initH = typeof window !== 'undefined' && window.innerHeight > 0 ? window.innerHeight : 600;

    const pool = questionBank.length > 0 ? questionBank : [getNextRandomQuestion()];
    const p1Q = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : getNextRandomQuestion();
    const p2Candidates = pool.length > 1 ? pool.filter((q) => q.id !== p1Q.id) : pool;
    const p2Q = p2Candidates.length > 0 ? p2Candidates[Math.floor(Math.random() * p2Candidates.length)] : getNextRandomQuestion(p1Q.id);

    const rawP1: PlayerSessionState = {
      playerId: 'P1',
      name: 'Pemain 1',
      score: 0,
      streak: 0,
      highestStreak: 0,
      goalsScored: 0,
      totalAttempts: 0,
      currentQuestion: p1Q,
      balls: [],
      goalkeeper: {
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
        targetX: 0,
        targetY: 0,
        state: 'idle',
        diveProgress: 0,
        rotation: 0,
        armAngleL: 0.4,
        armAngleR: -0.4,
        gloveCatchOffset: { x: 0, y: 0 },
      },
      feedback: null,
      isKickingLocked: false,
    };

    const initialP1Data = computeArenaPositions(rawP1, settings.mode, initW, initH);
    const initialP1: PlayerSessionState = {
      ...rawP1,
      balls: initialP1Data.balls,
      goalkeeper: initialP1Data.goalkeeper,
    };

    if (settings.mode === '1P') {
      return [initialP1];
    }

    const rawP2: PlayerSessionState = {
      playerId: 'P2',
      name: 'Pemain 2',
      score: 0,
      streak: 0,
      highestStreak: 0,
      goalsScored: 0,
      totalAttempts: 0,
      currentQuestion: p2Q,
      balls: [],
      goalkeeper: {
        x: 0,
        y: 0,
        baseX: 0,
        baseY: 0,
        targetX: 0,
        targetY: 0,
        state: 'idle',
        diveProgress: 0,
        rotation: 0,
        armAngleL: 0.4,
        armAngleR: -0.4,
        gloveCatchOffset: { x: 0, y: 0 },
      },
      feedback: null,
      isKickingLocked: false,
    };

    const initialP2Data = computeArenaPositions(rawP2, settings.mode, initW, initH);
    const initialP2: PlayerSessionState = {
      ...rawP2,
      balls: initialP2Data.balls,
      goalkeeper: initialP2Data.goalkeeper,
    };

    return [initialP1, initialP2];
  });

  // Keep a mutable ref of players for the 60fps canvas loop
  const playersRef = useRef<PlayerSessionState[]>(players);
  playersRef.current = players;

  // Active kick impact points for visual spark fx
  const activeKickFootRef = useRef<{ P1?: { x: number; y: number } | null; P2?: { x: number; y: number } | null }>({});

  // Layout calculations for Goal Nets, Goalkeepers, and Answer Balls
  const layoutArena = useCallback((w: number, h: number) => {
    const safeW = Math.max(w, 400);
    const safeH = Math.max(h, 400);

    setPlayers((prevList) => {
      return prevList.map((player) => {
        const { balls, goalkeeper } = computeArenaPositions(player, settings.mode, safeW, safeH);
        return {
          ...player,
          balls,
          goalkeeper,
        };
      });
    });
  }, [settings.mode]);

  // Execute Kick for a player
  const executeKick = useCallback(
    (playerId: 'P1' | 'P2', option: 'A' | 'B', impactPoint?: { x: number; y: number }) => {
      const currentPlayers = playersRef.current;
      const playerIndex = currentPlayers.findIndex((p) => p.playerId === playerId);
      if (playerIndex === -1) return;

      const player = currentPlayers[playerIndex];
      if (player.isKickingLocked) return;

      const ball = player.balls.find((b) => b.id === option);
      if (!ball || ball.state !== 'idle') return;

      // Lock player kicking
      player.isKickingLocked = true;
      soundEngine.playKick();

      if (impactPoint) {
        activeKickFootRef.current[playerId] = impactPoint;
        setTimeout(() => {
          activeKickFootRef.current[playerId] = null;
        }, 350);
      }

      const canvas = canvasRef.current;
      const w = canvas ? canvas.width / (window.devicePixelRatio || 1) : 800;
      const is2P = settings.mode === '2P';

      // Determine goal coordinates for this player
      let goalNetX: number;
      let goalNetW: number;
      const goalNetY: number = 70;
      const goalNetH: number = 150;

      if (!is2P) {
        goalNetW = Math.min(w * 0.62, 500);
        goalNetX = (w - goalNetW) / 2;
      } else {
        const halfW = w / 2;
        goalNetW = Math.min(halfW * 0.76, 310);
        goalNetX = playerId === 'P1' ? halfW * 0.5 - goalNetW / 2 : halfW + halfW * 0.5 - goalNetW / 2;
      }

      const isCorrect = ball.isCorrect;
      ball.state = 'kicked';
      ball.startX = ball.x;
      ball.startY = ball.y;
      ball.flightProgress = 0;

      // Target point
      let targetX: number;
      let targetY: number;

      if (isCorrect) {
        // Shoots cleanly into the net corner
        const cornerOffset = (ball.optionLetter === 'A' ? -1 : 1) * (goalNetW * 0.32);
        targetX = goalNetX + goalNetW / 2 + cornerOffset;
        targetY = goalNetY + 35;

        // Goalkeeper is beaten / dives wrong way!
        player.goalkeeper.state = 'beaten';
        player.goalkeeper.targetX = goalNetX + goalNetW / 2 - cornerOffset * 0.5;
        player.goalkeeper.rotation = ball.optionLetter === 'A' ? 0.35 : -0.35;
      } else {
        // Wrong answer -> Ball heads right towards Goalkeeper, Goalkeeper dives and CATCHES it!
        targetX = goalNetX + goalNetW / 2 + (ball.optionLetter === 'A' ? -25 : 25);
        targetY = goalNetY + goalNetH - 25;

        player.goalkeeper.state = 'diving';
        player.goalkeeper.targetX = targetX;
        player.goalkeeper.targetY = targetY;
        player.goalkeeper.rotation = ball.optionLetter === 'A' ? -0.25 : 0.25;
      }

      // Trajectory animation
      const startX = ball.startX;
      const startY = ball.startY;
      const startTime = performance.now();
      const flightDuration = 520; // ms

      const animateFlight = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / flightDuration, 1);
        ball.flightProgress = progress;

        // Ease-in flight with parabolic height peak
        const t = progress;
        ball.x = startX + (targetX - startX) * t;
        const linearY = startY + (targetY - startY) * t;
        const arc = Math.sin(t * Math.PI) * -110;
        ball.y = linearY + arc;

        // 3D Perspective scaling & spin
        ball.scale = 1 - t * 0.48;
        ball.rotation += 0.28;

        if (progress < 1) {
          requestAnimationFrame(animateFlight);
        } else {
          // Ball arrived at goal!
          ball.state = isCorrect ? 'scored' : 'missed';
          player.totalAttempts += 1;

          if (isCorrect) {
            // GOAL SCORED!
            const basePts = settings.scorePerGoal || 100;
            const streakPts = settings.streakBonus || 20;
            const addedScore = basePts + player.streak * streakPts;

            player.score += addedScore;
            player.streak += 1;
            player.highestStreak = Math.max(player.highestStreak, player.streak);
            player.goalsScored += 1;

            soundEngine.playGoal();

            // Trigger burst of celebration confetti
            confetti({
              particleCount: 50,
              spread: 70,
              origin: {
                x: targetX / (canvas ? canvas.width / (window.devicePixelRatio || 1) : 800),
                y: targetY / (canvas ? canvas.height / (window.devicePixelRatio || 1) : 600),
              },
            });

            player.feedback = {
              type: 'goal',
              text: 'GOOOL! JAWABAN BENAR!',
              subText: `+${addedScore} POIN`,
              color: '#34D399',
              timer: 1.0,
            };
          } else {
            // CAUGHT BY GOALKEEPER!
            player.streak = 0;
            player.goalkeeper.state = 'caught';
            soundEngine.playGloveCatch();

            player.feedback = {
              type: 'caught',
              text: 'DITANGKAP PENJAGA GAWANG 3D!',
              subText: `Jawaban Salah: ${ball.label}`,
              color: '#F87171',
              timer: 1.0,
            };
          }

          setPlayers([...playersRef.current]);

          // Advance to next random question after pause
          setTimeout(() => {
            const nextQ = getNextRandomQuestion();
            setPlayers((prev) =>
              prev.map((p) => {
                if (p.playerId !== playerId) return p;
                return {
                  ...p,
                  currentQuestion: nextQ,
                  feedback: null,
                  isKickingLocked: false,
                  goalkeeper: {
                    ...p.goalkeeper,
                    state: 'idle',
                    rotation: 0,
                    armAngleL: 0.4,
                    armAngleR: -0.4,
                    targetX: p.goalkeeper.baseX,
                    targetY: p.goalkeeper.baseY,
                  },
                  balls: p.balls.map((b) => ({
                    ...b,
                    label: b.id === 'A' ? nextQ.optionA : nextQ.optionB,
                    isCorrect: b.id === nextQ.correctOption,
                    state: 'idle',
                    x: b.baseX,
                    y: b.baseY,
                    scale: 1,
                    opacity: 1,
                    rotation: 0,
                  })),
                };
              })
            );
          }, 1400);
        }
      };

      requestAnimationFrame(animateFlight);
    },
    [getNextRandomQuestion, settings.mode]
  );

  const executeKickRef = useRef(executeKick);
  executeKickRef.current = executeKick;

  // Responsive Resize and Layout Observer
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const w = Math.max(rect.width || 0, containerRef.current.clientWidth || 0, window.innerWidth || 800);
      const h = Math.max(rect.height || 0, containerRef.current.clientHeight || 0, window.innerHeight || 600);
      const dpr = window.devicePixelRatio || 1;

      canvasRef.current.width = Math.floor(w * dpr);
      canvasRef.current.height = Math.floor(h * dpr);

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      trackerRef.current?.updateCanvasDimensions(w, h);
      layoutArena(w, h);
    };

    handleResize();

    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && containerRef.current) {
      ro = new ResizeObserver(() => handleResize());
      ro.observe(containerRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      ro?.disconnect();
    };
  }, [layoutArena]);

  // Safely trigger match completion when countdown reaches 0 without updating parent during render/reducer
  useEffect(() => {
    if (timeLeft <= 0 && !hasFinishedRef.current) {
      hasFinishedRef.current = true;
      onGameFinishedRef.current(playersRef.current);
    }
  }, [timeLeft]);

  // Match countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        if (prev <= 6) {
          soundEngine.playTick(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Keyboard shortcut triggers:
  // P1: [Q]/[A] (Kick A), [W]/[S] (Kick B)
  // P2: [O]/[K] (Kick A), [P]/[L] (Kick B)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const is2P = settingsRef.current.mode === '2P';

      if (!is2P) {
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          executeKickRef.current('P1', 'A');
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' || e.key === 'b' || e.key === 'B') {
          executeKickRef.current('P1', 'B');
        }
      } else {
        // Player 1 controls (Left)
        if (e.key === 'q' || e.key === 'Q' || e.key === 'a' || e.key === 'A') {
          executeKickRef.current('P1', 'A');
        } else if (e.key === 'w' || e.key === 'W' || e.key === 's' || e.key === 'S') {
          executeKickRef.current('P1', 'B');
        }
        // Player 2 controls (Right)
        if (e.key === 'o' || e.key === 'O' || e.key === 'k' || e.key === 'K') {
          executeKickRef.current('P2', 'A');
        } else if (e.key === 'p' || e.key === 'P' || e.key === 'l' || e.key === 'L') {
          executeKickRef.current('P2', 'B');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initialize MediaPipe Pose and Camera Stream (Mounts ONCE)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracker = new PoseTrackerManager();
    trackerRef.current = tracker;

    const rect = containerRef.current?.getBoundingClientRect();
    const w = Math.max(rect?.width || 0, containerRef.current?.clientWidth || 0, window.innerWidth || 800);
    const h = Math.max(rect?.height || 0, containerRef.current?.clientHeight || 0, window.innerHeight || 600);

    let isMounted = true;

    const initTracker = async () => {
      const ready = await tracker.initialize(
        video,
        (data) => {
          if (!isMounted) return;
          feetPointsRef.current = data.footPoints;
          skeletonsRef.current = data.skeletons || [];
          allLandmarksRef.current = data.allLandmarks || [];
          if (data.footPoints.length !== feetDetectedCountRef.current) {
            feetDetectedCountRef.current = data.footPoints.length;
            setFeetDetectedCount(data.footPoints.length);
          }

          const currentWidth = canvasRef.current
            ? canvasRef.current.width / (window.devicePixelRatio || 1)
            : w;
          const dividerX = currentWidth / 2;
          const hitTolerance = settingsRef.current.kickSensitivity === 'high' ? 36 : 22;

          // Check collisions for each player independently
          playersRef.current.forEach((player) => {
            if (player.isKickingLocked) return;

            // In 2P mode, check feet tagged with player.playerId first, then fallback to screen partition
            let playerFeet = data.footPoints.filter((f) => f.playerId === player.playerId);
            if (playerFeet.length === 0) {
              playerFeet =
                settingsRef.current.mode === '2P'
                  ? player.playerId === 'P1'
                    ? data.footPoints.filter((f) => f.x < dividerX)
                    : data.footPoints.filter((f) => f.x >= dividerX)
                  : data.footPoints;
            }

            if (playerFeet.length === 0) return;

            player.balls.forEach((ball) => {
              if (ball.state === 'idle') {
                const collided = checkFootBallCollision(
                  playerFeet.map((f) => ({ x: f.x, y: f.y })),
                  ball,
                  hitTolerance
                );
                if (collided) {
                  const foot = playerFeet[0];
                  executeKickRef.current(
                    player.playerId,
                    ball.id,
                    foot ? { x: foot.x, y: foot.y } : undefined
                  );
                }
              }
            });
          });
        },
        w,
        h,
        settingsRef.current.mode
      );

      if (ready && isMounted) {
        const streamActive = await tracker.startCamera();
        if (isMounted) {
          setCameraActive(Boolean(streamActive));
        }
      }
    };

    initTracker();
    soundEngine.playMatchStart();

    return () => {
      isMounted = false;
      tracker.destroy();
    };
  }, []);

  // Synchronize pose tracker mode when mode changes
  useEffect(() => {
    trackerRef.current?.setMode(settings.mode);
  }, [settings.mode]);

  // 60FPS Game Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new ARCanvasRenderer();

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      try {
        const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
        lastTime = currentTime;

        const ctx = canvas.getContext('2d');
        const bounding = containerRef.current?.getBoundingClientRect();
        const width = Math.max(bounding?.width || 0, containerRef.current?.clientWidth || 0, window.innerWidth || 800);
        const height = Math.max(bounding?.height || 0, containerRef.current?.clientHeight || 0, window.innerHeight || 600);
        const curSettings = settingsRef.current;
        const dpr = window.devicePixelRatio || 1;

        // Auto-correct canvas resolution if mismatch
        const targetW = Math.floor(width * dpr);
        const targetH = Math.floor(height * dpr);
        if (canvas.width !== targetW || canvas.height !== targetH) {
          canvas.width = targetW;
          canvas.height = targetH;
          if (ctx) ctx.scale(dpr, dpr);
        }

        if (ctx && rendererRef.current) {
          // Goalkeeper idle swaying & breathing
          playersRef.current.forEach((player) => {
            const keeper = player.goalkeeper;
            if (keeper.state === 'idle') {
              const sway = Math.sin(currentTime * 0.0035 + (player.playerId === 'P1' ? 0 : 2)) * 14;
              keeper.x = keeper.baseX + sway;
              keeper.armAngleL = 0.4 + Math.sin(currentTime * 0.004) * 0.08;
              keeper.armAngleR = -0.4 - Math.sin(currentTime * 0.004) * 0.08;
            }

            // Idle ball hover
            player.balls.forEach((ball) => {
              if (ball.state === 'idle') {
                ball.y = ball.baseY + Math.sin(currentTime * 0.004 + (ball.id === 'A' ? 0 : 1.5)) * 5;
              }
            });

            // Feedback timer decay
            if (player.feedback) {
              player.feedback.timer = Math.max(0, player.feedback.timer - dt * 0.85);
            }
          });

          // Prepare player render groups
          const is2P = curSettings.mode === '2P';
          const playerGroups: PlayerRenderGroup[] = playersRef.current.map((p) => {
            const goalW = is2P ? Math.min((width / 2) * 0.76, 310) : Math.min(width * 0.62, 500);
            const goalH = is2P ? Math.min(height * 0.25, 155) : Math.min(height * 0.27, 175);
            const goalX = !is2P
              ? (width - goalW) / 2
              : p.playerId === 'P1'
              ? (width / 2) * 0.5 - goalW / 2
              : width / 2 + (width / 2) * 0.5 - goalW / 2;
            const goalY = Math.max(14, height * 0.07);

            const pChar =
              p.playerId === 'P1'
                ? curSettings.goalkeeperCharacter || 'lion'
                : curSettings.goalkeeperCharacter === 'cyber'
                ? 'lion'
                : 'cyber';

            return {
              playerId: p.playerId,
              name: p.name,
              themeColor: p.playerId === 'P1' ? '#38BDF8' : '#FB923C',
              accentColor: p.playerId === 'P1' ? '#0284C7' : '#EA580C',
              balls: p.balls,
              goalkeeper: p.goalkeeper,
              goalNet: { x: goalX, y: goalY, w: goalW, h: goalH },
              goalCelebrationTime: p.feedback?.type === 'goal' ? p.feedback.timer : 0,
              missCelebrationTime: p.feedback?.type === 'caught' ? p.feedback.timer : 0,
              celebrationText: p.feedback?.text,
              subText: p.feedback?.subText,
              streak: p.streak,
              activeKickFoot: activeKickFootRef.current[p.playerId],
              goalkeeperCharacter: pChar,
            };
          });

          rendererRef.current.render(ctx, {
            width,
            height,
            mode: curSettings.mode,
            video: videoRef.current,
            cameraActive: cameraActiveRef.current,
            footPoints: feetPointsRef.current,
            allLandmarks: allLandmarksRef.current,
            skeletons: skeletonsRef.current,
            players: playerGroups,
            showSkeleton: curSettings.showSkeleton,
            glassTransparency: curSettings.glassTransparency,
            questionCardSize: curSettings.questionCardSize,
          });
        }
      } catch (loopErr) {
        console.error('AR Game render loop error:', loopErr);
      }

      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Toggle Camera
  const handleToggleCamera = async () => {
    if (cameraActive) {
      trackerRef.current?.stop();
      setCameraActive(false);
    } else {
      const ok = await trackerRef.current?.startCamera();
      setCameraActive(Boolean(ok));
    }
  };

  // Canvas Tap/Click fallback for touch screens
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    playersRef.current.forEach((player) => {
      player.balls.forEach((ball) => {
        const dx = clickX - ball.x;
        const dy = clickY - ball.y;
        if (dx * dx + dy * dy <= (ball.radius + 24) * (ball.radius + 24)) {
          executeKickRef.current(player.playerId, ball.id, { x: clickX, y: clickY });
        }
      });
    });
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full min-h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none"
    >
      {/* Hidden camera video element */}
      <video ref={videoRef} playsInline muted autoPlay className="hidden" />

      {/* Main AR Dynamic Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        data-testid="ar-game-canvas"
        className="w-full h-full object-cover cursor-crosshair"
      />

      {/* Dynamic Overlay HUD */}
      <GameHUD
        mode={settings.mode}
        players={players}
        timeLeft={timeLeft}
        cameraActive={cameraActive}
        soundEnabled={settings.soundEnabled}
        showSkeleton={settings.showSkeleton}
        feetDetectedCount={feetDetectedCount}
        settings={settings}
        onToggleSound={onToggleSound}
        onToggleCamera={handleToggleCamera}
        onToggleSkeleton={onToggleSkeleton}
        onQuit={onQuit}
        onSimulateKick={(pId, opt) => executeKick(pId, opt)}
      />
    </div>
  );
};

// Export CameraARView guarded by ErrorBoundary as requested
export const CameraARView: React.FC<CameraARViewProps> = (props) => {
  return (
    <ErrorBoundary
      fallbackTitle="Kendala Memuat Sesi Game AR"
      fallbackMessage="Terjadi kendala saat memproses tampilan AR, sensor kamera, atau grafis pertandingan. Silakan coba kembali ke menu utama atau muat ulang."
      onReset={props.onQuit}
      resetLabel="Kembali ke Menu Utama"
    >
      <CameraARViewInner {...props} />
    </ErrorBoundary>
  );
};
