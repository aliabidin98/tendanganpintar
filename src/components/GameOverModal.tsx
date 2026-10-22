/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Trophy, RotateCcw, Home, Flame, Target, Star, Users, User } from 'lucide-react';
import { GameMode, PlayerSessionState } from '../types/game';

interface GameOverModalProps {
  mode: GameMode;
  players: PlayerSessionState[];
  isNewHighScore: boolean;
  onPlayAgain: () => void;
  onGoHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  mode,
  players,
  isNewHighScore,
  onPlayAgain,
  onGoHome,
}) => {
  const p1 = players[0];
  const p2 = players[1];

  let outcomeTitle = 'Waktu Habis! Peluit Akhir!';
  let outcomeSubtitle = 'Pertandingan Selesai!';

  if (mode === '2P' && p1 && p2) {
    if (p1.score > p2.score) {
      outcomeTitle = '🏆 Pemain 1 Juara Duel!';
      outcomeSubtitle = `${p1.score} vs ${p2.score} · Kemenangan Mutlak Pemain 1!`;
    } else if (p2.score > p1.score) {
      outcomeTitle = '🏆 Pemain 2 Juara Duel!';
      outcomeSubtitle = `${p2.score} vs ${p1.score} · Kemenangan Mutlak Pemain 2!`;
    } else {
      outcomeTitle = '🤝 Pertandingan Seri / Imbang!';
      outcomeSubtitle = `Skor Kembar ${p1.score} - ${p2.score} · Kedua Pemain Sama Hebatnya!`;
    }
  } else if (p1) {
    if (p1.score >= 120) outcomeSubtitle = '⭐ Striker Juara Kelas Dunia!';
    else if (p1.score >= 60) outcomeSubtitle = '⚽ Pemain Handal!';
    else outcomeSubtitle = 'Calon Bintang Bola Edukasi!';
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl bg-slate-900 border-2 border-sky-500/50 rounded-3xl p-6 sm:p-8 shadow-2xl text-center relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Top Trophy / Badge */}
        <div className="relative inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mb-3 shadow-xl shadow-amber-500/30">
          <Trophy className="w-8 h-8 sm:w-10 sm:h-10" />
          {isNewHighScore && (
            <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-full bg-rose-600 text-white font-extrabold text-[10px] uppercase shadow">
              Rekor Baru!
            </span>
          )}
        </div>

        <h3 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-['Outfit'] mb-1">
          {outcomeTitle}
        </h3>
        <p className="text-sky-300 font-bold text-xs sm:text-sm mb-5">{outcomeSubtitle}</p>

        {/* 2-Player Head-to-Head Comparison Card */}
        {mode === '2P' && p1 && p2 ? (
          <div className="grid grid-cols-2 gap-3 mb-6">
            {/* Player 1 Card */}
            <div
              className={`rounded-2xl p-4 border text-left transition-all ${
                p1.score >= p2.score
                  ? 'bg-sky-950/70 border-sky-400/80 shadow-lg shadow-sky-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-sky-400 font-['Outfit'] uppercase">
                  Pemain 1 (Kiri)
                </span>
                {p1.score > p2.score && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500 text-slate-950 font-black">
                    MENANG
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tabular-nums mb-2">
                {p1.score} <span className="text-xs font-normal text-slate-400">Poin</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gol Masuk:</span>
                  <span className="font-bold">{p1.goalsScored} / {p1.totalAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Streak Tertinggi:</span>
                  <span className="font-bold text-orange-400">x{p1.highestStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Akurasi:</span>
                  <span className="font-bold text-emerald-400">
                    {p1.totalAttempts > 0 ? Math.round((p1.goalsScored / p1.totalAttempts) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Player 2 Card */}
            <div
              className={`rounded-2xl p-4 border text-left transition-all ${
                p2.score >= p1.score
                  ? 'bg-amber-950/70 border-amber-400/80 shadow-lg shadow-amber-500/20'
                  : 'bg-slate-950/60 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-orange-400 font-['Outfit'] uppercase">
                  Pemain 2 (Kanan)
                </span>
                {p2.score > p1.score && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500 text-slate-950 font-black">
                    MENANG
                  </span>
                )}
              </div>
              <div className="text-3xl sm:text-4xl font-black text-white font-['Outfit'] tabular-nums mb-2">
                {p2.score} <span className="text-xs font-normal text-slate-400">Poin</span>
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-400">Gol Masuk:</span>
                  <span className="font-bold">{p2.goalsScored} / {p2.totalAttempts}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Streak Tertinggi:</span>
                  <span className="font-bold text-orange-400">x{p2.highestStreak}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Akurasi:</span>
                  <span className="font-bold text-emerald-400">
                    {p2.totalAttempts > 0 ? Math.round((p2.goalsScored / p2.totalAttempts) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* 1-Player Score Breakdown */
          p1 && (
            <>
              <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 mb-5">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block mb-1">
                  Skor Akhir Anda
                </span>
                <span className="text-4xl sm:text-5xl font-black text-amber-300 font-['Outfit'] tabular-nums">
                  {p1.score}
                </span>
                {isNewHighScore && (
                  <p className="text-xs text-amber-400 font-semibold mt-1">
                    🎉 Rekor skor tertinggi baru berhasil dicetak!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-6">
                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <Target className="w-4 h-4 text-emerald-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Gol Masuk</span>
                  <span className="text-base font-bold text-white font-['Outfit'] tabular-nums">
                    {p1.goalsScored} / {p1.totalAttempts}
                  </span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <Flame className="w-4 h-4 text-orange-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Streak Top</span>
                  <span className="text-base font-bold text-white font-['Outfit'] tabular-nums">
                    x{p1.highestStreak}
                  </span>
                </div>

                <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5">
                  <Star className="w-4 h-4 text-sky-400 mx-auto mb-1" />
                  <span className="text-[10px] text-slate-400 block font-medium">Akurasi</span>
                  <span className="text-base font-bold text-white font-['Outfit'] tabular-nums">
                    {p1.totalAttempts > 0 ? Math.round((p1.goalsScored / p1.totalAttempts) * 100) : 0}%
                  </span>
                </div>
              </div>
            </>
          )
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            type="button"
            onClick={onPlayAgain}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-sky-500 hover:from-emerald-400 hover:to-sky-400 text-white font-black font-['Outfit'] text-sm sm:text-base shadow-lg shadow-emerald-500/25 active:scale-95 transition-all cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Main Lagi ({mode === '1P' ? '1 Pemain' : '2 Pemain'})</span>
          </button>

          <button
            type="button"
            onClick={onGoHome}
            className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold font-['Outfit'] text-sm sm:text-base border border-slate-700 active:scale-95 transition-all cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Menu Utama</span>
          </button>
        </div>

        {/* Developer Credit Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-3 text-[11px] text-slate-400">
          <span>Pengembang: <strong className="text-amber-400">M. Nur Ali Abidin, S.Pd.</strong></span>
          <span className="hidden sm:inline text-slate-600">•</span>
          <div className="flex items-center gap-2.5">
            <a href="https://instagram.com/aliabidin988" target="_blank" rel="noreferrer" className="text-pink-400 hover:underline">
              Ig : @aliabidin988
            </a>
            <span className="text-slate-600">•</span>
            <a href="https://tiktok.com/@aliabidin98" target="_blank" rel="noreferrer" className="text-cyan-400 hover:underline">
              TikTok: @aliabidin98
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
