// API implementation

var common = require('./common')

var mongodb = common.mongodb


var todocoll = null

var util = {}

util.validate = function (input) {
    return input.text
}

util.fixid = function (doc) {
    if (doc._id) {
        doc.id = doc._id.toString()
        delete doc._id
    }
    else if (doc.id) {
        doc._id = new mongodb.ObjectID(doc.id)
        delete doc.id
    }
    return doc
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

    create:function (req, res) {
        var input = req.body
        console.log("creating db entry " + input.text)
        if (!util.validate(input)) {
            return res.send$(400, 'invalid')
        }

        var todoItem = {
            text:input.text,
            done:input.done,
            created:new Date().getTime(),
            group:input.group
        }

        //lab code had "todocoll.insert(todoItem, res.err$(res,function( docs ){"
        //john removed extra res in the err$ function arguments
        todocoll.insert(todoItem, res.err$(function (docs) {
            console.log("Calling win")
            var output = util.fixid(docs[0])
            res.sendjson$(output)
        }))

        /*
         Below is an example if an insert without using the higher level function res.err$
         */
//        todocoll.insert(todoItem, {safe:true}, function(err,objects){
//            if(err){
//                console.log("Error when inserting")
//            } else {
//                console.log(JSON.stringify(objects))
//                common.sendjson(res, util.fixid( objects[0]))
//            }
//        })
    },


    read:function (req, res) {
        var input = req.params

        console.log(req.params)

        var query = util.fixid({id:input.id})
        todocoll.findOne(query, res.err$(function (doc) {
            if (doc) {
                var output = util.fixid(doc)
                res.sendjson$(output)
            }
            else {
                res.send$(404, 'not found')
            }
        }))
    },


    list:function (req, res) {
        var input = req.query
        var output = []

        var query = {}
        var options = {sort:[
            ['created', 'desc']
        ]}

        todocoll.find(query, options, res.err$(function (cursor) {
            cursor.toArray(res.err$(function (docs) {
                output = docs
                output.forEach(function (item) {
                    util.fixid(item)
                })
                res.sendjson$(output)
            }))
        }))
    },


    update:function (req, res) {
        var id = req.params.id
        var input = req.body

        if (!util.validate(input)) {
            return res.send$(404, 'invalid')
        }

        var query = util.fixid({id:id})
        //john added {safe:true} to prevent upsert, count was also coming back undefined
        todocoll.update(query, {$set:{text:input.text, done:input.done}}, {safe:true}, res.err$(function (count) {
            console.log("Result of update : " + count)
            if (0 < count) {
                var output = {id:id}
                res.sendjson$(output)
            }
            else {
                console.log('Did not find object to update ' + id)
                res.send$(404, 'not found')
            }
        }))
    },


    del:function (req, res) {
        //del works as provided
        var input = req.params

        var query = util.fixid({id:input.id})
        todocoll.remove(query, res.err$(function () {
            var output = {}
            res.sendjson$(output)
        }))
    }

}


exports.connect = function (options, callback) {
    var client = new mongodb.Db(options.name, new mongodb.Server(options.server, options.port, {}))
    client.open(function (err, client) {
        if (err) return callback(err);

        client.collection('todo-john-rellis', function (err, collection) {
            if (err) return callback(err);

            todocoll = collection
            callback()
        })
    })
}
