/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  Volume2,
  Sparkles,
  Trophy,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileCode,
  Sliders,
  BookOpen,
  Eye,
  EyeOff,
  Type,
  Coins,
  KeyRound,
  Lock,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { GameSettings, AppLicenseMode, QuestionCardSize } from '../types/game';
import { QUESTION_BANK } from '../game/quizData';
import {
  generateTemplateCSV,
  generateTemplateJSON,
  parseQuestionsCSV,
  parseQuestionsJSON,
  downloadFile,
  resetToDefaultQuestions,
  saveCustomQuestions,
} from '../game/questionManager';
import { downloadSingleFileBundle } from '../utils/singleFileDownloader';

interface SettingsModalProps {
  settings: GameSettings;
  highScore1P: number;
  highScore2P: { p1: number; p2: number };
  activeQuestionsCount: number;
  licenseMode?: AppLicenseMode;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onQuestionsUpdated: (count: number) => void;
  onResetScores: () => void;
  onOpenActivation?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  highScore1P,
  highScore2P,
  activeQuestionsCount,
  licenseMode = 'DEMO',
  onClose,
  onUpdateSettings,
  onQuestionsUpdated,
  onResetScores,
  onOpenActivation,
}) => {
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
    details?: string[];
  }>({ type: null, message: '' });

  // Download Single File HTML state
  const [downloadPassword, setDownloadPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle single file HTML download with admin password verification
  const handleDownloadSingleFile = async () => {
    if (!downloadPassword.trim()) {
      setDownloadStatus({
        type: 'error',
        message: 'Silakan masukkan password admin terlebih dahulu.',
      });
      return;
    }

    setIsDownloading(true);
    setDownloadStatus({ type: null, message: '' });

    try {
      const result = await downloadSingleFileBundle(downloadPassword);
      if (result.success) {
        setDownloadStatus({
          type: 'success',
          message: result.message,
        });
      } else {
        setDownloadStatus({
          type: 'error',
          message: result.message,
        });
      }
    } catch (e: unknown) {
      const errStr = e instanceof Error ? e.message : 'Terjadi kendala sistem.';
      setDownloadStatus({
        type: 'error',
        message: 'Gagal mengunduh file: ' + errStr,
      });
    } finally {
      setIsDownloading(false);
    }
  };

  // Handle file import
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const isJson =
        file.name.endsWith('.json') || text.trim().startsWith('{') || text.trim().startsWith('[');
      const result = isJson ? parseQuestionsJSON(text) : parseQuestionsCSV(text);

      if (result.questions.length > 0) {
        saveCustomQuestions(result.questions);
        onQuestionsUpdated(result.questions.length);
        setImportStatus({
          type: 'success',
          message: `Berhasil mengimpor ${result.questions.length} soal baru dari ${file.name}!`,
          details: result.errors.length > 0 ? result.errors : undefined,
        });
      } else {
        setImportStatus({
          type: 'error',
          message: 'Gagal mengimpor file.',
          details: result.errors.length > 0 ? result.errors : ['Format file tidak sesuai.'],
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Download template handlers
  const handleDownloadCsvTemplate = () => {
    const csv = generateTemplateCSV();
    downloadFile(csv, 'template_soal_ar_tendangan_pintar.csv', 'text/csv');
  };

  const handleDownloadJsonTemplate = () => {
    const json = generateTemplateJSON();
    downloadFile(json, 'template_soal_ar_tendangan_pintar.json', 'application/json');
  };

  // Reset questions handler
  const handleResetQuestions = () => {
    if (confirm('Kembalikan ke 5 soal bawaan standar?')) {
      const def = resetToDefaultQuestions();
      onQuestionsUpdated(def.length);
      setImportStatus({
        type: 'success',
        message: `Bank soal berhasil di-reset ke 5 soal bawaan standar.`,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center text-base">
              ⚙️
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] leading-none">
                  Menu Pengaturan & Kustomisasi
                </h3>
                {licenseMode === 'FULL' ? (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/25 border border-amber-400/40 text-amber-300 text-[10px] font-black uppercase">
                    ⭐ Full
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenActivation?.();
                    }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/40 text-sky-300 hover:bg-sky-500/30 text-[10px] font-extrabold uppercase transition-colors cursor-pointer"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>Mode Demo · Aktivasi</span>
                  </button>
                )}
              </div>
              <p className="text-[11px] text-sky-400 font-medium mt-0.5">
                Pengaturan skor, tingkat transparansi kaca, ukuran soal, durasi, dan bank soal
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            title="Tutup Menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Single Unified Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {/* Notification Banner */}
          {importStatus.type && (
            <div
              className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs ${
                importStatus.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
              }`}
            >
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{importStatus.message}</p>
                {importStatus.details && importStatus.details.length > 0 && (
                  <ul className="mt-1 list-disc pl-4 space-y-0.5 text-[11px] opacity-80">
                    {importStatus.details.slice(0, 3).map((d, i) => (
                      <li key={i}>{d}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* SECTION 1: PENGATURAN SKOR PERTANDINGAN */}
          <section className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                  1. Pengaturan Skor Pertandingan
                </h4>
              </div>
              <span className="text-[11px] font-bold text-amber-300 font-mono">
                {settings.scorePerGoal || 100} Poin / Gol
              </span>
            </div>

            {/* Poin Per Gol */}
            <div className="mb-3.5">
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Nilai Poin Setiap Gol Benar:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '50 Poin', val: 50 },
                  { label: '100 Poin (Standar)', val: 100 },
                  { label: '150 Poin', val: 150 },
                  { label: '200 Poin', val: 200 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateSettings({ scorePerGoal: item.val })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (settings.scorePerGoal || 100) === item.val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bonus Streak Beruntun */}
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1.5">
                Bonus Streak Jawaban Beruntun:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '+10 Poin', val: 10 },
                  { label: '+20 Poin (Standar)', val: 20 },
                  { label: '+30 Poin', val: 30 },
                  { label: '+50 Poin', val: 50 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateSettings({ streakBonus: item.val })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      (settings.streakBonus || 20) === item.val
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                💡 Pemain akan mendapatkan tambahan bonus streak dikalikan dengan jumlah jawaban berturut-turut yang benar.
              </p>
            </div>
          </section>

          {/* SECTION 2: TAMPILAN KACA TRANSPARAN & UKURAN SOAL */}
          <section className="bg-slate-950/70 border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Eye className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                2. Tingkat Transparansi Kaca & Ukuran Soal
              </h4>
            </div>

            {/* Tingkat Transparansi Soal Jawaban */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Tingkat Transparansi Kaca Bening Soal:
                </label>
                <span className="text-xs font-mono font-bold text-sky-300">
                  {Math.round((settings.glassTransparency || 0.3) * 100)}% Kejernihan Kaca
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 mb-2.5">
                {[
                  { label: 'Sangat Bening (15%)', val: 0.15 },
                  { label: 'Standar (30%)', val: 0.3 },
                  { label: 'Semi (50%)', val: 0.5 },
                  { label: 'Pekat (75%)', val: 0.75 },
                  { label: 'Solid (95%)', val: 0.95 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateSettings({ glassTransparency: item.val })}
                    className={`py-1.5 px-1 text-center rounded-xl text-[11px] font-bold border transition-all cursor-pointer ${
                      Math.abs((settings.glassTransparency || 0.3) - item.val) < 0.05
                        ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20 font-black'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Slider Manual */}
              <input
                type="range"
                min="0.1"
                max="0.95"
                step="0.05"
                value={settings.glassTransparency || 0.3}
                onChange={(e) => onUpdateSettings({ glassTransparency: parseFloat(e.target.value) })}
                className="w-full accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
              />

              {/* Mini Live Glass Preview Box */}
              <div className="relative mt-2 p-3 rounded-2xl overflow-hidden border border-white/20 text-center shadow-lg bg-cover bg-center" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, #0369A1, #0F172A)' }}>
                <div
                  className="rounded-xl p-2.5 border border-white/30 backdrop-blur-md transition-all shadow-md inline-block max-w-sm w-full"
                  style={{
                    backgroundColor: `rgba(255, 255, 255, ${settings.glassTransparency || 0.3})`,
                  }}
                >
                  <span className="text-[10px] uppercase font-bold text-sky-200 block">
                    Pratinjau Kaca Bening
                  </span>
                  <span className="text-xs font-black text-white drop-shadow">
                    Contoh Teks Soal & Kartu Jawaban
                  </span>
                </div>
              </div>
            </div>

            {/* Besar Kecil Ukuran Soal Jawaban */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <label className="text-xs font-bold text-slate-300">
                  Besar Kecil Ukuran Teks & Kartu Soal Jawaban:
                </label>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'small' as const, label: 'Kecil', desc: 'Ukuran Compact' },
                  { id: 'normal' as const, label: 'Sedang', desc: 'Ukuran Standar' },
                  { id: 'large' as const, label: 'Besar', desc: 'Mudah Dibaca' },
                  { id: 'xlarge' as const, label: 'Ekstra Besar', desc: 'Jarak Jauh / TV' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => onUpdateSettings({ questionCardSize: item.id })}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      (settings.questionCardSize || 'normal') === item.id
                        ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    <span className="block font-black text-xs font-['Outfit'] text-white">
                      {item.label}
                    </span>
                    <span className="text-[10px] opacity-75">{item.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* SECTION 3: PENGATURAN PERTANDINGAN & SENSOR */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Sliders className="w-4 h-4 text-sky-400" />
              <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                3. Durasi & Karakter Kiper 3D
              </h4>
            </div>

            {/* Durasi Pertandingan */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-300 block mb-2">
                Durasi Waktu Permainan:
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: '15 Detik', val: 15 },
                  { label: '30 Detik', val: 30 },
                  { label: '60 Detik', val: 60 },
                  { label: '90 Detik', val: 90 },
                ].map((item) => (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => onUpdateSettings({ durationSeconds: item.val })}
                    className={`py-2 px-1 text-center rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      settings.durationSeconds === item.val
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : 'bg-slate-800/90 text-slate-300 border-slate-700 hover:bg-slate-750'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sensitivitas Tendangan */}
            <div className="mb-4">
              <label className="text-xs font-bold text-slate-300 block mb-2">
                Sensitivitas Deteksi Tendangan Kaki:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ kickSensitivity: 'normal' })}
                  className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                    settings.kickSensitivity === 'normal'
                      ? 'bg-sky-500/20 text-sky-200 border-sky-400'
                      : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="block font-extrabold text-white">Normal (Presisi)</span>
                  <span className="text-[11px] opacity-80">
                    Kaki harus tepat menyentuh bola virtual
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ kickSensitivity: 'high' })}
                  className={`p-3 rounded-xl text-xs font-bold border text-left transition-all cursor-pointer ${
                    settings.kickSensitivity === 'high'
                      ? 'bg-emerald-500/20 text-emerald-200 border-emerald-400'
                      : 'bg-slate-800/70 text-slate-400 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  <span className="block font-extrabold text-white">
                    Tinggi (Disarankan untuk Anak SD)
                  </span>
                  <span className="text-[11px] opacity-80">
                    Area tabrakan bola lebih lebar & responsif
                  </span>
                </button>
              </div>
            </div>

            {/* Pilihan Karakter Kiper 3D */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 block">
                  Pilih Karakter Kiper 3D:
                </label>
                <span className="text-[10px] text-amber-400 font-bold">
                  {settings.goalkeeperCharacter === 'lion'
                    ? '🦁 Singa Juara 3D Aktif'
                    : settings.goalkeeperCharacter === 'cyber'
                    ? '🤖 Cyber Bot 3D Aktif'
                    : '⚡ Hero Champion 3D Aktif'}
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {[
                  {
                    id: 'lion' as const,
                    name: 'Singa Juara 3D',
                    desc: 'Mascot singa emas & sarung tangan neon',
                    badge: '🦁 Singa Emas',
                    theme: 'border-amber-500/60 bg-amber-950/30 text-amber-300 shadow-amber-500/10',
                  },
                  {
                    id: 'champion' as const,
                    name: 'Hero Champion 3D',
                    desc: 'Kiper anak berbakat jersey hijau neon',
                    badge: '⚡ Hero Juara',
                    theme: 'border-emerald-500/60 bg-emerald-950/30 text-emerald-300 shadow-emerald-500/10',
                  },
                  {
                    id: 'cyber' as const,
                    name: 'Cyber Bot 3D',
                    desc: 'Robot kiper canggih sarung tangan sensor',
                    badge: '🤖 Robo Siber',
                    theme: 'border-sky-500/60 bg-sky-950/30 text-sky-300 shadow-sky-500/10',
                  },
                ].map((char) => {
                  const isSelected = settings.goalkeeperCharacter === char.id;
                  return (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => onUpdateSettings({ goalkeeperCharacter: char.id })}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? `${char.theme} border-2 shadow-lg`
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-black font-['Outfit'] text-white">
                          {char.badge}
                        </span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase bg-white/20 text-white">
                            Aktif
                          </span>
                        )}
                      </div>
                      <span className="text-xs font-bold text-white block mb-0.5">
                        {char.name}
                      </span>
                      <span className="text-[10px] opacity-75 leading-tight">
                        {char.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Suara Audio */}
            <div>
              <button
                type="button"
                onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
                className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-colors cursor-pointer ${
                  settings.soundEnabled
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200'
                    : 'bg-slate-800/70 border-slate-700 text-slate-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Volume2 className="w-4 h-4 text-emerald-400" />
                  <div>
                    <span className="text-xs font-bold block text-white">Efek Suara Audio</span>
                    <span className="text-[11px] opacity-75">Kick, Peluit, & Sorak</span>
                  </div>
                </div>
                <span className="text-xs font-black font-mono">
                  {settings.soundEnabled ? 'ON' : 'OFF'}
                </span>
              </button>
            </div>
          </section>

          {/* SECTION 4: IMPOR & UNDUH TEMPLATE SOAL */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                  4. Impor & Unduh Template Soal ({activeQuestionsCount} Soal Aktif)
                </h4>
              </div>
              <button
                type="button"
                onClick={handleResetQuestions}
                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 underline cursor-pointer"
              >
                Reset ke 5 Soal Bawaan
              </button>
            </div>

            <p className="text-xs text-slate-400 mb-3 leading-relaxed">
              Bapak/Ibu Guru dapat mengunduh template spreadsheet Excel (CSV) atau JSON, lalu mengunggah soal kuis buatan sendiri untuk dimainkan siswa di kelas.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3.5">
              <button
                type="button"
                onClick={handleDownloadCsvTemplate}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>Unduh Template CSV (Excel)</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadJsonTemplate}
                className="inline-flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-amber-300 border border-amber-500/30 text-xs font-bold transition-colors cursor-pointer"
              >
                <FileCode className="w-4 h-4 text-amber-400" />
                <span>Unduh Template JSON</span>
              </button>
            </div>

            {/* Upload Area */}
            <div className="border border-dashed border-sky-500/40 rounded-xl p-4 text-center bg-slate-900/60">
              <Upload className="w-6 h-6 text-sky-400 mx-auto mb-1.5" />
              <p className="text-xs font-bold text-white mb-0.5">
                Unggah File Soal (.csv atau .json)
              </p>
              <p className="text-[11px] text-slate-400 mb-3">
                Format Kolom: Soal, Opsi A, Opsi B, Kunci Jawaban (A/B)
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.json"
                onChange={handleFileUpload}
                className="hidden"
                id="unified-soal-upload"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-colors cursor-pointer shadow-md shadow-sky-500/20"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Pilih File dari Komputer</span>
              </button>
            </div>
          </section>

          {/* SECTION 5: DAFTAR 5 SOAL BAWAAN STANDAR */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                5. Daftar 5 Soal Bawaan Standar
              </h4>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              5 soal pengetahuan umum bawaan yang siap dimainkan langsung oleh pemain:
            </p>

            <div className="space-y-2">
              {QUESTION_BANK.map((item, idx) => (
                <div
                  key={item.id}
                  className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs flex flex-col gap-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sky-300">
                      Soal #{idx + 1}
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      Kunci: Opsi {item.correctOption}
                    </span>
                  </div>
                  <p className="font-bold text-white text-xs">{item.question}</p>
                  <div className="grid grid-cols-2 gap-2 mt-1 text-[11px]">
                    <div
                      className={`p-1.5 rounded-lg border ${
                        item.correctOption === 'A'
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-semibold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      ⚽ A: {item.optionA} {item.correctOption === 'A' ? '✓' : ''}
                    </div>
                    <div
                      className={`p-1.5 rounded-lg border ${
                        item.correctOption === 'B'
                          ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200 font-semibold'
                          : 'border-slate-800 bg-slate-950/40 text-slate-400'
                      }`}
                    >
                      ⚽ B: {item.optionB} {item.correctOption === 'B' ? '✓' : ''}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* SECTION 6: RIWAYAT REKOR SKOR */}
          <section className="bg-slate-950/70 border border-slate-800/80 rounded-2xl p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                6. Riwayat Rekor Skor
              </h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Rekor Mode 1 Pemain
                </span>
                <span className="text-2xl font-black text-amber-300 font-['Outfit'] tabular-nums">
                  {highScore1P} Poin
                </span>
              </div>

              <div className="bg-slate-900/90 border border-sky-500/30 rounded-xl p-3 text-center">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
                  Rekor Mode 2 Pemain (Duel)
                </span>
                <div className="flex items-center justify-center gap-3">
                  <div>
                    <span className="text-[9px] text-sky-400 block font-bold">P1 (Kiri)</span>
                    <span className="text-xl font-black text-white font-['Outfit'] tabular-nums">
                      {highScore2P.p1}
                    </span>
                  </div>
                  <span className="text-slate-600 font-bold">VS</span>
                  <div>
                    <span className="text-[9px] text-orange-400 block font-bold">P2 (Kanan)</span>
                    <span className="text-xl font-black text-white font-['Outfit'] tabular-nums">
                      {highScore2P.p2}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-slate-400">
                Mulai ulang catatan skor tertinggi ke nilai nol
              </span>
              <button
                type="button"
                onClick={() => {
                  if (confirm('Yakin ingin mereset semua rekor skor?')) {
                    onResetScores();
                  }
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 text-xs font-bold transition-colors cursor-pointer"
              >
                Reset Rekor Skor
              </button>
            </div>
          </section>

          {/* SECTION 7: UNDUH SELURUH KODE (1 FILE HTML STANDALONE) */}
          <section className="bg-slate-950/70 border border-emerald-500/40 rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <FileCode className="w-4 h-4 text-emerald-400" />
                <h4 className="text-sm font-extrabold text-white font-['Outfit'] uppercase tracking-wider">
                  7. Unduh Seluruh Kode (1 File HTML)
                </h4>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 text-[10px] font-black uppercase flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                Password Admin
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed mb-3.5">
              Unduh seluruh aplikasi, grafis 3D (bola & kiper), sistem fisika kinestetik, audio efek suara Web Audio API, kuis, dan sensor AI MediaPipe Pose tracking ke dalam <strong>1 file HTML mandiri</strong> (.html). Tampilan dan animasinya <strong>sama persis</strong> dan dapat langsung dijalankan secara offline di komputer/laptop manapun tanpa server.
            </p>

            {/* Password Verification & Download Form */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3.5 space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 flex items-center justify-between mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                    Password Akses Unduh Kode:
                  </span>
                  <span className="text-[10px] text-slate-400">Verifikasi pengembang</span>
                </label>

                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={downloadPassword}
                      onChange={(e) => {
                        setDownloadPassword(e.target.value);
                        if (downloadStatus.type) setDownloadStatus({ type: null, message: '' });
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleDownloadSingleFile();
                      }}
                      placeholder="Masukkan password admin..."
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 pr-10 font-mono tracking-wide"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors p-1 cursor-pointer"
                      title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleDownloadSingleFile}
                    disabled={isDownloading}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:opacity-50 text-slate-950 font-black font-['Outfit'] text-xs flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95 cursor-pointer shrink-0"
                  >
                    {isDownloading ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                        <span>Menyiapkan File...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        <span>Verifikasi & Unduh 1 File HTML</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Banner */}
              {downloadStatus.type && (
                <div
                  className={`p-2.5 rounded-xl border flex items-center gap-2 text-xs ${
                    downloadStatus.type === 'success'
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
                      : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
                  }`}
                >
                  {downloadStatus.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span className="font-semibold">{downloadStatus.message}</span>
                </div>
              )}

              {/* Quality & Fidelity Assurance Checklist */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Grafis 3D Bola & Kiper sama persis</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Animasi tendangan & selebrasi gol identik</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Audio Synthesizer & Efek Suara lengkap</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>Sensor kinestetik AI MediaPipe Pose terintegrasi</span>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer with Developer Credits & Close Button */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/90 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <div className="text-center sm:text-left">
            <div className="text-xs font-bold text-white flex items-center justify-center sm:justify-start gap-1.5">
              <span>Pengembang:</span>
              <span className="text-amber-400 font-extrabold">M. Nur Ali Abidin, S.Pd.</span>
            </div>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-1 text-[11px]">
              <a
                href="https://instagram.com/aliabidin988"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-pink-400 hover:text-pink-300 font-medium transition-colors"
              >
                <span>Ig :</span>
                <span className="underline">@aliabidin988</span>
              </a>
              <span className="text-slate-600">•</span>
              <a
                href="https://tiktok.com/@aliabidin98"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
              >
                <span>TikTok:</span>
                <span className="underline">@aliabidin98</span>
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-black font-['Outfit'] text-xs transition-colors cursor-pointer shadow-md shadow-sky-500/20"
          >
            Tutup & Simpan
          </button>
        </div>
      </div>
    </div>
  );
};
