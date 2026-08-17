import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeOpenTriviaQuestion, buildRoomQuestionPayload } from './triviaQuestionService.js';

test('normalizeOpenTriviaQuestion converts Open Trivia DB fields into the app contract', () => {
  const raw = {
    category: 'Science: Computers',
    type: 'multiple',
    difficulty: 'easy',
    question: 'What does CPU stand for?',
    correct_answer: 'Central Processing Unit',
    incorrect_answers: ['Central Power Unit', 'Central Program Unit', 'Central Process Utility']
  };

  assert.deepStrictEqual(normalizeOpenTriviaQuestion(raw), {
    category: 'Science: Computers',
    difficulty: 'easy',
    question: 'What does CPU stand for?',
    correctAnswer: 'Central Processing Unit',
    incorrectAnswers: ['Central Power Unit', 'Central Program Unit', 'Central Process Utility'],
    answers: [
      'Central Processing Unit',
      'Central Power Unit',
      'Central Program Unit',
      'Central Process Utility'
    ]
  });
});

test('buildRoomQuestionPayload keeps one question order per room and keeps all answers together', () => {
  const questions = [
    {
      id: 1,
      question: 'Q1',
      correctAnswer: 'A',
      incorrectAnswers: ['B', 'C', 'D'],
      category: 'History',
      difficulty: 'easy'
    },
    {
      id: 2,
      question: 'Q2',
      correctAnswer: 'X',
      incorrectAnswers: ['Y', 'Z', 'W'],
      category: 'History',
      difficulty: 'medium'
    }
  ];

  assert.deepStrictEqual(buildRoomQuestionPayload(questions), [
    {
      id: 1,
      question: 'Q1',
      category: 'History',
      difficulty: 'easy',
      answers: ['A', 'B', 'C', 'D']
    },
    {
      id: 2,
      question: 'Q2',
      category: 'History',
      difficulty: 'medium',
      answers: ['X', 'Y', 'Z', 'W']
    }
  ]);
});
