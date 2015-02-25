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
      var view = this;
      this.opts = _.extend({light: false}, options);
      App.vent.on('user:update', function (model) {
        view.showAlert(model);
      });
    },
    template: Templates.header,
    className: "container",
    events: {
      "click .btn-upgrade" : "upgrade"
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

    },
    upgrade: function(e) {
      Backbone.history.navigate("payments", { trigger: true });
    }
  });

});
