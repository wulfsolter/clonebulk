export const constants = {
  taskPresets: {
    copyMostOfApp: (pool: string) => [
      {
        name: `Automation History - ${pool}`,
        table: 'automation_history',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        limit: 50000,
        fetchAllAtOnce: true,
        // truncate: true,
        skipConflict: true,
        where: { query: 'pool = ?', params: [pool] },
      },

      {
        name: `Automation Queue - ${pool}`,
        table: 'automation_queue',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        limit: 50000,
        fetchAllAtOnce: true,
        // truncate: true,
        skipConflict: true,
        where: { query: 'pool = ?', params: [pool] },
      },

      {
        name: `Event Log - ${pool}`,
        table: 'event_log',
        id: 'id',
        where: { query: 'pool = ?', params: [pool] },
        orderBy: ['created_at', 'DESC'],
        limit: 300000,
        skipConflict: true,
        fetchAllAtOnce: true,
      },

      {
        name: `Bookings from - ${pool}`,
        table: 'tracked_booking',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        where: { query: 'pool = ?', params: [pool] },
        limit: 10000,
        fetchAllAtOnce: true,
      },

      {
        name: `Last 10000 Waivers from ${pool}`,
        table: 'guest',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        where: { query: 'pool = ?', params: [pool] },
        limit: 10000,
        fetchAllAtOnce: true,
      },

      {
        name: `Last 20000 Waivers from ${pool}`,
        table: 'guest',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        where: { query: 'pool = ?', params: [pool] },
        limit: 20000,
        fetchAllAtOnce: true,
      },

      {
        name: `Last 30000 Waivers from ${pool}`,
        table: 'guest',
        id: 'id',
        orderBy: ['createdAt', 'DESC'],
        where: { query: 'pool = ?', params: [pool] },
        limit: 30000,
        fetchAllAtOnce: true,
      },
    ],
  },
};
