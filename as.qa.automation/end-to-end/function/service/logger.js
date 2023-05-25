const _ = require('lodash');
const { LEVEL, MESSAGE, SPLAT } = require('triple-beam');
const { createLogger, format, transports } = require('winston');

/**
 * @typedef {number} LoggerLevel
 * @enum {LoggerLevel}
 */
const LoggerLevel = {
  ERROR: 0,
  WARN: 1,
  INFO: 2,
  DEBUG: 3,
};

const CONTEXT_ERROR = Symbol.for('ERROR');

class Logger {
  /**
   * Gets the default LoggerLevel based on environment variables
   * @returns {LoggerLevel}
   */
  static getDefaultLevel() {
    const envLoggerLevel = process.env.LOGGER_LEVEL;

    if (!envLoggerLevel) {
      return process.env.NODE_ENV === 'production' ? LoggerLevel.INFO : LoggerLevel.DEBUG;
    }

    switch (envLoggerLevel) {
      case 'DEBUG':
        return LoggerLevel.DEBUG;
      case 'INFO':
        return LoggerLevel.INFO;
      case 'WARN':
        return LoggerLevel.WARN;
      case 'ERROR':
        return LoggerLevel.ERROR;
      default:
        return LoggerLevel.DEBUG;
    }
  }

  /**
   * Get the current Logger level
   * @returns {LoggerLevel}
   */
  static getLevel() {
    return Logger.level;
  }

  /**
   * Sets the Logger level
   * @param {LoggerLevel} level
   */
  static setLevel(level) {
    Logger.level = level;
  }

  /**
   * Get default Logger configuration for timestamps based on environment variables
   * @returns {boolean}
   */
  static getDefaultTimestamp() {
    const envLoggerTimestamp = process.env.LOGGER_TIMESTAMP;

    if (!envLoggerTimestamp) {
      return process.env.NODE_ENV !== 'production';
    }

    switch (envLoggerTimestamp) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return true;
    }
  }

  /**
   * Get Logger configuration for timestamps
   * @returns {boolean}
   */
  static getTimestamp() {
    return Logger.timestamp;
  }

  /**
   * Set Logger configuration for timestamps
   * @param {boolean} value
   */
  static setTimestamp(value) {
    Logger.timestamp = value;
  }

  /**
   * Get default Logger configuration for error stack traces based on environment variables
   * @returns {boolean}
   */
  static getDefaultStackTrace() {
    const envLoggerTimestamp = process.env.LOGGER_STACK_TRACE;

    if (!envLoggerTimestamp) {
      return process.env.NODE_ENV !== 'production';
    }

    switch (envLoggerTimestamp) {
      case 'true':
        return true;
      case 'false':
        return false;
      default:
        return true;
    }
  }

  /**
   * Get current Logger configuration for error stack traces
   * @returns {boolean}
   */
  static getStackTrace() {
    return Logger.stackTrace;
  }

  /**
   * Set Logger configuration for error stack traces
   * @param {boolean} value
   */
  static setStackTrace(value) {
    Logger.stackTrace = value;
  }

  /**
   * Check if Logger would log a string
   * @param {LoggerLevel} level
   * @returns {boolean}
   */
  static shouldLog(level) {
    return level <= Logger.level;
  }

  /**
   * Returns a new Logger instance
   * @param {string} name
   * @param {object} context
   * @returns {Logger}
   */
  static create(name, context) {
    return new Logger(name, context);
  }

  /**
   * @constructor Create a new Logger instance.
   * @see {@link create}
   * @param {string} name Logger name, which will be included in all logs
   * @param {object} context Logger context, which will be included in all logs
   */
  constructor(name, context = {}) {
    this.setName(name);
    this.setContext(context);
    this.logger = createLogger({
      transports: [
        new transports.Console({
          level: 'debug',
          format: format.printf(this._createLogMessage.bind(this)),
        }),
      ],
    });
  }

  /**
   * Create log message metadata
   * @param {object} metadata
   * @param {Error} [error]
   * @returns {object}
   */
  _createMetadata(metadata = {}, error) {
    if (_.isError(metadata)) {
      return { [CONTEXT_ERROR]: metadata };
    }

    const metaClone = _.cloneDeep(metadata);

    if (_.isError(error)) {
      metaClone[CONTEXT_ERROR] = error;
    }

    return metaClone;
  }

  /**
   * Create the log message string
   * @returns {string}
   */
  _createLogMessage({ level, message, ...meta }) {
    let timestampString = '';
    let contextString = '';
    let errorString = '';
    const error = meta[CONTEXT_ERROR];

    delete meta[LEVEL];
    delete meta[MESSAGE];
    delete meta[SPLAT];
    delete meta[CONTEXT_ERROR];

    if (Logger.timestamp === true) {
      timestampString = `${new Date().toISOString()} `;
    }

    if (!_.isEmpty(this.context) || !_.isEmpty(meta)) {
      contextString = `${JSON.stringify(_.assign({}, this.context, meta))} `;
    }

    if (_.isError(error)) {
      if (Logger.stackTrace === true && error.stack) {
        errorString = ` => ${error.stack}`;
      } else {
        errorString = ` => ${error.name}: ${error.message}`;
      }
    }

    return `${timestampString}[${this.name}] ${level.toUpperCase()} - `
      + `${contextString}${message}${errorString}`;
  }

  /**
   * Get Logger name
   * @returns {string}
   */
  getName() {
    return this.name;
  }

  /**
   * Set Logger name
   * @param {string} name
   */
  setName(name) {
    this.name = name;
  }

  /**
   * Get current Logger context
   * @returns {object}
   */
  getContext() {
    return _.clone(this.context);
  }

  /**
   * Set a new Logger context
   * @param {object} context
   */
  setContext(context = {}) {
    this.context = _.clone(context);
  }

  /**
   * Assign new context to Logger
   * @param {object} context
   */
  assignContext(context = {}) {
    _.assign(this.context, context);
  }

  /**
   * Set a new Logger context property
   * @param {string} prop
   * @param {any} value
   */
  setContextProp(prop, value) {
    this.context[prop] = value;
  }

  /**
   * Log a error message
   * @param {string} message
   * @param {object | Error} [metadata]
   * @param {Error} [error]
   */
  error(message, metadata, error) {
    this.logger.error(message, this._createMetadata(metadata, error));
  }

  /**
   * Log a warn message
   * @param {string} message
   * @param {object | Error} [metadata]
   * @param {Error} [error]
   */
  warn(message, metadata, error) {
    if (Logger.shouldLog(LoggerLevel.WARN)) {
      this.logger.warn(message, this._createMetadata(metadata, error));
    }
  }

  /**
   * Log a info message
   * @param {string} message
   * @param {object} [metadata]
   */
  info(message, metadata) {
    if (Logger.shouldLog(LoggerLevel.INFO)) {
      this.logger.info(message, this._createMetadata(metadata));
    }
  }

  /**
   * Log a debug message
   * @param {string} message
   * @param {object} [metadata]
   */
  debug(message, metadata) {
    if (Logger.shouldLog(LoggerLevel.DEBUG)) {
      this.logger.debug(message, this._createMetadata(metadata));
    }
  }
}

// Init Logger with default values
Logger.level = Logger.getDefaultLevel();
Logger.timestamp = Logger.getDefaultTimestamp();
Logger.stackTrace = Logger.getDefaultStackTrace();

module.exports = { Logger, LoggerLevel };
