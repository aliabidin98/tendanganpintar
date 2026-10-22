/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { ARCanvasRenderer, PlayerRenderGroup } from '../game/canvasRenderer';
import { PoseTrackerManager } from '../game/poseTracker';
import { soundEngine } from '../game/audio';
import { checkFootBallCollision, calculateKickScore } from '../game/collision';
import { GameHUD } from './GameHUD';
import {
  QuizQuestion,
  Ball,
  FootPoint,
  GameSettings,
  PlayerSessionState,
  GoalkeeperState,
} from '../types/game';

interface CameraARViewProps {
  settings: GameSettings;
  questionBank: QuizQuestion[];
  onGameFinished: (players: PlayerSessionState[]) => void;
  onQuit: () => void;
  onToggleSound: () => void;
  onToggleSkeleton: () => void;
}

export const CameraARView: React.FC<CameraARViewProps> = ({
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
  const [feetPoints, setFeetPoints] = useState<FootPoint[]>([]);
  const [timeLeft, setTimeLeft] = useState(settings.durationSeconds);

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const cameraActiveRef = useRef(cameraActive);
  cameraActiveRef.current = cameraActive;

  const feetPointsRef = useRef<FootPoint[]>([]);

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

  // Players Session States
  const [players, setPlayers] = useState<PlayerSessionState[]>(() => {
    const pool = questionBank.length > 0 ? questionBank : getNextRandomQuestion();
    const p1Q = Array.isArray(pool) && pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : getNextRandomQuestion();
    const p2Candidates = Array.isArray(pool) && pool.length > 1 ? pool.filter((q) => q.id !== p1Q.id) : pool;
    const p2Q = Array.isArray(p2Candidates) && p2Candidates.length > 0
      ? p2Candidates[Math.floor(Math.random() * p2Candidates.length)]
      : getNextRandomQuestion(p1Q.id);
    const initialP1: PlayerSessionState = {
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

    if (settings.mode === '1P') {
      return [initialP1];
    }

    const initialP2: PlayerSessionState = {
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

    return [initialP1, initialP2];
  });

  // Keep a mutable ref of players for the 60fps canvas loop
  const playersRef = useRef<PlayerSessionState[]>(players);
  playersRef.current = players;

  // Active kick impact points for visual spark fx
  const activeKickFootRef = useRef<{ P1?: { x: number; y: number } | null; P2?: { x: number; y: number } | null }>({});

  // Layout calculations for Goal Nets, Goalkeepers, and Answer Balls
  const layoutArena = useCallback((w: number, h: number) => {
    const is2P = settings.mode === '2P';

    setPlayers((prevList) => {
      return prevList.map((player) => {
        const isP1 = player.playerId === 'P1';

        // 1P vs 2P Goal geometry
        let goalX: number;
        let goalW: number;
        let goalY: number = Math.max(14, h * 0.07);
        let goalH: number;

        let ballXA: number;
        let ballXB: number;
        let ballY: number = h * 0.74;
        let ballRadius: number;

        if (!is2P) {
          // 1-Player Full Pitch
          goalW = Math.min(w * 0.62, 500);
          goalH = Math.min(h * 0.27, 175);
          goalX = (w - goalW) / 2;

          ballRadius = Math.max(38, Math.min(52, w * 0.055));
          ballXA = w * 0.26;
          ballXB = w * 0.74;
        } else {
          // 2-Player Split Screen
          const halfW = w / 2;
          goalW = Math.min(halfW * 0.76, 310);
          goalH = Math.min(h * 0.25, 155);

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

        // Goalkeeper positioned on goal line
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

        return {
          ...player,
          balls,
          goalkeeper: updatedKeeper,
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
      const w = canvas ? canvas.width : 800;
      const is2P = settings.mode === '2P';

      // Determine goal coordinates for this player
      let goalNetX: number;
      let goalNetW: number;
      let goalNetY: number = 70;
      let goalNetH: number = 150;

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
        player.goalkeeper.rotation = (ball.optionLetter === 'A' ? 0.35 : -0.35);
      } else {
        // Wrong answer -> Ball heads right towards Goalkeeper, Goalkeeper dives and CATCHES it!
        targetX = goalNetX + goalNetW / 2 + (ball.optionLetter === 'A' ? -25 : 25);
        targetY = goalNetY + goalNetH - 25;

        player.goalkeeper.state = 'diving';
        player.goalkeeper.targetX = targetX;
        player.goalkeeper.targetY = targetY;
        player.goalkeeper.rotation = ball.optionLetter === 'A' ? -0.4 : 0.4;
      }

      // Animate Ball Flight & Goalkeeper movement
      const flightDuration = 650; // ms
      const startTime = performance.now();

      const animateFlight = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const t = Math.min(1.0, elapsed / flightDuration);
        ball.flightProgress = t;

        // Parabolic arc curve
        const arc = Math.sin(t * Math.PI) * 110;
        ball.x = ball.startX + (targetX - ball.startX) * t;
        ball.y = ball.startY + (targetY - ball.startY) * t - arc;
        ball.rotation += 0.28;
        ball.scale = 1.0 - t * 0.42; // scales from 1.0 down to ~0.58 for 3D depth

        // Smooth keeper dive towards target
        player.goalkeeper.x += (player.goalkeeper.targetX - player.goalkeeper.x) * 0.12;

        if (t < 1.0) {
          requestAnimationFrame(animateFlight);
        } else {
          // Flight ended!
          if (isCorrect) {
            // GOAL SCORED!
            ball.state = 'scored';
            soundEngine.playGoal();
            try {
              confetti({
                particleCount: is2P ? 50 : 80,
                spread: 60,
                origin: { x: targetX / w, y: 0.35 },
                colors: playerId === 'P1' ? ['#38BDF8', '#10B981', '#FFFFFF'] : ['#FB923C', '#FACC15', '#FFFFFF'],
              });
            } catch {
              // ignore
            }

            const { points } = calculateKickScore(player.streak);
            const newScore = player.score + points;
            const newStreak = player.streak + 1;
            const highestStreak = Math.max(player.highestStreak, newStreak);
            const goalsScored = player.goalsScored + 1;
            const totalAttempts = player.totalAttempts + 1;

            setPlayers((prev) =>
              prev.map((p) => {
                if (p.playerId !== playerId) return p;
                return {
                  ...p,
                  score: newScore,
                  streak: newStreak,
                  highestStreak,
                  goalsScored,
                  totalAttempts,
                  feedback: {
                    text: 'GOAL! ⚽',
                    subText: `+${points} Poin`,
                    color: '#4ade80',
                    timer: 1.0,
                    type: 'goal',
                  },
                };
              })
            );
          } else {
            // CAUGHT BY GOALKEEPER! (DITANGKAP KIPER)
            ball.state = 'missed';
            player.goalkeeper.state = 'caught';
            player.goalkeeper.armAngleL = -0.9;
            player.goalkeeper.armAngleR = 0.9;

            soundEngine.playGloveCatch();
            setTimeout(() => soundEngine.playMiss(), 180);

            const totalAttempts = player.totalAttempts + 1;

            setPlayers((prev) =>
              prev.map((p) => {
                if (p.playerId !== playerId) return p;
                return {
                  ...p,
                  streak: 0,
                  totalAttempts,
                  feedback: {
                    text: 'DITANGKAP KIPER! 🧤',
                    subText: 'Jawaban Salah!',
                    color: '#f87171',
                    timer: 1.0,
                    type: 'caught',
                  },
                };
              })
            );
          }

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

  // Resize listener
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvasRef.current.width = rect.width * dpr;
      canvasRef.current.height = rect.height * dpr;

      const ctx = canvasRef.current.getContext('2d');
      if (ctx) ctx.scale(dpr, dpr);

      trackerRef.current?.updateCanvasDimensions(rect.width, rect.height);
      layoutArena(rect.width, rect.height);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [layoutArena]);

  // Match countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onGameFinished(playersRef.current);
          return 0;
        }
        if (prev <= 6) {
          soundEngine.playTick(true);
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onGameFinished]);

  // Keyboard shortcut triggers:
  // P1: [Q]/[A] (Kick A), [W]/[S] (Kick B)
  // P2: [O]/[K] (Kick A), [P]/[L] (Kick B)
  // Or standard arrow keys for 1P
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

  // Initialize MediaPipe Pose and Camera Stream (Mounts ONCE, completely decoupled from UI updates)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const tracker = new PoseTrackerManager();
    trackerRef.current = tracker;

    const rect = containerRef.current?.getBoundingClientRect();
    const w = rect?.width || 800;
    const h = rect?.height || 600;

    let isMounted = true;

    const initTracker = async () => {
      const ready = await tracker.initialize(
        video,
        (data) => {
          if (!isMounted) return;
          feetPointsRef.current = data.footPoints;
          setFeetPoints(data.footPoints);

          const currentWidth = canvasRef.current
            ? canvasRef.current.width / (window.devicePixelRatio || 1)
            : w;
          const dividerX = currentWidth / 2;
          const hitTolerance = settingsRef.current.kickSensitivity === 'high' ? 36 : 22;

          // Check collisions for each player independently
          playersRef.current.forEach((player) => {
            if (player.isKickingLocked) return;

            // In 2P mode, partition feet by screen half
            let playerFeet = data.footPoints;
            if (settingsRef.current.mode === '2P') {
              playerFeet =
                player.playerId === 'P1'
                  ? data.footPoints.filter((f) => f.x < dividerX)
                  : data.footPoints.filter((f) => f.x >= dividerX);
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
        h
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

  // 60FPS Game Render Loop (Independent lifecycle, zero camera interruptions)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    rendererRef.current = new ARCanvasRenderer();

    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      const ctx = canvas.getContext('2d');
      const bounding = containerRef.current?.getBoundingClientRect();
      const width = bounding?.width || 800;
      const height = bounding?.height || 600;
      const curSettings = settingsRef.current;

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
          let goalW = is2P ? Math.min((width / 2) * 0.76, 310) : Math.min(width * 0.62, 500);
          let goalH = is2P ? Math.min(height * 0.25, 155) : Math.min(height * 0.27, 175);
          let goalX = !is2P
            ? (width - goalW) / 2
            : p.playerId === 'P1'
            ? (width / 2) * 0.5 - goalW / 2
            : width / 2 + (width / 2) * 0.5 - goalW / 2;
          let goalY = Math.max(14, height * 0.07);

          // Differentiate goalkeeper in 2P mode so each goal has distinct character
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
          players: playerGroups,
          showSkeleton: curSettings.showSkeleton,
        });
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
      className="relative w-screen h-screen overflow-hidden bg-slate-950 flex items-center justify-center select-none"
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
        feetDetectedCount={feetPoints.length}
        onToggleSound={onToggleSound}
        onToggleCamera={handleToggleCamera}
        onToggleSkeleton={onToggleSkeleton}
        onQuit={onQuit}
        onSimulateKick={(pId, opt) => executeKick(pId, opt)}
      />
    </div>
  );
};
