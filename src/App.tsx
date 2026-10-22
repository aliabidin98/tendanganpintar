/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { StartScreen } from './components/StartScreen';
import { CameraARView } from './components/CameraARView';
import { GameOverModal } from './components/GameOverModal';
import { getStoredQuestions } from './game/questionManager';
import { QuizQuestion, GameSettings, GameMode, PlayerSessionState } from './types/game';
import { ErrorBoundary } from './components/ErrorBoundary';

const HIGH_SCORE_1P_KEY = 'ar_sports_hero_highscore_1p';
const HIGH_SCORE_2P_KEY = 'ar_sports_hero_highscore_2p';

export default function App() {
  const [gameState, setGameState] = useState<'MENU' | 'PLAYING' | 'GAME_OVER'>('MENU');

  const [settings, setSettings] = useState<GameSettings>({
    mode: '1P',
    durationSeconds: 30,
    soundEnabled: true,
    showSkeleton: true,
    kickSensitivity: 'normal',
    goalkeeperCharacter: 'lion',
  });

  // Stored questions bank (includes any user imported questions, default 5)
  const [questions, setQuestions] = useState<QuizQuestion[]>(() => getStoredQuestions());

  // High Scores
  const [highScore1P, setHighScore1P] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_1P_KEY);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });

  const [highScore2P, setHighScore2P] = useState<{ p1: number; p2: number }>(() => {
    try {
      const saved = localStorage.getItem(HIGH_SCORE_2P_KEY);
      return saved ? JSON.parse(saved) : { p1: 0, p2: 0 };
    } catch {
      return { p1: 0, p2: 0 };
    }
  });

  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [finishedPlayers, setFinishedPlayers] = useState<PlayerSessionState[]>([]);

  // Active questions (5 default or custom imported)
  const activeQuestions = questions;

  // Start game handler
  const startGame = useCallback((chosenMode?: GameMode) => {
    if (chosenMode) {
      setSettings((prev) => ({ ...prev, mode: chosenMode }));
    }
    setIsNewHighScore(false);
    setGameState('PLAYING');
  }, []);

  // Check URL params for testing/autostart
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const autostart = params.get('autostart');
    const modeParam = params.get('mode');

    if (modeParam === '2p' || modeParam === '2P') {
      setSettings((prev) => ({ ...prev, mode: '2P' }));
    }

    if (autostart === '1') {
      startGame();
    }
  }, [startGame]);

  // Update Settings
  const handleUpdateSettings = (newSettings: Partial<GameSettings>) => {
    setSettings((prev) => ({ ...prev, ...newSettings }));
  };

  // Questions updated via import/reset in Settings Modal
  const handleQuestionsUpdated = () => {
    const updated = getStoredQuestions();
    setQuestions(updated);
  };

  // Reset scores
  const handleResetScores = () => {
    try {
      localStorage.removeItem(HIGH_SCORE_1P_KEY);
      localStorage.removeItem(HIGH_SCORE_2P_KEY);
      setHighScore1P(0);
      setHighScore2P({ p1: 0, p2: 0 });
    } catch {
      // ignore
    }
  };

  // Match finished handler
  const handleGameFinished = useCallback((finalPlayers: PlayerSessionState[]) => {
    setFinishedPlayers(finalPlayers);
    setGameState('GAME_OVER');

    if (settings.mode === '1P' && finalPlayers[0]) {
      const p1 = finalPlayers[0];
      if (p1.score > highScore1P) {
        setIsNewHighScore(true);
        setHighScore1P(p1.score);
        try {
          localStorage.setItem(HIGH_SCORE_1P_KEY, p1.score.toString());
        } catch {
          // ignore
        }
      }
    } else if (settings.mode === '2P' && finalPlayers[0] && finalPlayers[1]) {
      const p1 = finalPlayers[0];
      const p2 = finalPlayers[1];
      if (p1.score > highScore2P.p1 || p2.score > highScore2P.p2) {
        setIsNewHighScore(true);
        const newRecord = {
          p1: Math.max(p1.score, highScore2P.p1),
          p2: Math.max(p2.score, highScore2P.p2),
        };
        setHighScore2P(newRecord);
        try {
          localStorage.setItem(HIGH_SCORE_2P_KEY, JSON.stringify(newRecord));
        } catch {
          // ignore
        }
      }
    }
  }, [highScore1P, highScore2P, settings.mode]);

  return (
    <div className="w-full min-h-screen bg-slate-950 font-['Plus_Jakarta_Sans',sans-serif] text-slate-100 flex flex-col">
      {gameState === 'MENU' && (
        <StartScreen
          settings={settings}
          highScore1P={highScore1P}
          highScore2P={highScore2P}
          activeQuestionsCount={activeQuestions.length}
          onUpdateSettings={handleUpdateSettings}
          onQuestionsUpdated={handleQuestionsUpdated}
          onResetScores={handleResetScores}
          onStartGame={startGame}
        />
      )}

      {gameState === 'PLAYING' && (
        <ErrorBoundary
          fallbackTitle="Kendala Sesi AR Game"
          fallbackMessage="Terjadi kendala saat memproses kamera atau sensor pose tubuh AR. Anda dapat kembali ke menu utama atau memulai ulang."
          onReset={() => setGameState('MENU')}
          resetLabel="Kembali ke Menu Utama"
        >
          <CameraARView
            settings={settings}
            questionBank={activeQuestions}
            onGameFinished={handleGameFinished}
            onQuit={() => setGameState('MENU')}
            onToggleSound={() =>
              setSettings((prev) => ({ ...prev, soundEnabled: !prev.soundEnabled }))
            }
            onToggleSkeleton={() =>
              setSettings((prev) => ({ ...prev, showSkeleton: !prev.showSkeleton }))
            }
          />
        </ErrorBoundary>
      )}

      {gameState === 'GAME_OVER' && (
        <div className="relative w-full h-screen overflow-hidden bg-slate-950 flex items-center justify-center">
          {/* Ambient Stadium Glow Background */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.3),rgba(255,255,255,0))]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_60%_at_50%_100%,rgba(16,185,129,0.2),transparent)]" />
          <GameOverModal
            mode={settings.mode}
            players={finishedPlayers}
            isNewHighScore={isNewHighScore}
            onPlayAgain={() => startGame(settings.mode)}
            onGoHome={() => setGameState('MENU')}
          />
        </div>
      )}
    </div>
  );
}
