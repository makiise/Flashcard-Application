/* eslint-disable @typescript-eslint/naming-convention */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

// define enum for difficulty type
const ANSWER_DIFFICULTY_TYPE = 'answer_difficulty_enum';

/**
 * @param {import('node-pg-migrate/dist/types').MigrationBuilder} pgm
 */
exports.up = (pgm) => {
  // create enum type
  pgm.createType(ANSWER_DIFFICULTY_TYPE, ['WRONG', 'HARD', 'EASY']); // Use values that make sense

  // enable uuid 
  pgm.createExtension('uuid-ossp', { ifNotExists: true });

  // flashcards table
  pgm.createTable('flashcards', {
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    front: { type: 'text', notNull: true },
    back: { type: 'text', notNull: true },
    hint: { type: 'text' },
    tags: { type: 'text[]' },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    difficulty: { type: ANSWER_DIFFICULTY_TYPE, notNull: false }, // might manage difficulty elsewhere, sheidzleba bucket shi
  });

  // user table
  pgm.createTable('users', { 
    id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    username: { type : 'text', notNull: true, unique: true },
    // 'entire_score' might be better calculated than stored by function (?) da shemidzlia function chavumato executionshi
    entire_score: { type: 'integer', notNull: true, default: 0 },
    created_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
    updated_at: { type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp') },
  });

  // Create practice_log table 
  pgm.createTable('practice_log', {
    log_id: { type: 'uuid', primaryKey: true, default: pgm.func('uuid_generate_v4()') },
    user_id: {
      type: 'uuid',
      notNull: true,
      references: 'users(id)', 
      onDelete: 'CASCADE', 
    },
    flashcard_id:{
      type: 'uuid',
      notNull: true,
      references: 'flashcards(id)',
      onDelete: 'CASCADE', 
    },
    difficulty_chosen: { 
      type: ANSWER_DIFFICULTY_TYPE,
      notNull: true,
    },
    practiced_at: { 
      type: 'timestamp with time zone',
      notNull: true,
      default: pgm.func('current_timestamp'),
    },
    // AQ IQNEBA BUCKETS: Step 8 mentions 'buckets' in practice_history
    // initial_bucket: { type: 'integer' },
    // resulting_bucket: { type: 'integer' },
  });

  // Add index for faster lookup of logs per user or per card
  pgm.createIndex('practice_log', 'user_id');
  pgm.createIndex('practice_log', 'flashcard_id');
};


/**
 * @param {import('node-pg-migrate/dist/types').MigrationBuilder} pgm
 */
exports.down = (pgm) => {
  
  pgm.dropTable('practice_log');
  pgm.dropTable('users'); 
  pgm.dropTable('flashcards');

  pgm.dropType(ANSWER_DIFFICULTY_TYPE);

    pgm.dropExtension('uuid-ossp');
};





 // es unda gadavacunculo mere ps1 shi
// function calculateScoreOnEachFlashcard(difficulty){
  //  if (difficulty === 'easy') return 1;
 //   if (difficulty === 'hard') return 2;
 //   if (difficulty === 'wrong') return 0;
// }