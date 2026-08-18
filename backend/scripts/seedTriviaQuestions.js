import { prisma } from '../src/config/prisma.js';
import {
  buildSourceHash,
  fetchOpenTriviaQuestions,
  normalizeOpenTriviaQuestion,
  upsertTriviaQuestions
} from '../src/services/triviaQuestionService.js';

const DEFAULT_TARGET_QUESTION_COUNT = 250;

async function seedTriviaQuestions() {
  try {
    const targetCount = Number(process.env.TRIVIA_QUESTION_COUNT ?? DEFAULT_TARGET_QUESTION_COUNT);
    const batchSize = 50;
    const seenHashes = new Set();
    let totalSaved = 0;
    let fetchedThisRun = 0;

    while (fetchedThisRun < targetCount) {
      const remaining = targetCount - fetchedThisRun;
      const amount = Math.min(batchSize, remaining);
      const questions = await fetchOpenTriviaQuestions({ amount });

      const uniqueQuestions = [];
      for (const question of questions) {
        const normalized = normalizeOpenTriviaQuestion(question);
        const hash = buildSourceHash(normalized);

        if (seenHashes.has(hash)) {
          continue;
        }

        seenHashes.add(hash);
        uniqueQuestions.push(question);
      }

      if (uniqueQuestions.length === 0) {
        break;
      }

      const savedQuestions = await upsertTriviaQuestions(prisma, uniqueQuestions);
      totalSaved += savedQuestions.length;
      fetchedThisRun += uniqueQuestions.length;

      if (questions.length < amount) {
        break;
      }
    }

    console.log(`Saved ${totalSaved} unique trivia questions to the database.`);
  } catch (error) {
    console.error('Error seeding trivia questions:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedTriviaQuestions();
