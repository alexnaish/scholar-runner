function generateCaptureLogMessage(targetFile, clipRect) {
  var logMessage = 'Capturing page to ' + targetFile;
  if (clipRect) {
    logMessage += ' with dimensions: ' + clipRect.width + 'x' + clipRect.height;
  }
  console.log(logMessage);
}

function capture(page, targetFileName, clipRect, callback) {
  if (clipRect && clipRect.top === undefined) {
    throw new Error('clipRect must be an Object instance.');
  }

  var filePath = process.cwd() + '/test_out/images/' + targetFileName + '.png';

  generateCaptureLogMessage(filePath, clipRect);
  page.property('clipRect', clipRect);
  try {
    page.render(filePath)
      .then(function() {
        return callback(null, {
          name: targetFileName,
          filePath: filePath,
          browser: 'PhantomJS',
          resolution: clipRect.width + 'x' + clipRect.height
        })
      })
      .catch(function(error){
        console.error('Image rendering error! ', error);
        return callback(error, null);
      });
  } catch (e) {
    console.error('Failed to capture screenshot as ' + targetFile + ': ' + e);
    throw e;
  }

}

module.exports = {

  selector: function(page, targetFile, selector, callback) {
    page.evaluate(function(selector) {
        return document.querySelector(selector).getBoundingClientRect();
      }, selector)
      .then(function(clipRect) {
        capture(page, targetFile, clipRect, callback);
      });
  }
};
