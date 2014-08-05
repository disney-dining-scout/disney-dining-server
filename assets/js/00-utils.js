ReplaceRegion = Marionette.Region.extend({
  attachHtml: function(view){
    this.$el.replaceWith(view.$el);
  }
});

Swag.registerHelpers(Handlebars);

filteredCollection = function(original, filterFn) {

  var filtered;

  // Instantiate new collection
  filtered = new original.constructor();

  // Remove events associated with original
  filtered._callbacks = {};

  filtered.filterItems = function(filter) {
    var items;
    items = original.filter(filter);
    filtered._currentFilter = filterFn;
    return filtered.reset(items);
  };

  // Refilter when original collection is modified
  original.on('reset change destroy', function() {
    return filtered.filterItems(filtered._currentFilter);
  });

  return filtered.filterItems(filterFn);
};

$(document).on('click', 'a:not([data-bypass],[target])', function(evt) {
    var href = $(this).attr('href'),
        protocol = this.protocol + '//';

    // For <a href="#"> links, we always want to preventDefault to avoid having to do
    // this within each individual Backbone View event function.
    // (However don't preventDefault on #something URLs in case we need to jump down a page.)
    if (href === '#') {
        evt.preventDefault();
    }

    // Don't break cmd-click (windows: ctrl+click) opening in new tab
    if (evt.metaKey || evt.ctrlKey) {
        return;
    }

    // Ensure the protocol is not part of URL, meaning it's relative.
    // We also don't want to do anything with links that start with "#" since we use push state
    /*jshint scripturl:true*/
    if (href && href.slice(0, protocol.length) !== protocol &&
        href.indexOf('#') !== 0 &&
        href.indexOf('javascript:') !== 0 &&
        href.indexOf('mailto:') !== 0 &&
        href.indexOf('tel:') !== 0
       ) {
        // Stop the default event to ensure the link will not cause a page
        // refresh.
        evt.preventDefault();

        // `Backbone.history.navigate` is sufficient for all Routers and will
        // trigger the correct events. The Router's internal `navigate` method
        // calls this anyways.
        Backbone.history.navigate(href, true);
    }
});

//  format an ISO date using Moment.js
//  http://momentjs.com/
//  moment syntax example: moment(Date("2011-07-18T15:50:52")).format("MMMM YYYY")
//  usage: {{dateFormat creation_date format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function(context, block) {
  if (window.moment && context !== null) {
    var f = block.hash.format || "MMM Do, YYYY";
    //return moment(context.replace("Z","")).format(f);
    return moment(context).format(f);
  }else{
    return context;   //  moment plugin not available. return data as is.
  }
});

// usage: {{fromNow date}}
Handlebars.registerHelper('fromNow', function(date) {
    return moment(date).fromNow();
});


// Comparison Helper for handlebars.js
// Pass in two values that you want and specify what the operator should be
// e.g. {{#compare val1 val2 operator="=="}}{{/compare}}

Handlebars.registerHelper('compare', function(lvalue, rvalue, options) {

    if (arguments.length < 3)
        throw new Error("Handlerbars Helper 'compare' needs 2 parameters");

    operator = options.hash.operator || "==";

    var operators = {
          '==':       function(l,r) { return l == r; },
          '===':      function(l,r) { return l === r; },
          '!=':       function(l,r) { return l != r; },
          '<':        function(l,r) { return l < r; },
          '>':        function(l,r) { return l > r; },
          '<=':       function(l,r) { return l <= r; },
          '>=':       function(l,r) { return l >= r; },
          'typeof':   function(l,r) { return typeof l == r; }
        };

    if (!operators[operator])
        throw new Error("Handlerbars Helper 'compare' doesn't know the operator "+operator);

    var result = operators[operator](lvalue,rvalue);

    if( result ) {
        return options.fn(this);
    } else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper('each_with_index', function(context, options) {
  var fn = options.fn, inverse = options.inverse;
  var i = 0, ret = "", data;

  var type = toString.call(context);

  if (options.data) {
    data = Handlebars.createFrame(options.data);
  }

  if(context && typeof context === 'object') {
    if(context instanceof Array){
      for(var j = context.length; i<j; i++) {
        if (data) { data.index = i; }
        ret = ret + fn(context[i], { data: data });
      }
    } else {
      for(var key in context) {
        if(context.hasOwnProperty(key)) {
          if(data) { data.key = key; data.index = i; }
          ret = ret + fn(context[key], {data: data});
          i++;
        }
      }
    }
  }

  if(i === 0){
    ret = inverse(this);
  }

  return ret;
});


Handlebars.registerHelper('iter', function(context, options) {
    var fn = options.fn, inverse = options.inverse;
    var ret = "";

    if(context && context.length > 0) {
        for(var i=0, j=context.length; i<j; i++) {
            ret = ret + fn(_.extend({}, context[i], { i: i, iPlus1: i + 1 }));
        }
    } else {
        ret = inverse(this);
    }
    return ret;
});

function isNumber(n) {
    return !isNaN(parseFloat(n)) && isFinite(n);
}

function generateQuickGuid() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
