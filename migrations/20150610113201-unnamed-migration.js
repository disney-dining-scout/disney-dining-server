'use strict';

var async = require('async'),
    fs = require('fs');
module.exports = {
  up: function(migration, DataTypes, done) {
    async.waterfall(
      [
        function(callback) {
          migration.addColumn(
            'restaurants',
            'secondary',
            {
              type: DataTypes.BOOLEAN,
              defaultValue: 0
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("restaurants");
            callback(null);
          });
        },
        function(callback) {
          migration.addColumn(
            'userSearches',
            'secondary',
            {
              type: DataTypes.STRING(255)
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("userSearches");
            callback(null);
          });
        },
        function(callback) {
          migration.addColumn(
            'searchLogs',
            'urls',
            {
              type: DataTypes.STRING
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("searchLogs");
            callback(null);
          });
        },
        function(callback) {
          migration.addColumn(
            'smsGateways',
            'plivo',
            {
              type: DataTypes.BOOLEAN,
              defaultValue: 0
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("smsGateways");
            callback(null);
          });
        }
      ],
      function(err) {
        console.log("complete");
        done();
      }
    );
  },

  down: function(migration, DataTypes, done) {
   async.waterfall(
      [
        function(callback) {
          console.log("begin revert");
          migration.removeColumn(
            'restaurants',
            'secondary'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("restaurants:secondary");
              callback(null);
            }
          );
        },
        function(callback) {
          migration.removeColumn(
            'userSearches',
            'secondary'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("userSearches:secondary");
              callback(null);
            }
          );
        },
        function(callback) {
          migration.removeColumn(
            'searchLogs',
            'urls'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("searchLogs:urls");
              callback(null);
            }
          );
        },
        function(callback) {
          migration.removeColumn(
            'smsGateway',
            'plivo'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("smsGateway:plivo");
              callback(null);
            }
          );
        }
      ],
      function(error) {
        console.log("complete");
        done();
      }
    );
  }
};
