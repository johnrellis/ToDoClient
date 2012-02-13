// API implementation

var common = require('./common')

var uuid = common.uuid


var data = {}

var util = {}
util.validate = function (input) {
    return input.text
}

var debug = {}
debug.pd = function (restfunc) {
    return function (req, res) {
        console.log('before', data)
        var sendjson$ = res.sendjson$

        res.sendjson$ = function () {
            console.log('after', data)
            sendjson$.apply(res, Array.prototype.slice.call(arguments))
        }

        restfunc(req, res)
    }
}


exports.ping = function (req, res) {
    var output = {ok:true, time:new Date()}
    res.sendjson$(output)
}


exports.echo = function (req, res) {
    var output = req.query

    if ('POST' == req.method) {
        output = req.body
    }

    res.sendjson$(output)
}


exports.rest = {

    create:debug.pd(function (req, res) {
        var input = req.body

        if (!util.validate(input)) {
            return res.send$(400, 'invalid')
        }

        var todo = {
            text:input.text,
            created:new Date().getTime(),
            id:uuid.v4()
        }

        data[todo.id] = todo

        var output = todo
        res.sendjson$(output)
    }),


    read:debug.pd(function (req, res) {
        var input = req.params

        var output = data[input.id]
        if (output) {
            res.sendjson$(output)
        }
        else {
            res.send$(404, 'not found')
        }
    }),


    list:debug.pd(function (req, res) {
        var input = req.query
        var output = []

        for (var id in data) {
            output.push(data[id])
        }

        // sort in descending order
        output.sort(function (a, b) {
            return b.created - a.created
        })

        res.sendjson$(output)
    }),


    update:debug.pd(function (req, res) {
        var id = req.params.id
        var input = req.body

        if (!util.validate(input)) {
            return res.send$(400, 'invalid')
        }

        var todo = data[id]
        if (!todo) {
            res.send$(404, 'not found')
        }

        todo.text = input.text

        var output = todo
        res.sendjson$(output)
    }),


    del:debug.pd(function (req, res) {
        var input = req.params

        var output = data[input.id] || {}
        delete data[input.id]

        res.sendjson$(output)
    }),

}
