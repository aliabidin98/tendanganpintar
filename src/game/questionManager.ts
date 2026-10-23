/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizQuestion } from '../types/game';
import { QUESTION_BANK } from './quizData';

const CUSTOM_QUESTIONS_STORAGE_KEY = 'ar_sports_hero_custom_questions';

/**
 * Get active questions (from custom storage if available, else default bank)
 */
export function getStoredQuestions(): QuizQuestion[] {
  try {
    const saved = localStorage.getItem(CUSTOM_QUESTIONS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored questions:', e);
  }
  return [...QUESTION_BANK];
}

/**
 * Save custom questions list to localStorage
 */
export function saveCustomQuestions(questions: QuizQuestion[]): boolean {
  try {
    localStorage.setItem(CUSTOM_QUESTIONS_STORAGE_KEY, JSON.stringify(questions));
    return true;
  } catch (e) {
    console.error('Error saving custom questions:', e);
    return false;
  }
}

/**
 * Reset to default question bank
 */
export function resetToDefaultQuestions(): QuizQuestion[] {
  try {
    localStorage.removeItem(CUSTOM_QUESTIONS_STORAGE_KEY);
  } catch (e) {
    console.error('Error resetting questions:', e);
  }
  return [...QUESTION_BANK];
}

/**
 * Parse CSV format question string
 */
export function parseQuestionsCSV(csvText: string): { questions: QuizQuestion[]; errors: string[] } {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const questions: QuizQuestion[] = [];
  const errors: string[] = [];

  if (lines.length < 2) {
    errors.push('File CSV kosong atau tidak memiliki baris data.');
    return { questions, errors };
  }

  // Check header
  const header = lines[0].toLowerCase();
  const hasExpectedHeader = header.includes('soal') || header.includes('question');
  const startIndex = hasExpectedHeader ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i].trim();
    if (!rawLine) continue;

    // Simple CSV row parser taking into account quotes
    const cells: string[] = [];
    let insideQuotes = false;
    let currentCell = '';

    for (let charIndex = 0; charIndex < rawLine.length; charIndex++) {
      const char = rawLine[charIndex];
      if (char === '"') {
        insideQuotes = !insideQuotes;
      } else if (char === ',' && !insideQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());

    // Expect at least 4 columns: Soal, Pilihan A, Pilihan B, Jawaban Benar
    if (cells.length < 4) {
      errors.push(`Baris ${i + 1}: Format kolom tidak lengkap (minimal 4 kolom: Soal, Opsi A, Opsi B, Kunci Jawaban).`);
      continue;
    }

    let question = '';
    let optionA = '';
    let optionB = '';
    let correctRaw = '';

    // Check if cell[3] is an answer option (A/B) -> Standard 4-column format: Soal, Pilihan A, Pilihan B, Jawaban Benar
    if (cells.length === 4 || cells[3]?.trim().toUpperCase() === 'A' || cells[3]?.trim().toUpperCase() === 'B') {
      question = cells[0].replace(/^"|"$/g, '');
      optionA = cells[1].replace(/^"|"$/g, '');
      optionB = cells[2].replace(/^"|"$/g, '');
      correctRaw = cells[3].replace(/^"|"$/g, '').trim().toUpperCase();
    } else {
      // Legacy 5/6 column format: [Kategori], Soal, Pilihan A, Pilihan B, Jawaban Benar, [Penjelasan]
      question = cells[1].replace(/^"|"$/g, '');
      optionA = cells[2].replace(/^"|"$/g, '');
      optionB = cells[3].replace(/^"|"$/g, '');
      correctRaw = cells[4]?.replace(/^"|"$/g, '').trim().toUpperCase() || '';
    }

    if (!question || !optionA || !optionB) {
      errors.push(`Baris ${i + 1}: Teks soal atau pilihan jawaban tidak boleh kosong.`);
      continue;
    }

    let correctOption: 'A' | 'B' = 'A';
    if (correctRaw === 'B' || correctRaw === optionB.toUpperCase()) {
      correctOption = 'B';
    } else if (correctRaw === 'A' || correctRaw === optionA.toUpperCase()) {
      correctOption = 'A';
    } else {
      errors.push(`Baris ${i + 1}: Jawaban benar harus bernilai 'A' atau 'B'.`);
      continue;
    }

    questions.push({
      id: `custom_${Date.now()}_${i}`,
      question,
      optionA,
      optionB,
      correctOption,
    });
  }

  return { questions, errors };
}

/**
 * Parse JSON format question string
 */
export function parseQuestionsJSON(jsonText: string): { questions: QuizQuestion[]; errors: string[] } {
  const errors: string[] = [];
  try {
    const parsed = JSON.parse(jsonText);
    const list = Array.isArray(parsed) ? parsed : parsed.questions;

    if (!Array.isArray(list)) {
      return { questions: [], errors: ['JSON harus berupa array soal atau objek dengan key "questions".'] };
    }

    const validQuestions: QuizQuestion[] = [];
    list.forEach((item, index) => {
      const q = item.question || item.soal;
      const optA = item.optionA || item.pilihanA || item.pilihan_a;
      const optB = item.optionB || item.pilihanB || item.pilihan_b;
      const corr = (item.correctOption || item.jawabanBenar || item.jawaban_benar || 'A').toString().toUpperCase();

      if (!q || !optA || !optB) {
        errors.push(`Item ${index + 1}: Soal dan pilihan A/B wajib diisi.`);
        return;
      }

      validQuestions.push({
        id: item.id || `custom_${Date.now()}_${index}`,
        question: q,
        optionA: optA,
        optionB: optB,
        correctOption: corr === 'B' ? 'B' : 'A',
      });
    });

    return { questions: validQuestions, errors };
  } catch (e) {
    return { questions: [], errors: [`Format JSON tidak valid: ${(e as Error).message}`] };
  }
}

/**
 * Generate CSV template string
 */
export function generateTemplateCSV(): string {
  const headers = ['soal', 'pilihan_a', 'pilihan_b', 'jawaban_benar'];
  const sampleRows = [
    [
      'Berapa hasil dari 9 x 8 ?',
      '72',
      '64',
      'A',
    ],
    [
      'Planet terdekat dengan Matahari adalah...',
      'Venus',
      'Merkurius',
      'B',
    ],
    [
      'Ibu kota negara Jepang adalah...',
      'Tokyo',
      'Kyoto',
      'A',
    ],
  ];

  const lines = [headers.join(',')];
  sampleRows.forEach((row) => {
    lines.push(row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','));
  });

  return lines.join('\n');
}

/**
 * Generate JSON template string
 */
export function generateTemplateJSON(): string {
  const sample = [
    {
      question: 'Berapa hasil dari 15 + 27 ?',
      optionA: '42',
      optionB: '40',
      correctOption: 'A',
    },
    {
      question: 'Lawan kata dari "Rajin" adalah...',
      optionA: 'Pintar',
      optionB: 'Malas',
      correctOption: 'B',
    },
    {
      question: 'Zat hijau daun pada tumbuhan disebut...',
      optionA: 'Klorofil',
      optionB: 'Stomata',
      correctOption: 'A',
    },
  ];
  return JSON.stringify(sample, null, 2);
}

/**
 * Trigger file download in browser
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
