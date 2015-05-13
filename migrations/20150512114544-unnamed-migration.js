'use strict';

module.exports = {
  up: function(migration, DataTypes, done) {
    migration.addColumn(
      'smsGateways',
      'prepend',
      {
        type: DataTypes.STRING(255),
        defaultValue: null
      }
    ).complete(
      function(err) {
        if (err) { console.log(err); }
        console.log("smsGateways");
        done(null);
      }
    );
  },

  down: function(migration, DataTypes, done) {
    migration.removeColumn(
      'smsGateways',
      'prepend'
    ).complete(
      function(err) {
        if (err) { console.log(err); }
        console.log("smsGateways");
        done(null);
      }
    );
  }
};
