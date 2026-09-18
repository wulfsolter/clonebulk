#!/usr/bin/env node
import _ from 'lodash';
import async from 'async';
import { exec as _exec } from 'node:child_process';
import { createRequire } from 'node:module';
import knex from 'knex';
import moment from 'moment';
import { promisify } from 'node:util';
import parse from 'pg-connection-string';
import pg from 'pg';
import { setTimeout } from 'timers/promises';
import windowSize from 'window-size';
import winston from 'winston';

import { config, TypeTask } from './config'; // load tasks
import { regular } from './regular';

// A few quick helpers
const screenWidth = windowSize.width;
const exec = promisify(_exec);
const require = createRequire(import.meta.url);

type BackendEnvironment = {
  datastores: {
    defaultPostgres: {
      url: string;
    };
  };
};

// The backend environment files use CommonJS `module.exports` and are executed by tsx at runtime.
const localEnvironment = require('../wherewolf/wherewolf-backend/config/env/development.ts') as BackendEnvironment;
const remoteEnvironment = require('../wherewolf/wherewolf-backend/config/env/production.ts') as BackendEnvironment;
const localDatabaseUrl = localEnvironment.datastores.defaultPostgres.url;
const remoteDatabaseUrl = remoteEnvironment.datastores.defaultPostgres.url;

// Set up logger
const logger = winston.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    }),
  ],
});

type ClientWithTransferCounters = {
  connection?: {
    stream?: {
      bytesRead?: number;
      bytesWritten?: number;
    };
  };
};

