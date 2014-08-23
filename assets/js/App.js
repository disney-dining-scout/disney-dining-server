var Dining = new Backbone.Marionette.Application();

Dining.addRegions({
  body: {
    selector: '#body',
    regionClass: ReplaceRegion
  }
});

Dining.ioEvent = function(data) {
  console.log(data);
  var message = "";
  if ("user" in Dining && data.objectType == "search-update") {
    var searches = Dining.user.get("searches");

    if (searches) {
      var results = searches.findWhere({uid: data.uid});

      if (results) {
        if (data.foundSeats) {
          message = data.restaurant + ": " + data.message;
          Messenger().post({
            message: message
          });
        }
        //Dining.vent.trigger("refreshModel", data);
        if ($(".last-update")) {
          var lastUpdate = moment(data.time, "YYYY-MM-DDTHH:mm:ss.SSSZZ").format("dddd MMMM Do, YYYY h:mm:ss A");
          $(".last-update").text(lastUpdate);
        }
        results.fetch({
          success: function(model, response, options)  {
            Dining.fixTime(model);
          }
        });
      }
    }
  } else if (data.objectType == "updates") {
    if (data.modType == "checkedIn") {
      message = data.restaurant + ": " + data.objectId;
      $(".checkedInNumber").text(message);
    }
  }

  /*
  if (data.type == "review-submitted") {
      var message = data.doc.versions[0].personnel[0].uinName + " was submitted for review.";
      $('.top-right').notify({ message: { text: message }, type: 'bangTidy', fadeOut: { enabled: true, delay: 8000 } }).show();
  }
  */

};

Dining.vent.on('initBody', function (action) {
  action = action  || {};

  if (Dining.layoutView === null) {
    Dining.layoutView = new Dining.Layout.Body();
    Dining.layoutView.render();
    Dining.body.show(Dining.layoutView);
    Dining.layoutView.addRegions({
      login: '#loginContainer',
      header: '#header',
      main: "#main",
      modal: {
        selector:   '#modal',
        regionType: Backbone.Marionette.Modals
      }
    });

  }
  if ("reset" in action) {
    if (action.reset === "header") {
      var header = new Dining.Layout.Header({model: Dining.user});
      Dining.layoutView.header.show(header);
    }
  }
});

Dining.addInitializer(function(options){
  Backbone.history.start({pushState: true});
});

Dining.on('before:start', function() {
  this.ioId = "";
  Dining.layoutView = null;
  this.collections = {};
  Messenger.options = {
    extraClasses: 'messenger-fixed messenger-on-bottom',
    theme: 'air'
  };

  //Initialize Socket.IO
  this.Io = io.connect();
  // Listen for the talk event.
  this.Io.on('talk', this.ioEvent);
  this.Io.on('connect', function() {
    Dining.ioId = this.socket.sessionid;
  });
  this.Io.on('reconnect', function() {
    if (Dining.ioId !== this.socket.sessionid) {
      Dining.ioId = this.socket.sessionid;
      var searches = Dining.user.get("searches");
      searches.each(function(search) {
        Dining.updateRoom(search);
      });
    }
  });
});

Dining.on('start', function() {
  if (typeof this.user !== 'undefined' && "id" in this.user) {
    this.Io.emit('ready', {'user': this.user.get("id")});
    var searches = Dining.user.get("searches");
    searches.each(function(search) {
      Dining.updateRoom(search);
    });
    searches.on('add', this.updateRooms, this);
    searches.on('change:uid', this.updateRooms, this);
    if (Backbone.history.fragment == newFragment && Backbone.history.fragment !== "") {
      Backbone.history.loadUrl();
    } else if (Backbone.history.fragment.indexOf("activation/") > -1) {
      Backbone.history.loadUrl();
    } else if (Backbone.history.fragment !== "searches") {
      Backbone.history.navigate("searches", { trigger: true });
    } else {
      Dining.vent.trigger("showSearches");
    }

  } else {
    var newFragment = Backbone.history.getFragment($(this).attr('href'));
    if (Backbone.history.fragment == newFragment && Backbone.history.fragment !== "") {
      Backbone.history.loadUrl();
    } else if (Backbone.history.fragment.indexOf("activation/") > -1) {
      Backbone.history.loadUrl();
    } else {
      Backbone.history.navigate("start", { trigger: true });
    }
  }
});

Dining.vent.on('loggedin', function() {
  Dining.layoutView.main.$el.removeClass("loginContainer");
  if (typeof Dining.user !== 'undefined' && "id" in Dining.user) {
    var searches = Dining.user.get("searches");
    searches.each(function(search) {
      Dining.updateRoom(search);
    });
  }
});

Dining.vent.on('hideMenu', function() {
  $('#navMenu').offcanvas('hide');
});

Dining.fixTime = function(model, attr) {
  attr = attr || "date";
  var newDate = null;
  if (model.isNew()) {
    var now = moment().add('days', 1),
        hour = parseInt(now.format("HH"), 10),
        minutes = parseInt(now.format("m"), 10),
        m = (((minutes + 15)/30 | 0) * 30) % 60,
        h = ((((minutes/105) + 0.5) | 0) + hour) % 24,
        day = now.format("YYYY-MM-DD ");

    newDate = day.toString() + h.toString() + ":" + m.toString() + ":00";
    model.set(attr, newDate);
  } else {
    var offset = (moment(model.get(attr)).isDST()) ? 240 - moment(model.get(attr)).zone() : 300 - moment(model.get(attr)).zone();
    newDate = moment(model.get(attr)).utc().add("minutes", offset);
    //model.set(attr, newDate);
    if (attr === "date") {
      var date = moment(model.get("date"));
      model.set("past", date.isBefore(moment()));
    }
  }
};

Dining.updateRoom = function(model) {
  if (model.get("uid") !== "") {
    Dining.Io.emit('room:join', model.get("uid"));
  }
};

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1);
};
