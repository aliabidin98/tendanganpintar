/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Trash2,
  Shuffle,
  Users,
  CheckCircle2,
  Volume2,
  VolumeX,
  History,
  ListPlus,
  UserCheck,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { soundEngine } from '../game/audio';

const STORAGE_NAMES_KEY = 'ar_tendangan_pintar_random_names';
const STORAGE_HISTORY_KEY = 'ar_tendangan_pintar_random_history';

const DEFAULT_NAMES = [
  'Kelompok 1',
  'Kelompok 2',
  'Kelompok 3',
  'Kelompok 4',
  'Kelompok 5',
  'Kelompok 6',
];

const PRESET_STUDENTS = [
  'Ahmad Fauzi',
  'Budi Santoso',
  'Citra Lestari',
  'Dewi Rahmawati',
  'Eko Prasetyo',
  'Fajar Pratama',
  'Gita Puspita',
  'Hadi Saputra',
  'Indah Permata',
  'Joko Nugroho',
];

const PRESET_GROUPS = [
  'Kelompok Harimau',
  'Kelompok Garuda',
  'Kelompok Rajawali',
  'Kelompok Elang',
  'Kelompok Singa',
  'Kelompok Lumba-lumba',
];

const SLICE_COLORS = [
  '#0284C7', // Sky Blue
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
  '#E11D48', // Rose
  '#6366F1', // Indigo
  '#84CC16', // Lime
  '#D946EF', // Fuchsia
];

interface RandomNamePickerModalProps {
  onClose: () => void;
  onSelectPlayerForGame?: (name: string) => void;
}

