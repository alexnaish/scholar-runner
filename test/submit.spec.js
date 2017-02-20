'use strict';

const expect = require('chai').expect;
const sinon = require('sinon');
const fs = require('fs');
const request = require('request');

const submit = require('../lib/submit');

describe('Submit', () => {

    const mockUrl = 'http://scholarServerEndpoint';
    const mockImageResults = [{
        scenario: {
            name: 'First Test',
            labels: ['something']
        },
        filePath: 'someFileLocation',
        browser: 'Test',
        resolution: '1280x400'
    }, {
        scenario: {
            name: 'Second Test'
        },
        filePath: 'anotherFileLocation',
        browser: 'Test',
        resolution: '200x300'
    }];
    let sandbox, fileStub, postStub;

    beforeEach(() => {
        sandbox = sinon.sandbox.create();
        fileStub = sandbox.stub(fs, 'readFile').yields(null, 'mockbase64string');
        postStub = sandbox.stub(request, 'post').yields(null, 200, JSON.stringify({
            some: 'json'
        }));
    });

    afterEach(() => {
        sandbox.restore();
    });

    it('should read each image from disk', (done) => {
        submit(mockUrl, mockImageResults, (err, results) => {
            expect(fileStub.callCount).to.equal(mockImageResults.length, 'Expect file reads to match amount of images');
            expect(fileStub.calledWith(mockImageResults[0].filePath)).to.equal(true);
            expect(fileStub.calledWith(mockImageResults[1].filePath)).to.equal(true);
            done();
        });
    });

    it('should throw an exception if any image fails to be read', (done) => {
        fileStub.yields({
            some: 'error'
        }, null);
        try {
            submit(mockUrl, mockImageResults, (err, results) => {
                expect(true).to.equal(false, 'Should not have reached callback!');
                done();
            });
        } catch (err) {
            expect(err).to.be.defined;
            done();
        }
    });

    it('should attempt to post each image to the API', (done) => {
        submit(mockUrl, mockImageResults, (err, results) => {
            expect(postStub.callCount).to.equal(mockImageResults.length, 'Expect amount of post requests to match amount of images');
            expect(postStub.calledWith(`${mockUrl}/api/screenshot/${mockImageResults[0].scenario.name}`)).to.equal(true);
            expect(postStub.calledWith(`${mockUrl}/api/screenshot/${mockImageResults[1].scenario.name}`)).to.equal(true);
            done();
        });
    });

    it('should send image metadata headers with each request', (done) => {

				const imageIndex = 0;

        submit(mockUrl, mockImageResults, (err, results) => {
            const requestPayload = postStub.getCall(imageIndex).args[1];
						expect(requestPayload).to.have.property('headers');
						expect(requestPayload.headers).to.have.property('X-Scholar-Meta-Browser', mockImageResults[imageIndex].browser);
						expect(requestPayload.headers).to.have.property('X-Scholar-Meta-Resolution', mockImageResults[imageIndex].resolution);
						expect(requestPayload.headers).to.have.property('X-Scholar-Meta-Labels', mockImageResults[imageIndex].scenario.labels.join(', '));
						expect(requestPayload).to.have.property('form');
						expect(requestPayload.form).to.have.property('imageData');
            done();
        });
    });

    it('should manage errors if API response is invalid', () => {
        postStub.yields(null, 500, 'Server unavailable.');
        expect(submit.bind(null, mockUrl, mockImageResults)).to.throw();
    });
});
