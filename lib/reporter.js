function handleImageComparison(err, comparisonResults, options = {}) {
    if (err) {
        console.error(`Error passed to handleImageComparison! ${err}`);
        process.exit(1);
    }
    console.log('Final process complete, images submitted and compared.');

    let errorArray = comparisonResults.filter(result => !result.passes);

    if (errorArray.length) {
        console.error(`${errorArray.length} Failure${errorArray.length === 1 ? '' : 's'}`);
        console.table(
          errorArray.map(result => ({
              Name: result.name,
              "Diff Image": appConfig.scholarUrl + result.diffUrl,
              "Diff Percentage": result.difference + '%',
              "Same Resolution": result.isSameDimensions ? 'Yes' : 'No'
          }));
        );

        if (options.testReportDirectory) {
            createReportFile(errorArray, options.testReportDirectory);
        } else {
            process.exit(1);
        }
    } else {
        console.log('No errors!');
        process.exit();
    }
}

function createReportFile(failedResults, testReportDirectory) {
  fs.readFile(path.join(__dirname, 'report.template.html'), 'utf8', (err, html) => {
    if (err) {
      console.error('Error reading error report');
      process.exit(1);
    }

    let reportFile = path.join(process.cwd(), testReportDirectory, 'report.html');
    let imageHtml = '<div>';
    failedResults.forEach(result => {
      imageHtml += `
        <h2>${result.name}</h2>
        <p>Same Dimensions: ${result.isSameDimensions ? 'Yes' : 'No'}</p>
        <img src="${result.baselineImage}"/>
        <img src="${result.image}"/>
      `;
    });
    imageHtml += '</div>';

    fs.writeFileSync(reportFile, html.replace('${images}', imageHtml));
    console.log(`Created test report at: ${reportFile}`);
    process.exit(1);
  });
}
