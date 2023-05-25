const { default: allureReporter } = require('@wdio/allure-reporter');
const { Logger } = require('./logger');

const logger = Logger.create('AllureReporter');
// Allure Reporter Monkey Patch. It is done to control which status we will set for failed tests. By
// default allure reporter will use a 'failed' status if the error message contains the expect word
// and will set a 'broken' status otherwise.
const onTestFail = allureReporter.onTestFail;
allureReporter.onTestFail = function (test) {
  const endCase = this._allure.endCase;
  // endCase method is the one responsible to set the status. We should change its behavior inside
  // onTestFail implementation, so we can always set tests as 'failed'
  this._allure.endCase = (status, err, timestamp) => {
    logger.debug(`Previous Status: ${status}`);
    if (status === 'broken' || status === 'failed') {
      endCase.call(this._allure, 'failed', err, timestamp);
    }
  };
  // Call the original onTestFail method, which will end up calling the modified version of endCase
  onTestFail.call(this, test);
  // Return endCase to its original state after calling onTestFail, so other tests results will not
  // be affected
  this._allure.endCase = endCase;
};
