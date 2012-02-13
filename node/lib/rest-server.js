var common = require('./common')
var api = require('./rest-api')

var connect = common.connect


function init() {
    var server = connect.createServer()
    server.use(connect.logger())
    server.use(connect.bodyParser())
    server.use(connect.query())

    server.use(function (req, res, next) {
        res.sendjson$ = function (obj) {
            common.sendjson(res, obj)
        }

        res.send$ = function (code, text) {
            res.writeHead(code, '' + text)
            res.end()
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
