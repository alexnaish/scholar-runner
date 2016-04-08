module.exports = function(callback) {
  var data = '';
  var self = process.stdin;
  
  self.on('readable', function() {
      var chunk = this.read();
      if (chunk !== null) {
         data += chunk;
      }
  });
  self.on('end', function() {
    var config = JSON.parse(data.trim());
    callback(config)
  });
};
