import { prisma } from '../src/config/prisma.js';
import { fetchOpenTriviaQuestions, upsertTriviaQuestions } from '../src/services/triviaQuestionService.js';

async function seedTriviaQuestions() {
  try {
    const questions = await fetchOpenTriviaQuestions({ amount: 50 });
    const savedQuestions = await upsertTriviaQuestions(prisma, questions);

    console.log(`Saved ${savedQuestions.length} trivia questions to the database.`);
  } catch (error) {
    console.error('Error seeding trivia questions:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seedTriviaQuestions();
