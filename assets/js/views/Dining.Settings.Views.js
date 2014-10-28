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
      if ("sms" in this.model.attributes && this.model.get("sms").id.length > 0) {
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
      $('#phone').inputmask({
        mask: '(999) 999-9999'
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
        phone: this.ui.phone.val().trim(),
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
      $('#phone').inputmask({
        mask: '(999) 999-9999'
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
        phone: this.ui.phone.val().trim(),
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

  // Application Event Handlers
  // --------------------------


});
