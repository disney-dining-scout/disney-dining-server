'use strict';

var async = require('async'),
    fs = require('fs');
module.exports = {
  up: function(migration, DataTypes, done) {
    async.waterfall(
      [
        function(callback) {
          console.log("begin migration");
          migration.createTable(
            'subscriptions',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              user: {
                type: DataTypes.INTEGER(11)
              },
              type: {
                type: DataTypes.ENUM,
                values: ['standard','plus','pro']
              },
              unlimited: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              expires: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              createdAt: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              updatedAt: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              deletedAt: {
                type: DataTypes.DATE,
                defaultValue: null
              }
            },
            {
              engine: 'InnoDB', // default: 'InnoDB'
              charset: 'utf8' // default: null
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("subscriptions");
            migration.addIndex('subscriptions', ['user']);
            migration.addIndex('subscriptions', ['unlimited']);
            migration.addIndex('subscriptions', ['deletedAt']);
            migration.addIndex('subscriptions', ['expires']);
            callback(null);
            }
          );
        },
        function(callback) {
          migration.createTable(
            'extraSearches',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              user: {
                type: DataTypes.INTEGER(11)
              },
              subscription: {
                type: DataTypes.INTEGER(11)
              },
              createdAt: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              updatedAt: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              deletedAt: {
                type: DataTypes.DATE,
                defaultValue: null
              }
            },
            {
              engine: 'InnoDB', // default: 'InnoDB'
              charset: 'utf8' // default: null
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("extraSearches");
            migration.addIndex('extraSearches', ['user']);
            migration.addIndex('extraSearches', ['subscription']);
            migration.addIndex('extraSearches', ['deletedAt']);
            callback(null);
            }
          );
        },
        function(callback) {
         migration.changeColumn(
            'payments',
            'subscription',
            {
              type: DataTypes.ENUM,
              values: ['standard', 'plus', 'pro', 'searches']
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("payments");
            callback(null);
          });
        }
      ],
      function(error) {
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
          migration.dropTable(
            'subscriptions'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("subscriptions");
              callback(null);
            }
          );
        },
        function(callback) {
          migration.dropTable(
            'extraSearches'
          ).complete(
            function(err) {
              if (err) console.log(err);
              console.log("extraSearches");
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
