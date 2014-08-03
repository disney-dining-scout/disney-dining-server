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
      $('#phone').mask('(000) 000-0000');
    },
    updateAccount: function(e) {
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
              var alertModel = new Backbone.Model({
                    'message': 'Your profile has been successfully updated.'
                  });
              alert = new App.Public.Views.SuccessView({model: alertModel});
              $(".alert", this.$el).remove();
              alert.render();
              $(alert.$el).prependTo(".bootcards-list", this.$el);
            },
            error: function(model, xhr, options) {
              var err = xhr.responseJSON,
                  alertModel = new Backbone.Model({
                    'message': 'There has been an issue updating your profile.'
                  });
              alert = new App.Public.Views.AlertView({model: alertModel});
              $("input", this.$el).removeClass("alert-danger");
              $(".alert", this.$el).remove();
              alert.render();
              $(alert.$el).prependTo(".bootcards-list", this.$el);
            }
          }
        );
      } else {
        var model = new Backbone.Model(this.model.validationError);
        this.showAlert(model);
      }
    }

  });



  // Application Event Handlers
  // --------------------------


});
