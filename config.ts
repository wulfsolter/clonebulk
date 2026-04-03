export const config: TypeConfig = {
  // Disable cleaning up of tunnels so that multiple instances of this script can be run at the same time.
  // You probably do NOT want to do this.
  multithreaded: false,

  // How many select->inserts to run in parallel
  parallelism: 300,

  // copyMostOfApp: 'wherewolfadventures' /* cspell: disable-line */,
  copyMostOfApp: 'v2xbpr' /* cspell: disable-line */,

  // The tasks themselves
  tasks: [
    /* cspell: disable */
    {
      name: 'BI Time Series Daily',
      table: 'bi_time_series_daily',
      id: 'id',
      truncate: true,
      fetchAllAtOnce: true,
    },

    {
      name: 'Subscription Deals',
      table: 'shortened',
      id: 'id',
      where: { query: 'type = ?', params: ['subscription_deal'] },
      truncate: true,
      fetchAllAtOnce: true,
    },

    {
      name: 'Graphs',
      table: 'graph',
      id: 'pool',
      orderBy: ['updatedAt', 'DESC'],
      limit: 10000,
      truncate: true,
      fetchAllAtOnce: true,
    },

    {
      name: '10 most recent guests per app (fetchAllAtOnce)',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 10) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      fetchAllAtOnce: true,
    },

    {
      name: '20 most recent guests per app (fetchAllAtOnce)',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 20) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      fetchAllAtOnce: true,
    },

    {
      name: '50 most recent guests per app (fetchAllAtOnce)',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 50) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      fetchAllAtOnce: true,
    },

    {
      name: '75 most recent guests per app (fetchAllAtOnce)',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 75) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      fetchAllAtOnce: true,
    },

    {
      name: '100 most recent guests per app (fetchAllAtOnce)',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 100) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      fetchAllAtOnce: true,
    },

    {
      name: '250 most recent guests per app',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 250) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      // fetchAllAtOnce: true,
    },

    {
      name: '500 most recent guests per app',
      table: 'guest',
      id: 'id',
      where: {
        query:
          // heavily inspired from https://stackoverflow.com/a/25965393/1265447
          `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 500) g ORDER BY a.pool DESC)`,
      },
      skipCount: true,
      // fetchAllAtOnce: true,
    },

    // {
    //   name: 'AuditBizOp',
    //   table: 'audit_bizop',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   limit: 100000,
    // },

    // {
    //   name: 'BizOps',
    //   table: 'bizop',
    //   id: 'id',
    //   orderBy: ['updatedAt', 'DESC'],
    //   limit: 10000,
    //   // truncate: true,
    //   // fetchAllAtOnce: true,
    // },

    // {
    //   name: 'Charge',
    //   table: 'charge',
    //   id: 'id',
    //   limit: 1000000,
    //   // fetchAllAtOnce: true,
    // },

    // {
    //   name: 'Last Fourty Thousand Waivers from gkpet4',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['gkpet4'] },
    //   limit: 40000,
    // },

    // {
    //   name: '1000 most recent guests per app',
    //   table: 'guest',
    //   id: 'id',
    //   where: {
    //     query:
    //       // heavily inspired from https://stackoverflow.com/a/25965393/1265447
    //       `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 1000) g ORDER BY a.pool DESC)`,
    //   },
    //   skipCount: true,
    // },

    // {
    //   name: 'Most recent guests (all apps)',
    //   table: 'guest',
    //   id: 'id',
    //   where: { query: 'id IN (SELECT DISTINCT ON (pool) id FROM guest ORDER BY pool, "createdAt" desc)' }, // https://stackoverflow.com/a/34715134
    //   skipCount: true,
    // },

    // {
    //   name: 'All Staff',
    //   table: 'staff',
    //   id: 'id',
    //   limit: 100000,
    // },

    // {
    //   name: 'Last 50,000 AuditApp',
    //   table: 'audit_app',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   limit: 50000,
    // },
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
  skipConflict?: boolean;
  truncate?: boolean;
  fetchAllAtOnce?: boolean;
};

export type TypeConfig = {
  copyMostOfApp?: string;
  parallelism: number;
  multithreaded: boolean;
  tasks: Array<TypeTask>;
};
