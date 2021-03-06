var wd = require('wd');
require('colors');

var _ = require('lodash');
var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');

//var url = 'http://localhost:3000/';
//var url = 'https://sample-cloud-native-toolchain-tutorial-20200611112251240-test.mybluemix.net/docs/'
var url = 'https://sample-cloud-native-toolchain-tutorial-20200611112251240.mybluemix.net/'

if (process.env.APP_URL && process.env.APP_URL !== 'undefined') {
  url = process.env.APP_URL;
  if (!url.endsWith("/")) {
    url = url + "/";
  }
} else if (process.env.APP_NAME && process.env.APP_NAME !== '') {
  url = 'http://' + process.env.APP_NAME + '-test.mybluemix.net/';
}

var assert = require('assert');
var testEventTS = new Date().getTime();
var testEventDesc = 'Sauce Test Event TS: ' + testEventTS;

chai.use(chaiAsPromised);
chai.should();
chaiAsPromised.transferPromiseness = wd.transferPromiseness;

// checking sauce credential
if (process.env.SAUCE_USERNAME == '' || process.env.SAUCE_ACCESS_KEY == '') {
  console.warn(
    '\nPlease configure your sauce credential:\n\n' +
    'export SAUCE_USERNAME=<SAUCE_USERNAME>\n' +
    'export SAUCE_ACCESS_KEY=<SAUCE_ACCESS_KEY>\n\n'
  );
  throw new Error('Missing Sauce Labs Credentials!');
}

// http configuration, not needed for simple runs
wd.configureHttp({
  timeout: 600000,
  retryDelay: 15000,
  retries: 5,
});

var desired = JSON.parse(process.env.DESIRED || '{browserName: "chrome"}');
desired.name = 'example with ' + desired.browserName;
desired.tags = ['tutorial'];

describe('tutorial (' + desired.browserName + ')', function() {
  var browser;
  var allPassed = true;

  before(function(done) {
    var username = process.env.SAUCE_USERNAME;
    var accessKey = process.env.SAUCE_ACCESS_KEY;

    browser = wd.promiseChainRemote('ondemand.saucelabs.com', 80, username, accessKey);

    if (process.env.VERBOSE) {

      // optional logging
      browser.on('status', function(info) {
        console.log(info.cyan);
      });

      browser.on('command', function(meth, path, data) {
        console.log(' > ' + meth.yellow, path.grey, data || '');
      });
    }

    browser
      .init(desired)
      .nodeify(done);
  });

  afterEach(function(done) {
    allPassed = allPassed && (this.currentTest.state === 'passed');
    done();
  });

  after(function(done) {
    browser
      .quit()
      .sauceJobStatus(allPassed)
      .nodeify(done);
  });

  it('Pre post event', function(done) {
    var request = require('request');
    var options = {
      uri: url + '/event?source=custom&hook=' + process.env.SAUCE_HOOK_ID,
      headers: {
        'Content-type': 'application/json',
      },
      agentOptions: {
        rejectUnauthorized: false,
      },
      method: 'POST',
      json: {
        '@timestamp': testEventTS,
        severity_type: 'error',
        severity: 'Error',
        env: process.env.NODE_ENV,
        text: 'Event from Sauce Labs Test',
        description: testEventDesc,
        source: 'custom',
      },
    };

    request(options, function(error, res, body) {
      done();
    });
  });

  it('Landing page', function(done) {
    browser
      .get(url)
      .title()
      .should.become('DevOps Tutorial App')
      .nodeify(done);
  });

});
