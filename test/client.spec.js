const expect = require('chai').expect;
const sinon = require('sinon');
const webdriverio = require('webdriverio');

const createClient = require('../helpers/client');

describe('Helper: Client', () => {

  let sandbox;
  let remoteStub;
  let initStub;

  beforeEach(() => {
      sandbox = sinon.sandbox.create();
      initStub = sandbox.stub();
      remoteStub = sandbox.stub(webdriverio, 'remote').returns({
        init: initStub
      });
  });

  afterEach(() => {
      sandbox.restore();
  });

  it('should supply base options', () => {
    createClient({}, {});
    const clientOptions = remoteStub.getCall(0).args[0];

    expect(clientOptions).to.have.property('logLevel', 'silent');
    expect(clientOptions).to.have.property('desiredCapabilities');
    expect(clientOptions).to.have.property('phantomjs.binary.path');

    expect(clientOptions.desiredCapabilities).to.deep.equal({
      browserName: 'chrome',
      platform: 'ANY'
    });

  });

  it('should set correct desiredCapabilities based off browser choice', () => {
    const options = {
      browser: 'test'
    };
    const config = {
      capabilitiesMap: {
        test: 'it worked!'
      }
    }

    createClient(config, options);
    const clientOptions = remoteStub.getCall(0).args[0];
    expect(clientOptions).to.have.property('desiredCapabilities', config.capabilitiesMap.test);

  });

  it('should set verbose mode based off options', () => {
    createClient({}, {verbose: true});
    const clientOptions = remoteStub.getCall(0).args[0];
    expect(clientOptions).to.have.property('logLevel', 'verbose');
  });

});
