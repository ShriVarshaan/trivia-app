import { createHash } from 'node:crypto';

const OPEN_TRIVIA_API_URL = 'https://opentdb.com/api.php';
const DEFAULT_GAME_NAME = 'trivia';

function decodeHtmlEntities(value = '') {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&ldquo;/g, '“')
    .replace(/&rdquo;/g, '”')
    .replace(/&lsquo;/g, '‘')
    .replace(/&rsquo;/g, '’')
    .replace(/&hellip;/g, '…')
    .replace(/&nbsp;/g, ' ')
    .replace(/&copy;/g, '©')
    .replace(/&reg;/g, '®');
}

export function normalizeOpenTriviaQuestion(rawQuestion) {
  const correctAnswer = decodeHtmlEntities(rawQuestion.correct_answer ?? rawQuestion.correctAnswer ?? '');
  const incorrectAnswers = (rawQuestion.incorrect_answers ?? rawQuestion.incorrectAnswers ?? []).map((answer) =>
    decodeHtmlEntities(answer)
  );

  const answers = [correctAnswer, ...incorrectAnswers];

  return {
    category: decodeHtmlEntities(rawQuestion.category ?? 'General'),
    difficulty: decodeHtmlEntities(rawQuestion.difficulty ?? 'medium'),
    question: decodeHtmlEntities(rawQuestion.question ?? ''),
    correctAnswer,
    incorrectAnswers,
    answers
  };
}

function getQuestionAnswers(question) {
  if (Array.isArray(question.answers) && question.answers.length > 0) {
    return question.answers;
  }

  const correctAnswer = question.correctAnswer ?? question.correct_answer ?? '';
  const incorrectAnswers = question.incorrectAnswers ?? question.incorrect_answers ?? [];
  return [correctAnswer, ...incorrectAnswers];
}

export function buildRoomQuestionPayload(roomQuestions) {
  return roomQuestions.map((question) => ({
    id: question.id,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty,
    answers: getQuestionAnswers(question)
  }));
}

export function getQuestionCountForDuration(durationSeconds = 120) {
  const normalizedDuration = Number(durationSeconds) || 120;
  const extraWindowSeconds = Math.max(0, normalizedDuration - 120);
  const extraQuestions = Math.floor(extraWindowSeconds / 15) * 10;
  return 30 + extraQuestions;
}

export function selectRandomQuestions(questionPool = [], amount = 10) {
  if (!Array.isArray(questionPool) || questionPool.length === 0) {
    return [];
  }

  const n = questionPool.length;
  const count = Math.min(Math.max(0, amount), n);
  if (count === 0) return [];

  // When count is close to n, a partial clone shuffle is faster
  if (count > n / 2) {
    const pool = [...questionPool];
    for (let i = 0; i < count; i += 1) {
      const swapIndex = i + Math.floor(Math.random() * (n - i));
      [pool[i], pool[swapIndex]] = [pool[swapIndex], pool[i]];
    }
    return pool.slice(0, count);
  }

  const selectedIndices = new Set();
  while (selectedIndices.size < count) {
    selectedIndices.add(Math.floor(Math.random() * n));
  }

  return Array.from(selectedIndices, (idx) => questionPool[idx]);
}

export function shuffleAnswerOptions(options = []) {
  const answers = [...options];

  for (let index = answers.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [answers[index], answers[swapIndex]] = [answers[swapIndex], answers[index]];
  }

  return answers;
}

export function buildSourceHash(question) {
  const serialized = JSON.stringify({
    question: question.question,
    category: question.category,
    difficulty: question.difficulty,
    correctAnswer: question.correctAnswer,
    incorrectAnswers: question.incorrectAnswers
  });

  return createHash('sha256').update(serialized).digest('hex');
}

export async function fetchOpenTriviaQuestions({ amount = 10, category, difficulty, type = 'multiple', retries = 5 } = {}) {
  const params = new URLSearchParams({
    amount: String(amount),
    type
  });

  if (category) {
    params.set('category', String(category));
  }

  if (difficulty) {
    params.set('difficulty', String(difficulty));
  }

  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(`${OPEN_TRIVIA_API_URL}?${params.toString()}`, {
        headers: { Accept: 'application/json' }
      });

      if (response.status === 429 && attempt < retries) {
        const delayMs = 1000 * (attempt + 1) * 2;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        continue;
      }

      if (!response.ok) {
        throw new Error(`Open Trivia API request failed with status ${response.status}`);
      }

      const payload = await response.json();

      if (payload?.response_code !== 0) {
        throw new Error(`Open Trivia API returned a non-zero response code: ${payload?.response_code ?? 'unknown'}`);
      }

      return (payload.results ?? []).map(normalizeOpenTriviaQuestion);
    } catch (error) {
      lastError = error;

      if (attempt >= retries) {
        break;
      }

      const delayMs = 1000 * (attempt + 1) * 2;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error('Open Trivia API request failed');
}

