Dining.module('Searches.Views', function(Views, App, Backbone, Marionette, $, _) {

  // Searches View
  // --------------

  Views.SearchView = Marionette.ItemView.extend({
      template: Templates.diningSearch,
      tagName: "a",
      className: "list-group-item",
      events: {
        "click .fa-history"   : "showHistory",
        "click"               : "editSearch"
      },

      modelEvents: {
        'change': 'fieldsChanged'
      },

      initialize: function() {
        //if (this.model.get("id")) this.model.set({uuid: this.model.get("id")});
        this.justUpdated = false;
      },

      fieldsChanged: function() {
        console.log("clearing timeout");
        clearTimeout(this.timeout);
        this.justUpdated = true;
        this.render();
      },

      onRender: function(e) {
        var view = this,
            millis = (!this.model.get("past")) ? 30000 : 3600000;
        this.timeout = setTimeout(
          function() {
            view.render();
            console.log("Rendering:", view.model.get("restaurant").get("name"));
          },
          millis
        );
      },

      editSearch: function(e) {
        var entities = JSON.stringify({
              "name": this.model.get("restaurant").get("name"),
              "id": this.model.get("restaurant").get("id")
            });
        this.model.set({"entities": he.encode(entities)});
        var searchModal = new Views.SearchModal({model: this.model});
        App.layoutView.modal.show(searchModal);
      },

      updateSearch: function(e) {
        var view = this,
            errors = this.form.commit();
        if (typeof errors === 'undefined') {
          $(".update", this.$el).attr("disabled", "disabled");
          this.model.save(
            {},
            {
              success: function(model, response, options) {
                var restaurant = model.get("restaurant");

                Messenger().post("Dining Search for "+restaurant+" has been updated.");
                $(".update", view.$el).removeAttr("disabled");
              },
              error: function(model, xhr, options) {
                if (view.$el.find('.alert').length > 0) view.$el.find('.alert').remove();
                view.$el.find('.page-header').before('<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>There has been a error trying to create this search. This is what the server told me: <strong>'+xhr.responseJSON.messsage.detail+'</strong></div>');
                $(".update", view.$el).removeAttr("disabled");
                $('html, body').animate({
                  scrollTop: $(".alert-dismissable").offset().top-70
                }, 2000);

              }
            }
          );
        } else {
          var errorList = "",
              i = 0;
          _.each(errors, function(value, key, list) {
            errorList += (i > 0) ? ", " : "";
            errorList += key.capitalize();
            i++;
          });
          $('html, body').animate({
              scrollTop: $(".control-group.error").first().offset().top - 100
          }, 2000);
          Messenger().post({
            message: "You have errors that you must correct. You have issues with the following: "+errorList+".",
            type: "error"
          });
        }
      },

      showHistory: function(e) {
        e.stopImmediatePropagation();
        var test = this;
      },

      onBeforeDestroy: function(){
        console.log("clearing timeout");
        clearTimeout(this.timeout);
      }
  });

  Views.SearchesView = Marionette.CompositeView.extend({
      template: Templates.searchesView,
      childView : Views.SearchView,
      childViewContainer: "#searches",
      className: "row",
      events: {
        "click .btn-add"    : "showAddSearch",
        "keyup #search"     : "filterSearches",
        "click .clearer"    : "clearerOnClick",
        "keyup .hasclear"   : "hasClearKeyUp"
      },
      collectionEvents: {
        "add": "modelAdded"
      },
      initialize: function() {
        var test = $(this.el),
            view = this;
        Dining.vent.on('refreshModel', function (data) {
          //view.refreshModel(data);
        });
      },

      onRender: function() {

      },

      onShow: function(e) {
        $(".clearer").hide();
      },

      clearerOnClick: function(e) {
        $(".hasclear", this.$el).val('').focus();
        $(".clearer", this.$el).hide();
        this.filterSearches(e);
      },

      hasClearKeyUp: function(e) {
        var t = $(".clearer", this.$el);
        t.toggle(Boolean($(".hasclear", this.$el).val()));
      },

      showAddSearch: function(e) {
        this.newSearch = new App.Models.Search();
        var searchModal = new Views.SearchModal({model: this.newSearch, collection: this.collection});
        App.layoutView.modal.show(searchModal);
        //searches.add(search);
      },

      filterSearches: function(e) {
        var qry = $("#search", this.$el).val().toLowerCase(),
            filterSearchFn = function(search) {
              return search.get('restaurant').get('name').toLowerCase().indexOf(qry) > -1;
            },
            filtered = (qry === "") ? App.user.get('searches').models : filteredCollection(App.user.get('searches'), filterSearchFn);
        this.collection.reset(filtered);
      },

      modelAdded: function(e) {
        var test = e;
      },

      refreshModel: function(data) {
        var results = this.collection.findWhere({uid: data.uid});
        results.fetch({
          success: function(model, response, options)  {
            Dining.fixTime(model);
          }
        });
      }

  });

  Views.SearchModal = Backbone.Modal.extend({
    template: Templates.addSearchForm,
    submitEl: '.btn-save',
    cancelEl: '.btn-close',
    events: {
      "click .btn-delete"    : "deleteSearch",
    },
    initialize: function(options) {
      _.extend(this, _.pick(options, "collection"));
    },
    onShow: function() {
      $('#date', this.$el).pickadate({
        container: 'body',
        format: 'dddd, mmm dd, yyyy',
        formatSubmit: 'yyyy-mm-dd',
        min: [moment().year(),moment().month(),moment().date()],
        selectYears: true,
        selectMonths: true
      });
      $('#time', this.$el).pickatime({
        container: 'body',
        disable: [
          0, 1, 2, 3, 4, 5, 23, 24
        ]
      });
      $("#partySize", this.$el).TouchSpin({
          min: 1,
          max: 50,
          step: 1,
          boostat: 5,
          maxboostedstep: 5,
      });

      $('#restaurant', this.$el).selectize({
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
            url: '/api/search/restaurants/' + encodeURIComponent(query),
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
    },

    submit: function(e) {
      var dateTime = $("#date", this.$el).val() + " " + $("#time", this.$el).val(),
          isThisNew = (this.model.get("uid") === "") ? true : false,
          modal = this,
          offset = 240 - moment().zone();
      this.model.set({
        "restaurantId": $("#restaurant", this.$el).val(),
        "date": moment(dateTime, "dddd, MMMM DD, YYYY h:mm A").utc().add("minutes", offset).format("YYYY-MM-DD HH:mm:ss +0000"),
        "partySize": $("#partySize", this.$el).val(),
        "user": App.user.get("id")
      });
      this.model.save(
        {},
        {
          success: function(model, response, options) {
            if (isThisNew) {
              var searches = App.user.get('searches');
              searches.add(model);
              if (modal.collection) {
                modal.collection.add(model);
              }
            }
            Dining.fixTime(model);

          },
          error: function(error) {
            var test = error;
          }
        }
      );
    },

    deleteSearch: function(e) {
      var modal = this;
      this.model.destroy(
        {
          success: function(model, response, options) {
            modal.close();
          },
          error: function(error) {
            modal.close();
          }
        }
      );
    }
  });

  Views.AccountSettingsView = Marionette.ItemView.extend({
      template: Templates.accountSettings,
      events: {
        "click .update-profile"    : "updateProfile"
      },
      initialize: function(){
        this.model.schema = {
          title:      {
            type: 'Select',
            options: [
              { val: false, label: 'Select a title' },
              { val: 'Mr', label: 'Mr' },
              { val: 'Mrs', label: 'Mrs' },
              { val: 'Ms', label: 'Ms' }
            ],
            editorClass: 'form-control'
          },
          firstName:  { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          lastName:   { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          street1:    { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          street2:    { type: 'Text', editorClass: 'form-control' },
          city:       { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          state:      { type: 'Select', options: App.Users.states, validators: ['required'], editorClass: 'form-control' },
          zipCode:    { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          phone:      { type: 'Text', validators: ['required'], editorClass: 'form-control' },
          email:      { validators: ['required', 'email'], editorClass: 'form-control' }
        };
      },

      onRender: function() {
        var submit = "<div class='form-group'><button type=\"submit\" class=\"btn btn-default update-profile\">Update Profile</button></div>";
        this.form = new Backbone.Form({
            model: this.model
        }).render();

        this.$el.find("#accountSettingsMain").append(this.form.el).append(submit);
        this.$el.find('#c2_phone').mask('(000) 000-0000');
      },

      updateProfile: function(e) {
        var view = this;
        if (typeof this.form.commit() === 'undefined') {
          this.model.save(
            {},
            {
              success: function(model, response, options) {
                  $('.page-header').before('<div class="alert alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>Your profile has been updated.</strong></div>');
                  $('html, body').animate({
                    scrollTop: $(".alert-dismissable").offset().top-70
                  }, 2000);
              },
              error: function(model, xhr, options) {
                if ($('.alert').length > 0) $('.alert').remove();
                $('.page-header').before('<div class="alert alert-danger alert-dismissable"><button type="button" class="close" data-dismiss="alert" aria-hidden="true">&times;</button>There has been a error trying to create your user. This is what the server told me: <strong>'+xhr.responseJSON.messsage.detail+'</strong></div>');
                $('html, body').animate({
                  scrollTop: $(".alert-dismissable").offset().top-70
                }, 2000);
              }
            }
          );
        }
      }
  });


  // Application Event Handlers
  // --------------------------


});
