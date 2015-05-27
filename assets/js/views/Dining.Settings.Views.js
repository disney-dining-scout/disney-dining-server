Dining.module('Settings.Views', function(Views, App, Backbone, Marionette, $, _) {

  // Settings View
  // --------------

  Views.UserProfileView = Marionette.ItemView.extend({
    template: Templates.userProfileView,
    className: "row",
    events: {
      "click .btn-update"    : "updateAccount"
    },
    ui: {
      email: "#email",
      phone: '#phone',
      carrier: '#carrier',
      firstName: '#firstName',
      lastName: '#lastName',
      zipCode: '#zipCode',
      sendTxt: '#sendTxt',
      sendEmail: '#sendEmail'
    },
    initialize: function() {
      if ("sms" in this.model.attributes && "id" in this.model.get("sms")) {
        var entities = JSON.stringify({
              "name": this.model.get("sms").get("name"),
              "id": this.model.get("sms").get("id")
            });
        this.model.set({"entities": he.encode(entities)});
      }
    },
    onRender: function() {

    },
    onShow: function(e) {
      var s = $('#carrier', this.$el).selectize({
        valueField: 'id',
        labelField: 'name',
        searchField: 'name',
        dataAttr: 'data-data',
        create: false,
        render: {
          option: function(item, escape) {
            return '<div>' +
                '<span class="title">' +
                    '<span class="name"></i>' + escape(item.name) + '</span>' +
                '</span>' +
            '</div>';
          }
        },
        load: function(query, callback) {
          if (!query.length) { return callback(); }
          $.ajax({
              url: '/api/search/carriers/' + encodeURIComponent(query),
              type: 'GET',
              error: function() {
                  callback();
              },
              success: function(res) {
                  callback(res);
              }
          });
        }
      });
      s[0].selectize.setValue(this.model.get("carrier"));
      /*
      $('#phone').inputmask({
        mask: '(999) 999-9999'
      });
      */
      $('#phone').intlTelInput({
        defaultCountry: "auto",
        utilsScript: "/lib/intl-tel-input/utils.js"
      });
      this.switcherySendEmail = new Switchery($("#sendEmail")[0]);
      this.switcherySendTxt = new Switchery($("#sendTxt")[0]);
    },
    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model) {
        $("input", this.$el).removeClass(model.get("class"));
        $("#"+model.get("error"), this.$el).addClass(model.get("class"));
      }
      $(alert.$el).prependTo(".bootcards-list", this.$el);
      if ($(window).scrollTop() > 0) {
        var offset = ($(".alert").offset().top-70 < 0) ? 0 : $(".alert").offset().top-70;
        $('html, body').animate({
          scrollTop: offset
        }, 2000);
      }
    },
    updateAccount: function(e) {
      var view = this,
          alertModel = new App.Models.AlertModel();
      this.model.set({
        checkAttrs: true,
        email: this.ui.email.val().trim(),
        phone: this.ui.phone.intlTelInput("getNumber").trim(),
        firstName: this.ui.firstName.val().trim(),
        lastName: this.ui.lastName.val().trim(),
        zipCode: this.ui.zipCode.val().trim(),
        carrier: this.ui.carrier.val().trim(),
        sendEmail: (this.ui.sendEmail.prop('checked')) ? 1 : 0,
        sendTxt: (this.ui.sendTxt.prop('checked')) ? 1 : 0
      });
      if (this.model.isValid()) {
        this.model.save(
          null,
          {
            success: function(model, response, options) {
              alertModel.set({
                'message': 'Your profile has been successfully updated.',
                'class': 'alert-success'
              });
              Backbone.history.navigate("searches", { trigger: true });
              App.vent.trigger("searches:showAlert", alertModel);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON;
              alertModel.set({
                'message': 'There has been an issue updating your profile.'
              });
              view.showAlert(alertModel);
            }
          }
        );
      } else {
        alertModel = new App.Models.AlertModel(this.model.validationError);
        this.showAlert(alertModel);
      }
    }

  });

  Views.ChangePasswordView = Marionette.ItemView.extend({
    template: Templates.changePasswordView,
    className: "row",
    events: {
      "click .btn-update"    : "updatePassword"
    },
    ui: {
      passwordNew: '#passwordNew',
      passwordConfirm: '#passwordConfirm'
    },
    initialize: function() {

    },
    onRender: function() {

    },
    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model) {
        $("input", this.$el).removeClass(model.get("class"));
        $("#"+model.get("error"), this.$el).addClass(model.get("class"));
      }
      $(alert.$el).prependTo(".bootcards-list", this.$el);
      $('html, body').animate({
        scrollTop: $(".alert").offset().top-70
      }, 2000);
    },
    updatePassword: function(e) {
      var view = this,
          alertModel = new App.Models.AlertModel();
      this.model.urlRoot = '/api/user/password/update';
      this.model.set({
        checkAttrs: true,
        password: this.ui.passwordNew.val().trim(),
        passwordConfirm: this.ui.passwordConfirm.val().trim()
      });
      if (this.model.isValid()) {

        this.model.save(
          null,
          {
            success: function(model, response, options) {
              alertModel.set({
                'message': 'Your password has been updated',
                'class': 'alert-success'
              });
              Backbone.history.navigate("searches", { trigger: true });
              App.vent.trigger("searches:showAlert", alertModel);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON;
              alertModel = alertModel.set({
                'error': 'email',
                'message': 'There has been an error updating your password.('+err.data.code+')'
              });
              view.showAlert(alertModel);
            }
          }
        );
      } else {
        alertModel = new App.Models.AlertModel(this.model.validationError);
        this.showAlert(alertModel);
      }
    }
  });

  Views.NotificationsView = Marionette.ItemView.extend({
    template: Templates.notificationsView,
    className: "row",
    events: {
      "click .btn-update"    : "updateAccount"
    },
    ui: {
      email: "#email",
      phone: '#phone',
      carrier: '#carrier',
      sendTxt: '#sendTxt',
      sendEmail: '#sendEmail',
      emailTimeout: '#emailTimeout',
      smsTimeout: '#smsTimeout'
    },
    initialize: function() {
      if ("sms" in this.model.attributes && typeof this.model.get("sms").id !== "undefined") {
        var entities = JSON.stringify({
              "name": this.model.get("sms").get("name"),
              "id": this.model.get("sms").get("id")
            });
        this.model.set({"entities": he.encode(entities)});
      }
    },
    onRender: function() {

    },
    onShow: function(e) {
      var s = $('#carrier', this.$el).selectize({
        valueField: 'id',
        labelField: 'name',
        searchField: 'name',
        dataAttr: 'data-data',
        create: false,
        render: {
          option: function(item, escape) {
            return '<div>' +
                '<span class="title">' +
                    '<span class="name"></i>' + escape(item.name) + '</span>' +
                '</span>' +
            '</div>';
          }
        },
        load: function(query, callback) {
          if (!query.length) { return callback(); }
          $.ajax({
              url: '/api/search/carriers/' + encodeURIComponent(query),
              type: 'GET',
              error: function() {
                  callback();
              },
              success: function(res) {
                  callback(res);
              }
          });
        }
      });
      s[0].selectize.setValue(this.model.get("carrier"));
      /*
      $('#phone').inputmask({
        mask: '(999) 999-9999'
      });
      */
      $('#phone').intlTelInput({
        defaultCountry: "auto",
        utilsScript: "/lib/intl-tel-input/utils.js"
      });
      this.switcherySendEmail = new Switchery($("#sendEmail")[0]);
      this.switcherySendTxt = new Switchery($("#sendTxt")[0]);
      this.ui.emailTimeout.slider({
        max: 24,
        min: 0.5,
        step: 0.5,
        tooltip: 'always',
        formatter: function(value) {
          return value + " hour(s)";
        }
      });

      this.ui.smsTimeout.slider({
        max: 24,
        min: 0.5,
        step: 0.5,
        tooltip: 'always',
        formatter: function(value) {
          return value + " hour(s)";
        }
      });
    },
    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model) {
        $("input", this.$el).removeClass(model.get("class"));
        $("#"+model.get("error"), this.$el).addClass(model.get("class"));
      }
      $(alert.$el).prependTo(".bootcards-list", this.$el);
      if ($(window).scrollTop() > 0) {
        var offset = ($(".alert").offset().top-70 < 0) ? 0 : $(".alert").offset().top-70;
        $('html, body').animate({
          scrollTop: offset
        }, 2000);
      }
    },
    updateAccount: function(e) {
      var view = this,
          alertModel = new App.Models.AlertModel();
      this.model.set({
        checkAttrs: true,
        email: this.ui.email.val().trim(),
        phone: this.ui.phone.intlTelInput("getNumber").trim(),
        carrier: this.ui.carrier.val().trim(),
        sendEmail: (this.ui.sendEmail.prop('checked')) ? 1 : 0,
        sendTxt: (this.ui.sendTxt.prop('checked')) ? 1 : 0,
        emailTimeout: parseFloat(this.ui.emailTimeout.slider('getValue')) * 3600,
        smsTimeout: parseFloat(this.ui.smsTimeout.slider('getValue')) * 3600
      });
      if (this.model.isValid()) {
        this.model.save(
          null,
          {
            success: function(model, response, options) {
              alertModel.set({
                'message': 'Your notification settings have been successfully updated.',
                'class': 'alert-success'
              });
              Backbone.history.navigate("searches", { trigger: true });
              App.vent.trigger("searches:showAlert", alertModel);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON;
              alertModel.set({
                'message': 'There has been an issue updating your notification settings.'
              });
              view.showAlert(alertModel);
            }
          }
        );
      } else {
        alertModel = new App.Models.AlertModel(this.model.validationError);
        this.showAlert(alertModel);
      }
    }

  });

  Views.PaymentView = Marionette.ItemView.extend({
    template: Templates.paymentView,
    tagName: "tr",
    events: {
      "click .fa-history"   : "showHistory",
      "click"               : "editSearch"
    }
  });

  Views.PaymentsView = Marionette.CompositeView.extend({
    template: Templates.paymentsView,
    childView : Views.PaymentView,
    childViewContainer: "#payments",
    className: "row",
    events: {
      "click .make-payment"    : "showPaymentScreen",
    },
    initialize: function() {
      var view = this;
      this.collection = this.model.get("payments");
      App.vent.on('payment:showAlert', function (model) {
        view.showAlert(model);
      });
      App.vent.on("payment:showProcessing", function (model) {
        view.showPaymentProcessing(model);
      });
      App.vent.on("payment:removeAlert", function () {
        $(".alert", view.$el).remove();
      });
    },
    onRender: function() {

    },
    onShow: function(e) {

    },
    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model.attributes) {
        $("#"+model.get("error"), this.$el).parent().removeClass("has-error");
        $("#"+model.get("error"), this.$el).parent().addClass("has-error");
      }
      $(alert.$el).prependTo(".panel-body", this.$el);
      /**

      if ($(window).scrollTop() > 0) {
        var offset = ($(".alert").offset().top-70 < 0) ? 0 : $(".alert").offset().top-70;
        $('html, body').animate({
          scrollTop: offset
        }, 2000);
      }
      **/
    },
    showPaymentProcessing: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      $(alert.$el).removeClass("alert-danger").addClass("alert-info");
      $(alert.$el).prependTo(".panel-body", this.$el);
    },
    showPaymentScreen: function(e) {
      var paymentModal = new Views.PaymentModal({model: this.model});
      App.layoutView.modal.show(paymentModal);
    }

  });

  Views.PaymentModal = Backbone.Modal.extend({
    template: Templates.makePaymentForm,
    cancelEl: '.btn-close',
    submitEl: '.btn-pay',
    events: {
      "click .btn-delete"     : "deleteSearch",
      "click .btn-service"    : "selectService",
      "blur #number"          : "validate",
      "blur #name"            : "validate",
      "blur #expiry"          : "validate",
      "keyup #cvc"             : "validate"
    },
    initialize: function(options) {
      _.extend(this, _.pick(options, "collection"));
      this.ui = {};
      this.creditcard = new App.Models.Charge({
        userId: this.model.get("id"),
        subscription: "standard"
      });
    },
    onShow: function() {
      this.ui.name = $('#name', this.$el);
      this.ui.amount = $('.amount', this.$el);
      this.ui.number = $('#number', this.$el);
      this.ui.expiration = $('#expiry', this.$el);
      this.ui.security = $('#cvc', this.$el);
      var name = this.model.get("firstName") + " " + this.model.get("lastName");
      this.ui.name.val(name);
      $('#cardForm', this.$el).card({
        container: '.card-wrapper',

        // passing in a messages object is another way to
        // override the default card values
        values: {
          name: name,
        }
      });
    },
    selectService: function(e) {
      if (_.indexOf(e.target.classList,"btn-standard") > -1) {
        this.ui.amount.html("3.99");
        $(e.target).addClass("active").addClass("btn-primary");
        this.creditcard.set({subscription: "standard"});
        $(".btn-plus", this.$el).removeClass("active").removeClass("btn-primary");
      } else {
        this.ui.amount.html("5.99");
        $(e.target).addClass("active").addClass("btn-primary");
        this.creditcard.set({subscription: "plus"});
        $(".btn-standard", this.$el).removeClass("active").removeClass("btn-primary");
      }
      this.creditcard.set({
        amount: parseFloat(this.ui.amount.html())
      });
    },
    beforeSubmit: function(e) {
      if (this.creditcard.isValid()) {
        var alertModel = new App.Models.AlertModel({
              message: "Payment is being processed",
              spinner: true
            });
        App.vent.trigger("payment:showProcessing", alertModel);
        return true;
      } else {
        var model = new App.Models.AlertModel(this.model.validationError);
        this.showAlert(model);
        return false;
      }
    },
    submit: function(e) {
      this.creditcard.save(
        {},
        {
          success: function(model, response, options) {
            var message = {
                  message: "Payment has been made",
                  type: "success"
                };

            if (model.get("failureCode") !== null) {
              var alertModel = new App.Models.AlertModel({
                    message: model.get("failureMess")
                  });
              App.vent.trigger("payment:showAlert", alertModel);
            } else {
              App.vent.trigger("payment:removeAlert");
              var payments = App.user.get('payments');
              payments.add(model);
              Messenger().post(message);
            }

          },
          error: function(error) {
            var test = error;
          }
        }
      );
    },
    validate: function(e) {
      this.creditcard.set({
        "name": this.ui.name.val(),
        "number": this.ui.number.val(),
        "expiration": this.ui.expiration.val(),
        "security": this.ui.security.val(),
        "cardType": $.payment.cardType(this.ui.number.val())
      });

      if (this.creditcard.isValid()) {
        $(".btn-pay").removeAttr("disabled");
      } else {
        $(".btn-pay").attr("disabled", "disabled");
      }
    }
  });

  // Application Event Handlers
  // --------------------------


});
