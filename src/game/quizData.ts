/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { QuizQuestion } from '../types/game';

// 5 Soal Bawaan Edukatif Pilihan
export const QUESTION_BANK: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'Planet terbesar di tata surya kita adalah...',
    optionA: 'Jupiter',
    optionB: 'Mars',
    correctOption: 'A',
  },
  {
    id: 'q2',
    question: 'Berapakah hasil perkalian dari 7 x 8 ?',
    optionA: '54',
    optionB: '56',
    correctOption: 'B',
  },
  {
    id: 'q3',
    question: 'Ibu kota negara Indonesia yang baru (IKN) bernama...',
    optionA: 'Nusantara',
    optionB: 'Surabaya',
    correctOption: 'A',
  },
  {
    id: 'q4',
    question: 'Mamalia terbesar yang hidup di bumi adalah...',
    optionA: 'Gajah Afrika',
    optionB: 'Paus Biru',
    correctOption: 'B',
  },
  {
    id: 'q5',
    question: 'Proses tumbuhan hijau memasak makanan dengan bantuan sinar matahari disebut...',
    optionA: 'Fotosintesis',
    optionB: 'Metamorfosis',
    correctOption: 'A',
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
