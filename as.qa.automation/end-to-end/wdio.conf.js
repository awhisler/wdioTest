const { commonConfig } = require('./common-conf');

process.env.TZ = 'UTC';

exports.config = {
  ...commonConfig,
  runner: 'local',
  capabilities: [
    {
      browserName: 'chrome',
      'goog:chromeOptions': {
        /* args: [
          '--headless',
          '--disable-gpu',
        ], */
        prefs: {
          directory_upgrade: true,
          prompt_for_download: false,
        },
      },
      acceptInsecureCerts: true,
    },
  ],
  services: [
    'chromedriver',
    ...commonConfig.services,
  ],
};