const formatBytes = (bytes: number) => {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
  let value = bytes;
  let unitIndex = 0;

  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }

  const precision = unitIndex === 0 || value >= 100 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(precision)} ${units[unitIndex]}`;
};

const formatElapsed = (milliseconds: number) => {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value, index) => (index === 0 ? value.toString() : value.toString().padStart(2, '0')))
    .join(':');
};

/* cspell:disable-next-line */
// node-postgres buffers query results, so a large query otherwise appears idle until every row has arrived.
// Its connection stream exposes cumulative byte counters that let us show activity without changing query behavior.
const withTransferProgress = async <Result>(
  client: pg.PoolClient,
  operation: () => Promise<Result>,
): Promise<Result> => {
  const stream = (client as unknown as ClientWithTransferCounters).connection?.stream;
  const canReadCounters = typeof stream?.bytesRead === 'number' && typeof stream?.bytesWritten === 'number';

  if (!canReadCounters || !stream) {
    return operation();
  }

  const startedAt = Date.now();
  const startingBytesRead = stream.bytesRead || 0;
  const startingBytesWritten = stream.bytesWritten || 0;
  let previousSampleAt = startedAt;
  let previousBytesRead = startingBytesRead;
  let previousBytesWritten = startingBytesWritten;

  const renderProgress = () => {
    const sampledAt = Date.now();
    const bytesRead = stream.bytesRead || 0;
    const bytesWritten = stream.bytesWritten || 0;
    const sampleSeconds = Math.max((sampledAt - previousSampleAt) / 1000, 0.001);
    const downloaded = Math.max(bytesRead - startingBytesRead, 0);
    const uploaded = Math.max(bytesWritten - startingBytesWritten, 0);
    const downloadRate = Math.max(bytesRead - previousBytesRead, 0) / sampleSeconds;
    const uploadRate = Math.max(bytesWritten - previousBytesWritten, 0) / sampleSeconds;
    const message = `                fetchAllAtOnce! - Transfer: down ${formatBytes(downloaded)} (${formatBytes(downloadRate)}/s), up ${formatBytes(uploaded)} (${formatBytes(uploadRate)}/s), elapsed ${formatElapsed(sampledAt - startedAt)}`;

    if (process.stdout.isTTY) {
      process.stdout.clearLine(0);
      process.stdout.cursorTo(0);
      process.stdout.write(message);
    } else {
      logger.info(message.trimStart());
    }

    previousSampleAt = sampledAt;
    previousBytesRead = bytesRead;
    previousBytesWritten = bytesWritten;
  };

  const progressInterval = globalThis.setInterval(renderProgress, process.stdout.isTTY ? 1000 : 5000);

  try {
    return await operation();
  } finally {
    clearInterval(progressInterval);
    renderProgress();
    if (process.stdout.isTTY) {
      process.stdout.write('\n');
    }
  }
};

const MAX_INSERT_ROWS = 1000;
const MAX_INSERT_PARAMETERS = 30000;
// Refuse to copy more than this many rows when a task has no explicit `limit`
const SAFETY_ROW_LIMIT = 50000;
const conflictClauseForTask = (task: TypeTask) =>
  task.skipConflict ? ' ON CONFLICT DO NOTHING' : ` ON CONFLICT (${pg.escapeIdentifier(task.id)}) DO NOTHING`;

const insertRowsInBatches = async (client: pg.PoolClient, task: TypeTask, rows: pg.QueryResultRow[]) => {
  if (!rows.length) {
    return { inserted: 0, skipped: 0 };
  }

  const columns = Object.keys(rows[0]);
  if (!columns.length) {
    throw new Error(`Cannot insert rows into ${task.table}: the remote query returned no columns`);
  }

  const rowsPerBatch = Math.max(1, Math.min(MAX_INSERT_ROWS, Math.floor(MAX_INSERT_PARAMETERS / columns.length)));
  const batchCount = Math.ceil(rows.length / rowsPerBatch);
  const escapedColumns = columns.map((column) => pg.escapeIdentifier(column)).join(', ');
  const conflictClause = conflictClauseForTask(task);
  const startedAt = Date.now();
  let displayedProgress = false;
  let insertedRows = 0;

  logger.info(
    `          fetchAllAtOnce! - Using ${batchCount} insert batches of up to ${rowsPerBatch} rows (${columns.length} columns)`,
  );

  try {
    for (let offset = 0; offset < rows.length; offset += rowsPerBatch) {
      const batch = rows.slice(offset, offset + rowsPerBatch);
      const values = batch.flatMap((row) =>
        columns.map((column) => {
          const value = row[column];
          return _.isArray(value) ? JSON.stringify(value) : value;
        }),
      );
      const valueGroups = batch.map((_row, rowIndex) => {
        const firstParameter = rowIndex * columns.length + 1;
        const placeholders = columns.map((_, columnIndex) => `$${firstParameter + columnIndex}`);
        return `(${placeholders.join(', ')})`;
      });

      const result = await client.query({
        text: `INSERT INTO ${pg.escapeIdentifier(task.table)} (${escapedColumns}) VALUES ${valueGroups.join(', ')}${conflictClause} /* source:clonebulk-fetchAllAtOnce-insert task:${task.name.replace(/\W/g, '')} */`,
        values,
      });

      insertedRows += result.rowCount || 0;
      const processedRows = Math.min(offset + batch.length, rows.length);
      const skippedRows = processedRows - insertedRows;
      const batchNumber = Math.floor(offset / rowsPerBatch) + 1;
      const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.001);
      const message = `                fetchAllAtOnce! - Processed ${processedRows}/${rows.length} rows (${Math.round((processedRows / rows.length) * 100)}%) - inserted ${insertedRows}, skipped ${skippedRows} - batch ${batchNumber}/${batchCount} - ${Math.round(processedRows / elapsedSeconds)} rows/s`;

      if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(message);
        displayedProgress = true;
      } else if (batchNumber % 10 === 0 || batchNumber === batchCount) {
        logger.info(message.trimStart());
      }
    }
  } finally {
    if (displayedProgress) {
      process.stdout.write('\n');
    }
  }

  return { inserted: insertedRows, skipped: rows.length - insertedRows };
};

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
    try {
      const { stdout: tunnelDownOutput, stderr: tunnelDownError } = await exec('ssh -T -O "exit" clonerow-tunnel');
      logger.info('tunnelDownOutput, tunnelDownError', tunnelDownOutput, tunnelDownError);
    } catch (error: any) {
      if (!error.toString().includes('Connection refused')) {
        logger.error('    error shutting down tunnel', { error });
      }
    }
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
        `ssh -f -N -T -M -o ControlMaster=auto -L ${localPortToRemote}:${parse.parse(remoteDatabaseUrl).host}:5432 clonerow-tunnel`,
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
  connectionString: localDatabaseUrl,
  max: _.min([config.parallelism, 10]),
});

const poolRemote = new pg.Pool({
  user: parse.parse(remoteDatabaseUrl).user,
  password: parse.parse(remoteDatabaseUrl).password,
  host: 'localhost',
  port: localPortToRemote,
  max: _.min([config.parallelism, 10]),
  // https://stackoverflow.com/a/66913689/1265447
  ssl: {
    // sslmode: 'require',
    rejectUnauthorized: false,
  },
});

logger.info('after setting up remote');

const tasks = [...config.tasks];

if (config.copyMostOfApp && config.copyMostOfApp.length) {
  // to the front of array
  tasks.unshift(...config.copyMostOfApp.flatMap((el) => regular.taskPresets.copyMostOfAppTasks(el)));
}

// Exit if there are no tasks to run
if (_.isEmpty(tasks)) {
  logger.info('No tasks to run');
  await cleanup();
}

await async.eachOfSeries(tasks, async (task, idx) => {
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
    `Task ${(parseInt(idx.toString(), 10) + 1).toString().padStart(tasks.length.toString().length, '0')}/${tasks.length.toString()} - ${task.name}`,
  );
  logger.info('    -----------------------------------');
  logger.info('    Overview');
  logger.info(`          table:     ${task.table}`);
  logger.info(`          id:        ${task.id}`);
  logger.info(`          where:     ${task.where ? JSON.stringify(task.where) : '<ALL>'}`);
  logger.info(`          orderBy:   ${task.orderBy || ''}`);
  logger.info(`          limit:     ${task.limit || 'none'}`);
  logger.info(`          skipCount: ${task.skipCount || false}`);
  logger.info(`          truncate:  ${task.truncate || false}`);
  logger.info('    -----------------------------------');

  if (!task.skipCount) {
    // Guard against doing a huge query - if a task has no `limit` and matches more than SAFETY_ROW_LIMIT rows, exit
    const queryCount = countQueryBuilder(task);
    logger.info('    Counting rows on remote to check for unexpected large result set.');
    logger.info(`          Query: ${queryCount}`);

    const countRemote = parseInt((await clientTaskRemote.query(queryCount)).rows[0].count, 10);
    if (!task.limit && countRemote > SAFETY_ROW_LIMIT) {
      logger.error(' ');
      logger.error('    *** ABORTING - SAFETY GUARD TRIPPED ***');
      logger.error(`    Task "${task.name}" (table ${task.table}) would copy ${countRemote} rows from remote,`);
      logger.error(`    which is over the ${SAFETY_ROW_LIMIT} row safety limit, and the task has no \`limit\` set.`);
      logger.error(' ');
      logger.error('    To proceed, do one of the following in the task definition:');
      logger.error('      - set `limit` to the max number of rows you actually want to copy');
      logger.error('      - narrow `where` so fewer rows match');
      logger.error('      - set `skipCount: true` to bypass this check entirely (you really do want them all)');
      logger.error(' ');
      process.exit(1);
    }
    logger.info(
      `          Found ${countRemote} rows on remote ${task.limit ? ` - only fetching up to ${Math.min(task.limit, countRemote)} as per task.limit` : ''}`,
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
    const clientLocal = await poolLocal.connect();
    const clientRemote = await poolRemote.connect();

    if (task.fetchAllAtOnce) {
      // Copy all rows down in one go, then insert them in batches
      const selectQuery = `SELECT * FROM "${task.table}" WHERE ${task.id} = ANY($1) /* source:clonebulk-fetchAllAtOnce task:${task.name.replace(/\W/g, '')} */`;
      const fetchingStart = moment();
      logger.info(`          fetchAllAtOnce! - Fetching all ${IDsToPull.length} rows - query: ${selectQuery}`);

      const rows = (
        await withTransferProgress(clientRemote, () =>
          clientRemote.query({
            text: selectQuery,
            values: [IDsToPull],
          }),
        )
      ).rows;

      logger.info(
        `          fetchAllAtOnce! - Fetched all ${rows.length} rows in ${moment.duration(moment().diff(fetchingStart)).humanize()}`,
      );

      if (task.truncate) {
        logger.info('    Truncating table on local');
        await clientTaskLocal.query(`TRUNCATE TABLE "${task.table}" CASCADE`);
        logger.info('    -----------------------------------');
      }

      logger.info(`          fetchAllAtOnce! - Inserting all ${rows.length} rows`);
      const insertingStart = moment();
      const insertResult = await insertRowsInBatches(clientLocal, task, rows);
      logger.info(
        `          fetchAllAtOnce! - Processed all ${rows.length} rows in ${moment.duration(moment().diff(insertingStart)).humanize()} - inserted ${insertResult.inserted}, skipped ${insertResult.skipped}`,
      );
    } else {
      if (task.truncate) {
        logger.info('    Truncating table on local');
        await clientTaskLocal.query(`TRUNCATE TABLE "${task.table}" CASCADE`);
        logger.info('    -----------------------------------');
      }
      // one row at a time
      await async.eachOfLimit(IDsToPull, config.parallelism, async (remoteID) => {
        try {
          const index = IDsToPull.indexOf(remoteID) + 1;

          const eta = moment(startTime).add(
            moment().diff(startTime, 'seconds') / (index / IDsToPull.length),
            'seconds',
          );

          /* cspell:disable-next-line */
          const stringProgress = `\r\x1b[32minfo:     \x1b[37mFetching ${index.toString().padStart(IDsToPull.length.toString().length)}/${IDsToPull.length} - ${Math.round(
            (index / IDsToPull.length) * 100,
          )
            .toString()
            .padStart(3)}%`;

          const stringETA = `- ETA: ${eta.toISOString()} = ${moment.duration(eta.diff(moment())).humanize()} - ${Math.round(index / (moment().diff(startTime, 'seconds') + 1))} records/s`;

          const spaceForID = screenWidth - stringProgress.length - stringETA.length + 11; // the +11 is because the control characters at start of stringETA are counted in JS string but now shown on screen

          let stringID = ` - ${task.id}: ${remoteID}`.toString().padEnd(Math.min(longestRemoteIDLength, spaceForID));
          if (stringID.length > spaceForID) {
            stringID = stringID.slice(0, spaceForID - 1) + '…';
          }

          process.stdout.write(`${stringProgress}${stringID}${stringETA}`.padEnd(screenWidth, ' '));

          // Copy row down
          const row = (
            await clientRemote.query({
              text: `SELECT * FROM "${task.table}" WHERE ${task.id} = $1  /* source:clonebulk-individual task:${task.name.replace(/\W/g, '')} */`,
              values: [remoteID],
            })
          ).rows[0];

          if (!row) {
            logger.error(` - ${remoteID} not found on remote`);
            process.exit();
          }

          await clientLocal.query({
            text: `INSERT INTO "${task.table}" VALUES (${[...Array(Object.keys(row).length).keys()].map((x) => `$${x + 1}`).join(' ,')})${conflictClauseForTask(task)}`,
            values: Object.values(row).map((el) => {
              if (_.isArray(el)) {
                return JSON.stringify(el);
              }
              return el;
            }),
          });
        } catch (error: any) {
          logger.error(` - ${remoteID} failed to copy down`, { error });
          console.log(error);
          // process.exit();
        }
      });
    }

    clientRemote.release();
    clientLocal.release();
    process.stdout.write('\n');
  }

  clientTaskRemote.release();
  clientTaskLocal.release();
});

logger.info('\n');
await cleanup();
