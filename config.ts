export const config: TypeConfig = {
  // Disable cleaning up of tunnels so that multiple instances of this script can be run at the same time.
  // You probably do NOT want to do this.
  multithreaded: false,

  // How many select->inserts to run in parallel
  parallelism: 300,

  // The tasks themselves
  tasks: [
    /* cspell: disable */

    {
      name: 'Subscription Deals',
      table: 'shortened',
      id: 'id',
      where: { query: 'type = ?', params: ['subscription_deal'] },
      truncate: true,
      fetchAllAtOnce: true,
    },

    {
      name: 'All Waivers from 22wsq6',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['22wsq6'] },
      limit: 100000,
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
      name: '10 most recent guests per app',
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

    // {
    //   name: '50 most recent guests per app',
    //   table: 'guest',
    //   id: 'id',
    //   where: {
    //     query:
    //       // heavily inspired from https://stackoverflow.com/a/25965393/1265447
    //       `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 50) g ORDER BY a.pool DESC)`,
    //   },
    //   skipCount: true,
    //   // fetchAllAtOnce: true,
    // },

    // {
    //   name: '250 most recent guests per app',
    //   table: 'guest',
    //   id: 'id',
    //   where: {
    //     query:
    //       // heavily inspired from https://stackoverflow.com/a/25965393/1265447
    //       `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 250) g ORDER BY a.pool DESC)`,
    //   },
    //   skipCount: true,
    //   // fetchAllAtOnce: true,
    // },

    // {
    //   name: '500 most recent guests per app',
    //   table: 'guest',
    //   id: 'id',
    //   where: {
    //     query:
    //       // heavily inspired from https://stackoverflow.com/a/25965393/1265447
    //       `id IN (SELECT g.id FROM app a CROSS JOIN LATERAL (SELECT g.id FROM guest g WHERE g.pool = a.pool AND a.status = 'Active' ORDER BY g."createdAt" DESC LIMIT 500) g ORDER BY a.pool DESC)`,
    //   },
    //   skipCount: true,
    //   // fetchAllAtOnce: true,
    // },

    // {
    //   name: 'AuditBizOp',
    //   table: 'audit_bizop',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   limit: 100000,
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
    //   name: 'Event Log - 8jjy87',
    //   table: 'event_log',
    //   id: 'id',
    //   where: { query: 'pool = ?', params: ['8jjy87'] },
    //   orderBy: ['created_at', 'DESC'],
    //   limit: 300000,
    //   skipConflict: true,
    //   fetchAllAtOnce: true,
    // },

    // {
    //   name: 'Tracked Bookings',
    //   table: 'tracked_booking',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   limit: 50000,
    // },

    // {
    //   name: 'All Waivers from mysteryroomalbany',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['mysteryroomalbany'] },
    //   limit: 50000,
    // },

    // {
    //   name: 'Bookings from pacwhale',
    //   table: 'tracked_booking',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['pacwhale'] },
    //   limit: 50000,
    // },

    // {
    //   name: 'Last Ten Thousand Waivers from pacwhale',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['pacwhale'] },
    //   limit: 10000,
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
    //   name: 'Last Five Thousand Waivers from pqqaxy',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['pqqaxy'] },
    //   limit: 5000,
    // },

    // {
    //   name: 'Last Twenty Thousand Waivers from queenstownbiketours',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['queenstownbiketours'] },
    //   limit: 20000,
    // },

    // {
    //   name: 'Last Five Thousand Waivers from 5t82ep',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['5t82ep'] },
    //   limit: 5000,
    // },

    // {
    //   name: 'Last Five Thousand Waivers from wherewolfadventures',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['wherewolfadventures'] },
    //   limit: 5000,
    // },

    // {
    //   name: 'Last Five Thousand Waivers from y9h8h3',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['y9h8h3'] },
    //   limit: 5000,
    // },

    // {
    //   name: 'Last Ten Thousand Waivers from y9h8h3',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['y9h8h3'] },
    //   limit: 10000,
    // },

    // {
    //   name: 'Last ThrityThousand Waivers from y9h8h3',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['y9h8h3'] },
    //   limit: 30000,
    // },

    // {
    //   name: 'Last ThrityThousand Waivers from 2kev6h',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['2kev6h'] },
    //   limit: 30000,
    // },

    // {
    //   name: 'Last ThrityThousand Waivers from qazxh4',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['qazxh4'] },
    //   limit: 30000,
    // },

    // {
    //   name: 'Charge',
    //   table: 'charge',
    //   id: 'id',
    //   limit: 1000000,
    // },

    // {
    //   name: 'All Staff',
    //   table: 'staff',
    //   id: 'id',
    //   limit: 100000,
    // },

    // {
    //   name: 'All AuditBizOp',
    //   table: 'audit_bizop',
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

    // {
    //   name: 'All Waivers from z98vuu',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['z98vuu'] },
    //   limit: 40000,
    // },

    // {
    //   name: 'Last Twenty Thousand Waivers from wherewolfadventures',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['wherewolfadventures'] },
    //   limit: 20000,
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
  parallelism: number;
  multithreaded: boolean;
  tasks: Array<TypeTask>;
};
