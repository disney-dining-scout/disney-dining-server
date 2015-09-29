var fs = require('fs'),
    mysql = require('mysql'),
    Sequelize = require("sequelize"),
    nconf = require('nconf'),
    async = require('async'),
    program = require('commander'),
    moment = require('moment-timezone'),
    db = {}, models = {}, template, configFile, config, transport;

program
  .version('0.0.1')
  .usage('[options]')
  .option('-u, --user <n>', 'User Id to cancel', parseInt)
  .parse(process.argv);

configFile = __dirname + '/../config/settings.json';
config = nconf
    .argv()
    .env("__")
    .file({ file: configFile });

db.dining = new Sequelize(
  config.get("mysql:database"),
  config.get("mysql:username"),
  config.get("mysql:password"),
  {
      dialect: 'mysql',
      omitNull: true,
      host: config.get("mysql:host") || "localhost",
      port: config.get("mysql:port") || 3306,
      pool: { maxConnections: 5, maxIdleTime: 30},
      define: {
        freezeTableName: true,
        timestamps: false
      }
});

var inSql = 'SELECT * FROM users WHERE id = :user';

db.dining.query(
  inSql,
  {
    replacements: {
      user: program.user
    },
    type: Sequelize.QueryTypes.SELECT
  }
).then(
  function(user) {
    async.parallel(
      [
        function(cb) {
          inSql = "UPDATE users SET updatedAt = UTC_TIMESTAMP(), deletedAt = UTC_TIMESTAMP() WHERE id = :user";
          db.dining.query(
            inSql,
            {
              replacements: {
                user: program.user
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          ).then(
            function(update) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), update);
              cb(null, "success");
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
              cb(error);
            }
          );

        },
        function(cb) {
          inSql = "UPDATE userSearches SET updatedAt = UTC_TIMESTAMP(), deletedAt = UTC_TIMESTAMP(), deleted = 1, enabled = 0 WHERE user = :user";
          db.dining.query(
            inSql,
            {
              replacements: {
                user: program.user
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          ).then(
            function(update) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), update);
              cb(null, "success");
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
              cb(error);
            }
          );

        },
        function(cb) {
          inSql = "UPDATE deviceTokens SET updatedAt = UTC_TIMESTAMP(), deletedAt = UTC_TIMESTAMP() WHERE userId = :user";
          db.dining.query(
            inSql,
            {
              replacements: {
                user: program.user
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          ).then(
            function(update) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), update);
              cb(null, "success");
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
              cb(error);
            }
          );

        },
        function(cb) {
          inSql = "UPDATE subscriptions SET updatedAt = UTC_TIMESTAMP(), deletedAt = UTC_TIMESTAMP() WHERE user = :user";
          db.dining.query(
            inSql,
            {
              replacements: {
                user: program.user
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          ).then(
            function(update) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), update);
              cb(null, "success");
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
              cb(error);
            }
          );

        },
        function(cb) {
          inSql = "UPDATE extraSearches SET updatedAt = UTC_TIMESTAMP(), deletedAt = UTC_TIMESTAMP() WHERE user = :user";
          db.dining.query(
            inSql,
            {
              replacements: {
                user: program.user
              },
              type: Sequelize.QueryTypes.UPDATE
            }
          ).then(
            function(update) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), update);
              cb(null, "success");
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
              cb(error);
            }
          );

        }
      ],
      function(error, result) {
        console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), "Done!");
        process.exit();
      }
    );
  },
  function(error) {
    console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
  }
);

