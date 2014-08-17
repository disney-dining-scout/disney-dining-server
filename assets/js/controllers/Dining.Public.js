Dining.module('Public', function(Public, App, Backbone, Marionette, $, _) {

  // Public Router
  // ---------------
  //
  // Handle routes to show the active vs complete todo items

  Public.Router = Marionette.AppRouter.extend({
    appRoutes: {
      'start'                 : 'start',
      'new'                   : 'newUser',
      'reset/password/:token' : 'resetPassword',
      'activation/:token'     : 'activate',
      'logout'                : 'logout'
    }
  });

  // Public Controller (Mediator)
  // ------------------------------
  //
  // Control the workflow and logic that exists at the application
  // level, above the implementation detail of views and models

  Public.Controller = function() {};

  _.extend(Public.Controller.prototype, {

    // Start the app by showing the appropriate views
    // and fetching the list of todo items, if there are any
    start: function() {
      App.user = new App.Models.User();
      App.vent.trigger("initBody", {reset: "header"});
      //this.showHeader();
      this.showPublic();
    },

    newUser: function() {
      App.user = new App.Models.User();
      App.vent.trigger("initBody", {reset: "header"});
      //this.showHeader();
      this.showPublic('new');
    },

    showHeader: function(options) {
      options = options || {};
      var header = new App.Layout.Header(options);
      App.layout.header.show(header);
    },

    showFooter: function() {
      var footer = new App.Layout.Footer();
      App.layout.footer.show(footer);
    },

    showPublic: function(display) {
      display = display || null;
      var view = new Public.Views.PublicView();
      App.layoutView.main.show(view);
      App.vent.trigger("showLogin", App.layout);
      if (display === "new") {
        App.vent.trigger("showNewUser", App.layout);
      }
      //this.appBody.login.$el.show();
    },

    resetPassword: function(token) {
      var resetModel = new App.Models.PasswordReset(),
          controller = this;
      resetModel.set({
        "token": token,
        "email": "none@none.com",
        "zipCode": "00000"
      });
      resetModel.urlRoot = "/api/token/check";
      resetModel.save(
        {},
        {
          success: function(model, response, options) {
            var view = new Public.Views.ResetPasswordView({model: model});
            App.vent.trigger("initBody");
            App.layoutView.main.show(view);
            var alertModel = new App.Models.AlertModel({
                  'message': 'Password has been updated',
                  'class': 'alert-info'
                });
            App.vent.trigger("public:showAlert", alertModel);
          },
          error: function(model, xhr, options) {
            controller.start();
            var alertModel = new App.Models.AlertModel({
                  'message': 'No valid reset token found',
                  'class': 'alert-danger'
                });
            App.vent.trigger("public:showAlert", alertModel);
          }
        }
      );

    },

    activate: function(token) {
      var view = this;
      $.ajax({
        url: '/api/user/activation/'+token,
        type: 'PUT',
        error: function() {
          view.start();
          var alertModel = new App.Models.AlertModel({
                  'message': 'There has been an issue activating this account.',
                  'class': 'alert-danger'
                });
          App.vent.trigger("public:showAlert", alertModel);
        },
        success: function(res) {
          var alertModel = new App.Models.AlertModel({
                'message': 'Your account has been activated.',
                'class': 'alert-success'
              });
          Backbone.history.navigate("searches", { trigger: true });
          if ("id" in Dining.user) {
            App.vent.trigger("searches:showAlert", alertModel);
          } else {
            App.vent.trigger("public:showAlert", alertModel);
          }
        }
      });
    },

    logout: function() {
        App.user.destroy();
        $.removeCookie('remember');
        App.Io.disconnect();
        App.vent.trigger("hideMenu");
        Backbone.history.navigate("start", { trigger: true });
    }

  });

  // Public Initializer
  // --------------------
  //
  // Get the Public up and running by initializing the mediator
  // when the the application is started.

  Dining.addInitializer(function() {

    var controller = new Public.Controller();
    new Public.Router({
      controller: controller
    });

  });

});
