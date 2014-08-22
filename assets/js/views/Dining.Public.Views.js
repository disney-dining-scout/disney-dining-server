Dining.module('Public.Views', function(Views, App, Backbone, Marionette, $, _) {

  // Public View
  // --------------

  Views.AlertView = Marionette.ItemView.extend({
    template: Templates.alert,
    className: "alert fade in",
    onRender: function() {
      this.$el.addClass(this.model.get("class"));
    }
  });

  Views.SuccessView = Marionette.ItemView.extend({
    template: Templates.alert,
    className: "alert alert-success fade in",
  });

  Views.ResetPasswordView = Marionette.ItemView.extend({
    template: Templates.resetPasswordForm,
    className: "row",
    events: {
      'keypress #passwordConfirm' :   'onInputKeypress',
      'click .btn-update'         :   'update'
    },

    ui: {
      passwordNew: '#passwordNew',
      passwordConfirm: '#passwordConfirm'
    },

    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model) {
        $("input", this.$el).removeClass(model.get("class"));
        $("#"+model.get("error"), this.$el).addClass(model.get("class"));
      }
      $(alert.$el).prependTo("#resetFields", this.$el);
      if ($(window).scrollTop() > 0) {
        var offset = ($(".alert").offset().top-70 < 0) ? 0 : $(".alert").offset().top-70;
        $('html, body').animate({
          scrollTop: offset
        }, 2000);
      }
    },

    update: function(e) {
      var view = this;
      this.model.urlRoot = '/api/user/password/update';
      this.model.set({
        checkAttrs: true,
        password: this.ui.passwordNew.val().trim(),
        passwordConfirm: this.ui.passwordConfirm.val().trim()
      });
      if (this.model.isValid()) {
        var alertModel = new App.Models.AlertModel();
        this.model.save(
          null,
          {
            success: function(model, response, options) {
              Backbone.history.navigate("start", { trigger: true });
              alertModel.set({
                'message': 'Your password has been updated',
                'class': 'alert-info'
              });
              App.vent.trigger("resetPasswordInfo", alertModel);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON;
              alertModel = new App.Models.AlertModel({
                'error': 'email',
                'message': 'There has been an error updating your password.('+err.data.code+')'
              });
              view.showAlert(alertModel);
            }
          }
        );
      } else {
        var model = new App.Models.AlertModel(this.model.validationError);
        this.showAlert(model);
      }
    },
  });

  Views.PublicView = Marionette.ItemView.extend({
    template: Templates.public,
    className: "row",
    events: {
      'keypress #password'    :   'onInputKeypress',
      'click .sign-in'        :   'logIn',
      'click .create'         :   'createAccount',
      'click .forgotPassword' :   'forgotPassword'
    },

    ui: {
      username: '#username',
      password: '#password',
      email: "#email",
      passwordNew: '#passwordNew',
      passwordConfirm: '#passwordConfirm',
      phone: '#phone',
      carrier: '#carrier',
      firstName: '#firstName',
      lastName: '#lastName',
      zipCode: '#zipCode',
      sendEmail: '#sendEmail',
      sendTxt: '#sendTxt',
      activationCode: '#activationCode',
      remember: '#remember'
    },

    initialize: function() {
      var view = this;
      App.vent.on('public:showAlert', function (model) {
        view.showAlert(model);
      });
      App.vent.on('showNewUser', function (e) {
        $('.nav-tabs a[href="#new"]').tab('show');
      });
    },

    onRender: function() {
      //App.main.$el.removeClass('container').addClass('jumbotron');
      //App.header.$el.hide();
      //App.footer.$el.hide();
    },

    onShow: function() {
      $('#carrier', this.$el).selectize({
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
            if (!query.length) return callback();
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
      $('#phone').mask('(000) 000-0000');
      this.switcherySendEmail = new Switchery($("#sendEmail")[0]);
      this.switcherySendTxt = new Switchery($("#sendTxt")[0]);
    },

    onInputKeypress: function(evt) {
      var ENTER_KEY = 13;

      if (evt.which === ENTER_KEY && this.ui.password.val().length > 0) {
        this.logIn(evt);
      }
    },

    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $(".alert", this.$el).remove();
      alert.render();
      if ("error" in model) {
        $("input", this.$el).removeClass(model.get("class"));
        $("#"+model.get("error"), this.$el).addClass(model.get("class"));
      }
      $(alert.$el).prependTo(".tab-content", this.$el);
      if ($(window).scrollTop() > 0) {
        var offset = ($(".alert").offset().top-70 < 0) ? 0 : $(".alert").offset().top-70;
        $('html, body').animate({
          scrollTop: offset
        }, 2000);
      }
},

    logIn: function(e) {
      var view = this;
      App.user.set({
        password: this.ui.password.val().trim(),
        email: this.ui.username.val().trim(),
        remember: this.ui.remember.prop("checked")
      });
      if (App.user.isValid()) {
        $(".sign-in", this.$el).prepend("<i class=\"fa fa-circle-o-notch fa-spin\"></i> ").attr("disabled","disabled");
        App.user.urlRoot = "/api/user/authenticate";

        App.user.save(
          {},
          {
            success: function(model, response, options) {
              //App.login.$el.hide();
              App.vent.trigger("loggedin", App.layoutView);
              App.user.urlRoot = "/api/user";
              Backbone.history.navigate("searches", { trigger: true });
            },
            error: function(model, xhr, options) {
              var alertModel = new App.Models.AlertModel({
                    'error': 'login',
                    'message': 'The username or password entered did not match',
                    'class': 'alert-danger'
                  });
              view.showAlert(alertModel);
              $(".sign-in", this.$el).removeAttr("disabled").find(".fa-circle-o-notch").remove();
            }
          }
        );
      } else {
        var model = new App.Models.AlertModel(App.user.validationError);
        this.showAlert(model);
      }
    },

    createAccount: function(e) {
      var view = this,
          user = new App.Models.User();
      App.user = user;
      user.set({
        checkAttrs: true,
        password: this.ui.passwordNew.val().trim(),
        passwordConfirm: this.ui.passwordConfirm.val().trim(),
        email: this.ui.email.val().trim(),
        phone: this.ui.phone.val().trim(),
        firstName: this.ui.firstName.val().trim(),
        lastName: this.ui.lastName.val().trim(),
        zipCode: this.ui.zipCode.val().trim(),
        carrier: this.ui.carrier.val().trim(),
        sendTxt: this.ui.sendTxt[0].checked,
        sendEmail: this.ui.sendEmail[0].checked,
        activationCode: this.ui.activationCode.val().trim()
      });
      if (user.isValid()) {

        user.save(
          null,
          {
            success: function(model, response, options) {
              //App.login.$el.hide();
              App.vent.trigger("loggedin", App.layoutView);
              //App.user.urlRoot = "/api/user";
              Backbone.history.navigate("searches", { trigger: true });
              var alertModel = new App.Models.AlertModel({
                'message': 'A welcome message has been sent to your email address. If that email does not arrive in your inbox please check your spam folder and add noreply@disneydining.io to your address book.',
                'class': 'alert-info'
              });
              App.vent.trigger("searches:showAlert", alertModel);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON,
                  alertModel = new App.Models.AlertModel({
                    'message': err.data.message + ' ('+err.data.code+')'
                  });
              if ("error" in err.data) {
                alertModel.set({"error": err.data.error});
              }
              view.showAlert(alertModel);
            }
          }
        );
      } else {
        var model = new App.Models.AlertModel(user.validationError);
        this.showAlert(model);
      }
    },

    forgotPassword: function(e) {
      var resetPasswordModel = new App.Models.PasswordReset(),
          restPasswordModal = new Views.RetrievePasswordModal({model: resetPasswordModel});
      App.layoutView.modal.show(restPasswordModal);
    }
  });

  Views.RetrievePasswordModal = Backbone.Modal.extend({
    template: Templates.retrievePasswordForm,
    submitEl: '.btn-submit',
    cancelEl: '.btn-close',
    events: {

    },

    initialize: function(options) {

    },
    onShow: function() {
      this.ui = {
        email: $("#email-reset", this.$el),
        zipCode: $("#zipCode-reset", this.$el),
      };
    },

    beforeSubmit: function(e) {
      var modal = this;
      this.model.set({
        "email": this.ui.email.val().trim(),
        "zipCode": this.ui.zipCode.val().trim()
      });
      if (this.model.isValid()) {
        var alertModel = new App.Models.AlertModel();
        this.model.save(
          {},
          {
            success: function(model, response, options) {
              alertModel.set({
                'message': 'A password reset email has been sent to the email address on file',
                'class': 'alert-info'
              });
              App.vent.trigger("resetPasswordInfo", alertModel);
              return true;
            },
            error: function(model, response, options) {
              var err = options.xhr.responseJSON;
              alertModel.set({
                'message': 'The email and/or zip code is not recognized.('+err.messsage.code+')',
                'class': 'alert-danger'
              });
              App.vent.trigger("resetPasswordInfo", alertModel);
              return false;
            }
          }
        );
      } else {
        var model = new Backbone.Model(this.model.validationError);
        this.showAlert(model);
        return false;
      }
    },

    showAlert: function(model) {
      var alert = new App.Public.Views.AlertView({model: model});
      $("input", this.$el).removeClass("alert-danger");
      $(".alert", this.$el).remove();
      alert.render();
      $("#"+model.get("error"), this.$el).addClass(alert.get("class"));
      $(alert.$el).prependTo(".modal-body", this.$el);

    }
  });

  // Application Event Handlers
  // --------------------------

});
