var common = require('./common')
var api = require('./db-rest-api')

var connect = common.connect


function init() {
    var server = connect.createServer()
    server.use(connect.logger())
    server.use(connect.bodyParser())
    server.use(connect.query())

    api.connect(
            {
                name:   'johnrellis',
                server: '127.0.0.1',
                port:   27017
            },
            function(err){
                if( err ) return console.log(err);

                server.listen(8180)
            }
    )

    server.use(function (req, res, next) {
        res.sendjson$ = function (obj) {
            common.sendjson(res, obj)
        }

        res.send$ = function (code, text) {
            res.writeHead(code, '' + text)
            res.end()
        }

        res.err$ = function (win) {
            //returns the callback function with two params so for example, the mongo insert uses this returned function
            //as a callback, the callback has a closure containing "win" at runtime
            return function (err, output) {
                console.log("Calling res.err$ callback")
                if (err) {
                    res.send$(500, err)
                }
                else {
                    //same as : win == null ? null : win(output)
                    //same as : win == null ? win : win(output)
                    //win may be null as javascript does not enforce a set num of arguments when a function is called
                    win && win(output)
                }
            }
        }


        next()
    })

    var router = connect.router(function (app) {
        app.get('/api/ping', api.ping)
        app.get('/api/echo', api.echo)
        app.post('/api/echo', api.echo)

        app.post('/api/rest/todo', api.rest.create)
        app.get('/api/rest/todo/:id', api.rest.read)
        app.get('/api/rest/todo', api.rest.list)
        app.put('/api/rest/todo/:id', api.rest.update)
        app.del('/api/rest/todo/:id', api.rest.del)

    })
    server.use(router)

    server.use(connect.static(__dirname + '/../../site/public'))

    server.listen(8180)
}


init()
