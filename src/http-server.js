var connect = require('connect');

// servidor http
connect.createServer(
    connect.static(__dirname)
).listen(9999);