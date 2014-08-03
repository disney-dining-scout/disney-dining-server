/*global Backbone,define*/

;(function (root, factory) {
  "use strict";
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(['marionette','jquery','underscore'], factory);
  } else {
    // Browser globals
    root.Marionette.FormView = factory(root.Marionette,root.jQuery,root._);
  }
}(this, function (Marionette,$,_) {
  "use strict";

  /**
   * FormView Extension of Backbone.Marionette.ItemView
   *
   * @param {Object} options                   Options defining this FormView
   * @param {Object} [options.data]            Form Data. (Required if options.model is not set)
   * @param {object} [options.schema]
   *
   */
  var FormView = Marionette.FormView = Marionette.ItemView.extend({

    className : "formView",

    rules   : {}, //Custom Field Validation Rules

    constructor : function(){
      Marionette.ItemView.prototype.constructor.apply(this, arguments);

      //Allow Passing In Fields by extending with a fields hash
      if (!this.model) throw new Error("A Model Must Be Provided");

      //Attach Events to preexisting elements if we don't have a template
      if (!this.template) this.runInitializers();
      this.on('item:rendered',this.runInitializers, this);
    },

    populateFields : function () {
      var Form = Backbone.Form.extend({
            schema: this.options.schema
          });

      this.form = new Form({
        model: this.model
      }).render();

      this.$el.append(this.form.el);
    },

    beforeFormSubmit : function (e) {
      var errors = this.form.commit(); // runs schema validation
    },


    submit : function () {
      this.form.submit();
    },

    bindFormEvents : function() {
      var form = this.form;
      this.model.on('change:name', function(model, name) {
          form.setValue({ name: name });
      });
    },

    runInitializers : function() {
      this.populateFields();
      this.bindFormEvents();
      if (_.isFunction(this.onReady)) this.onReady();
    }
  });


  return FormView;
}));
