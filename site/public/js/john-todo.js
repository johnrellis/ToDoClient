function pd( func ) {
  return function( event ) {
    event.preventDefault()
    func && func(event)
  }
}

document.ontouchmove = pd()

_.templateSettings = {
  interpolate: /\{\{(.+?)\}\}/g,
  escape:      /\{\{-(.+?)\}\}/g,
  evaluate:    /\{\{=(.+?)\}\}/g
};


var browser = {
  android: /Android/.test(navigator.userAgent)//regex/.text('string to be tested')
}
browser.iphone = !browser.android


var app = {
  model: {},
  view: {}
}

var bb = {
  model: {},
  view: {}
}


bb.init = function() {

  var scrollContent = {
    scroll: function() {
      var self = this
      setTimeout( function() {
        if( self.scroller ) {
          self.scroller.refresh()
        }
        else {
          //noinspection JSPotentiallyInvalidConstructorUsage
            self.scroller = new iScroll( $("div[data-role='content']")[0] )
        }
      },1)
    }
  }


  bb.model.State = Backbone.Model.extend(_.extend({    
    defaults: {
      items: 'loading'
    }
  }))


  bb.model.Item = Backbone.Model.extend(_.extend({    
    
	defaults: {
      id:'',
	  text: ''
    },

    initialize: function() {
       var self = this
      _.bindAll(self)
    }

  }))


  bb.model.Items = Backbone.Collection.extend(_.extend({    
    model: bb.model.Item,
    localStorage: new Store("items"),

    initialize: function() {
      var self = this
      _.bindAll(self)
      self.count = 0

      self.on('reset',function() {
        self.count = self.length
      })
    },

    additem: function(item) {
      var self = this
      self.add(item)
      self.count++
      item.save() 
    }

  }))


  bb.view.Head = Backbone.View.extend(_.extend({    
    events: {
      'tap #add': function(){ 
        var self = this
		self.showEditor()
      },
	  'tap #cancel': function(){ 
        var self = this
		self.hideEditor()
      },
	  'tap #save': function(){ 
        var self = this
		var id = new Date().getTime()
		var item = new bb.model.Item({
			text : self.elem.text.val(),
			id:id
		})
		self.items.additem(item)
		self.hideEditor()
      }
    },

    initialize: function( items ) {
      var self = this
	  
      _.bindAll(self)
      self.items = items

      self.setElement("div[data-role='header']")

      self.elem = {
        add: self.$el.find('#add'),
		cancel: self.$el.find('#cancel'),
        title: self.$el.find('h1'),
		newItem: self.$el.find('#newItem'),
		save: self.$el.find('#save'),
		text: self.$el.find('#text')
      }
      
      self.tm = {
        title: _.template( self.elem.title.html() )
      }

      self.elem.add.hide()
	  self.elem.cancel.hide()
	  self.elem.newItem.hide()

      app.model.state.on('change:items',self.render)
      self.items.on('add',self.render)
    },

    render: function() {
      var self = this
      
      var loaded = 'loaded' == app.model.state.get('items')

      self.elem.title.html( self.tm.title({
        title: loaded ? self.items.length+' Items' : 'Loading...'
      }) )

      if( loaded ) {
        self.elem.add.show()
      }
    },

    showEditor : function(){ 
		var self = this
		self.elem.newItem.slideDown()
		self.elem.add.hide()
		self.elem.cancel.show()
		self.elem.text.focus()
	},

	hideEditor : function(){
		var self = this
		self.elem.newItem.slideUp()
		self.elem.cancel.hide()
		self.elem.add.show()
		self.elem.text.val('').blur()
	}

  }))
  
  

  bb.view.List = Backbone.View.extend(_.extend({    

    events: {
    //  'tap .ui-body-c': function(event){ 
    //    var self = this
	//	console.log(event.target.id)
	 // }
	},
  
    initialize: function( items ) {
      var self = this
      _.bindAll(self)

      self.setElement('#list')
    
      self.items = items
      self.items.on('add',self.appenditem)
    },


    render: function() {
      var self = this

      self.$el.empty()

      self.items.each(function(item){
        self.appenditem(item)
      })
    },


    appenditem: function(item) {
      var self = this

      var itemview = new bb.view.Item({
        model: item
      })

      self.$el.append( itemview.$el)      
      self.scroll()
    }

  },scrollContent))//adds scrollContent's functions to the {} that represents the view



  bb.view.Item = Backbone.View.extend(_.extend({  
	
	
	
    initialize: function() {
      var self = this
      _.bindAll(self)
      self.render()
    },

    render: function() {
      var self = this
      var html = self.tm.item( self.model.toJSON() )//model is set in view.List.appendItem, text is shown as that is in the template -text
	  self.$el.append( html )  
      var item = self.$el.find('#item_tm').attr('id','item_' + self.model.id)
      //var deletebutton = self.$el.find('#delete_tm').attr('id','delete_' + self.model.id)
	  var deletebutton = $('#delete_tm').clone().attr('id','delete_' + self.model.id).hide()
	  item.append(deletebutton)
	  item.swipe(function(){console.log(self.model.id)})
	  item.swipe(function(){deletebutton.show()})
	  deletebutton.tap(function(){deletebutton.hide()})
	  console.log(item)
    }

  },{
    tm: {
      item: _.template( $('#list').html() )
    }
  }))

}


app.init_browser = function() {
  if( browser.android ) {
    $("#main div[data-role='content']").css({
      bottom: 0
    })
  }
}


app.init = function() {
  console.log('start init')

  bb.init()

  app.init_browser()


  app.model.state = new bb.model.State()
  app.model.items = new bb.model.Items()

  app.view.head = new bb.view.Head(app.model.items)
  app.view.head.render()

  app.view.list = new bb.view.List(app.model.items)
  app.view.list.render()

  app.model.items.fetch( {
    success: function() {
      app.model.state.set({items:'loaded'})
      app.view.list.render()
    }
  })


  console.log('end init')
}


$(app.init)
