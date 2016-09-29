#!/usr/bin/env node

'use strict';

const program = require('commander');
const path = require('path');
const pick = require('lodash.pick');
const merge = require('lodash.merge');
const packageJson = require('./package.json');
const buildDirectories = require('./helpers/directories');
const pipeHelper = require('./helpers/stdin');
const testHelper = require('./helpers/fetchTests');

program
    .version(packageJson.version)
    .option('-b, --browser <option>', 'Define test browser (defaults to "phantomjs")', 'phantomjs')
    .option('-r, --runner <option>', 'Define the runner for the tests e.g. local, remote (defaults to "local")', 'local')
    .option('--compareLocally', 'Define to run the comparison locally (defaults to false)')
    .option('--seleniumVersion <version>', 'Optionally use a specific selenium version', '2.53.0')
    .option('--verbose', 'Define selenium log level')
    .option('-s, --suite <suite>', 'Define file to run (optional)')
    .option('-t, --type <key>', 'Define subset of tests to run (optional)', 'all')
    .option('-c, --config <filePath>', 'Define config file location (defaults to "config/scholar.js")', 'config/scholar.js')
    .option('-d, --directory <testDirectory>', 'Define test files directory (defaults to "process.cwd()/test/")', 'test')
    .option('-o, --output <imageDirectory>', 'Define directory to place screenshots (defaults to "process.cwd()/test_images/")', 'test_images')
    .option('-r, --testReportDirectory <testReportDirectory>', 'Define directory to place report html (defaults to "process.cwd()/test_images/")', 'test_images')
    .option('--baselineDirectory <baselineDirectory>', 'Define baseline files directory (defaults to "process.cwd()/baselines/")', 'baselines')
    .parse(process.argv);

const appConfig = require(path.join(process.cwd(), program.config));
let options;

buildDirectories(program, ['output', 'baselineDirectory']);
pipeHelper(mergeData);

function mergeData(parsedData) {
    merge(appConfig, parsedData);
    options = pick(program, ['browser', 'compareLocally', 'runner', 'verbose', 'seleniumVersion', 'output', 'baselineDirectory', 'testReportDirectory']);
    testHelper(program.directory, program.suite, program.type, generateSpecs);
}

function generateSpecs(testResults) {
    options.scenarios = testResults;
    if (program.browser === 'phantom') options.browser = 'phantomjs';
    require('./lib/runner')(appConfig, options)
}