export const RandomNamePickerModal: React.FC<RandomNamePickerModalProps> = ({
  onClose,
  onSelectPlayerForGame,
}) => {
  // Load saved names or fallback
  const [namesText, setNamesText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_NAMES_KEY);
      if (saved) return saved;
    } catch {
      // Safe ignore
    }
    return DEFAULT_NAMES.join('\n');
  });

  // History of picked names in current session
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_HISTORY_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // Safe ignore
    }
    return [];
  });

  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [soundOn, setSoundOn] = useState<boolean>(() => soundEngine.enabled);
  const [activeTab, setActiveTab] = useState<'input' | 'history'>('input');

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wheelAngleRef = useRef<number>(0);
  const animFrameRef = useRef<number | null>(null);
  const lastTickSliceRef = useRef<number>(-1);

  // Parse active names from textarea
  const activeNames = namesText
    .split('\n')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  // Save to localStorage whenever names change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_NAMES_KEY, namesText);
    } catch {
      // Safe ignore
    }
  }, [namesText]);

  // Save history
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Safe ignore
    }
  }, [history]);

  // Sync sound engine
  useEffect(() => {
    soundEngine.enabled = soundOn;
  }, [soundOn]);

  // Draw wheel on canvas
  const drawWheel = useCallback((currentAngle: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const cx = size / 2;
    const cy = size / 2;
    const radius = cx - 18; // Leave margin for pegs and pointer

    ctx.clearRect(0, 0, size, size);

    const total = activeNames.length;
    if (total === 0) {
      // Empty state wheel placeholder
      ctx.save();
      ctx.fillStyle = '#1E293B';
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#475569';
      ctx.lineWidth = 4;
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '700 14px Outfit, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Masukkan minimal 1 nama', cx, cy);
      ctx.restore();
      return;
    }

    const arc = (Math.PI * 2) / total;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(currentAngle);

    // 1. Draw Wheel Slices
    for (let i = 0; i < total; i++) {
      const start = i * arc;
      const end = start + arc;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, start, end);
      ctx.closePath();

      // Radial slice shading for 3D depth
      const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(0.85, color);
      grad.addColorStop(1, '#0F172A');
      ctx.fillStyle = grad;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Draw Name Text along radial center of slice
      ctx.save();
      const midAngle = start + arc / 2;
      ctx.rotate(midAngle);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 4;

      // Dynamic font size based on slice count
      let fontPx = 14;
      if (total > 20) fontPx = 10;
      else if (total > 14) fontPx = 11;
      else if (total > 8) fontPx = 12;
      else fontPx = 14;

      ctx.font = `800 ${fontPx}px Outfit, sans-serif`;

      // Truncate text if too long
      let text = activeNames[i];
      const maxChars = total > 16 ? 12 : 18;
      if (text.length > maxChars) {
        text = text.substring(0, maxChars - 2) + '..';
      }

      ctx.fillText(text, radius - 24, 0);
      ctx.restore();
    }

    // 2. Metallic Outer Rim with Pegs
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, radius - 3, 0, Math.PI * 2);
    ctx.strokeStyle = '#CA8A04';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Golden boundary pegs
    for (let i = 0; i < total; i++) {
      const pegAngle = i * arc;
      const px = Math.cos(pegAngle) * (radius - 2);
      const py = Math.sin(pegAngle) * (radius - 2);

      ctx.fillStyle = '#FEF08A';
      ctx.beginPath();
      ctx.arc(px, py, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#78350F';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    ctx.restore();

    // 3. Center Hub Button (Putar / Spin)
    ctx.save();
    ctx.translate(cx, cy);

    // Drop shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 12;

    const hubR = Math.max(34, radius * 0.22);
    const hubGrad = ctx.createRadialGradient(-5, -5, 2, 0, 0, hubR);
    hubGrad.addColorStop(0, '#FFFFFF');
    hubGrad.addColorStop(0.35, '#F8FAFC');
    hubGrad.addColorStop(0.7, '#CBD5E1');
    hubGrad.addColorStop(1, '#475569');

    ctx.fillStyle = hubGrad;
    ctx.beginPath();
    ctx.arc(0, 0, hubR, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 3.5;
    ctx.stroke();

    // Center icon & text
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0F172A';
    ctx.font = '900 13px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚽', 0, -6);
    ctx.fillText('PUTAR', 0, 9);
    ctx.restore();

    // 4. Pointer at TOP (12 o'clock pointing down)
    ctx.save();
    ctx.translate(cx, cy - radius - 2);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;

    // Pointer pin / arrow
    ctx.fillStyle = '#EF4444';
    ctx.beginPath();
    ctx.moveTo(0, 24); // tip pointing down into wheel
    ctx.lineTo(-14, -6);
    ctx.lineTo(14, -6);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    // Pointer pivot bulb
    ctx.fillStyle = '#FACC15';
    ctx.beginPath();
    ctx.arc(0, -6, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  }, [activeNames]);

  // Initial render of wheel
  useEffect(() => {
    drawWheel(wheelAngleRef.current);
  }, [drawWheel]);

  // Execute Spin
  const spinWheel = () => {
    if (isSpinning) return;
    if (activeNames.length === 0) {
      alert('Silakan masukkan nama siswa atau kelompok terlebih dahulu.');
      return;
    }
    if (activeNames.length === 1) {
      // Only 1 name, auto win
      onPickWinner(activeNames[0]);
      return;
    }

    setIsSpinning(true);
    setWinner(null);

    const total = activeNames.length;
    const arc = (Math.PI * 2) / total;

    // Pick random winning index
    const winnerIndex = Math.floor(Math.random() * total);

    // Pointer is at Top (12 o'clock = 3*PI/2 or -PI/2)
    // Slice i spans from [i*arc, (i+1)*arc]
    // Middle of winning slice i is: midAngle = (winnerIndex + 0.5) * arc
    // When wheel rotates by totalAngle, the angle under pointer (which is -PI/2 in standard trig)
    // satisfies: (-PI/2 - totalAngle) % (2*PI) === midAngle
    // So targetAngle = -PI/2 - midAngle + (jitter) + (extra full rotations)
    const pointerAngle = -Math.PI / 2;
    const jitter = (Math.random() - 0.5) * (arc * 0.65); // natural random landing within slice
    const sliceCenter = winnerIndex * arc + arc / 2;

    // Full rotations: 5 to 7 full turns for exhilarating spin
    const fullSpins = (5 + Math.floor(Math.random() * 3)) * (Math.PI * 2);

    const startAngle = wheelAngleRef.current % (Math.PI * 2);
    // Calculate final destination angle so it lands exactly on the chosen winnerIndex
    let targetOffset = (pointerAngle - sliceCenter + jitter) - startAngle;
    while (targetOffset < 0) {
      targetOffset += Math.PI * 2;
    }
    const finalAngle = startAngle + fullSpins + targetOffset;

    const duration = 4500; // ms
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth custom quintic ease-out: 1 - (1 - t)^4.5
      const ease = 1 - Math.pow(1 - progress, 4.5);
      const currentAngle = startAngle + (finalAngle - startAngle) * ease;
      wheelAngleRef.current = currentAngle;

      // Audio click when passing each slice
      const normalizedAngle = (-Math.PI / 2 - currentAngle) % (Math.PI * 2);
      const positiveAngle = normalizedAngle < 0 ? normalizedAngle + Math.PI * 2 : normalizedAngle;
      const currentSlice = Math.floor(positiveAngle / arc);

      if (currentSlice !== lastTickSliceRef.current) {
        lastTickSliceRef.current = currentSlice;
        soundEngine.playWheelClick();
      }

      drawWheel(currentAngle);

      if (progress < 1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsSpinning(false);
        const chosen = activeNames[winnerIndex];
        onPickWinner(chosen);
      }
    };

    animFrameRef.current = requestAnimationFrame(animate);
  };

  // When winner is chosen
  const onPickWinner = (chosenName: string) => {
    setWinner(chosenName);
    soundEngine.playFanfare();

    // Confetti celebration burst
    confetti({
      particleCount: 80,
      spread: 90,
      origin: { y: 0.55 },
    });
  };

  // Remove winner and continue
  const handleRemoveWinner = () => {
    if (!winner) return;
    const updated = activeNames.filter((n) => n !== winner);
    setNamesText(updated.join('\n'));
    setHistory((prev) => [winner, ...prev.filter((h) => h !== winner)]);
    setWinner(null);
  };

  // Keep winner and continue
  const handleKeepWinner = () => {
    if (!winner) return;
    setHistory((prev) => [winner, ...prev.filter((h) => h !== winner)]);
    setWinner(null);
  };

  // Presets
  const handleLoadStudents = () => {
    if (confirm('Ganti daftar dengan contoh 10 nama siswa?')) {
      setNamesText(PRESET_STUDENTS.join('\n'));
    }
  };

  const handleLoadGroups = () => {
    if (confirm('Ganti daftar dengan contoh 6 kelompok?')) {
      setNamesText(PRESET_GROUPS.join('\n'));
    }
  };

  const handleShuffle = () => {
    const list = [...activeNames];
    for (let i = list.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [list[i], list[j]] = [list[j], list[i]];
    }
    setNamesText(list.join('\n'));
  };

  const handleClear = () => {
    if (confirm('Kosongkan semua daftar nama?')) {
      setNamesText('');
    }
  };

  const handleRestoreHistory = () => {
    if (history.length === 0) return;
    const merged = Array.from(new Set([...activeNames, ...history]));
    setNamesText(merged.join('\n'));
    setHistory([]);
  };

  // Clean up animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in select-none">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-950/70 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-500 text-slate-950 flex items-center justify-center text-lg font-black shadow-md shadow-amber-500/20">
              🎡
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white font-['Outfit'] leading-none">
                Pilih Nama Acak (Roda Putar)
              </h3>
              <p className="text-[11px] text-sky-400 font-medium mt-0.5">
                Undi giliran siswa atau kelompok untuk bermain kuis tendangan secara adil
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Toggle */}
            <button
              type="button"
              onClick={() => setSoundOn(!soundOn)}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title={soundOn ? 'Matikan Suara Roda' : 'Nyalakan Suara Roda'}
            >
              {soundOn ? (
                <Volume2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-rose-400" />
              )}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Tutup Menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Left Wheel, Right Inputs */}
        <div className="p-4 sm:p-6 overflow-y-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: SPINNING WHEEL CANVAS & CONTROLS (MD: 7 COLS) */}
          <div className="md:col-span-7 flex flex-col items-center justify-center bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 sm:p-6 shadow-inner relative">
            {/* Wheel Canvas Container */}
            <div
              className={`relative cursor-pointer transition-transform ${
                isSpinning ? '' : 'hover:scale-[1.01]'
              }`}
              onClick={() => {
                if (!isSpinning) spinWheel();
              }}
              title="Klik pada roda untuk memutar!"
            >
              <canvas
                ref={canvasRef}
                width={360}
                height={360}
                className="max-w-full w-[300px] h-[300px] sm:w-[350px] sm:h-[350px] drop-shadow-2xl"
              />
            </div>

            {/* Spin CTA Button */}
            <div className="mt-4 w-full flex flex-col sm:flex-row items-center gap-2.5">
              <button
                type="button"
                onClick={spinWheel}
                disabled={isSpinning || activeNames.length === 0}
                className="w-full flex-1 py-3 px-6 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-['Outfit'] font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 active:scale-95 transition-all cursor-pointer"
              >
                {isSpinning ? (
                  <>
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                    <span>Roda Sedang Berputar...</span>
                  </>
                ) : (
                  <>
                    <span>🎡 PUTAR SEKARANG</span>
                    <span className="text-xs bg-slate-950/20 px-2 py-0.5 rounded-full font-mono">
                      {activeNames.length} Nama
                    </span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShuffle}
                disabled={isSpinning || activeNames.length < 2}
                className="py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 disabled:opacity-40"
                title="Acak urutan warna pada roda"
              >
                <Shuffle className="w-4 h-4 text-sky-400" />
                <span className="hidden sm:inline">Acak Urutan</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 mt-2 text-center">
              💡 Tip: Anda bisa klik tombol di atas atau langsung klik pada lingkaran roda untuk memutar.
            </p>
          </div>

          {/* RIGHT COLUMN: LIST INPUT & HISTORY TABS (MD: 5 COLS) */}
          <div className="md:col-span-5 flex flex-col gap-3">
            {/* Tabs */}
            <div className="flex rounded-xl bg-slate-950/70 p-1 border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('input')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'input'
                    ? 'bg-sky-500 text-slate-950 shadow-sm shadow-sky-500/20 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>Daftar Nama ({activeNames.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('history')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  activeTab === 'history'
                    ? 'bg-amber-500 text-slate-950 shadow-sm shadow-amber-500/20 font-black'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <History className="w-3.5 h-3.5" />
                <span>Terpilih ({history.length})</span>
              </button>
            </div>

            {/* TAB CONTENT 1: INPUT NAMES (SATU NAMA PER BARIS) */}
            {activeTab === 'input' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-300">
                    Ketik / Tempel Nama (1 nama per baris):
                  </label>
                  <span className="text-[10px] font-mono text-sky-400 font-bold">
                    {activeNames.length} nama aktif
                  </span>
                </div>

                {/* Multi-line Textarea */}
                <textarea
                  value={namesText}
                  onChange={(e) => setNamesText(e.target.value)}
                  disabled={isSpinning}
                  placeholder={`Contoh:\nAhmad\nBudi\nCitra\nDewi`}
                  rows={9}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400 focus:ring-1 focus:ring-sky-400 font-mono leading-relaxed resize-none"
                />

                {/* Quick Presets and Actions */}
                <div className="space-y-1.5">
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
                    Muat Contoh Cepat:
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={handleLoadStudents}
                      disabled={isSpinning}
                      className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-sky-300 text-[11px] font-bold border border-sky-500/20 text-center transition-colors cursor-pointer"
                    >
                      👨‍🎓 10 Nama Siswa
                    </button>
                    <button
                      type="button"
                      onClick={handleLoadGroups}
                      disabled={isSpinning}
                      className="py-1.5 px-2 rounded-lg bg-slate-800/80 hover:bg-slate-750 text-amber-300 text-[11px] font-bold border border-amber-500/20 text-center transition-colors cursor-pointer"
                    >
                      👥 6 Kelompok
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={handleClear}
                    disabled={isSpinning || activeNames.length === 0}
                    className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer disabled:opacity-40"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Kosongkan Daftar</span>
                  </button>

                  <span className="text-[10px] text-slate-500">Tersimpan otomatis</span>
                </div>
              </div>
            )}

            {/* TAB CONTENT 2: HISTORY (NAMA YANG SUDAH KELUAR) */}
            {activeTab === 'history' && (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex flex-col gap-3 min-h-[300px]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300">
                    Riwayat Nama Terpilih:
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 font-bold">
                    {history.length} nama
                  </span>
                </div>

                {history.length === 0 ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500">
                    <Trophy className="w-8 h-8 opacity-40 mb-1.5 text-slate-400" />
                    <p className="text-xs">Belum ada nama yang terpilih.</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Putar roda untuk mengundi nama pertama!
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                      {history.map((name, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-mono font-bold">
                              {idx + 1}
                            </span>
                            <span className="font-bold text-white">{name}</span>
                          </div>
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleRestoreHistory}
                        className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Kembalikan Semua ke Roda</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          if (confirm('Hapus riwayat nama terpilih?')) setHistory([]);
                        }}
                        className="text-[11px] text-rose-400 hover:text-rose-300 cursor-pointer"
                      >
                        Hapus Riwayat
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* WINNER POPUP OVERLAY */}
        {winner && (
          <div className="absolute inset-0 z-20 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
            <div className="w-full max-w-md bg-gradient-to-b from-slate-900 to-slate-950 border-2 border-amber-400/90 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />

              {/* Trophy Header */}
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-300 text-slate-950 mb-3 shadow-lg shadow-amber-500/30">
                <Trophy className="w-8 h-8" />
              </div>

              <span className="text-[11px] font-black uppercase text-amber-400 tracking-widest block mb-1">
                🎉 NAMA TERPILIH 🎉
              </span>

              {/* Chosen Name Highlight */}
              <div className="my-3 py-3 px-4 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-inner">
                <h4 className="text-2xl sm:text-3xl font-black text-white font-['Outfit'] break-words">
                  {winner}
                </h4>
              </div>

              <p className="text-xs text-slate-300 mb-5 leading-relaxed">
                Apakah Anda ingin menghapus nama ini dari roda untuk putaran berikutnya, atau tetap menyimpannya?
              </p>

              {/* Action Buttons */}
              <div className="space-y-2">
                {/* 1. Hapus Nama & Lanjutkan */}
                <button
                  type="button"
                  onClick={handleRemoveWinner}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-orange-500 hover:from-rose-400 hover:to-orange-400 text-white font-black text-xs font-['Outfit'] flex items-center justify-center gap-2 shadow-md shadow-rose-500/20 active:scale-95 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Nama Ini & Lanjutkan Undi</span>
                </button>

                {/* 2. Biarkan Nama di Daftar */}
                <button
                  type="button"
                  onClick={handleKeepWinner}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tetap Simpan di Daftar & Putar Lagi</span>
                </button>

                {/* 3. Optional: Pilih untuk Main Langsung */}
                {onSelectPlayerForGame && (
                  <button
                    type="button"
                    onClick={() => {
                      onSelectPlayerForGame(winner);
                      handleRemoveWinner();
                      onClose();
                    }}
                    className="w-full py-2 px-4 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Pilih & Mulai Main Tendangan Pintar</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-950/90 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <span className="font-bold text-white">Roda Acak Edukasi</span>
            <span>•</span>
            <span className="text-[11px] text-slate-400">
              Total {activeNames.length} nama dalam roda
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
