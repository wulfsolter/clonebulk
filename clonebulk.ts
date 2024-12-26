#!/usr/bin/env node
import _ from 'lodash';
import async from 'async';
import { exec as _exec } from 'node:child_process';
import knex from 'knex';
import moment from 'moment';
import { promisify } from 'node:util';
import parse from 'pg-connection-string';
import pg from 'pg';
import { setTimeout } from 'timers/promises';
import windowSize from 'window-size';
import winston from 'winston';

import { config, TypeTask } from './config'; // load tasks

// @ts-ignore
import * as connectionStringLocal from '../wherewolf-backend/config/env/development.js'; // import local DB connection string //
// @ts-ignore
import * as connectionStringRemote from '../wherewolf-backend/config/env/production.js'; // import prod DB connection string

// A few quick helpers
const screenWidth = windowSize.width;
const exec = promisify(_exec);

// Set up logger
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

let alreadyCleaningUp = false;
const cleanup = async () => {
  logger.info(
    '---------------------------------------------------------------------------------------------------------',
  );

  // Guard against running cleanup twice
  if (alreadyCleaningUp) {
    logger.info('    already cleaning up');
    return false;
  }
  alreadyCleaningUp = true;

  logger.info('Cleanup');

  // Shutdown local + remote connection pools
  await Promise.race([
    async () => {
      try {
        logger.info('    ending remote');
        await poolRemote.end();

        logger.info('    ending local');
        await poolLocal.end();
      } catch (cleanupError) {
        logger.error('    error cleaning up', { cleanupError });
      }
    },
    async () => {
      const delay = 10;
      await setTimeout(delay * 1000);
      logger.info(`    waited ${delay}s, ending`);
    },
  ]);

  if (config.multithreaded) {
    logger.info('    leaving tunnel up');
  } else {
    logger.info('    shutting down tunnel to remote');
    logger.info('TODO SHUT DOWN THE TUNNEL');
    // const { stdout: tunnelDownOutput, stderr: tunnelDownError } = await exec('ssh -T -O "exit" clonerow-tunnel');
    // logger.info(tunnelDownOutput, tunnelDownError);
  }

  process.exit(0);
};

// Query Builder helper method that parses a task into a knex query builder and returns SQL string
const selectQueryBuilder = (task: TypeTask) => {
  const knexQueryBuilder = knex({ client: 'pg' }).queryBuilder().select(task.id).from(task.table);
  if (task.where) {
    knexQueryBuilder.whereRaw(task.where.query, task.where.params);
  }
  if (task.orderBy) {
    knexQueryBuilder.orderBy(task.orderBy[0], task.orderBy[1]);
  }
  if (task.limit) {
    knexQueryBuilder.limit(task.limit);
  }
  return knexQueryBuilder.toString();
};
const countQueryBuilder = (task: TypeTask) => {
  const knexQueryBuilder = knex({ client: 'pg' }).queryBuilder().count().from(task.table);
  if (task.where) {
    knexQueryBuilder.whereRaw(task.where.query, task.where.params);
  }
  return knexQueryBuilder.toString();
};

// interrupt handler for SIGINT (Ctrl-C)
process.on('SIGINT', async () => {
  logger.info('Caught interrupt signal');
  await cleanup();
  return false;
});

//
// Create tunnel to remote DB
//
logger.info('CloneBulk - creating new ssh tunnel to worker');

let localPortToRemote = 5433;
let tunnelUp = false;
let firstTask = true;

await async.doUntil(
  async () => {
    try {
      logger.info(` --- trying port ${localPortToRemote}`);

      // https://gist.github.com/scy/6781836
      // Create an ssh tunnel through worker to the prod db server mapped to port:localPortToRemote on localhost
      // - f                      put ssh in the background
      // - N                      do not send a command to the host
      // - T                      do not allocate a terminal
      // - M                      initiate the master connection on the socket
      // - L                      the forward command
      // - o ControlMaster=auto   allow sharing of sockets between multiple sessions
      // ssh -f -N -T -M -L 5433:hoffman-cluster.cluster-c5hzncxdxaaa.eu-central-1.rds.amazonaws.com:5432 clonerow-tunnel /* cspell: disable-line /*

      const { stdout: tunnelUpOutput, stderr: tunnelUpError } = await exec(
        `ssh -f -N -T -M -o ControlMaster=auto -L ${localPortToRemote}:${parse.parse(connectionStringRemote.default.datastores.defaultPostgres.url).host}:5432 clonerow-tunnel`,
      );

      logger.info(' --- created new tunnel', {
        tunnelUpOutput: tunnelUpOutput,
        tunnelUpError: tunnelUpError,
      });

      return (tunnelUp = true);
    } catch (error: any) {
      if (error.toString().includes('Address already in use')) {
        localPortToRemote += 1;
        return;
      }

      logger.error(' --- error creating new tunnel', { error });
      throw error;
    }
  },
  async () => tunnelUp,
);

logger.info('');

// Create connections to local and remote DBs
const poolLocal = new pg.Pool({
  connectionString: connectionStringLocal.default.datastores.defaultPostgres.url,
  max: _.min([config.parallelism, 10]),
});

const poolRemote = new pg.Pool({
  user: parse.parse(connectionStringRemote.default.datastores.defaultPostgres.url).user,
  password: parse.parse(connectionStringRemote.default.datastores.defaultPostgres.url).password,
  host: 'localhost',
  port: localPortToRemote,
  max: _.min([config.parallelism, 10]),
});

logger.info('after setting up remote');

