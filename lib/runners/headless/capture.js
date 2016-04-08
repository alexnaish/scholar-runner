function generateCaptureLogMessage(targetFile, clipRect) {
  var logMessage = 'Capturing page to ' + targetFile;
  if (clipRect) {
    logMessage += ' with dimensions: ' + clipRect.width + 'x' + clipRect.height;
  }
  console.log(logMessage);
}


function capture(page, targetFile, clipRect, callback) {
  if (clipRect && clipRect.top === undefined) {
    throw new Error('clipRect must be an Object instance.');
  }

  generateCaptureLogMessage(targetFile, clipRect);
  page.property('clipRect', clipRect).then(function(){
    try {
      page.render(targetFile).then(callback);
    } catch (e) {
      console.error('Failed to capture screenshot as ' + targetFile + ': ' + e);
      throw e;
    }
  });
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
