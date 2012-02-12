function pd(func) {
    return function (event) {
        event.preventDefault()
        func && func(event)
    }
}

document.ontouchmove = pd()

_.templateSettings = {
    interpolate:/\{\{(.+?)\}\}/g,
    escape:/\{\{-(.+?)\}\}/g,
    evaluate:/\{\{=(.+?)\}\}/g
};


var browser = {
    android:/Android/.test(navigator.userAgent)//regex/.text('string to be tested')
}
browser.iphone = !browser.android


var app = {
    model:{},
    view:{}
}

var bb = {
    model:{},
    view:{}
}


bb.init = function () {

    var scrollContent = {
        scroll:function () {
            var self = this
            setTimeout(function () {
                if (self.scroller) {
                    self.scroller.refresh()
                }
                else {
                    //noinspection JSPotentiallyInvalidConstructorUsage
                    self.scroller = new iScroll($("div[data-role='content']")[0])
                }
            }, 1)
        }
    }


    bb.model.State = Backbone.Model.extend(_.extend({
        defaults:{
            items:'loading'
        }
    }))


    bb.model.Item = Backbone.Model.extend(_.extend({
        collection :bb.model.Items,
        defaults:{
            id:'',
            text:'',
            done:false
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
        }

    }))


    bb.model.Items = Backbone.Collection.extend(_.extend({
        localStorage:new Store("items"),
        model:bb.model.Item,


        initialize:function () {
            var self = this
            _.bindAll(self)
            self.count = 0

            self.on('reset', function () {
                self.count = self.length
            })
        },

        additem:function (item) {
            var self = this
            self.add(item)
            self.count++
            item.save()
        },

        testRemove : function (item){
            var self = this
            self.remove(item)
        }

    }))


    bb.view.Head = Backbone.View.extend(_.extend({
        events:{
            'tap #add':function () {
                var self = this
                self.showEditor()
            },
            'tap #cancel':function () {
                var self = this
                self.hideEditor()
            },
            'tap #save':function () {
                var self = this
                console.log('save')
                var id = new Date().getTime()
                var item = new bb.model.Item({
                    text:self.elem.text.val(),
                    id:id,
                    done:false
                })
                self.items.additem(item)
                self.hideEditor()
            }
        },

        initialize:function (items) {
            var self = this

            _.bindAll(self)
            self.items = items

            self.setElement("div[data-role='header']")

            self.elem = {
                add:self.$el.find('#add'),
                cancel:self.$el.find('#cancel'),
                title:self.$el.find('h1'),
                newItem:self.$el.find('#newItem'),
                save:self.$el.find('#save'),
                text:self.$el.find('#text')
            }

            self.tm = {
                title:_.template(self.elem.title.html())
            }

            self.elem.add.hide()
            self.elem.cancel.hide()
            self.elem.newItem.hide()

            app.model.state.on('change:items', self.render)
            self.items.on('add', self.render)
        },

        render:function () {
            var self = this

            var loaded = 'loaded' == app.model.state.get('items')

            self.elem.title.html(self.tm.title({
                title:loaded ? self.items.length + ' Items' : 'Loading...'
            }))

            if (loaded) {
                self.elem.add.show()
            }
        },

        showEditor:function () {
            var self = this
            console.log('show editor')
            self.elem.newItem.slideDown()
            self.elem.add.hide()
            self.elem.cancel.show()
            self.elem.text.focus()
        },

        hideEditor:function () {
            var self = this
            console.log('hide editor')
            self.elem.newItem.slideUp()
            self.elem.cancel.hide()
            self.elem.add.show()
            self.elem.text.val('').blur()
        }

    }))


    bb.view.List = Backbone.View.extend(_.extend({

        initialize:function (items) {
            var self = this
            _.bindAll(self)

            self.setElement('#list')

            self.items = items
            self.items.on('add', self.appenditem)
            self.items.on('remove', self.removeitem)
        },


        render:function () {
            var self = this

            self.$el.empty()

            self.items.each(function (item) {
                self.appenditem(item)
            })
        },


        appenditem:function (item) {
            var self = this

            var itemview = new bb.view.Item({
                model:item
            })

            self.$el.append(itemview.$el)
            //http://forum.jquery.com/topic/dynamically-add-style-list-item
            self.$el.listview("refresh")
            self.scroll()
        },

        removeitem:function(){
            console.log("running remove item")
        }

    }, scrollContent))//adds scrollContent's functions to the {} that represents the view


    bb.view.Item = Backbone.View.extend(_.extend({

        tagName:"li", //need to call listview refresh to add the proper class styling

        events:{
            "tap":function () {
                var self = this
                var model = self.model
                console.log("tap " + model.id)
                model.set("done", !model.get('done'))
                model.save()
            }
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
            self.$el.attr('id', self.model.id)
            self.render()
        },

        render:function () {
            var self = this
            var html = self.tm.item(self.model.toJSON())//model is set in view.List.appendItem, text is shown as that is in the template -text
            self.$el.append(html)//add the templated html
            var deletebutton = self.tm.deletebutton().attr('id', 'delete_' + self.model.id).hide()
            self.$el.append(deletebutton)

            self.$el.swipe(function () {
                console.log("show deletebutton " + self.model.id)
                deletebutton.show()
            })
            deletebutton.tap(function () {
                app.model.items.testRemove(self.model)
            })
            self.model.on('change:done', function (event) {
                console.log('change:done')
                self.refreshuistate()
            });
            self.refreshuistate()
        },

        refreshuistate:function () {
            var self = this
            var done = self.model.get('done')
            console.log("refreshuistate : done = " + done)
            self.$el.find('span.check').html(done ? '&#10003;' : '&nbsp;')
            self.$el.find('span.text').css({'text-decoration':done ? 'line-through' : 'none' })
        }



    }, {
        tm:{
            item:_.template($('#ul_tm').html()),
            deletebutton:function () {
                //return a new clone everytime
                return $('#delete_tm').clone()
            }
        }
    }))

}


app.init_browser = function () {
    if (browser.android) {
        $("#main div[data-role='content']").css({
            bottom:0
        })
    }
}


app.init = function () {
    console.log('start init')

    bb.init()

    app.init_browser()


    app.model.state = new bb.model.State()
    app.model.items = new bb.model.Items()

    app.view.head = new bb.view.Head(app.model.items)
    app.view.head.render()

    app.view.list = new bb.view.List(app.model.items)
    app.view.list.render()

    app.model.items.fetch({
        success:function () {
            app.model.state.set({items:'loaded'})
            app.view.list.render()
        }
    })


    console.log('end init')
}


$(app.init)
