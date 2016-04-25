var expect = require('chai').expect;
var dirHelper = require('../helpers/directories');
var pipeHelper = require('../helpers/stdin');
var testHelper = require('../helpers/fetchTests');

describe('My first spec', () => {
    it('should do something', () => {
        expect(1).to.equal(1);
    });
});