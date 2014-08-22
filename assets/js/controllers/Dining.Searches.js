Dining.module('Searches', function(Searches, App, Backbone, Marionette, $, _) {

  // Edit Router
  // ---------------
  //
  // Handle routes to show the active vs complete todo items

  Searches.Router = Marionette.AppRouter.extend({
    appRoutes: {
      'searches'  : 'init'
    }
  });




  // Searches Controller (Mediator)
  // ------------------------------
  //
  // Control the workflow and logic that exists at the application
  // level, above the implementation detail of views and models

  Searches.Controller = function() {};

  _.extend(Searches.Controller.prototype, {

    init: function() {
      if (typeof Dining.user == 'undefined' || typeof Dining.user.get("id") == 'undefined') {
        Backbone.history.navigate("start", { trigger: true });
      } else {
        App.vent.trigger("initBody");
        this.showSearches();
      }
    },

    showSearches: function() {
      var models = (App.user.get('searches').length > 0) ? App.user.get('searches').models : null,
          searches = new App.Models.Searches(models),
          view = new Searches.Views.SearchesView({model: App.user, collection: searches}),
          header = new App.Layout.Header({model: Dining.user});
      App.layoutView.header.show(header);
      App.layoutView.main.show(view);
      //$("body").removeClass();

      //$("#dash-container").show();
    }

  });

  // Edit Initializer
  // --------------------
  //
  // Get the Edit up and running by initializing the mediator
  // when the the application is started.

  Dining.addInitializer(function() {

    var controller = new Searches.Controller();
    new Searches.Router({
      controller: controller
    });

    //controller.init();

    App.vent.on('showSearches', function (action) {
      App.vent.trigger("initBody");
      controller.showSearches();
    });

  });

});
