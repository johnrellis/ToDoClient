function pd(func) {
    return function (event) {
        event.preventDefault()
        func && func(event)
    }
}

document.ontouchmove = pd()//nicely prevents the browser from being moved arounds

_.templateSettings = {
    interpolate:/\{\{(.+?)\}\}/g,
    escape:/\{\{-(.+?)\}\}/g,
    evaluate:/\{\{=(.+?)\}\}/g
};


var browser = {
    android:/Android/.test(navigator.userAgent)//regex/.test('string to be tested')
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

    //TODO : iScroll is causing UI refresh issues in mobile safari and android.
    //TODO : iScroll is causing JQuery select item to fail
    var scrollContent = {
        //extend your view with this to have a scrollable panel with native behavior
        scroll:function () {
            var self = this
            if (browser.iphone) {
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
    }


    bb.model.State = Backbone.Model.extend(_.extend({
        defaults:{
            items:'loading'
        }
    }))

    bb.model.CurrentUniverseCoords = Backbone.Model.extend(_.extend({
        defaults:{
            address:'finding location..'
        }
    }))

    //this is the actual to do item, holds the text, whether it is done, and the group the to do belongs to
    //your view component should bind to the the done property, an example is in bb.view.item where 'change:done' is used
    bb.model.Item = Backbone.Model.extend(_.extend({
        defaults:{
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
            self.set('done', !self.get("done"))//fires a change event, currently cought by bb.view.item
            self.save();
        }

    }))

    //represents a category for to do items to reside in
    bb.model.GroupItem = Backbone.Model.extend(_.extend({
        defaults:{
            name:"General"
        },

        initialize:function () {
            var self = this
            _.bindAll(self)
        }

    }))


    //stores all the to do items
    bb.model.Items = Backbone.Collection.extend(_.extend({
        model:bb.model.Item,
        url:'/api/rest/todo',

        initialize:function () {
            var self = this
            _.bindAll(self)
        },

        additem:function (item) {
            var self = this
            self.add(item)
            item.save()
            //TODO : asynchronous save does not seem to be working
            //TODO : deal with failed saves
            /*item.save({success:function (model, response) {
             console.log("Success")
             }})*/
        }
    }))


    bb.view.Footer = Backbone.View.extend(_.extend({
        initialize:function () {
            var self = this
            _.bindAll(self)
            self.setElement("div[data-role='footer']")
            app.model.position.on('change:address', self.render)

            self.elem = {
                title:self.$el.find('h4')
            }

            self.tm = {
                title:_.template(self.elem.title.html())
            }

        },

        render:function () {
            var self = this
            console.log("render footer")
            self.elem.title.html(self.tm.title({
                position:app.model.position.get("address")
            }))
        }
    }))

    //the header contains an add button, a hidden cancel button and the title
    bb.view.Head = Backbone.View.extend(_.extend({
        events:{
            'tap #add':pd(function () {
                var self = this
                //TODO : unsure about accessing items using the app namespace.  Might limit re-usability of views
                app.view.newItem.showEditor()
            }),
            'tap #cancel':pd(function () {
                var self = this
                //TODO : unsure about accessing items using the app namespace.  Might limit re-usability of views
                app.view.newItem.hideEditor()
            })
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

            //update the header by binding to the items model
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

    //wraps '#new-item'
    bb.view.NewItem = Backbone.View.extend(_.extend({

        events:{
            'tap #save':function () {
                var self = this
                console.log('save')

                var todoText = self.elem.text.val();
                var groupName
                //if new group has a value, use that as the group
                if (self.elem.newGroup.val()) {
                    groupName = self.elem.newGroup.val()
                } else {
                    groupName = self.elem.groupSelect.val()
                }
                if (todoText && groupName) {
                    var item = new bb.model.Item({
                        text:todoText,
                        done:false,
                        group:groupName
                    })
                    self.items.additem(item)
                    self.hideEditor()
                }
            },
            'tap #add-new-group':function () {
                var self = this

                self.elem.newGroup.slideDown()

                self.elem.addNewGroup.hide()
                self.elem.cancelNewGroup.show()
            },

            'tap #cancel-new-group':function () {
                var self = this

                self.elem.newGroup.val('')
                self.elem.newGroup.blur()
                self.elem.newGroup.slideUp()

                self.elem.addNewGroup.show()
                self.elem.cancelNewGroup.hide()
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
                groupSelect:self.$el.find('#group-select'),
                newGroup:self.$el.find('#new-group'),
                cancelNewGroup:self.$el.find('#cancel-new-group'),
                addNewGroup:self.$el.find('#add-new-group')
            }
            self.elem.newGroup.hide()
            self.elem.cancelNewGroup.hide()
            //whenever an item is added to items, ensure the group select has its group
            self.items.on('add', self.appendgroup)
        },

        render:function () {
            var self = this
            self.items.each(function (item) {
                self.appendgroup(item)
            })
        },

        appendgroup:function (item) {
            var self = this
            // add the items group if it doesn't exist already
            var groupname = item.get("group")
            var existingOption = self.elem.groupSelect.find('option[value="' + groupname + '"]');
            if (!existingOption.attr("value")) {
                //TODO : this should use templates?
                self.elem.groupSelect.append("<option value='" + groupname + "'>" + groupname + "</option>")
            }
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
            self.elem.newGroup.val('').blur()
            self.elem.newGroup.hide()
            self.elem.cancelNewGroup.hide()
            self.elem.addNewGroup.show()
        }
    }))


    //wraps #list
    bb.view.List = Backbone.View.extend(_.extend({

        initialize:function (items) {
            var self = this
            _.bindAll(self)

            self.setElement('#list')

            self.items = items
            //whenever an item is added, call the appendItem function
            self.items.on('add', self.appenditem)
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
            console.log('append item called')
            var groupname = item.get("group") || "General"//default to a general group
            var group = self.findgroup(groupname)
            var itemview = new bb.view.Item({
                model:item
            })

            group.after(itemview.$el)//place the new item "into" the group
            self.refreshList()
            //self.scroll()
        },

        findgroup:function (groupname) {
            //finds a group list divider by groupname
            //if one does not exist, it adds one
            var self = this;
            var group = self.$el.find("#" + app.generateGroupId(groupname))
            if (!group.attr("id")) {
                console.log("Could not find group, creating it " + groupname)
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
            self.render()
            self.model.bind('destroy', self.remove, self)
        },

        render:function () {
            var self = this

            var html = self.tm.item(self.model.toJSON())//model is set in view.List.appendItem, text is shown as that is in the template -text
            self.$el.append(html)//add the templated html

            var deletebutton = self.tm.deletebutton().hide()
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
            //ensure the UI faithfully represents the model
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

    //creates a new list divider for each group
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

app.findMyPlace = function () {

    var fail = function () {
        app.model.position.set("address", "We couldn't find you..")
    }

    var success = function (position) {
        var lat = position.coords.latitude
        var lng = position.coords.longitude
        console.log(lat)
        console.log(lng)
        console.log("http://maps.google.com/maps/geo?sensor=false&output=json&q=" + lat + "," + lng + "&callback=?")
        //        $.getJSON("http://maps.google.com/maps/geo?sensor=false&output=json&q=40.714224,-73.961452&callback=?",

        $.getJSON("http://maps.google.com/maps/geo?sensor=false&output=json&key=AIzaSyBbMYRDWCQuw3xSWSqF2K8kgtrV13mTjt0&q=" + lat + "," + lng + "&callback=?",
                function (data) {
                    var address
                    console.log(data)
                    console.log(data.Status.code == "200")
                    if (data.Status.code == "200") {
                        address = data.Placemark[0].address
                    } else {
                        address = lat + "," + lng
                    }
                    app.model.position.set("address", address)
                });
    }
    navigator.geolocation.getCurrentPosition(success, fail)
}

app.generateGroupId = function (groupname) {
    //utility to create a div id for a group within the list
    return "group-" + groupname;
}


app.init = function () {
    console.log('start init')

    bb.init()

    app.init_browser()

    app.model.state = new bb.model.State()
    app.model.position = new bb.model.CurrentUniverseCoords()
    app.model.items = new bb.model.Items()

    app.view.list = new bb.view.List(app.model.items)
    app.view.list.render()

    app.view.newItem = new bb.view.NewItem(app.model.items)
    app.view.newItem.$el.hide()

    app.view.head = new bb.view.Head(app.model.items)
    app.view.head.render()

    app.view.footer = new bb.view.Footer()
    app.view.footer.render()

    app.model.items.fetch({
        success:function () {
            app.model.state.set({items:'loaded'})
            app.view.list.render()
            app.view.newItem.render()
        }
    })

    app.findMyPlace()
    console.log('end init')
}


$(app.init)