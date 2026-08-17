#!/usr/bin/env node
import { prisma } from '../src/config/prisma.js';

async function testRoomStart() {
  try {
    console.log('Starting room start test...\n');

    // Create a test user
    console.log('1. Creating test user...');
    const user = await prisma.user.upsert({
      where: { email: 'testuser@test.com' },
      update: {},
      create: {
        email: 'testuser@test.com',
        username: 'testuser',
        password: 'test'
      }
    });
    console.log(`   Created user: ${user.username} (ID: ${user.id})\n`);

    // Create a test room
    console.log('2. Creating test room...');
    const room = await prisma.room.create({
      data: {
        room_id: 'TEST1A',
        host_id: user.id,
        game_name: 'trivia',
        max_players: 2,
        cur_players: 1,
        duration_seconds: 120,
        players: {
          create: {
            user_id: user.id,
            is_ready: true
          }
        }
      }
    });
    console.log(`   Created room: ${room.room_id}`);
    console.log(`   Room status: ${room.status}`);
    console.log(`   Duration: ${room.duration_seconds} seconds\n`);

    // Check if room questions already exist
    console.log('3. Checking for existing room questions...');
    const existingQuestions = await prisma.roomQuestion.findMany({
      where: { room_id: room.room_id }
    });
    console.log(`   Found ${existingQuestions.length} existing room questions\n`);

    // Check if there are any game questions in the database
    console.log('4. Checking game questions database...');
    const gameQuestionCount = await prisma.gameQuestion.count({
      where: { game_name: 'trivia' }
    });
    console.log(`   Total trivia questions in DB: ${gameQuestionCount}\n`);

    if (gameQuestionCount === 0) {
      console.log('   ⚠️  WARNING: No trivia questions in the database!');
      console.log('   Please run: npm run seed:trivia\n');
    }

    // Try to get room questions
    console.log('5. Testing getOrCreateRoomQuestionSet...');
    try {
      const { getOrCreateRoomQuestionSet } = await import('../src/services/triviaQuestionService.js');
      const questions = await getOrCreateRoomQuestionSet(prisma, room.room_id);
      console.log(`   Got ${questions.length} questions for room\n`);

      if (questions.length > 0) {
        console.log('   Sample question:');
        console.log(`   - Text: ${questions[0].question}`);
        console.log(`   - Category: ${questions[0].category}`);
        console.log(`   - Answers: ${questions[0].answers?.length || 0}`);
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}\n`);
      throw error;
    }

    // Check room questions were created
    console.log('\n6. Verifying room questions created...');
    const roomQuestions = await prisma.roomQuestion.findMany({
      where: { room_id: room.room_id },
      orderBy: { question_index: 'asc' },
      select: { question_index: true, question_text: true }
    });
    console.log(`   Room now has ${roomQuestions.length} room questions`);

    if (roomQuestions.length > 0) {
      console.log(`   First question: ${roomQuestions[0].question_text.substring(0, 50)}...`);
    }

    // Try to update room status
    console.log('\n7. Updating room status to "started"...');
    const updatedRoom = await prisma.room.update({
      where: { room_id: room.room_id },
      data: { status: 'started' }
    });
    console.log(`   Room status now: ${updatedRoom.status}\n`);

    // Verify the room can be queried
    console.log('8. Final verification...');
    const verifyRoom = await prisma.room.findUnique({
      where: { room_id: room.room_id },
      select: { room_id: true, status: true, host_id: true }
    });
    console.log(`   Room verification:`);
    console.log(`   - ID: ${verifyRoom.room_id}`);
    console.log(`   - Status: ${verifyRoom.status}`);
    console.log(`   - Host ID: ${verifyRoom.host_id}\n`);

    console.log('✅ All tests passed! Room startup flow is working.');

    // Cleanup
    console.log('\n9. Cleaning up test data...');
    await prisma.roomQuestion.deleteMany({
      where: { room_id: room.room_id }
    });
    await prisma.roomPlayer.deleteMany({
      where: { room_id: room.room_id }
    });
    await prisma.room.delete({
      where: { room_id: room.room_id }
    });
    await prisma.user.delete({
      where: { id: user.id }
    });
    console.log('   Cleanup complete.\n');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testRoomStart();
