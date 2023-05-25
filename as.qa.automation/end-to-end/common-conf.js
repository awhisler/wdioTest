const chai = require('chai');
const { AllureService } = require('./function/service/allure-service');

process.env.TZ = 'UTC';
chai.config.truncateThreshold = 0;

exports.commonConfig = {
  framework: 'mocha',
  specs: [
    `${__dirname}/specs/**/*.spec.js`,
  ],
  suites: {
    home: [
      `${__dirname}/specs/portal/home/**/*.spec.js`,
    ],
  },
  maxInstances: 12,
  // Level of logging verbosity: trace | debug | info | warn | error | silent
  logLevel: 'error',
  coloredLogs: true,
  // Default timeout for all waitFor* commands.
  waitforTimeout: 40000,
  waitforInterval: 50,
  // Default timeout in milliseconds for request
  connectionRetryTimeout: 100000,
  connectionRetryCount: 3,
  services: [
    [
      AllureService,
      {
        saveHistory: true,
        autoGenerateOnComplete: true,
      },
    ],
  ],
  reporters: [
    [
      'spec',
      {
        showPreface: false,
        realtimeReporting: true,
      },
    ],
    [
      'allure',
      {
        outputDir: './function/service/reports/allure-results',
        addConsoleLogs: true,
        disableMochaHooks: true,
        disableWebdriverStepsReporting: true,
        issueLinkTemplate: 'https://absencesoft.atlassian.net/browse/{}',
      },
    ],
  ],
  specFileRetries: /^\d+$/.test(process.env.rerun) ? parseInt(process.env.rerun, 10) : 0,
  specFileRetriesDeferred: false,
  mochaOpts: {
    timeout: 200000,
    fullTrace: true,
  },
  async before() {
    await browser.setWindowSize(1880, 1040);
    global.expect = chai.expect;
  },
};
