'use strict';

const expect = require('chai').expect;
const mock = require('mock-require');
const sinon = require('sinon');
const nodeDir = require('node-dir');

const fetchTests = require('../helpers/fetchTests');

describe('Helper: Fetch Tests', () => {

    const mockFileList = [
        'some-irrelevant-file.js',
        'test1-spec.js',
        'mobile-spec.js'
    ];

    const mockFile1 = {
        all: [{}],
        custom: [{}, {}, {}, {}]
    };

    const mockFile2 = {
        all: [{}]
    };

    mock('test1-spec.js', mockFile1);
    mock('mobile-spec.js', mockFile2);

    let sandbox, fileStub;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        fileStub = sandbox.stub(nodeDir, 'files').yields(null, mockFileList);
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should throw an exception if an error occurs', () => {

        fileStub.yields({
            error: 'something went wrong'
        }, null);

        try {
          expect(fetchTests('test', null, null)).to.throw();
        } catch (err) {
          expect(err).to.be.defined;
        }

    });

    it('should only read all specs from all relevant files', (done) => {
        fetchTests('test', null, 'all', (results) => {
            expect(results.length).to.equal(mockFile1.all.length + mockFile2.all.length);
            done();
        });

    });

});
