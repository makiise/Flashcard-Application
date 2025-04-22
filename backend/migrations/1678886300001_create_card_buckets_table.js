/* eslint-disable @typescript-eslint/naming-convention */

/** @type {import('node-pg-migrate').ColumnDefinitions | undefined} */
exports.shorthands = undefined;

/**
 * @param {import('node-pg-migrate/dist/types').MigrationBuilder} pgm
 */

exports.up = (pgm) => {
    pgm.createTable('card_buckets', {
        card_id: {type: 'uuid', primaryKey: true, references:'flashcards(id)', onDelete: 'CASCADE',},
        bucket_number: {type: 'integer', notNull: true, default: 0,},
        updated_at: {type: 'timestamp with time zone', notNull: true, default: pgm.func('current_timestamp'),},
        last_practiced_at: {
            type: 'timestamp with time zone', 
            //I think that bucket must have last_practised_at attribute which is updated if one of the card from that bucket was being practised.
            //so if in bucket 0 , there is 7 cards and only one of them was practised a minute ago, this will be updated.
            default: null,
          },
    });
    pgm.createIndex('card_buckets', 'bucket_number');

};



/**
 * @param {import('node-pg-migrate/dist/types').MigrationBuilder} pgm
 */
 exports.down = (pgm) => {
    pgm.dropTable('card_buckets'); 
  };