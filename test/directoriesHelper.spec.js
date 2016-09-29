'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const mkdirp = require('mkdirp');

const createDirectories = require('../helpers/directories');

describe('Helper: Directory', () => {

    const mockProgram = {
      first: 'something',
      second: 'else',
      third: 'again',
    };
    const mockKeys = ['first', 'second', 'third'];
    const missingKey = ['someKeyThatDoesntExist'];
    let sandbox, fileStub;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        fileStub = sandbox.stub(mkdirp, 'sync');
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should pick each directory based off key each image from disk', () => {
      createDirectories(mockProgram, mockKeys);
      expect(fileStub.callCount).to.equal(mockKeys.length, 'Expected one call per key');
    });


    it('should ignore any keys that arent found', () => {
      createDirectories(mockProgram, mockKeys.concat(missingKey));
      expect(fileStub.callCount).to.equal(mockKeys.length, 'Expected one call per key');
    });

});
