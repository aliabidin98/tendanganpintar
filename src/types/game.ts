/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface QuizQuestion {
  id: string;
  category: string;
  question: string;
  optionA: string;
  optionB: string;
  correctOption: 'A' | 'B';
  explanation: string;
}

export interface FootPoint {
  index: number;
  name: string;
  x: number; // canvas pixel x (mirrored)
  y: number; // canvas pixel y
  normX: number; // 0 to 1
  normY: number; // 0 to 1
  visibility: number;
}

export interface Ball {
  id: 'A' | 'B';
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  radius: number;
  label: string;
  optionLetter: 'A' | 'B';
  isCorrect: boolean;
  state: 'idle' | 'kicked' | 'scored' | 'missed';
  vx: number;
  vy: number;
  scale: number;
  rotation: number;
  opacity: number;
  startX: number;
  startY: number;
  flightProgress: number; // 0 to 1
}

export interface GoalkeeperState {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  targetX: number;
  targetY: number;
  state: 'idle' | 'diving' | 'caught' | 'beaten';
  diveProgress: number; // 0 to 1
  rotation: number;
  armAngleL: number;
  armAngleR: number;
  gloveCatchOffset: { x: number; y: number };
}

export type GameMode = '1P' | '2P';

export type GoalkeeperCharacter = 'lion' | 'champion' | 'cyber';

export type QuestionCardSize = 'small' | 'normal' | 'large' | 'xlarge';

export type AppLicenseMode = 'DEMO' | 'FULL';

export interface GameSettings {
  mode: GameMode;
  durationSeconds: number; // e.g. 15, 30, 60, 90
  soundEnabled: boolean;
  showSkeleton: boolean;
  kickSensitivity: 'normal' | 'high';
  goalkeeperCharacter: GoalkeeperCharacter;
  scorePerGoal: number; // 50, 100, 150, 200
  streakBonus: number; // 10, 20, 30, 50
  glassTransparency: number; // 0.15 (sangat bening) to 0.95 (solid)
  questionCardSize: QuestionCardSize; // 'small' | 'normal' | 'large' | 'xlarge'
}

export interface GameScoreState {
  score: number;
  streak: number;
  highestStreak: number;
  goalsScored: number;
  totalAttempts: number;
  highScore: number;
}

export interface PlayerSessionState {
  playerId: 'P1' | 'P2';
  name: string;
  score: number;
  streak: number;
  highestStreak: number;
  goalsScored: number;
  totalAttempts: number;
  currentQuestion: QuizQuestion | null;
  balls: Ball[];
  goalkeeper: GoalkeeperState;
  goalkeeperCharacter?: GoalkeeperCharacter;
  feedback: {
    text: string;
    subText?: string;
    color: string;
    timer: number;
    type: 'goal' | 'caught';
  } | null;
  isKickingLocked: boolean;
}
