import log4js from 'log4js';

log4js.configure({
    appenders: {
      console: { type: 'console' }, // Console appender
      file: { type: 'file', filename: 'application.log' },
      startup_file: { type: 'file', filename: 'startup.log' },
      startup_memory: { type: 'logLevelFilter', appender: 'buffer', level: 'trace' }
    },
    categories: {
      default: { appenders: ['console', 'file'], level: 'debug' },
      start_up: { appenders: ['console', "startup_file", "startup_memory"]}
    }
  });
const logger = log4js.getLogger()
const startup_logger = log4js.getLogger("start_up")

const startup_memory = log4js.appenders.get('buffer');

export { logger, startup_logger, startup_memory }