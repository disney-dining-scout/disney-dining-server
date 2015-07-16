Dining.module('Models', function(Models, App, Backbone, Marionette, $, _) {

  // User Model
  // ----------

  //Models.states = _.extend({'false': 'Please select a state'}, Data.states);

  Models.AppInfoModel = Backbone.Model.extend({
    urlRoot:'',
    defaults: {
      rev: "00000",
      tag: "0.0.1"
    }
  });

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
      createdAt: moment.utc().format("YYYY-MM-DD HH:m:ssZ")
    },
    relations: {
      'restaurant': Models.Restaurant,
      'logs': Models.Logs
    },
    initialize: function() {
      Dining.fixTime(this);
      this.timeUrls();
    },
    update: function () {
      Dining.fixTime(this);
      this.timeUrls();
    },
    timeUrls: function() {
      if (this.get("logs") && this.get("logs").length > 0) {
        var times = this.get("logs").at(0).get("times"),
            urls = this.get("logs").at(0).get("urls"),
            timeUrls = [];
        if (urls) {
          times.forEach(function(time, index, array) {
            timeUrls.push("<a href='https://disneyworld.disney.go.com/dining-reservation/book-dining-event/?offerId[]="+urls[index]+"'>"+time+"</a>");
          });
        } else {
          timeUrls = times;
        }
        this.get("logs").at(0).set("timeUrls", timeUrls);
      }
    },
    validate: function(attrs, options) {
      if (attrs.restaurantId === "") {
        return {
          "error": "restaurant",
          "message": "A valid restaurant must be selected"
        };
      }
    }
  });

  Models.Searches = Backbone.Collection.extend({
    model: Models.Search,
    comparator: function(item) {
      var now = moment.utc(),
          date = moment.utc(item.get("date")),
          before = date.isBefore(now) ? "01" : "00",
          diff = Math.abs(now.diff(date, "minutes"));
      return before + "-" + pad(diff, 50);
    }
  });

  Models.Payment = Backbone.SuperModel.extend({
    urlRoot:'/api/payment',
    idAttribute: "id",
    defaults: {
      date: moment.utc().format("YYYY-MM-DD HH:m:ssZ"),
      userId: 0,
      amount: 0.00,
      subscription: 'standard',
      expires: moment.utc().format("YYYY-MM-DD HH:m:ssZ"),
      transId: '',
      discountCode: 0,
      discount: 0.00,
      cardType: "",
      last4: 0,
      failureCode: "",
      failureMess: ""
    }
  });

  Models.Payments = Backbone.Collection.extend({
    model: Models.Payment
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
      sendEmail: true,
      sendTxt: false,
      eula: moment.utc().format("YYYY-MM-DD HH:m:ssZ"),
      checkAttrs: false,
      existing: false,
      emailTimeout: 14400,
      smsTimeout: 14400,
      activated: false,
      subExpires: ''
    },
    relations: {
      'searches': Models.Searches,
      'payments': Models.Payments
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
        } else if (!this.validateEmail(attrs.email)) {
          return {
            "error": "email",
            "message": "Email address is not valid"
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
      } else {
        if (attrs.email.length === 0) {
          return {
            "error": "username",
            "message": "Email address must be entered"
          };
        } else if (!this.validateEmail(attrs.email)) {
          return {
            "error": "email",
            "message": "Email address is not valid"
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
    },
    validateEmail: function (email) {
      var re = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
      return re.test(email);
    }
  });

  Models.Charge = Backbone.SuperModel.extend({
    urlRoot:'/api/charge',
    idAttribute: "id",
    defaults: {
      userId: 0,
      number: "",
      expiration: "",
      name: "",
      security: "",
      amount: null,
      subscription: null,
      discount: 0.00,
      dicountCode: null,
      cardType: ''
    },
    validate: function(attrs, options) {
      var type = $.payment.cardType(attrs.number),
          expiry = $.payment.cardExpiryVal(attrs.expiration);

      if ($.payment.validateCardNumber(attrs.number) === false) {
        return {
          "error": "number",
          "message": "Your credit card number is invalid"
        };
      } else if ($.payment.validateCardExpiry(expiry.month, expiry.year) === false) {
        return {
          "error": "expiry",
          "message": "Your credit card expiration date is invalid"
        };
      } else if ($.payment.validateCardCVC(attrs.security, type) === false) {
        return {
          "error": "cvc",
          "message": "Your credit card security code is invalid"
        };
      } else if (attrs.name.length < 1) {
        return {
          "error": "name",
          "message": "Your missing the credit card's biller full name"
        };
      } else if (attrs.amount === null) {
        return {
          "error": "amount",
          "message": "A service level must be selected"
        };
      }
    }
  });


});
