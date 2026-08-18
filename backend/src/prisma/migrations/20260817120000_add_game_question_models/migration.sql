-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('waiting', 'started', 'finished');
CREATE TYPE "GameName" AS ENUM ('trivia');

-- CreateTable
CREATE TABLE "Room" (
    "room_id" CHAR(6) NOT NULL,
    "host_id" INTEGER NOT NULL,
    "game_name" "GameName" NOT NULL DEFAULT 'trivia',
    "status" "RoomStatus" NOT NULL DEFAULT 'waiting',
    "max_players" INTEGER NOT NULL DEFAULT 2,
    "cur_players" INTEGER NOT NULL DEFAULT 1,
    "duration_seconds" INTEGER NOT NULL DEFAULT 120,

    CONSTRAINT "Room_pkey" PRIMARY KEY ("room_id")
);

-- CreateTable
CREATE TABLE "RoomPlayer" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "room_id" CHAR(6) NOT NULL,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_ready" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "RoomPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoomPlayer_user_id_key"
ON "RoomPlayer"("user_id");

-- CreateIndex
CREATE INDEX "RoomPlayer_room_id_idx"
ON "RoomPlayer"("room_id");

-- AddForeignKey
ALTER TABLE "Room"
ADD CONSTRAINT "Room_host_id_fkey"
FOREIGN KEY ("host_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RoomPlayer"
ADD CONSTRAINT "RoomPlayer_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomPlayer"
ADD CONSTRAINT "RoomPlayer_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "GameQuestion" (
    "id" SERIAL NOT NULL,
    "game_name" "GameName" NOT NULL DEFAULT 'trivia',
    "category" TEXT,
    "difficulty" TEXT,
    "question" TEXT NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "incorrect_answers" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'opentdb',
    "source_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoomQuestion" (
    "id" SERIAL NOT NULL,
    "room_id" CHAR(6) NOT NULL,
    "question_id" INTEGER NOT NULL,
    "game_name" "GameName" NOT NULL DEFAULT 'trivia',
    "question_index" INTEGER NOT NULL,
    "question_text" TEXT NOT NULL,
    "category" TEXT,
    "difficulty" TEXT,
    "answers" JSONB NOT NULL,
    "correct_answer" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoomQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameQuestion_source_hash_key"
ON "GameQuestion"("source_hash");

-- CreateIndex
CREATE INDEX "RoomQuestion_room_id_idx"
ON "RoomQuestion"("room_id");

-- CreateIndex
CREATE UNIQUE INDEX "RoomQuestion_room_id_question_index_key"
ON "RoomQuestion"("room_id", "question_index");

-- AddForeignKey
ALTER TABLE "RoomQuestion"
ADD CONSTRAINT "RoomQuestion_room_id_fkey"
FOREIGN KEY ("room_id") REFERENCES "Room"("room_id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RoomQuestion"
ADD CONSTRAINT "RoomQuestion_question_id_fkey"
FOREIGN KEY ("question_id") REFERENCES "GameQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
