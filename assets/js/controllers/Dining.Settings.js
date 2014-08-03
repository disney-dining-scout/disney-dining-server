Dining.module('Settings', function(Settings, App, Backbone, Marionette, $, _) {

  // Edit Router
  // ---------------
  //
  // Handle routes to show the active vs complete todo items

  Settings.Router = Marionette.AppRouter.extend({
    appRoutes: {
      'user-profile'  : 'showUserProfile'
    }
  });

  // Settings Controller (Mediator)
  // ------------------------------
  //
  // Control the workflow and logic that exists at the application
  // level, above the implementation detail of views and models

  Settings.Controller = function() {};

  _.extend(Settings.Controller.prototype, {

    init: function() {
      /*
      if (typeof App.user == 'undefined') {
        Backbone.history.navigate("start", { trigger: true });
      } else {
        Backbone.history.navigate("searches", { trigger: true });
      }
      */
    },

    showUserProfile: function() {
      var view = new Settings.Views.UserProfileView({model: App.user});
      App.layoutView.main.show(view);
    }

  });

  // Edit Initializer
  // --------------------
  //
  // Get the Edit up and running by initializing the mediator
  // when the the application is started.

  Dining.addInitializer(function() {

    var controller = new Settings.Controller();
    new Settings.Router({
      controller: controller
    });

  });

});
