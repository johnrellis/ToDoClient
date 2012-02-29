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
        //extend your view with this to have a scrollable panel with native behavior
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
        defaults:{
            //id:'',
            text:'',
            done:false,
            group:"General"
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
        },

        toggle:function () {
            var self = this
            console.log('toggle')
            self.set('done', !self.get("done"))//fires a change event
            self.save();
        }

    }))

    bb.model.GroupItem = Backbone.Model.extend(_.extend({
        defaults:{
            name:"General"
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
        }

    }))


    bb.model.Items = Backbone.Collection.extend(_.extend({
        model:bb.model.Item,
        //localStorage:new Store("items"),
        url:'/api/rest/todo',
        initialize:function () {
            var self = this
            _.bindAll(self)
        },

        additem:function (item) {
            var self = this
            self.add(item)
            item.save({success:function (model, response) {
                console.log("Success")
            }})
        }
    }))


    bb.view.Head = Backbone.View.extend(_.extend({
        events:{
            'tap #add':function () {
                var self = this
                //TODO : unsure about accessing items using the app namespace.  Might limit re-usability of views
                app.view.newItem.showEditor()
            },
            'tap #cancel':function () {
                var self = this
                //TODO : unsure about accessing items using the app namespace.  Might limit re-usability of views
                app.view.newItem.hideEditor()
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
                title:self.$el.find('h1')
            }

            self.tm = {
                title:_.template(self.elem.title.html())
            }

            self.elem.add.hide()//add is shown when state is loaded
            self.elem.cancel.hide()

            app.model.state.on('change:items', self.render)
            self.items.on('add', self.render)
            self.items.on('remove', self.render)
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
        }
    }))

    bb.view.NewItem = Backbone.View.extend(_.extend({

        events:{
            'tap #save':function () {
                var self = this
                console.log('save')
                //var id = new Date().getTime()
                var todoText = self.elem.text.val();
                var groupName = self.elem.newGroup.val()
                if (todoText) {
                    var item = new bb.model.Item({
                        text:todoText,
                        //id:id,
                        done:false,
                        group:groupName
                    })
                    self.items.additem(item)
                    self.hideEditor()
                }
            }
        },

        initialize:function (items) {
            var self = this
            _.bindAll(self)
            self.setElement('#new-item')

            self.items = items

            self.elem = {
                save:self.$el.find('#save'),
                text:self.$el.find('#text'),
                newGroup:self.$el.find('#new-group')
            }

        },

        render:function () {
            var self = this
        },

        showEditor:function () {
            var self = this
            console.log('show editor')
            self.$el.slideDown()
            //TODO : unsure about accessing items in the app context, limits the re-usability of the view
            // but passing around references might be worse
            app.view.head.elem.add.hide()//when editing we want to show the cancel button instead of the add button
            app.view.head.elem.cancel.show()
        },

        hideEditor:function () {
            var self = this
            console.log('hide editor')
            self.$el.slideUp()
            //show the add button and hide the cancel button
            app.view.head.elem.cancel.hide()
            app.view.head.elem.add.show()
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
        },


        render:function () {
            var self = this

            self.$el.empty()

//            var groups = self.items.pluck("group").sort()
//
//            for (var i = 0; i < groups.length; i++) {
//                var group = groups[i]
//                var itemsInGroup = self.items.filter(function (item) {
//                    return item.get("group") == group
//                })
//                self.appendgroup(group)
//                self.appendItems(itemsInGroup)
//            }

            self.items.each(function (item) {
                self.appenditem(item)
            })
        },


        appendItems:function (items) {
            var self = this
            for (var i = 0; i < items.length; i++) {
                self.appenditem(items[i])
            }
        },

        appenditem:function (item) {
            var self = this
            console.log('append item called')

            var groupname = item.get("group") || "General"
            var group = self.findgroup(groupname)

            var itemview = new bb.view.Item({
                model:item
            })

            group.after(itemview.$el)

            //self.$el.append(itemview.$el)
            self.refreshList()
            //self.scroll()
        },

        findgroup:function (groupname) {
            //finds a group list divider by groupname
            //if one does not exist, it adds one
            var self = this;
            var group = self.$el.find("#" + app.generateGroupId(groupname))
            if (!group.attr("id")) {
                var newGroup = new bb.view.GroupItem({
                    model:new bb.model.GroupItem({name:groupname})
                })
                self.$el.append(newGroup.$el)
                self.refreshList()
                group = newGroup.$el
            }
            return group
        },

        refreshList:function () {
            var self = this
            console.log('bb.view.List refresh')
            //http://forum.jquery.com/topic/dynamically-add-style-list-item
            self.$el.listview("refresh")
        }

    }/*,scrollContent*/))//adds scrollContent's functions to the {} that represents the view


    bb.view.Item = Backbone.View.extend(_.extend({

        tagName:"li", //need to call listview refresh to add the proper class styling

        events:{
            'tap':function () {
                var self = this
                var model = self.model
                console.log("tap " + model.id)
                model.toggle()
                return false
            }
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
            self.$el.attr('id', self.model.id)
            self.render()
            self.model.bind('destroy', self.remove, self)
        },

        render:function () {
            var self = this

            var html = self.tm.item(self.model.toJSON())//model is set in view.List.appendItem, text is shown as that is in the template -text
            self.$el.append(html)//add the templated html

            var deletebutton = self.tm.deletebutton().attr('id', 'delete_' + self.model.id).hide()
            self.$el.append(deletebutton)

            self.$el.swipe(function () {
                console.log("show deletebutton " + self.model.id)
                deletebutton.toggle()
                return false
            })

            deletebutton.tap(function () {
                self.model.destroy()
            })
            //bind the view to changes in the model
            self.model.on('change:done', function (event) {
                console.log('change:done')
                self.refreshuistate()
            });
            //ensure the view represents the state of the model
            self.refreshuistate()
        },


        refreshuistate:function () {
            var self = this
            var done = self.model.get('done')
            console.log("refreshuistate : done = " + done)
            var check = self.$el.find('span.check')
            var text = self.$el.find('span.text')
            check.html(done ? '&#10003;' : '&nbsp;')
            text.css({'text-decoration':done ? 'line-through' : 'none' })
        },

        remove:function () {
            var self = this
            $(self.$el).remove();
        }

    }, {
        tm:{
            item:_.template($('#ul_tm').html()),
            deletebutton:function () {
                //return a new clone every time
                return $('#delete_tm').clone()
            }
        }
    }))


    bb.view.GroupItem = Backbone.View.extend(_.extend({

        tagName:"li", //need to call listview refresh to add the proper class styling

        initialize:function () {
            var self = this
            _.bindAll(self)
            self.$el.attr('data-role', "list-divider")
            self.render()
        },

        render:function () {
            var self = this
            var name = self.model.get("name")
            self.$el.html(name)
            self.$el.attr('id', app.generateGroupId(name))
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

app.generateGroupId = function (groupname) {
    return "group-" + groupname;
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

    app.view.newItem = new bb.view.NewItem(app.model.items)
    app.view.newItem.$el.hide()

    app.model.items.fetch({
        success:function () {
            app.model.state.set({items:'loaded'})
            app.view.list.render()
        }
    })

    console.log('end init')
}


$(app.init)