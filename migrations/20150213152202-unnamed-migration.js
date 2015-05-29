"use strict";

var async = require('async'),
    fs = require('fs');

module.exports = {
  up: function(migration, DataTypes, done) {
    async.waterfall(
      [
        function(callback) {
          console.log("begin migration");
          migration.createTable(
            'restaurants',
            {
              id: {
                type: DataTypes.STRING(255),
                primaryKey: true
              },
              name: {
                type: DataTypes.STRING(255)
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
            console.log("restaurants");
            migration.addIndex('restaurants', ['name']);
            callback(null);
            }
          );
        },
        function(callback) {
          migration.createTable(
            'userSearches',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              restaurant: {
                type: DataTypes.STRING(255)
              },
              date: {
                type: DataTypes.DATE,
                defaultValue: null,
              },
              partySize: {
                type: DataTypes.INTEGER
              },
              uid: {
                type: DataTypes.STRING(255)
              },
              user: {
                type: DataTypes.STRING(255)
              },
              enabled: {
                type: DataTypes.BOOLEAN,
                defaultValue: 1
              },
              deleted: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              lastEmailNotification:{
                type: DataTypes.DATE,
                defaultValue: null,
              },
              lastSMSNotification:  {
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
            console.log("userSearches");
            migration.addIndex('userSearches', ['uid']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'globalSearches',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              lastChecked:          {
                type: DataTypes.DATE,
                defaultValue: null
              },
              uid: {
                type: DataTypes.STRING(255)
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
            console.log("globalSearches");
            migration.addIndex('globalSearches', ['uid']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'searchLogs',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              uid: {
                type: DataTypes.STRING(255)
              },
              dateSearched: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              message: {
                type: DataTypes.STRING(255)
              },
              foundSeats: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              times: {
                type: DataTypes.STRING
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
            console.log("searchLogs");
            migration.addIndex('searchLogs', ['uid']);
            migration.addIndex('searchLogs', ['dateSearched']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'users',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              email: {
                type: DataTypes.STRING(255)
              },
              password: {
                type: DataTypes.STRING(255)
              },
              firstName: {
                type: DataTypes.STRING(255)
              },
              lastName: {
                type: DataTypes.STRING(255)
              },
              zipCode: {
                type: DataTypes.STRING(15)
              },
              phone: {
                type: DataTypes.STRING(25)
              },
              carrier: {
                type: DataTypes.STRING(100)
              },
              sendTxt: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              sendEmail: {
                type: DataTypes.BOOLEAN,
                defaultValue: 1
              },
              emailTimeout: {
                type: DataTypes.INTEGER,
                defaultValue: 14400
              },
              smsTimeout: {
                type: DataTypes.INTEGER,
                defaultValue: 14400
              },
              activated: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              admin: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
              },
              subExpires: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              eula: {
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
              uniqueKeys: [
                {fields: ['email']},
              ],
              engine: 'InnoDB', // default: 'InnoDB'
              charset: 'utf8' // default: null
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("users");
            //migration.addIndex('users', ['email']);
            migration.addIndex('users', ['lastName']);
            migration.addIndex('users', ['sendTxt']);
            migration.addIndex('users', ['sendEmail']);
            migration.addIndex('users', ['carrier']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'smsGateways',
            {
              id: {
                type: DataTypes.STRING(100),
                primaryKey: true
              },
              country: {
                type: DataTypes.STRING(255)
              },
              name: {
                type: DataTypes.STRING(255)
              },
              gateway: {
                type: DataTypes.STRING(255)
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
              console.log("smsGateways");
              migration.addIndex('smsGateways', ['name']);
              callback(null);
            }
          );
        },
        function(callback) {
          migration.createTable(
            'deviceTokens',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              userId: {
                type: DataTypes.INTEGER(11)
              },
              type: {
                type: DataTypes.ENUM,
                values: ['android','ios','win']
              },
              token: {
                type: DataTypes.STRING(255)
              },
              uuid: {
                type: DataTypes.STRING(255)
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
              uniqueKeys: [
                {fields: ['token']},
              ],
              engine: 'InnoDB', // default: 'InnoDB'
              charset: 'utf8' // default: null
            }
          ).complete(function(err) {
            if (err) console.log(err);
            console.log("deviceTokens");
            migration.addIndex('deviceTokens', ['userId']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'passwordReset',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              user: {
                type: DataTypes.INTEGER(11)
              },
              token: {
                type: DataTypes.STRING(255)
              },
              expire:              {
                type: DataTypes.DATE,
                defaultValue: null
              },
              used: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
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
            console.log("passwordReset");
            migration.addIndex('passwordReset', ['token']);
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'activationCodes',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              token: {
                type: DataTypes.STRING(255)
              },
              used: {
                type: DataTypes.BOOLEAN,
                defaultValue: 0
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
            migration.addIndex('activationCodes', ['token']);
            console.log("activationCodes");
            callback(null);
          });
        },
        function(callback) {
          migration.createTable(
            'payments',
            {
              id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
              },
              date: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              userId: {
                type: DataTypes.INTEGER
              },
              amount: {
                type: DataTypes.DECIMAL(10,2)
              },
              subscription: {
                type: DataTypes.ENUM,
                values: ['standard', 'plus']
              },
              expires: {
                type: DataTypes.DATE,
                defaultValue: null
              },
              transId: {
                type: DataTypes.STRING
              },
              cardType: {
                type: DataTypes.STRING(255)
              },
              last4: {
                type: DataTypes.STRING(4)
              },
              discountCode: {
                type: DataTypes.INTEGER
              },
              discount: {
                type: DataTypes.DECIMAL(10,2)
              },
              failureCode: {
                type: DataTypes.STRING(255)
              },
              failureMess: {
                type: DataTypes.STRING
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
            console.log("payments");
            migration.addIndex('payments', ['userId']);
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
    // add reverting commands here, calling 'done' when finished
    done();
  }
};
