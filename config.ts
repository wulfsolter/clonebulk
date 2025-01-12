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
      name: 'Last Five Thousand Waivers from x4fwnn',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['x4fwnn'] },
      limit: 5000,
    },

    {
      name: 'Graphs',
      table: 'graph',
      id: 'pool',
      orderBy: ['updatedAt', 'DESC'],
      limit: 10000,
    },

    {
      name: 'Last Five Thousand Waivers from pacwhale',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['pacwhale'] },
      limit: 5000,
    },

    {
      name: 'Bookings from pacwhale',
      table: 'tracked_booking',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['pacwhale'] },
      limit: 50000,
    },

    {
      name: 'Bookings from vnccnq',
      table: 'tracked_booking',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['vnccnq'] },
      limit: 50000,
    },

    {
      name: 'Most recent guests (all apps)',
      table: 'guest',
      id: 'id',
      where: { query: 'id IN (SELECT DISTINCT ON (pool) id FROM guest ORDER BY pool, "createdAt" desc)' }, // https://stackoverflow.com/a/34715134
      skipCount: true,
    },

    {
      name: 'Last Five Thousand Waivers from vnccnq',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['vnccnq'] },
      limit: 5000,
    },

    // {
    //   name: 'Last Five Thousand Waivers from pqqaxy',
    //   table: 'guest',
    //   id: 'id',
    //   orderBy: ['createdAt', 'DESC'],
    //   where: { query: 'pool = ?', params: ['pqqaxy'] },
    //   limit: 5000,
    // },

    {
      name: 'Last Twenty Thousand Waivers from queenstownbiketours',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['queenstownbiketours'] },
      limit: 20000,
    },

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

    {
      name: 'Last Ten Thousand Waivers from pacwhale',
      table: 'guest',
      id: 'id',
      orderBy: ['createdAt', 'DESC'],
      where: { query: 'pool = ?', params: ['pacwhale'] },
      limit: 10000,
    },

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
};

export type TypeConfig = {
  parallelism: number;
  multithreaded: boolean;
  tasks: Array<TypeTask>;
};
