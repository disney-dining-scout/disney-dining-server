Dining.module('Models', function(Models, App, Backbone, Marionette, $, _) {

  // User Model
  // ----------

  //Models.states = _.extend({'false': 'Please select a state'}, Data.states);

  Models.AlertModel = Backbone.Model.extend({
    urlRoot:'',
    idAttribute: "id",
    defaults: {
      message: "",
      class: "alert-danger"
    }
  });

  Models.PasswordReset = Backbone.Model.extend({
    urlRoot:'/api/user/password/reset',
    idAttribute: "id",
    defaults: {
      checkAttrs: false,
      email: "",
      zipCode: ""
    },
    validate: function(attrs, options) {
      if (attrs.checkAttrs) {
        if (attrs.password.length === 0) {
          return {
            "error": "passwordNew",
            "message": "A password must be entered"
          };
        } else if (attrs.password !== attrs.passwordConfirm) {
          return {
            "error": "passwordNew",
            "message": "Passwords do not match"
          };
        }
      } else {
        if (attrs.email.length === 0) {
          return {
            "error": "email",
            "message": "Email must be entered"
          };
        } else if (attrs.zipCode.length === 0) {
          return {
            "error": "zipCode",
            "message": "Zip code must be entered"
          };
        }
      }
    }
  });

  Models.Restaurant = Backbone.Model.extend({
    urlRoot:'/api/restaurant',
    idAttribute: "id",
    defaults: {
      name: ""
    }
  });

  Models.Log = Backbone.Model.extend({
    urlRoot:'/api/log',
    idAttribute: "id",
    defaults: {
      uid: "",
      dateSearched:  "",
      message: "",
      foundSeats: 0,
      times: ""
    },
    initialize: function() {
      //var times = JSON.parse(this.get("times"));
      //this.set("times", times);
    }
  });

  Models.Search = Backbone.SuperModel.extend({
    urlRoot:'/api/search',
    idAttribute: "id",
    defaults: {
      restaurant: {},
      date: moment().add('days', 1),
      partySize: 1,
      uid: '',
      user: '',
      enabled: true,
      deleted: false,
      created: moment.utc().format("YYYY-MM-DD HH:m:ssZ")
    },
    relations: {
      'restaurant': Models.Restaurant,
      'logs': Models.Logs
    },
    initialize: function() {
      Dining.fixTime(this);
    },
    update: function () {
      Dining.fixTime(this);
    }
  });

  Models.Searches = Backbone.Collection.extend({
    model: Models.Search,
    comparator: function(item) {
      return [item.get("past"), item.get("date")];
    }
  });

  Models.Logs = Backbone.Collection.extend({
    model: Models.Log
  });

  Models.User = Backbone.SuperModel.extend({
    name: 'user',
    urlRoot: '/api/user',
    idAttribute: "id",
    defaults: {
      email: '',
      password: '',
      phone: '',
      zipCode: '',
      firstName: '',
      lastName: '',
      carrier: 0,
      activationCode: '',
      sendEmail: true,
      sendTxt: false,
      checkAttrs: false,
      existing: false,
      emailTimeout: 14400,
      smsTimeout: 14400
    },
    relations: {
      'searches': Models.Searches
    },
    validate: function(attrs, options) {
      if (attrs.checkAttrs) {
        if (attrs.firstName.length === 0) {
          return {
            "error": "firstName",
            "message": "First name must be entered"
          };
        } else if (attrs.lastName.length === 0) {
          return {
            "error": "lastName",
            "message": "Last Name must be entered"
          };
        } else if (attrs.email.length === 0) {
          return {
            "error": "email",
            "message": "Email address must be entered"
          };
        } else if (attrs.password.length === 0 && this.isNew()) {
          return {
            "error": "passwordNew",
            "message": "Password must be entered"
          };
        } else if (attrs.password !== attrs.passwordConfirm  && this.isNew()) {
          return {
            "error": "passwordNew",
            "message": "Passwords do not match"
          };
        } else if (attrs.zipCode.length === 0) {
          return {
            "error": "zipCode",
            "message": "Zip code must be entered"
          };
        }

        if (this.isNew() && attrs.activationCode.length === 0) {
          return {
            "error": "activationCode",
            "message": "Your invitation code must be entered"
          };
        }
      } else {
        if (attrs.email.length === 0) {
          return {
            "error": "username",
            "message": "Email address must be entered"
          };
        } else if (attrs.password.length === 0) {
          return {
            "error": "password",
            "message": "A password must be entered"
          };
        }
      }
    },
    initialize: function() {
      //if (this.isNew()) this.set('created', Date.now());
    }
  });

});
