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

export default logger;