export async function upsertTriviaQuestions(prisma, questions = []) {
  const savedQuestions = [];

  for (const question of questions) {
    const normalized = normalizeOpenTriviaQuestion(question);
    const sourceHash = buildSourceHash(normalized);

    const existingQuestion = await prisma.gameQuestion.findUnique({
      where: { source_hash: sourceHash },
      select: { id: true, category: true, difficulty: true, question: true, correct_answer: true, answers: true }
    });

    if (existingQuestion) {
      savedQuestions.push({
        id: existingQuestion.id,
        question: existingQuestion.question,
        category: existingQuestion.category,
        difficulty: existingQuestion.difficulty,
        correctAnswer: existingQuestion.correct_answer,
        answers: Array.isArray(existingQuestion.answers) ? existingQuestion.answers : []
      });
      continue;
    }

    const createdQuestion = await prisma.gameQuestion.create({
      data: {
        game_name: DEFAULT_GAME_NAME,
        category: normalized.category,
        difficulty: normalized.difficulty,
        question: normalized.question,
        correct_answer: normalized.correctAnswer,
        incorrect_answers: normalized.incorrectAnswers,
        answers: normalized.answers,
        source: 'opentdb',
        source_hash: sourceHash
      },
      select: {
        id: true,
        category: true,
        difficulty: true,
        question: true,
        correct_answer: true,
        answers: true
      }
    });

    savedQuestions.push({
      id: createdQuestion.id,
      question: createdQuestion.question,
      category: createdQuestion.category,
      difficulty: createdQuestion.difficulty,
      correctAnswer: createdQuestion.correct_answer,
      answers: Array.isArray(createdQuestion.answers) ? createdQuestion.answers : []
    });
  }

  return savedQuestions;
}

export async function getOrCreateRoomQuestionSet(prisma, roomId, { amount } = {}) {
  const room = await prisma.room.findUnique({
    where: { room_id: roomId },
    select: { room_id: true, game_name: true, duration_seconds: true }
  });

  if (!room) {
    throw new Error('ROOM_NOT_FOUND');
  }

  const targetAmount = Number.isInteger(amount) && amount > 0
    ? amount
    : getQuestionCountForDuration(room.duration_seconds);

  const existingRoomQuestions = await prisma.roomQuestion.findMany({
    where: { room_id: roomId },
    orderBy: { question_index: 'asc' },
    include: { question: true }
  });

  if (existingRoomQuestions.length >= targetAmount) {
    return buildRoomQuestionPayload(
      existingRoomQuestions.map((item) => ({
        id: item.question_id,
        question: item.question_text,
        category: item.category,
        difficulty: item.difficulty,
        answers: Array.isArray(item.answers) ? item.answers : []
      }))
    );
  }

  let questionPool = await prisma.gameQuestion.findMany({
    where: { game_name: room.game_name ?? DEFAULT_GAME_NAME },
    orderBy: { id: 'asc' },
    select: {
      id: true,
      question: true,
      category: true,
      difficulty: true,
      correct_answer: true,
      answers: true
    }
  });

  if (questionPool.length < targetAmount) {
    try {
      const fetched = await fetchOpenTriviaQuestions({ amount: Math.max(targetAmount, 50) });
      if (Array.isArray(fetched) && fetched.length > 0) {
        await upsertTriviaQuestions(prisma, fetched);
        questionPool = await prisma.gameQuestion.findMany({
          where: { game_name: room.game_name ?? DEFAULT_GAME_NAME },
          orderBy: { id: 'asc' },
          select: {
            id: true,
            question: true,
            category: true,
            difficulty: true,
            correct_answer: true,
            answers: true
          }
        });
      }
    } catch (error) {
      console.warn("Failed to auto-fetch questions from OpenTDB:", error.message);
    }
  }

  if (questionPool.length === 0) {
    throw new Error('NO_QUESTIONS_AVAILABLE');
  }

  const randomQuestions = selectRandomQuestions(questionPool, targetAmount);
  const nextQuestionIndex = existingRoomQuestions.length;
  const roomQuestionRows = [];

  for (const [index, question] of randomQuestions.entries()) {
    const roomIndex = nextQuestionIndex + index;
    const existing = existingRoomQuestions.find((item) => item.question_index === roomIndex);

    if (existing) {
      roomQuestionRows.push({
        id: existing.question_id,
        question: existing.question_text,
        category: existing.category,
        difficulty: existing.difficulty,
        answers: Array.isArray(existing.answers) ? existing.answers : []
      });
      continue;
    }

    roomQuestionRows.push({
      id: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty,
      answers: Array.isArray(question.answers) ? question.answers : [question.correct_answer]
    });

    await prisma.roomQuestion.create({
      data: {
        room_id: roomId,
        question_id: question.id,
        game_name: room.game_name ?? DEFAULT_GAME_NAME,
        question_index: roomIndex,
        question_text: question.question,
        category: question.category,
        difficulty: question.difficulty,
        answers: question.answers,
        correct_answer: question.correct_answer
      }
    });
  }

  return buildRoomQuestionPayload(roomQuestionRows);
}
