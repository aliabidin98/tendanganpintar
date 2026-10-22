/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizQuestion } from '../types/game';

// 5 Soal Bawaan Edukatif Pilihan
export const QUESTION_BANK: QuizQuestion[] = [
  {
    id: 'q1',
    category: 'Sains',
    question: 'Planet terbesar di tata surya kita adalah...',
    optionA: 'Jupiter',
    optionB: 'Mars',
    correctOption: 'A',
    explanation: 'Jupiter adalah planet terbesar di tata surya dengan diameter sekitar 142.984 km.',
  },
  {
    id: 'q2',
    category: 'Matematika',
    question: 'Berapakah hasil perkalian dari 7 x 8 ?',
    optionA: '54',
    optionB: '56',
    correctOption: 'B',
    explanation: '7 dikalikan 8 menghasilkan nilai 56.',
  },
  {
    id: 'q3',
    category: 'Pengetahuan Umum',
    question: 'Ibu kota negara Indonesia yang baru (IKN) bernama...',
    optionA: 'Nusantara',
    optionB: 'Surabaya',
    correctOption: 'A',
    explanation: 'Ibu Kota Nusantara (IKN) berlokasi di Kalimantan Timur.',
  },
  {
    id: 'q4',
    category: 'Biologi',
    question: 'Mamalia terbesar yang hidup di bumi adalah...',
    optionA: 'Gajah Afrika',
    optionB: 'Paus Biru',
    correctOption: 'B',
    explanation: 'Paus Biru bisa mencapai panjang 30 meter dan berat hingga 190 ton.',
  },
  {
    id: 'q5',
    category: 'Sains',
    question: 'Proses tumbuhan hijau memasak makanan dengan bantuan sinar matahari disebut...',
    optionA: 'Fotosintesis',
    optionB: 'Metamorfosis',
    correctOption: 'A',
    explanation: 'Fotosintesis menghasilkan glukosa dan oksigen dengan bantuan klorofil dan cahaya matahari.',
  },
];

export function getShuffledQuestions(): QuizQuestion[] {
  const pool = [...QUESTION_BANK];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool;
}
