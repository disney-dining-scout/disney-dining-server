Dining.module('Layout', function(Layout, App, Backbone, Marionette, $, _) {

  Layout.Body = Marionette.LayoutView.extend({
    tagName: 'body',
    template: Templates.bodyMain,
    initialize: function(options){
      this.options = _.extend({login: false}, options);
      var view = this;
      App.vent.on('showLogin', function (view) {
        App.layoutView.main.$el.addClass("loginContainer");
        $(".footer", view.$el).hide();
      });

      App.vent.on('loggedin', function() {
        view.displaySearchesAvailable();
        $(".footer", view.$el).show();
      });

      App.vent.on('user:update', function() {
        view.displaySearchesAvailable();
        //$(".footer", view.$el).show();
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
    displaySearchesAvailable: function() {
      if (typeof App.user !== 'undefined' && "id" in App.user) {
        if (Dining.user.get("totalPaidSearches") > 100000) {
          $(".total-paid-searches", this.$el).html("unlimited");
        } else {
          var available = (App.user.get("availableSearches") < 0) ? 0 : App.user.get("availableSearches");
          $(".total-paid-searches", this.$el).html(available.toString() + "/" + App.user.get("totalPaidSearches") );
        }
      }
    },
    onShow: function() {
      this.displaySearchesAvailable();
      this.resize();
    }
  });

  Layout.Header = Marionette.ItemView.extend({
    initialize: function(options){
      var view = this;
      this.opts = _.extend({light: false}, options);
      App.vent.on('user:update', function (model) {
        view.updateUserModel(model);
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
    },
    updateUserModel: function(model) {
      this.model.set("user", Dining.user.toJSON());
    }
  });

});