// Exit if there are no tasks to run
if (_.isEmpty(config.tasks)) {
  logger.info('No tasks to run');
  await cleanup();
}

await async.eachOfSeries(config.tasks, async (task, idx) => {
  const clientTaskLocal = await poolLocal.connect();
  const clientTaskRemote = await poolRemote.connect();

  // remote connectivity check
  if (firstTask) {
    const remoteCheck = await clientTaskRemote.query('SELECT NOW()');
    logger.info(`remoteCheck - SELECT NOW() - ${JSON.stringify(remoteCheck.rows[0])}`);
    firstTask = false;
  }

  logger.info(' ');
  logger.info(
    '---------------------------------------------------------------------------------------------------------',
  );
  logger.info(
    `Task - ${(parseInt(idx.toString(), 10) + 1).toString().padStart(config.tasks.length.toString().length, '0')}/${config.tasks.length.toString()} - ${task.name}`,
  );
  logger.info(`          table:     ${task.table}`);
  logger.info(`          id:        ${task.id}`);
  logger.info(`          where:     ${task.where ? JSON.stringify(task.where) : ''}`);
  logger.info(`          orderBy:   ${task.orderBy || ''}`);
  logger.info(`          limit:     ${task.limit || 'none'}`);
  logger.info(`          skipCount: ${task.skipCount || false}`);
  logger.info('    -----------------------------------');

  if (!task.skipCount) {
    // Guard against doing a huge query - if more than 50,000 or task.limit rows, exit
    const queryCount = countQueryBuilder(task);
    logger.info('    Counting rows on remote to check for unexpected large result set.');
    logger.info(`          Query: ${queryCount}`);

    const countRemote = parseInt((await clientTaskRemote.query(queryCount)).rows[0].count, 10);
    if (!task.limit && countRemote > Math.max(50000, _.get(task, 'limit', 0))) {
      logger.error(
        `Count returned ${countRemote} rows on remote. Exiting because no task.limit is set, this is unexpected, and/or greater than task.limit`,
      );
      process.exit();
    }
    logger.info(
      `          Found ${countRemote} rows on remote ${task.limit ? ` - only fetching ${Math.min(task.limit, countRemote)} as per task.limit` : ''}`,
    );
    logger.info('    -----------------------------------');
  }

  // Build query to get IDs to pull, and run against local + remote
  const querySelectID = selectQueryBuilder(task);
  logger.info(`    Fetching IDs to pull from local + remote`);
  logger.info(`          Query:     ${querySelectID}`);
  const IDsLocal = (await clientTaskLocal.query((await querySelectID).toString())).rows.map((row) => row[task.id]);
  logger.info(`          IDsLocal:  ${IDsLocal.length}`);

  const IDsRemote = (await clientTaskRemote.query((await querySelectID).toString())).rows.map((row) => row[task.id]);
  logger.info(`          IDsRemote: ${IDsRemote.length}`);
  const IDsToPull = _.difference(IDsRemote, IDsLocal);
  logger.info(`          IDsToPull: ${IDsToPull.length}`);

  if (IDsToPull.length) {
    logger.info('    -----------------------------------');

    const longestRemoteIDLength = _.max(IDsRemote.map((id) => id.toString().length));
    const startTime = moment();
    await async.eachOfLimit(IDsToPull, config.parallelism, async (remoteID) => {
      const clientLocal = await poolLocal.connect();
      const clientRemote = await poolRemote.connect();

      const index = IDsToPull.indexOf(remoteID) + 1;

      const eta = moment(startTime).add(moment().diff(startTime, 'seconds') / (index / IDsToPull.length), 'seconds');

      const stringProgress = `\r\x1b[32minfo:     \x1b[37mFetching ${index.toString().padStart(IDsToPull.length.toString().length)}/${IDsToPull.length} - ${Math.round(
        (index / IDsToPull.length) * 100,
      )
        .toString()
        .padStart(3)}%`;

      const stringETA = `- ETA: ${eta.toISOString()} = ${moment.duration(eta.diff(moment())).humanize()} - ${Math.round(index / (moment().diff(startTime, 'seconds') + 1))} records/s`;

      const spaceForID = screenWidth - stringProgress.length - stringETA.length + 11; // the +11 is because the control characters at start of stringETA are counted in JS string but now shown on screen

      let stringID = ` - ID: ${remoteID}`.toString().padEnd(Math.min(longestRemoteIDLength, spaceForID));
      if (stringID.length > spaceForID) {
        stringID = stringID.slice(0, spaceForID - 1) + '…';
      }

      const output = `${stringProgress}${stringID}${stringETA}`;

      process.stdout.write(output.padEnd(screenWidth - output.length, ' '));

      // Copy row down
      const row = (
        await clientRemote.query({
          text: `SELECT * FROM "${task.table}" WHERE ${task.id} = $1`,
          values: [remoteID],
        })
      ).rows[0];

      if (!row) {
        logger.error(` - ${remoteID} not found on remote`);
        process.exit();
      }

      await clientLocal.query({
        text: `INSERT INTO "${task.table}" VALUES (${[...Array(Object.keys(row).length).keys()].map((x) => `$${x + 1}`).join(' ,')}) ON CONFLICT (${task.id}) DO NOTHING`,
        values: Object.values(row).map((el) => {
          if (_.isArray(el)) {
            return JSON.stringify(el);
          }
          return el;
        }),
      });

      clientRemote.release();
      clientLocal.release();
    });
    process.stdout.write('\n');
  }

  clientTaskRemote.release();
  clientTaskLocal.release();
});

logger.info('\n');
await cleanup();
