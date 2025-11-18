import winston from 'winston';

const { combine, timestamp, json, errors } = winston.format;

const logger = winston.createLogger({
	levels: winston.config.syslog.levels,
	format: combine(
		errors({ stack: true }),
		timestamp(),
		json(),
	),
	transports: [
		new winston.transports.Console({level: "debug"}),
		new winston.transports.File({
			filename: 'logs/app.log',
			level: 'debug'
		})
	]
});

// Ensure backward-compatible warn alias (syslog levels use 'warning')
interface LoggerWithWarning {
	warning?: (...args: unknown[]) => void;
	warn?: (...args: unknown[]) => void;
}
const loggerWithWarning = logger as unknown as LoggerWithWarning;
if (typeof loggerWithWarning.warn !== 'function' && typeof loggerWithWarning.warning === 'function') {
	loggerWithWarning.warn = loggerWithWarning.warning.bind(logger);
}

export default logger;