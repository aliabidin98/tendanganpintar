/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Volume2,
  VolumeX,
  Camera,
  CameraOff,
  Sparkles,
  Trophy,
  Footprints,
} from 'lucide-react';
import { GameMode, PlayerSessionState, GameSettings } from '../types/game';

interface GameHUDProps {
  mode: GameMode;
  players: PlayerSessionState[];
  timeLeft: number;
  cameraActive: boolean;
  soundEnabled: boolean;
  showSkeleton: boolean;
  feetDetectedCount: number;
  settings?: GameSettings;
  onToggleSound: () => void;
  onToggleCamera: () => void;
  onToggleSkeleton: () => void;
  onQuit: () => void;
  onSimulateKick: (playerId: 'P1' | 'P2', option: 'A' | 'B') => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  mode,
  players,
  timeLeft,
  cameraActive,
  soundEnabled,
  showSkeleton,
  feetDetectedCount,
  settings,
  onToggleSound,
  onToggleCamera,
  onToggleSkeleton,
  onQuit,
  onSimulateKick,
}) => {
  const isTimeCritical = timeLeft <= 5 && timeLeft > 0;
  const p1 = players[0];
  const p2 = players[1];

  const transparency = settings?.glassTransparency ?? 0.3;
  const cardSize = settings?.questionCardSize ?? 'normal';

  const sizeStyles = {
    small: {
      card: 'p-2 sm:p-3',
      title: 'text-xs sm:text-sm font-extrabold',
      sub: 'text-[10px]',
      maxWidth: 'max-w-md',
      btn: 'px-2.5 py-1 text-[10px]',
    },
    normal: {
      card: 'p-3 sm:p-4 md:p-5',
      title: 'text-sm sm:text-lg md:text-xl font-black',
      sub: 'text-[11px]',
      maxWidth: 'max-w-xl',
      btn: 'px-3 py-1.5 text-xs',
    },
    large: {
      card: 'p-4 sm:p-6',
      title: 'text-base sm:text-xl md:text-2xl font-black',
      sub: 'text-xs',
      maxWidth: 'max-w-2xl',
      btn: 'px-4 py-2 text-sm',
    },
    xlarge: {
      card: 'p-5 sm:p-7 md:p-8',
      title: 'text-lg sm:text-2xl md:text-3xl font-black',
      sub: 'text-sm',
      maxWidth: 'max-w-3xl',
      btn: 'px-5 py-2.5 text-base',
    },
  }[cardSize];

  const glassStyle: React.CSSProperties = {
    backgroundColor: `rgba(255, 255, 255, ${transparency})`,
    borderColor: `rgba(255, 255, 255, ${Math.min(1, transparency + 0.35)})`,
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
  };

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between p-2 sm:p-4 md:p-5 select-none">
      {/* Top Header Bar - Liquid Glassmorphism */}
      <header className="pointer-events-auto flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-xl bg-slate-950/60 border border-white/20 rounded-2xl px-3 sm:px-4 py-2 shadow-2xl">
        {/* Left Section: Brand & Foot Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5">
            <span className="text-lg sm:text-xl">⚽</span>
            <div className="hidden sm:block">
              <h1 className="text-xs sm:text-sm font-black tracking-wide text-white font-['Outfit'] uppercase">
                AR TENDANGAN PINTAR
              </h1>
              <span className="text-[10px] text-sky-300 font-bold">
                {mode === '1P' ? 'MODE 1 PEMAIN' : 'MODE 2 PEMAIN (DUEL)'}
              </span>
            </div>
          </div>

          {/* Foot Sensor Badge */}
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg backdrop-blur-md bg-white/10 border border-white/20 text-xs">
            <Footprints
              className={`w-3 h-3 ${feetDetectedCount > 0 ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`}
            />
            <span className="font-mono text-slate-200 text-[10px] hidden md:inline">
              {feetDetectedCount > 0 ? `${feetDetectedCount}/4 Sensor Kaki` : 'Arahkan Kaki'}
            </span>
          </div>
        </div>

        {/* Center: Live Scores and Match Timer */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* In 2-Player mode: Show P1 Score vs P2 Score */}
          {mode === '2P' && p1 && p2 ? (
            <div className="flex items-center gap-2 sm:gap-4">
              {/* P1 Score */}
              <div className="text-right">
                <span className="text-[9px] uppercase font-bold text-sky-300 block -mb-1">
                  P1 (Kiri)
                </span>
                <span className="text-lg sm:text-2xl font-black text-white font-['Outfit'] tabular-nums drop-shadow">
                  {p1.score}
                </span>
              </div>

              <span className="text-xs font-bold text-white/50">VS</span>

              {/* P2 Score */}
              <div className="text-left">
                <span className="text-[9px] uppercase font-bold text-amber-300 block -mb-1">
                  P2 (Kanan)
                </span>
                <span className="text-lg sm:text-2xl font-black text-white font-['Outfit'] tabular-nums drop-shadow">
                  {p2.score}
                </span>
              </div>
            </div>
          ) : (
            /* 1-Player Single Score Display */
            p1 && (
              <div className="flex items-center gap-1.5 text-center">
                <Trophy className="w-4 h-4 text-amber-400" />
                <div>
                  <span className="text-[9px] uppercase font-bold text-white/70 block -mb-1">
                    Skor
                  </span>
                  <span className="text-lg sm:text-2xl font-black text-amber-300 font-['Outfit'] tabular-nums drop-shadow">
                    {p1.score}
                  </span>
                </div>
              </div>
            )
          )}

          {/* Match Countdown Timer */}
          <div
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-xl font-['Outfit'] font-black tabular-nums transition-colors backdrop-blur-md ${
              isTimeCritical
                ? 'bg-rose-600/90 text-white animate-pulse shadow-lg shadow-rose-600/50 border border-rose-400'
                : 'bg-white/10 text-sky-200 border border-white/20'
            }`}
          >
            <span className="text-[10px] uppercase font-medium text-white/80 hidden sm:inline">
              Waktu
            </span>
            <span className="text-base sm:text-xl">
              {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:
              {String(timeLeft % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Right Section: Tool Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onToggleSkeleton}
            title={showSkeleton ? 'Sembunyikan Rangka' : 'Tampilkan Rangka'}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer backdrop-blur-md ${
              showSkeleton
                ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                : 'bg-white/10 border-white/20 text-slate-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>

          <button
            type="button"
            onClick={onToggleSound}
            title={soundEnabled ? 'Matikan Suara' : 'Nyalakan Suara'}
            className="p-1.5 sm:p-2 rounded-xl backdrop-blur-md bg-white/10 border border-white/20 text-slate-300 hover:text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            {soundEnabled ? (
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-rose-400" />
            )}
          </button>

          <button
            type="button"
            onClick={onToggleCamera}
            title={cameraActive ? 'Kamera Aktif' : 'Kamera Mati'}
            className={`p-1.5 sm:p-2 rounded-xl border transition-colors cursor-pointer backdrop-blur-md ${
              cameraActive
                ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300'
                : 'bg-white/10 border-white/20 text-amber-400 hover:text-amber-300'
            }`}
          >
            {cameraActive ? (
              <Camera className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            ) : (
              <CameraOff className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            )}
          </button>

          <button
            type="button"
            onClick={onQuit}
            className="px-2.5 sm:px-3 py-1 text-xs font-bold text-white/90 hover:text-white backdrop-blur-md bg-white/10 hover:bg-rose-900/60 border border-white/20 hover:border-rose-400 rounded-xl transition-colors cursor-pointer"
          >
            Keluar
          </button>
        </div>
      </header>

      {/* QUESTION BOARDS AREA - Bening Kaca Transparan (Liquid Glassmorphism) */}
      {mode === '2P' && p1 && p2 ? (
        /* 2-Player Split Question Boards */
        <div className="grid grid-cols-2 gap-2 sm:gap-3 w-full px-1">
          {/* Player 1 Question Board (Left) - Glass */}
          <div
            style={glassStyle}
            className={`relative overflow-hidden border rounded-2xl ${sizeStyles.card} text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] ring-1 ring-sky-400/40`}
          >
            {/* Glass light sweep reflection */}
            <div className="absolute -top-12 -left-12 w-40 h-20 bg-white/20 rounded-full blur-lg pointer-events-none transform -rotate-12" />

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full backdrop-blur-md bg-sky-500/25 border border-sky-300/40 text-sky-200 text-[10px] font-black uppercase mb-1">
              <span>🔵 PEMAIN 1</span>
            </div>
            <h2 className={`${sizeStyles.title} text-white font-['Outfit'] leading-tight line-clamp-2 drop-shadow-md`}>
              {p1.currentQuestion?.question || 'Menyiapkan soal...'}
            </h2>
            {p1.streak > 1 && (
              <span className={`${sizeStyles.sub} text-amber-300 font-bold block mt-0.5`}>
                🔥 Streak x{p1.streak}!
              </span>
            )}
          </div>

          {/* Player 2 Question Board (Right) - Glass */}
          <div
            style={glassStyle}
            className={`relative overflow-hidden border rounded-2xl ${sizeStyles.card} text-center shadow-[0_8px_32px_0_rgba(0,0,0,0.35)] ring-1 ring-amber-400/40`}
          >
            {/* Glass light sweep reflection */}
            <div className="absolute -top-12 -left-12 w-40 h-20 bg-white/20 rounded-full blur-lg pointer-events-none transform -rotate-12" />

            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full backdrop-blur-md bg-amber-500/25 border border-amber-300/40 text-amber-200 text-[10px] font-black uppercase mb-1">
              <span>🟠 PEMAIN 2</span>
            </div>
            <h2 className={`${sizeStyles.title} text-white font-['Outfit'] leading-tight line-clamp-2 drop-shadow-md`}>
              {p2.currentQuestion?.question || 'Menyiapkan soal...'}
            </h2>
            {p2.streak > 1 && (
              <span className={`${sizeStyles.sub} text-amber-300 font-bold block mt-0.5`}>
                🔥 Streak x{p2.streak}!
              </span>
            )}
          </div>
        </div>
      ) : (
        /* 1-Player Single Large Question Board - Bening Kaca Transparan */
        p1 && (
          <div className={`mx-auto w-full ${sizeStyles.maxWidth} px-2`}>
            <div
              style={glassStyle}
              className={`relative overflow-hidden border rounded-3xl ${sizeStyles.card} shadow-[0_8px_32px_0_rgba(0,0,0,0.4)] text-center ring-1 ring-white/25`}
            >
              {/* Crystalline diagonal glass sheen */}
              <div className="absolute -top-16 -left-16 w-56 h-28 bg-white/25 rounded-full blur-xl pointer-events-none transform -rotate-12" />
              <div className="absolute -bottom-16 -right-16 w-56 h-28 bg-sky-400/15 rounded-full blur-xl pointer-events-none" />

              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full backdrop-blur-md bg-white/15 border border-white/30 text-sky-200 text-[11px] font-bold mb-1.5 shadow-sm">
                <span>⚽ Soal Pengetahuan Umum</span>
              </div>
              <h2 className={`${sizeStyles.title} text-white font-['Outfit'] leading-tight mb-1.5 drop-shadow-md`}>
                {p1.currentQuestion ? p1.currentQuestion.question : 'Memuat soal berikutnya...'}
              </h2>
              <p className={`${sizeStyles.sub} text-white/90 font-medium drop-shadow-sm`}>
                Tendang bola <strong className="text-sky-300">[A - KIRI]</strong> atau{' '}
                <strong className="text-amber-300">[B - KANAN]</strong> dengan kaki Anda!
              </p>
            </div>
          </div>
        )
      )}

      {/* BOTTOM CONTROL & VIRTUAL KICK BAR - Translucent Glass */}
      <footer className="pointer-events-auto backdrop-blur-xl bg-slate-950/60 border border-white/20 rounded-2xl p-2.5 sm:p-3 shadow-2xl">
        {mode === '2P' && p1 && p2 ? (
          /* 2-Player Controls (Left half for P1, Right half for P2) */
          <div className="grid grid-cols-2 gap-3 items-center">
            {/* P1 Quick Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 border-r border-white/15 pr-2">
              <span className="text-[10px] text-sky-300 font-black hidden lg:inline">
                P1: [Q]/[A] | [W]/[S]
              </span>
              <div className="flex gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onSimulateKick('P1', 'A')}
                  className="flex-1 px-2.5 py-1.5 rounded-xl backdrop-blur-md bg-sky-500/30 hover:bg-sky-500/50 border border-sky-300/40 text-white font-bold text-[11px] shadow active:scale-95 transition-all truncate cursor-pointer"
                >
                  ⚽ P1: A ({p1.currentQuestion?.optionA || 'A'})
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateKick('P1', 'B')}
                  className="flex-1 px-2.5 py-1.5 rounded-xl backdrop-blur-md bg-cyan-500/30 hover:bg-cyan-500/50 border border-cyan-300/40 text-white font-bold text-[11px] shadow active:scale-95 transition-all truncate cursor-pointer"
                >
                  ⚽ P1: B ({p1.currentQuestion?.optionB || 'B'})
                </button>
              </div>
            </div>

            {/* P2 Quick Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-1.5 pl-2">
              <div className="flex gap-1.5 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onSimulateKick('P2', 'A')}
                  className="flex-1 px-2.5 py-1.5 rounded-xl backdrop-blur-md bg-amber-500/30 hover:bg-amber-500/50 border border-amber-300/40 text-white font-bold text-[11px] shadow active:scale-95 transition-all truncate cursor-pointer"
                >
                  ⚽ P2: A ({p2.currentQuestion?.optionA || 'A'})
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateKick('P2', 'B')}
                  className="flex-1 px-2.5 py-1.5 rounded-xl backdrop-blur-md bg-orange-500/30 hover:bg-orange-500/50 border border-orange-300/40 text-white font-bold text-[11px] shadow active:scale-95 transition-all truncate cursor-pointer"
                >
                  ⚽ P2: B ({p2.currentQuestion?.optionB || 'B'})
                </button>
              </div>
              <span className="text-[10px] text-amber-300 font-black hidden lg:inline">
                P2: [O]/[K] | [P]/[L]
              </span>
            </div>
          </div>
        ) : (
          /* 1-Player Controls - Translucent Glass Buttons */
          p1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <div className="text-xs text-white/70 flex items-center gap-2">
                <span className="hidden sm:inline">⌨️ Tombol Cepat:</span>
                <span className="px-2 py-0.5 rounded backdrop-blur-md bg-white/10 border border-white/20 text-sky-200 font-mono text-[11px]">
                  [A] / [←] Tendang Kiri
                </span>
                <span className="px-2 py-0.5 rounded backdrop-blur-md bg-white/10 border border-white/20 text-amber-200 font-mono text-[11px]">
                  [B] / [→] Tendang Kanan
                </span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => onSimulateKick('P1', 'A')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl backdrop-blur-md bg-sky-500/30 hover:bg-sky-500/50 border border-sky-300/50 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all cursor-pointer truncate"
                >
                  <span>⚽ Tendang A ({p1.currentQuestion?.optionA || 'Kiri'})</span>
                </button>
                <button
                  type="button"
                  onClick={() => onSimulateKick('P1', 'B')}
                  className="flex-1 sm:flex-none px-4 py-2 rounded-xl backdrop-blur-md bg-amber-500/30 hover:bg-amber-500/50 border border-amber-300/50 text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all cursor-pointer truncate"
                >
                  <span>⚽ Tendang B ({p1.currentQuestion?.optionB || 'Kanan'})</span>
                </button>
              </div>
            </div>
          )
        )}
      </footer>
    </div>
  );
};
