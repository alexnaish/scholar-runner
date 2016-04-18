const Transform = require('stream').Transform;

module.exports = function (callback) {
    if (process.stdin.isTTY) {
        return callback();
    }

    const rs = new Transform({
        transform: function (chunk, encoding, next) {
            this.data = this.data || '';
            if (chunk !== null) {
                this.data += chunk;
            }
            this.push(chunk);
            next();
        },
        flush: function (done) {
            try {
                callback(JSON.parse(this.data.trim()));
            } catch (e){
                callback()
            } finally {
                done();
            }
        }
    });

    process.stdin.pipe(rs)
        .on('error', function (error) {
            console.error('Pipe handler errored', error);
            callback();
        });
};
