var fs = require('fs'),
    mysql = require('mysql'),
    Sequelize = require("sequelize"),
    nconf = require('nconf'),
    async = require('async'),
    moment = require('moment-timezone'),
    db = {}, models = {}, template, configFile, config, transport;

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

var sql = 'SELECT * FROM payments WHERE failureCode IS NULL';

db.dining.query(
  sql,
  {
    replacements: {},
    type: Sequelize.QueryTypes.SELECT
  }
).then(
  function(subs) {
    async.eachSeries(
      subs,
      function(sub, cb) {
        var inSql = "INSERT INTO subscriptions (user, type, unlimited, monthly, expires, createdAt, updatedAt) VALUES (:user, :type, 1, 0, :expires, :created, :created)";
        console.log(sub);
        db.dining.query(
          inSql,
          {
            replacements: {
              user: sub.userId,
              type: sub.subscription,
              expires: sub.expires,
              created: sub.createdAt
            },
            type: Sequelize.QueryTypes.INSERT
          }
        ).then(
          function(insert) {
            console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), insert);
            cb();
          },
          function(error) {
            console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
            cb(error);
          }
        );

      },
      function(error) {
        console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), "Done!");
        process.exit();
      }
    );
  },
  function(error) {
    console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
  }
);

