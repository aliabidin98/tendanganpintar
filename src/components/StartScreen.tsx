/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Play,
  Trophy,
  Footprints,
  Sparkles,
  Users,
  User,
  Settings,
  ShieldCheck,
  FileSpreadsheet,
  BookOpen,
} from 'lucide-react';
import { GameSettings, GameMode } from '../types/game';
import { SettingsModal } from './SettingsModal';

interface StartScreenProps {
  settings: GameSettings;
  highScore1P: number;
  highScore2P: { p1: number; p2: number };
  activeQuestionsCount: number;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onQuestionsUpdated: (count: number) => void;
  onResetScores: () => void;
  onStartGame: (mode: GameMode) => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  settings,
  highScore1P,
  highScore2P,
  activeQuestionsCount,
  onUpdateSettings,
  onQuestionsUpdated,
  onResetScores,
  onStartGame,
}) => {
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-sky-500 selection:text-white">
      {/* Background Lighting & Stadium Atmosphere */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(14,165,233,0.2),rgba(255,255,255,0))]" />
      <div className="absolute bottom-0 inset-x-0 h-48 bg-gradient-to-t from-emerald-950/30 to-transparent pointer-events-none" />

      {/* Top Header - Glassmorphism */}
      <header className="relative z-10 flex items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 backdrop-blur-md bg-slate-950/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center text-xl shadow-lg shadow-sky-500/30">
            ⚽
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black tracking-tight text-white font-['Outfit'] leading-none">
              AR TENDANGAN PINTAR
            </h1>
            <p className="text-[11px] text-sky-400 font-medium">
              Edukasi Interaktif Tendang Kuis AI Pose Tracking 3D
            </p>
          </div>
        </div>

        {/* Right side controls: Settings & High Score */}
        <div className="flex items-center gap-2">
          {/* Unified Settings Button */}
          <button
            type="button"
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl backdrop-blur-md bg-white/10 hover:bg-white/15 border border-white/20 text-xs font-semibold text-slate-200 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Pengaturan & Soal</span>
            <span className="sm:hidden">Pengaturan</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1 rounded-xl backdrop-blur-md bg-white/10 border border-amber-500/30 shadow-inner">
            <Trophy className="w-3.5 h-3.5 text-amber-400" />
            <div className="text-right">
              <span className="text-[9px] uppercase font-bold text-slate-400 block -mb-1">
                {settings.mode === '1P' ? 'Rekor 1P' : 'Rekor Duel'}
              </span>
              <span className="text-xs font-extrabold text-amber-300 font-['Outfit'] tabular-nums">
                {settings.mode === '1P'
                  ? `${highScore1P} Poin`
                  : `${highScore2P.p1} vs ${highScore2P.p2}`}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Hero & Configuration Area */}
      <main className="relative z-10 max-w-4xl mx-auto w-full px-4 py-4 md:py-6 flex flex-col items-center">
        {/* Banner Pill */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full backdrop-blur-md bg-sky-500/15 border border-sky-400/30 text-sky-300 text-xs font-semibold mb-3 shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span>Karakter Kiper & Bola Versi 3D · Tampilan Kaca Bening Transparan</span>
        </div>

        {/* Hero Title */}
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-center text-white font-['Outfit'] max-w-2xl leading-tight mb-2">
          Pilih Mode Main,{' '}
          <span className="bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
            Tendang Bola Jawaban
          </span>
          , Taklukkan Kiper 3D!
        </h2>

        <p className="text-xs sm:text-sm text-slate-300 text-center max-w-xl mb-4 leading-relaxed">
          Kamera mendeteksi sendi pergelangan & ujung kaki pemain via{' '}
          <strong className="text-sky-300">MediaPipe Pose</strong>. Tendang bola ke gawang! Jawaban
          salah akan <strong className="text-rose-400">ditangkap oleh penjaga gawang 3D</strong>!
        </p>

        {/* MODE SELECTOR (1 Pemain vs 2 Pemain Layar Dibagi 2) */}
        <div className="w-full max-w-2xl mb-4">
          <label className="text-xs font-extrabold text-sky-300 uppercase tracking-widest block text-center mb-2.5">
            PILIH MODE PERMAINAN
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* 1 Pemain Button */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ mode: '1P' })}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden cursor-pointer ${
                settings.mode === '1P'
                  ? 'bg-gradient-to-br from-sky-950/80 to-slate-900 border-sky-400 shadow-xl shadow-sky-500/20'
                  : 'backdrop-blur-md bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                  <User className="w-5 h-5" />
                </div>
                {settings.mode === '1P' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 text-[10px] font-black uppercase">
                    Aktif
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white font-['Outfit']">
                Mode 1 Pemain (Solo)
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                1 gawang, 1 kiper 3D, layar penuh. Latihan mandiri dan kumpulkan poin rekor tertinggi!
              </p>
            </button>

            {/* 2 Pemain Button */}
            <button
              type="button"
              onClick={() => onUpdateSettings({ mode: '2P' })}
              className={`p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden cursor-pointer ${
                settings.mode === '2P'
                  ? 'bg-gradient-to-br from-indigo-950/80 to-slate-900 border-indigo-400 shadow-xl shadow-indigo-500/20'
                  : 'backdrop-blur-md bg-slate-900/60 border-slate-800 hover:border-slate-700 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                  <Users className="w-5 h-5" />
                </div>
                {settings.mode === '2P' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-slate-950 text-[10px] font-black uppercase">
                    Aktif
                  </span>
                )}
              </div>
              <h3 className="text-base font-black text-white font-['Outfit']">
                Mode 2 Pemain (Duel Layar Bagi 2)
              </h3>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Layar dibagi 2 (Kiri: Pemain 1, Kanan: Pemain 2) dengan soal acak berbeda untuk masing-masing pemain!
              </p>
            </button>
          </div>
        </div>

        {/* Configuration Box: Duration, Sensitivity, Questions Info */}
        <div className="w-full max-w-2xl backdrop-blur-xl bg-white/8 border border-white/15 rounded-2xl p-4 shadow-xl mb-4 flex flex-col gap-3">
          {/* Active Questions Preview Tag */}
          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-bold text-white">
                Bank Soal: {activeQuestionsCount} Soal Aktif (Bawaan Standar)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="text-[11px] text-sky-400 hover:text-sky-300 font-semibold underline cursor-pointer"
            >
              Ubah / Impor Soal
            </button>
          </div>

          {/* Duration Selector & Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                Durasi Waktu Pertandingan
              </label>
              <div className="flex gap-1.5">
                {[
                  { label: '30 Detik', val: 30 },
                  { label: '60 Detik', val: 60 },
                  { label: '90 Detik', val: 90 },
                ].map((dur) => (
                  <button
                    key={dur.val}
                    type="button"
                    onClick={() => onUpdateSettings({ durationSeconds: dur.val })}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      settings.durationSeconds === dur.val
                        ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/30'
                        : 'bg-white/10 text-slate-200 hover:bg-white/15'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1.5 uppercase tracking-wider">
                Sensitivitas & Menu Lengkap
              </label>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() =>
                    onUpdateSettings({
                      kickSensitivity: settings.kickSensitivity === 'high' ? 'normal' : 'high',
                    })
                  }
                  className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-colors flex items-center justify-center gap-1 cursor-pointer ${
                    settings.kickSensitivity === 'high'
                      ? 'bg-emerald-500/25 border-emerald-400/50 text-emerald-300'
                      : 'bg-white/10 border-white/15 text-slate-300'
                  }`}
                >
                  <Footprints className="w-3.5 h-3.5" />
                  <span>{settings.kickSensitivity === 'high' ? 'Tinggi' : 'Normal'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowSettingsModal(true)}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold border border-white/20 bg-white/10 hover:bg-white/20 text-sky-300 flex items-center justify-center gap-1 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Pengaturan</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3D Goalkeeper Character Selection Row */}
          <div className="border-t border-white/10 pt-2.5">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <span>Karakter Kiper 3D Lawan</span>
              </span>
              <button
                type="button"
                onClick={() => setShowSettingsModal(true)}
                className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                Pilihan Lengkap ⚙️
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { id: 'lion' as const, label: '🦁 Singa Juara' },
                { id: 'champion' as const, label: '⚡ Hero Juara' },
                { id: 'cyber' as const, label: '🤖 Cyber Bot' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onUpdateSettings({ goalkeeperCharacter: c.id })}
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-bold border transition-all cursor-pointer text-center ${
                    settings.goalkeeperCharacter === c.id
                      ? 'bg-sky-500/25 border-sky-400 text-sky-200 shadow-sm'
                      : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={() => onStartGame(settings.mode)}
          className="group relative inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-sky-500 text-white font-['Outfit'] font-black text-base md:text-lg shadow-xl shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
        >
          <Play className="w-5 h-5 fill-white transition-transform group-hover:scale-110" />
          <span>MULAI MAIN ({settings.mode === '1P' ? '1 PEMAIN' : '2 PEMAIN DUEL'})</span>
        </button>

        {/* Mirror camera reminder */}
        <p className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
          <ShieldCheck className="w-3 h-3 text-sky-400" />
          <span>Kamera di-mirror otomatis seperti cermin. Kiper 3D akan menangkap bola jika jawaban salah!</span>
        </p>
      </main>

      {/* Unified Settings Modal */}
      {showSettingsModal && (
        <SettingsModal
          settings={settings}
          highScore1P={highScore1P}
          highScore2P={highScore2P}
          activeQuestionsCount={activeQuestionsCount}
          onClose={() => setShowSettingsModal(false)}
          onUpdateSettings={onUpdateSettings}
          onQuestionsUpdated={onQuestionsUpdated}
          onResetScores={onResetScores}
        />
      )}

      {/* Developer Footer */}
      <footer className="relative z-10 py-3 px-6 border-t border-white/10 bg-slate-950/90 text-center flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-slate-300 backdrop-blur-md">
        <div className="flex items-center gap-1.5">
          <span className="text-slate-400">Pengembang :</span>
          <span className="font-extrabold text-amber-400">M. Nur Ali Abidin, S.Pd.</span>
        </div>
        <span className="hidden sm:inline text-slate-600">|</span>
        <div className="flex items-center gap-3 text-[11px]">
          <a
            href="https://instagram.com/aliabidin988"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 font-semibold transition-colors"
          >
            <span>Ig :</span>
            <span className="underline">@aliabidin988</span>
          </a>
          <span className="text-slate-600">•</span>
          <a
            href="https://tiktok.com/@aliabidin98"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
          >
            <span>TikTok:</span>
            <span className="underline">@aliabidin98</span>
          </a>
        </div>
      </footer>
    </div>
  );
};
