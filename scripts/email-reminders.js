var fs = require('fs'),
    mysql = require('mysql'), 
    Swag = require('swag'),
    Sequelize = require("sequelize"),
    nconf = require('nconf'),
    bcrypt = require('bcrypt'),
    async = require('async'),
    moment = require('moment-timezone'),
    nodemailer = require('nodemailer'),
    htmlToText = require('nodemailer-html-to-text').htmlToText,
    smtpTransport = require('nodemailer-smtp-transport'),
    underscore = require('underscore'),
    handlebars = require('handlebars'),
    db = {}, models = {}, template, configFile, config, transport,
    day = moment.tz("America/New_York").subtract("1", "day"),
    day_format = day.format("YYYY-MM-DD"),
    utc_start = moment.tz(day_format+" 00:00:00", "America/New_York").utc().format("YYYY-MM-DD HH:mm:ss"),
    utc_end = moment.tz(day_format+" 23:59:59", "America/New_York").utc().format("YYYY-MM-DD HH:mm:ss"),
    current = moment().utc();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
Swag.registerHelpers(handlebars);
//if (process.argv[2]) {
//  if (fs.lstatSync(process.argv[2])) {
//    configFile = require(process.argv[2]);
//  } else {
//    configFile = process.cwd() + '/../config/settings.json';
//  }
//} else {
  configFile = __dirname + '/../config/settings.json';
//}

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

transport = nodemailer.createTransport(smtpTransport({
    host: config.get("mail:host"),
    port: config.get("mail:port"),
    ignoreTLS: true
  }));
transport.use('compile', htmlToText());

var sql = 'SELECT users.* ' +
          'FROM users  ' +
          'JOIN userSearches ON users.id = userSearches.user  ' +
          'JOIN searchLogs ON userSearches.uid = searchLogs.uid  ' +
          'WHERE (users.subExpires < NOW() OR users.subExpires IS NULL)   ' +
          'AND searchLogs.dateSearched >= NOW() - INTERVAL 1 DAY  ' +
          'AND searchLogs.foundSeats = 1  ' +
          'AND userSearches.deleted = 0  ' +
          'GROUP BY users.id',
    processEmail = function(users, callback) {
      async.each(
        users,
        function(user, cb) {
          var sql = 'SELECT userSearches.*, restaurants.name, count(searchLogs.id) as count ' +
                    'FROM userSearches ' +
                    'JOIN searchLogs ON userSearches.uid = searchLogs.uid  ' +
                    'JOIN restaurants ON userSearches.restaurant = restaurants.id ' +
                    'WHERE userSearches.user = :user ' +
                    'AND searchLogs.dateSearched >= NOW() - INTERVAL 1 DAY  ' +
                    'AND searchLogs.foundSeats = 1  ' +
                    'AND userSearches.deleted = 0 ' +
                    'GROUP BY userSearches.uid';
          db.dining.query(
            sql,
            {
              replacements: {
                user: user.id
              },
              type: Sequelize.QueryTypes.SELECT
            }
          ).then(
            function(searches) {
              var mailOptions = {
                    from: "Disney Dining Scout <noreply@disneydining.io>", // sender address
                    to: "", // list of receivers
                    subject: "Search Summary for :today", // Subject line
                    generateTextFromHTML: true
                  },
                  pageBuilder = handlebars.compile(template),
                  html = pageBuilder({'user':user, 'seaches': searches, summaryDate: day});
              mailOptions.to = "voss.matthew@gmail.com"; //user.email
              mailOptions.html = html;
              transport.sendMail(
                mailOptions,
                function(error, response){
                  if (error) {
                    console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
                  }
                }
              );
            },
            function(error) {
              console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
            }
          );
        },
        function(error) {
          console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
        }
      );
    },
    getUsers = function() {
      db.dining.query(
        sql,
        {
          replacements: {},
          type: Sequelize.QueryTypes.SELECT
        }
      ).then(
        function(users) {
          processEmail(users);
        },
        function(error) {
          console.log(moment.utc().format("YYYY-MM-DD HH:mm:ss ZZ"), error);
        }
      );
    },
    init = function() {
      fs.readFile(
        __dirname + '/../email/templates/summary/html.handlebars',
        'utf8',
        function(error, content) {
          //console.log(content);
          template = content;
          getUsers();
        }
      );
    };

init();
