import log4js from 'log4js';

const startup_memory = []

log4js.configure({
    appenders: {
      console: { type: 'console' }, // Console appender
      file: { type: 'file', filename: 'application.log' },
      startup_file: { type: 'file', filename: 'startup.log' },
      startup_memory: {
        type: {
          configure: () => (le) => {
            startup_memory.push(le.startTime.toISOString() + ' ' + le.level.levelStr + ' ' + le.data.join(' '));
          },
        },
      },
      server_file: { type: 'file', filename: 'server.log' },
    },
    categories: {
      default: { appenders: ['console', 'file'], level: 'debug' },
      startup: { appenders: ['console', "startup_file", "startup_memory"], level: 'debug'},
      server: { appenders: ['console', 'file', "server_file"], level: 'debug' },
    }
  });
const logger = log4js.getLogger()
const startup_logger = log4js.getLogger("startup")
const server_logger = log4js.getLogger("server")

export { logger, startup_logger, server_logger, startup_memory }