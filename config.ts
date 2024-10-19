export const config: TypeConfig = {
  // Disable cleaning up of tunnels so that multiple instances of this script can be run at the same time.
  // This is only useful for running different tasks, eg one thread to pull tracked_booking table and another thread on guest table
  multithreaded: false,

  // How many select->inserts to run in parallel
  parallelism: 200,

  // The tasks themselves
  tasks: [
    /* cspell: disable */
    {
      name: 'Last Ten Thousand Waivers from allinadventuresraleigh',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['allinadventuresraleigh'] },
      limit: 10000,
    },

    {
      name: 'Most recent guests (all apps)',
      table: 'guest',
      id: 'id',
      where: { query: 'id IN (SELECT DISTINCT ON (pool) id FROM guest ORDER BY pool, "createdAt" desc)' }, // https://stackoverflow.com/a/34715134
      skipCount: true,
    },

    {
      name: 'Graphs',
      table: 'graph',
      id: 'pool',
      limit: 10000,
    },

    {
      name: 'Last Ten Thousand Waivers from wherewolfadventures',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['wherewolfadventures'] },
      limit: 10000,
    },
  ],
  /* cspell: enable */
};

export type TypeTaskWhere = {
  query: string;
  params?: string[];
};

export type TypeTask = {
  name: string;
  table: string;
  id: string;
  where?: TypeTaskWhere;
  orderBy?: string[];
  limit?: number;
  skipCount?: boolean;
};

export type TypeConfig = {
  parallelism: number;
  multithreaded: boolean;
  tasks: Array<TypeTask>;
};
