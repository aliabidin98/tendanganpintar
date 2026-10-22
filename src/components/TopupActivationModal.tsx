/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  KeyRound,
  ShieldCheck,
  Lock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Users,
  User,
  Sliders,
  FileSpreadsheet,
} from 'lucide-react';
import { AppLicenseMode } from '../types/game';

interface TopupActivationModalProps {
  currentLicense: AppLicenseMode;
  onClose: () => void;
  onActivateSuccess: () => void;
  onSelectDemoMode: () => void;
}

export const TopupActivationModal: React.FC<TopupActivationModalProps> = ({
  currentLicense,
  onClose,
  onActivateSuccess,
  onSelectDemoMode,
}) => {
  const [inputCode, setInputCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleVerifyCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanCode = inputCode.trim().toUpperCase();

    if (!cleanCode) {
      setErrorMessage('Silakan masukkan kode aktivasi lisensi.');
      return;
    }

    // Secret Activation Code verification (Hidden from UI display)
    if (cleanCode === 'TENDANGBOLA') {
      setIsSuccess(true);
      setErrorMessage('');
      try {
        localStorage.setItem('ar_tendangan_pintar_license', 'FULL');
      } catch (err) {
        console.warn('Could not save license to storage:', err);
      }
      setTimeout(() => {
        onActivateSuccess();
      }, 900);
    } else {
      setErrorMessage(
        'Kode aktivasi tidak valid. Pastikan memasukkan kode lisensi yang tepat atau hubungi pengembang.'
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-lg bg-slate-900 border border-sky-500/40 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-sky-500/20 via-indigo-500/10 to-transparent pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-amber-500 to-sky-500 flex items-center justify-center text-lg shadow-md shadow-amber-500/20 text-white">
              ⚡
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] leading-none">
                Aktivasi Lisensi Game
              </h3>
              <p className="text-[11px] text-sky-400 font-semibold mt-0.5">
                Buka Semua Menu & Fitur Lengkap AR Tendangan Pintar
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 p-5 sm:p-6 overflow-y-auto space-y-5">
          {/* Comparison Cards: Demo vs Full */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Demo Card */}
            <div
              className={`p-3.5 rounded-2xl border transition-all ${
                currentLicense === 'DEMO'
                  ? 'bg-slate-950/80 border-slate-700/80'
                  : 'bg-slate-950/40 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Mode Demo
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  Gratis
                </span>
              </div>
              <ul className="text-[11px] space-y-1.5 text-slate-300">
                <li className="flex items-center gap-1.5 text-emerald-400 font-medium">
                  <span>✓</span>
                  <span>1 Pemain (Solo)</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />
                  <span>2P Duel Terkunci</span>
                </li>
                <li className="flex items-center gap-1.5 text-slate-400">
                  <Lock className="w-3 h-3 text-amber-500/80 shrink-0" />
                  <span>Pengaturan Terkunci</span>
                </li>
              </ul>
            </div>

            {/* Full Version Card */}
            <div className="p-3.5 rounded-2xl border-2 border-amber-500/50 bg-gradient-to-b from-amber-500/15 via-slate-900 to-slate-950 relative overflow-hidden shadow-lg shadow-amber-500/10">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-black uppercase text-amber-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  Mode Full
                </span>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded bg-amber-500 text-slate-950">
                  Semua Fitur
                </span>
              </div>
              <ul className="text-[11px] space-y-1.5 text-slate-200">
                <li className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <span>✓</span>
                  <span>Mode 2P Duel Layar 2</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <span>✓</span>
                  <span>Semua Kiper 3D</span>
                </li>
                <li className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                  <span>✓</span>
                  <span>Impor & Edit Soal</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Success Banner */}
          {isSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-400/60 flex items-center gap-3 text-emerald-200">
              <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 animate-bounce" />
              <div>
                <p className="text-sm font-black text-white">Aktivasi Mode Penuh Berhasil!</p>
                <p className="text-xs text-emerald-300">
                  Semua menu, mode 2 pemain, kiper 3D, dan pengaturan kini terbuka penuh.
                </p>
              </div>
            </div>
          )}

          {/* Activation Form */}
          {!isSuccess && (
            <form onSubmit={handleVerifyCode} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1.5">
                  Masukkan Kode Aktivasi / Lisensi:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => {
                      setInputCode(e.target.value);
                      if (errorMessage) setErrorMessage('');
                    }}
                    placeholder="Ketik kode aktivasi di sini..."
                    className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 text-white placeholder-slate-500 text-sm font-mono tracking-wider font-bold transition-all uppercase"
                    autoComplete="off"
                    autoFocus
                  />
                  <KeyRound className="w-4 h-4 text-slate-500 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {errorMessage && (
                  <p className="text-xs text-rose-400 font-medium mt-1.5 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMessage}</span>
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="submit"
                  className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 font-black text-xs font-['Outfit'] uppercase tracking-wider shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>Verifikasi & Buka Mode Full</span>
                </button>

                <button
                  type="button"
                  onClick={onSelectDemoMode}
                  className="px-4 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white font-bold text-xs transition-colors cursor-pointer text-center"
                >
                  Lanjut Mode Demo (1P)
                </button>
              </div>
            </form>
          )}

          {/* Information Notice */}
          <div className="bg-slate-950/70 border border-white/10 rounded-2xl p-3.5 text-xs text-slate-400 leading-relaxed">
            <span className="font-bold text-white block mb-0.5">Bantuan & Lisensi:</span>
            Untuk mendapatkan kode aktivasi lisensi instansi / sekolah, silakan hubungi pengembang melalui{' '}
            <a
              href="https://instagram.com/aliabidin988"
              target="_blank"
              rel="noreferrer"
              className="text-pink-400 hover:underline font-semibold"
            >
              Instagram @aliabidin988
            </a>{' '}
            atau{' '}
            <a
              href="https://tiktok.com/@aliabidin98"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:underline font-semibold"
            >
              TikTok @aliabidin98
            </a>
            .
          </div>
        </div>
      </div>
    </div>
  );
};
