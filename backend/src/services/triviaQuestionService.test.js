import test from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizeOpenTriviaQuestion,
  buildRoomQuestionPayload,
  selectRandomQuestions,
  shuffleAnswerOptions,
  getQuestionCountForDuration,
  getOrCreateRoomQuestionSet,
  upsertTriviaQuestions,
  getRandomGameQuestions
} from './triviaQuestionService.js';

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

test('selectRandomQuestions shuffles the pool while keeping all choices unique', () => {
  const originalRandom = Math.random;
  const sequence = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3, 0.6, 0.4, 0.5, 0.0, 0.95, 0.05];
  let callCount = 0;

  Math.random = () => {
    const nextValue = sequence[callCount % sequence.length];
    callCount += 1;
    return nextValue;
  };

  try {
    const pool = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }));
    const selected = selectRandomQuestions(pool, 5);

    assert.equal(selected.length, 5);
    assert.deepStrictEqual(new Set(selected.map((item) => item.id)).size, 5);
    assert.notDeepStrictEqual(selected.map((item) => item.id), [1, 2, 3, 4, 5]);
  } finally {
    Math.random = originalRandom;
  }
});

test('shuffleAnswerOptions reorders answers without changing the set of choices', () => {
  const originalRandom = Math.random;
  const sequence = [0.9, 0.1, 0.8, 0.2, 0.7, 0.3];
  let callCount = 0;

  Math.random = () => {
    const value = sequence[callCount % sequence.length];
    callCount += 1;
    return value;
  };

  try {
    const answers = ['A', 'B', 'C', 'D'];
    const shuffled = shuffleAnswerOptions(answers);

    assert.equal(shuffled.length, 4);
    assert.deepStrictEqual(new Set(shuffled).size, 4);
    assert.notDeepStrictEqual(shuffled, ['A', 'B', 'C', 'D']);
  } finally {
    Math.random = originalRandom;
  }
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

test('getQuestionCountForDuration scales by 15-second increments after a 2 minute base', () => {
  assert.equal(getQuestionCountForDuration(120), 30);
  assert.equal(getQuestionCountForDuration(135), 40);
  assert.equal(getQuestionCountForDuration(150), 50);
  assert.equal(getQuestionCountForDuration(240), 110);
});

test('getOrCreateRoomQuestionSet reuses existing room questions instead of duplicating indexes', async () => {
  const createCalls = [];
  const roomId = 'room-123';
  const existingQuestions = Array.from({ length: 30 }, (_, index) => ({
    room_id: roomId,
    question_id: 100 + index,
    question_index: index,
    question_text: `Existing question ${index + 1}`,
    category: 'History',
    difficulty: 'easy',
    answers: ['A', 'B', 'C', 'D']
  }));

  const prisma = {
    room: {
      findUnique: async () => ({ room_id: roomId, game_name: 'trivia', duration_seconds: 120 })
    },
    roomQuestion: {
      findMany: async () => existingQuestions,
      create: async (data) => {
        createCalls.push(data);
        return data;
      }
    },
    gameQuestion: {
      findMany: async () => []
    }
  };

  const payload = await getOrCreateRoomQuestionSet(prisma, roomId);

  assert.equal(payload.length, 30);
  assert.equal(payload[0].question, 'Existing question 1');
  assert.equal(payload[29].question, 'Existing question 30');
  assert.deepStrictEqual(createCalls, []);
});

test('getOrCreateRoomQuestionSet creates new room questions using createMany when available', async () => {
  const createManyCalls = [];
  const roomId = 'room-createmany-123';
  const gameQuestionPool = Array.from({ length: 35 }, (_, index) => ({
    id: index + 1,
    question: `Game Question ${index + 1}`,
    category: 'General',
    difficulty: 'medium',
    correct_answer: 'Correct',
    answers: ['Correct', 'Wrong 1', 'Wrong 2', 'Wrong 3']
  }));

  const prisma = {
    room: {
      findUnique: async () => ({ room_id: roomId, game_name: 'trivia', duration_seconds: 120 })
    },
    roomQuestion: {
      findMany: async () => [],
      createMany: async ({ data }) => {
        createManyCalls.push(...data);
        return { count: data.length };
      }
    },
    gameQuestion: {
      findMany: async () => gameQuestionPool
    }
  };

  const payload = await getOrCreateRoomQuestionSet(prisma, roomId);

  assert.equal(payload.length, 30);
  assert.equal(createManyCalls.length, 30);
  assert.equal(createManyCalls[0].room_id, roomId);
});

test('upsertTriviaQuestions uses bulk querying and createMany when available', async () => {
  const createManyCalls = [];
  const questions = [
    {
      category: 'Geography',
      difficulty: 'easy',
      question: 'What is the capital of France?',
      correct_answer: 'Paris',
      incorrect_answers: ['London', 'Berlin', 'Madrid']
    },
    {
      category: 'Science',
      difficulty: 'easy',
      question: 'What is H2O commonly known as?',
      correct_answer: 'Water',
      incorrect_answers: ['Salt', 'Sugar', 'Air']
    }
  ];

  const prisma = {
    gameQuestion: {
      findMany: async () => [],
      createMany: async ({ data }) => {
        createManyCalls.push(...data);
        return { count: data.length };
      }
    }
  };

  const result = await upsertTriviaQuestions(prisma, questions);

  assert.equal(result.length, 2);
  assert.equal(createManyCalls.length, 2);
  assert.equal(createManyCalls[0].question, 'What is the capital of France?');
});


