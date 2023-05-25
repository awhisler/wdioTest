const allure = require('allure-commandline');
const fsPromise = require('fs/promises');
const { Logger } = require('./logger');
// Require necessary patches for allure reporter
require('./allure-reporter-patch');

const logger = Logger.create('AllureService');
const DEFAULT_OPTIONS = {
  saveHistory: true,
  autoGenerateOnComplete: true,
};

const fileExists = async function (path) {
  return fsPromise.access(path).then(() => true, () => false);
};

/**
 * Use custom categories creating a categories.json file inside `allure-results` folder.
 * Check `allure-categories.json` for categories content.
 * @see {@link https://docs.qameta.io/allure/#_categories_2}
 */
const setupCategories = async function () {
  if (!await fileExists('./function/service/reports/allure-results')) {
    await fsPromise.mkdir('./function/service/reports/allure-results');
  }
  await fsPromise.copyFile(
    './function/service/allure-categories.json',
    './function/service/reports/allure-results/categories.json',
  );
};

/**
 * Keep Allure history trends if available
 * @see {@link https://stackoverflow.com/questions/50376630/allure-reports-to-see-historic-trends}
 */
const saveHistory = async function () {
  if (await fileExists('./function/service/reports/allure-reports/history')) {
    if (!await fileExists('./function/service/reports/allure-results/history')) {
      await fsPromise.mkdir('./function/service/reports/allure-results/history');
    }
    if (await fileExists('./function/service/reports/allure-reports/history/categories-trend.json')) {
      await fsPromise.copyFile(
        './function/service/reports/allure-reports/history/categories-trend.json',
        './function/service/reports/allure-results/history/categories-trend.json',
      );
    }
    if (await fileExists('./function/service/reports/allure-reports/history/duration-trend.json')) {
      await fsPromise.copyFile(
        './function/service/reports/allure-reports/history/duration-trend.json',
        './function/service/reports/allure-results/history/duration-trend.json',
      );
    }
    if (await fileExists('./function/service/reports/allure-reports/history/history-trend.json')) {
      await fsPromise.copyFile(
        './function/service/reports/allure-reports/history/history-trend.json',
        './function/service/reports/allure-results/history/history-trend.json',
      );
    }
    if (await fileExists('./function/service/reports/allure-reports/history/history.json')) {
      await fsPromise.copyFile(
        './function/service/reports/allure-reports/history/history.json',
        './function/service/reports/allure-results/history/history.json',
      );
    }
    if (await fileExists('./function/service/reports/allure-reports/history/retry-trend.json')) {
      await fsPromise.copyFile(
        './function/service/reports/allure-reports/history/retry-trend.json',
        './function/service/reports/allure-results/history/retry-trend.json',
      );
    }
  }
};

/**
 * Create the Allure report files inside `allure-reports` folder using the contents from
 * `allure-results` folder.
 */
const generateReport = async function () {
  const generation = allure([
    'generate',
    '--clean',
    '--output', './function/service/reports/allure-reports/',
    './function/service/reports/allure-results/',
  ]);
  return new Promise((resolve, reject) => {
    const generationTimeout = setTimeout(
      () => reject(new Error('Error to generate Allure report: timeout')),
      30000,
    );
    generation.on('exit', function (exitCode) {
      clearTimeout(generationTimeout);
      if (exitCode !== 0) {
        return reject(new Error(`Error to generate Allure report: code=${exitCode}`));
      }
      return resolve();
    });
  });
};

const deleteFailedTestsDirectory = async function () {
  if (await fileExists('./function/service/reports/failed-tests')) {
    await fsPromise.rm('./function/service/reports/failed-tests', { recursive: true });
  }
};

const createFailedTestsDirectory = async function () {
  if (!await fileExists('./function/service/reports/failed-tests')) {
    await fsPromise.mkdir('./function/service/reports/failed-tests', { recursive: true });
  }
};

const deleteFailedTestsFiles = async function () {
  if (await fileExists('./function/service/reports/failed-tests/tests.txt')) {
    await fsPromise.rm('./function/service/reports/failed-tests/tests.txt');
  }
};

const createFailedTestsFiles = async function (specs) {
  specs.forEach(async function (spec) {
    const name = spec.substr(spec.indexOf('specs/'), spec.length);
    if (!await fileExists('./function/service/reports/failed-tests/tests.txt')) {
      await fsPromise.writeFile('./function/service/reports/failed-tests/tests.txt', name, { encoding: 'utf8' });
    } else {
      await fsPromise.appendFile('./function/service/reports/failed-tests/tests.txt', ` ${name}`, { encoding: 'utf8' });
    }
  });
};
class AllureService {
  constructor(serviceOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...serviceOptions };
  }

  async onPrepare() {
    await deleteFailedTestsDirectory();
    await createFailedTestsDirectory();
  }

  async before(caps, specs, browser) {
    this.browser = browser;
  }

  async afterTest(test, context, { passed }) {
    if (passed !== true) {
      await this.browser.takeScreenshot();
    }
  }

  async afterHook(test, context, { passed }) {
    if (passed !== true) {
      await this.browser.takeScreenshot();
    }
  }

  async after(result, caps, specs) {
    if (result !== 0) {
      await createFailedTestsFiles(specs);
    } else {
      await deleteFailedTestsFiles(specs);
    }
  }

  async onComplete() {
    await setupCategories();
    if (this.options.saveHistory === true) {
      await saveHistory();
    }
    if (this.options.autoGenerateOnComplete === true) {
      await generateReport();
    }
    const failedTests = await fsPromise.readFile('./function/service/reports/failed-tests/tests.txt');
    if (failedTests.length > 0) {
      logger.error(
        '\n\n'
        + '=============\n'
        + `FAILED TESTS: ${failedTests}\n`
        + '=============',
      );
    }
    await deleteFailedTestsDirectory();
  }
}
module.exports = {
  AllureService,
};
