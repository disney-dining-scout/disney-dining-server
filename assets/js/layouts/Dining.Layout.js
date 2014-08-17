Dining.module('Layout', function(Layout, App, Backbone, Marionette, $, _) {

  Layout.Body = Marionette.LayoutView.extend({
    tagName: 'body',
    template: Templates.bodyMain,
    initialize: function(options){
      this.options = _.extend({login: false}, options);
      var view = this;
      App.vent.on('showLogin', function (view) {
        App.layoutView.main.$el.addClass("loginContainer");
      });
    },

    // UI bindings create cached attributes that
    // point to jQuery selected objects
    ui: {

    },

    events: {

    },
    resize: function() {

    },

    onShow: function() {

      this.resize();
    }
  });

  Layout.Header = Marionette.ItemView.extend({
    initialize: function(options){
      this.opts = _.extend({light: false}, options);
    },
    template: Templates.header,
    className: "container",
    events: {

    },
    onRender: function() {
        /**
      if (this.opts.light) {
        this.$el.removeClass("navbar-inverse").addClass("navbar-default");
      } else {
        this.$el.removeClass("navbar-default").addClass("navbar-inverse");
      }
      **/
    },

    handleLink: function(e) {
      e.preventDefault();
      Backbone.history.navigate($(e.currentTarget).data().url, { trigger: true });

    }
  });


});
