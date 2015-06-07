(function(){
  "use strict";

var fs = require('fs'),
    pjson = require('../package.json'),
    path = require('path'),
    nodemailer = require('nodemailer'),
    htmlToText = require('nodemailer-html-to-text').htmlToText,
    smtpTransport = require('nodemailer-smtp-transport'),
    crypto = require('crypto'),
    spawn = require('child_process').spawn,
    async = require('async'),
    uuid = require("node-uuid"),
    glob = require('glob'),
    underscore = require('underscore'),
    handlebars = require('handlebars'),
    Sequelize = require("sequelize"),
    bcrypt = require('bcrypt'),
    Swag = require('swag'),
    moment = require('moment-timezone'),
    redis = require("redis"),
    jwt = require('jsonwebtoken'),
    git = require('git-rev-sync'),
    emailTemplatesDir = path.resolve(__dirname, '..', 'email', 'templates'),
    emailTemplates = require('email-templates'),
    Push = require('node-pushnotifications'),
    stripe, push,
    db = {},
    Schemas = {},
    models = {},
    DocumentTypes = {},
    Workflows = {},
    opts = {},
    config = {},
    reconnectTries = 0, cacheBuster = moment().format("X"),
    hmac, signature, connection, client, key, cert, indexHtml,
    transport, acl, subClient, analytics = "", appInfo = {}, pubClient,
    CheckinMemberFieldValues, RegMemberFieldValues, CheckinGroupMembers,
    RegGroupMembers, CheckinEventFields, CheckinBiller, RegBiller,
    CheckinBillerFieldValues, RegBillerFieldValues, RegEventFees,
    CheckinEventFees, CheckinExhibitorAttendeeNumber, CheckinExhibitorAttendees;

Swag.registerHelpers(handlebars);
// searchUid = MD5(restaurant.id + timestamp(userSearch.date)+userSearch.partySize)


exports.setKey = function(key, value) {
  opts[key] = value;
};

fs.exists(__dirname + '/../config/analytics.txt', function(exists) {
  if (exists) {
    fs.readFile(__dirname + '/../config/analytics.txt', 'utf8', function(error, content) {
      analytics = content;
    });
  }
});

fs.exists(__dirname + '/../assets/templates/index.html', function(exists) {
  if (exists) {
    fs.readFile(__dirname + '/../assets/templates/index.html', 'utf8', function(error, content) {
      indexHtml = content;
    });
  }
});


exports.initialize = function() {
  //Initialize PGsql
  //getConnection();

  //Initialize Email Client
  var setSubscription = function() {
        subClient.psubscribe("disneydining:*");
        subClient.on("pmessage", function (pattern, channel, message) {
          //console.log("channel ", channel, ": ", message);
          if (channel === "disneydining:searchupdate") {
            message = JSON.parse(message);
            message.objectType = "search-update";
            opts.io.to(message.uid).emit('talk', message);
            //opts.io.room(message.uid).broadcast('talk', message);
          }
        });
      };
  transport = nodemailer.createTransport(smtpTransport({
    host: opts.configs.get("mail:host"),
    port: opts.configs.get("mail:port"),
    ignoreTLS: true
  }));
  transport.use('compile', htmlToText());

  appInfo = {
    rev: git.short(),
    tag: pjson.version
  };
  key = opts.configs.get("key");

  stripe = require("stripe")(
    opts.configs.get("stripe:key")
  );

  //console.log(opts.configs.get("redis"));
  subClient = redis.createClient(
    opts.configs.get("redis:port"),
    opts.configs.get("redis:host")
  );
  pubClient = redis.createClient(
    opts.configs.get("redis:port"),
    opts.configs.get("redis:host")
  );
  if (opts.configs.get("redis:db") && opts.configs.get("redis:db") > 0) {
    subClient.select(
      opts.configs.get("redis:db"),
      function() {
        //console.log("Redis DB set to:", opts.configs.get("redis:db"));
        setSubscription();
      }
    );
    pubClient.select(
      opts.configs.get("redis:db"),
      function() {
        //console.log("Redis DB set to:", config.get("redis:db"));
      }
    );
  } else {
    setSubscription();
  }

  if (opts.configs.get("push")) {
    push = new Push(opts.configs.get("push"));
  }

  db.dining = new Sequelize(
    opts.configs.get("mysql:database"),
    opts.configs.get("mysql:username"),
    opts.configs.get("mysql:password"),
    {
        dialect: 'mariadb',
        omitNull: true,
        host: opts.configs.get("mysql:host") || "localhost",
        port: opts.configs.get("mysql:port") || 3306,
        pool: { maxConnections: 5, maxIdleTime: 30},
        define: {
          freezeTableName: true,
          timestamps: true,
          paranoid: true
        }
  });

  models.Restaurants = db.dining.define('restaurants', {
    id:                   { type: Sequelize.STRING(255), primaryKey: true },
    name :                { type: Sequelize.STRING(255) }
  });

  models.UserSearches = db.dining.define('userSearches', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    restaurant:           { type: Sequelize.STRING(255) },
    date:                 {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    partySize:            { type: Sequelize.INTEGER },
    uid:                  { type: Sequelize.STRING(255) },
    user:                 { type: Sequelize.STRING(255) },
    enabled:              { type: Sequelize.BOOLEAN, defaultValue: 1 },
    deleted:              { type: Sequelize.BOOLEAN, defaultValue: 0 },
    lastEmailNotification:{
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        var t = moment.utc(this.getDataValue(name));
        if (t.isUTC()) {
          return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
        } else {
          var d = t.format("YYYY-MM-DD HH:mm:ss");
          t = moment.utc(d+"+00:00", "YYYY-MM-DD HH:mm:ssZ");
          return t.format("YYYY-MM-DD HH:mm:ssZ");
        }
      }
    },
    lastSMSNotification:  {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    }
  });

  models.GlobalSearches = db.dining.define('globalSearches', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    lastChecked:          {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    uid:                  { type: Sequelize.STRING(255) }
  });

  models.SearchLogs = db.dining.define('searchLogs',
    {
      id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      uid:                  { type: Sequelize.STRING(255) },
      dateSearched:         {
        type: Sequelize.DATE,
        defaultValue: null,
        get: function(name) {
          return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
        }
      },
      message:              { type: Sequelize.STRING(255) },
      foundSeats:           { type: Sequelize.BOOLEAN, defaultValue: 0 },
      times:                { type: Sequelize.STRING }
    }
  );

  models.Users = db.dining.define('users', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    email :               { type: Sequelize.STRING(255) },
    password :            { type: Sequelize.STRING(255) },
    firstName :           { type: Sequelize.STRING(255) },
    lastName :            { type: Sequelize.STRING(255) },
    zipCode:              { type: Sequelize.STRING(15) },
    phone :               { type: Sequelize.STRING(25) },
    carrier:              { type: Sequelize.STRING(100) },
    sendTxt :             { type: Sequelize.BOOLEAN, defaultValue: 0 },
    sendEmail :           { type: Sequelize.BOOLEAN, defaultValue: 1 },
    emailTimeout:         { type: Sequelize.INTEGER, defaultValue: 14400 },
    smsTimeout:           { type: Sequelize.INTEGER, defaultValue: 14400 },
    activated :           { type: Sequelize.BOOLEAN, defaultValue: 0 },
    admin :               { type: Sequelize.BOOLEAN, defaultValue: 0 },
    subExpires:           {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        if (this.getDataValue(name) !== null) {
          return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
        } else {
         return null; 
        }
      }
    },
    eula:           {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    }
  });

  models.SmsGateways = db.dining.define('smsGateways', {
    id:                   { type: Sequelize.STRING(100), primaryKey: true },
    country :             { type: Sequelize.STRING(255) },
    name :                { type: Sequelize.STRING(255) },
    gateway :             { type: Sequelize.STRING(255) }
  });

  models.DeviceTokens = db.dining.define('deviceTokens', {
    id:                   { type: Sequelize.INTEGER(11), primaryKey: true },
    userId :              { type: Sequelize.INTEGER(11) },
    type :                { type: Sequelize.ENUM('android','ios','win') },
    token :               { type: Sequelize.STRING(255) },
    uuid:                 { type: Sequelize.STRING(255) }
  });

  models.PasswordReset = db.dining.define('passwordReset', {
    id:                   { type: Sequelize.INTEGER(11), primaryKey: true },
    user :                { type: Sequelize.INTEGER(11) },
    token :               { type: Sequelize.STRING(255) },
    expire :              {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    used :                { type: Sequelize.BOOLEAN, defaultValue: 0 }
  });

  models.ActivationCodes = db.dining.define('activationCodes', {
    id:                   { type: Sequelize.INTEGER(11), primaryKey: true },
    token :               { type: Sequelize.STRING(255) },
    used :                { type: Sequelize.BOOLEAN, defaultValue: 0 }
  });

  models.Payments = db.dining.define('payments', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    date:                 {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    userId :              { type: Sequelize.INTEGER },
    amount   :            { type: Sequelize.DECIMAL(10,2) },
    subscription :        { type: Sequelize.ENUM('standard', 'plus', 'pro', 'searches') },
    expires:              {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    transId :             { type: Sequelize.STRING },
    cardType :            { type: Sequelize.STRING(255) },
    last4 :               { type: Sequelize.STRING(4) },
    discountCode:         { type: Sequelize.INTEGER },
    discount :            { type: Sequelize.DECIMAL(10,2) },
    failureCode:          { type: Sequelize.STRING(255) },
    failureMess:          { type: Sequelize.STRING }
  });

  models.Subscriptions = db.dining.define('subscriptions', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    user:                 { type: Sequelize.INTEGER },
    type :                { type: Sequelize.ENUM('standard','plus','pro') },
    unlimited:            { type: Sequelize.BOOLEAN, defaultValue: 0 },
    monthly:              { type: Sequelize.BOOLEAN, defaultValue: 0 },
    expires:  {
      type: Sequelize.DATE,
      defaultValue: null,
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    }
  });

  models.ExtraSearches = db.dining.define('extraSearches', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    subscription:         { type: Sequelize.INTEGER },
    numberOfSearches:     { type: Sequelize.INTEGER },
    user:                 { type: Sequelize.INTEGER }
  });
};

/************
* Routes
*************/

exports.index = function(req, res){
  var init = "$(document).ready(function() { Dining.appInfo = new Dining.Models.AppInfoModel(" + JSON.stringify(appInfo) + ");Dining.start(); });",

      send = function() {
        var prefix = (opts.configs.get("prefix")) ? opts.configs.get("prefix") : "";
        init += (analytics.length > 0) ? analytics : "";
        var pageBuilder = handlebars.compile(indexHtml),
            html = pageBuilder({
              'init': init,
              'prefix':prefix,
              'cacheBuster': cacheBuster
            });

        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.write(html, 'utf-8');
        res.end('\n');
      };
  var userId, decipher;
  if ((typeof req.session !== 'undefined' && typeof req.session.user !== 'undefined') || "remember" in req.cookies) {

    if ("remember" in req.cookies) {
      decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.update(req.cookies.remember, 'base64', 'utf8');
      userId = decipher.final('utf8');
    } else {
      userId = req.session.user.id;
    }

    getUser(userId, true, function(user) {
      createUserModel(user, function(user) {
        req.session.user = user;
        addUserToSession(user, req, function() {
          init = "$(document).ready(function() { Dining.appInfo = new Dining.Models.AppInfoModel(" + JSON.stringify(appInfo) + ");Dining.user = new Dining.Models.User(" + JSON.stringify(req.session.user) + "); Dining.start(); });";
          send();
        });
      });
    });
  } else {
    //console.log(req.cookies);
    if ("remember" in req.cookies) {
      decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.update(req.cookies.remember, 'base64', 'utf8');
      userId = decipher.final('utf8');
      getUser(userId, true, function(user) {
        createUserModel(user, function(user) {
          addUserToSession(user, req, function() {
            init = "$(document).ready(function() { Dining.appInfo = new Dining.Models.AppInfoModel(" + JSON.stringify(appInfo) + ");Dining.user = new Dining.Models.User(" + JSON.stringify(req.session.user) + "); Dining.start(); });";
            send();
          });
        });
      });
    } else {
      send();
    }

  }
};

//Add a user
exports.addUser = function(req, res) {
  //console.log("adding user");
  var request = req,
      user = {
        email: req.body.email,
        password: null,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        zipCode: req.body.zipCode,
        phone: req.body.phone,
        carrier: req.body.carrier,
        sendTxt: req.body.sendTxt,
        sendEmail: req.body.sendEmail,
        emailTimeout: req.body.emailTimeout,
        smsTimeout: req.body.smsTimeout
      };
  bcrypt.hash(req.body.password, 8, function(err, hash) {
    user.password = hash;
    models.Users.create(user).then(function(userRec) {
      //console.log(userRec);
      userRec = userRec.toJSON();
      createUserModel(userRec, function(user) {
        //console.log("Sending back new user");
        addUserToSession(user, request, function() {
          delete user.password;
          sendActivationEmail(user, function() {
            sendBack(user, 200, res);
          });
        });
      });
    },
    function(error) {
      var errorMsg = {
            success: false,
            data: {
              message: "This email is already in use. Please use another. Do you already have an account?",
              code: error.code,
              error: "email"
            }
          };
      sendBack(errorMsg, 500, res);
    });
  });
};

//Update User
exports.updateUser = function(req, res) {
  var userAttributes = {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        carrier: req.body.carrier,
        sendTxt: req.body.sendTxt,
        sendEmail: req.body.sendEmail,
        phone: req.body.phone,
        zipCode: req.body.zipCode,
        emailTimeout: req.body.emailTimeout,
        smsTimeout: req.body.smsTimeout,
        activated: req.body.activated
      };
  models.Users.find(req.params.userId).then(function(user) {
    user.updateAttributes(userAttributes).then(function(user) {
      user = user.toJSON();
      opts.io.to("user:"+user.id).emit(
        'talk',
        {
          objectType: "user-update",
          id: user.id
        }
      );
      pubClient.publish("disneydining:userupdate", JSON.stringify(user));
      getUser(user.id, true, function(user) {
        if (req.user.mobile) {
          sendBack(user, 200, res);
        } else {
          createUserModel(user, function(user) {
            addUserToSession(user, req, function() {
              sendBack(user, 200, res);
            });
          });
        }
      });
    });
  });
};

//Auth a user
exports.authUser = function(req, res) {
  var request = req,
      processUser = function(user) {
        user = user.toJSON();
        createUserModel(user, function(user) {
          if (req.body.remember) {
            var day = 3600000 * 24,
                cipher = crypto.createCipher('aes-256-cbc', key);
            cipher.update(user.id.toString(), 'utf8', 'base64');
            var token = cipher.final('base64');
            res.cookie('remember', token, { maxAge: day });
          } else {
            //console.log("Delete cookie");
            res.clearCookie('remember');
          }
          addUserToSession(user, request, function() {
            sendBack(user, 200, res);
          });
        });
      },
      errorMsg;
  models.Users.find({ where: { email: req.body.email } }).then(function(user) {
    if (user !== null) {
      bcrypt.compare(req.body.password, user.password, function(err, result) {
        if (result) {
          processUser(user);
        } else {
          errorMsg = {
            status: "error",
            message: {
              response: "Invalid email and/or password."
            }
          };
          sendBack(errorMsg, 401, res);
        }
      });
    } else {
      errorMsg = {
        status: "error",
        message: {
          response: "Invalid email and/or password."
        }
      };
      sendBack(errorMsg, 401, res);
    }
  });
};

exports.mobileAuth = function(req, res) {
  var request = req,
      resource = res,
      processUser = function(user) {
        user = user.toJSON();
        createUserModel(user, function(user) {
          delete user.availableSearches;
          delete user.extraSearches;
          delete user.subscription;
          delete user.totalPaidSearches;
          var token = jwt.sign({ user: user.id, mobile: true }, opts.configs.get("privateKey"), { expiresInMinutes: 1440 * 60, algorithm: 'RS256' }),
              data = {
                user: user,
                token: token
              };
          sendBack(data, 200, resource);
        });
      },
      now = moment.utc(),
      errorMsg;
  models.Users.find(
    { 
      where: { 
        email: req.body.email
      } 
    }
  ).then(function(user) {
    if (user !== null) {
      var subExpires = moment.tz(user.subExpires, "YYYY-MM-DD HH:mm:ss", "America/New_York");
      if (subExpires !== null && now.isBefore(subExpires)) {
        bcrypt.compare(req.body.password, user.password, function(err, res) {
          if (res) {
            processUser(user);
          } else {
            errorMsg = {
              status: "error",
              message: {
                response: "Invalid email and/or password."
              }
            };
            sendBack(errorMsg, 401, resource);
          }
        });
      } else {
        errorMsg = {
          status: "error",
          message: {
            response: "Subscription has expired. Free accounts do not have mobile app access."
          }
        };
        sendBack(errorMsg, 401, resource);
      }
    } else {
      errorMsg = {
        status: "error",
        message: {
          response: "Invalid email and/or password."
        }
      };
      sendBack(errorMsg, 401, resource);
    }
  });
};

exports.mobileRefreshToken = function(req, res) {
  var decoded = jwt.decode(req.body.token),
      token = jwt.sign({ user: decoded.user, mobile: true }, opts.configs.get("privateKey"), { expiresInMinutes: 1440 * 60, algorithm: 'RS256' }),
      data = {
        token: token
      };
  sendBack(data, 200, res);
};

exports.addUserDeviceToken = function(req, res) {
  var callback = function(result) {
        var code = ("success" in result) ? 500 : 200;
        sendBack(result, code, res);
      },
      device = req.body,
      user = req.user.user;
  device.userId = user;
  addUserDeviceToken(device, callback);
};

exports.resetPassword = function(req, res) {
  models.Users.find({
    where: {
      'email': req.body.email,
      'zipCode': req.body.zipCode
    }
  }).then(function(user) {
    if (user) {
      var passToken = {
            user: user.id,
            token: uuid.v4(),
            expire: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
          };
      user = user.toJSON();
      models.PasswordReset.create(passToken).then(function(result) {
        emailTemplates(emailTemplatesDir, function(err, template) {
          if (err) {
            //console.log(err);
          } else {
            // Send a single email
            // An example users object with formatted email function
            user.token = passToken.token;
            // Send a single email
            template('resetPassword', user, function(err, html, text) {
              if (err) {
                //console.log(err);
              } else {
                transport.sendMail({
                  from: 'Disney Dining Scout <noreply@disneydining.io>',
                  to: user.email,
                  subject: 'Password Reset Request',
                  html: html,
                  generateTextFromHTML: true
                }, function(err, responseStatus) {
                  if (err) {
                    //console.log(err);
                  } else {
                    //console.log(responseStatus.message);
                    sendBack(
                      {
                        "success": true,
                        "token": "token goes here"
                      },
                      200,
                      res
                    );
                  }
                });
              }
            });
          }
        });
      });
    } else {
      var errorMsg = {
            status: "error",
            messsage: {
              response: "Unable to find user with that email and/or zip code",
              code: "ERR_INVALID_EMAIL_ZIPCODE"
            }
          };
      sendBack(errorMsg, 500, res);
    }
  });
};

exports.checkResetToken = function(req, res) {
  models.PasswordReset.find({
    where: {
      token: req.body.token,
      used: 0,
      expire: {
        lt: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
      }
    }
  }).then(function(token) {
    if (token) {
      getUser(token.user, true, function(user) {
        token = token.toJSON();
        token = underscore.extend(token, user);
        //console.log(token);
        sendBack(token, 200, res);
      });
    } else {
      var errorMsg = {
            "success": false,
            data: {"message": "No valid reset token found."}
          };
      sendBack(errorMsg, 500, res);
    }
  });
};

exports.updatePassword = function(req, res) {
  if ("token" in req.body) {
    models.PasswordReset.find({
      where: {
        token: req.body.token,
        used: 0,
        expire: {
          lt: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
        }
      }
    }).then(function(token) {
      if (token) {
        getUser(token.user, false, function(user) {
          updateUserPassword(user, req.body.password, function(user) {
            var tokenAttributes = {
                  used: true
                };
            token.updateAttributes(tokenAttributes).then(function(token) {
              delete user.password;
              sendBack(user, 200, res);
            });
          });
        });
      } else {
        var errorMsg = {
              success: false,
              data: {
                "message": "No valid reset token found",
                "code": "ERR_NO_VALID_RESET_TOKEN"
              }
            };
        sendBack(errorMsg, 500, res);
      }
    });
  } else {
    getUser(req.session.user.id, false, function(user) {
      updateUserPassword(user, true, req.body.password, function(user) {
        delete user.password;
         var successMsg = {
              success: true,
              data: {
                "message": "Password updated",
              }
            };
        sendBack(successMsg, 200, res);
      });
    });
  }
};

//Log out the current user
exports.logoutUser = function(req, res) {
 req.session.destroy(function () {
    res.clearCookie('connect.sid', { path: '/' });
    sendBack({logout: true}, 200, res);
  });
};

exports.addSearch = function(req, res) {
  var vals = [
        'id',
        'uid',
        'date',
        'enabled',
        'deleted',
        'user',
        'partySize'
      ],
      results = {};
  Object.keys(req.body).forEach(function(key) {
    if (vals.indexOf(key) >= 0) {
      results[key] = req.body[key];
    }
  });

  results.restaurant = req.body.restaurantId;
  var uid = generateUid(results);
  results.uid = uid;
  models.UserSearches.create(
    results
  ).then(function(search) {
    //console.log(search);

    getUserSearch(search.id, function(search) {
      checkUids(null, uid, function() {
        opts.io.to("user:"+req.user.user).emit(
          'talk',
          {
            objectType: "search-add",
            id: search.id
          }
        );
        pubClient.publish("disneydining:searchadd", JSON.stringify(search));
        if (req.user.mobile) {
          sendBack(search, 200, res);
        } else {
          createUserModel(req.session.user, function(user) {
            req.session.user = user;
            sendBack(search, 200, res);
          });
        }
      });
    });
  });
};

exports.updateSearch = function(req, res) {
  models.UserSearches
  .find(req.params.searchId)
  .then(function(userSearch) {
    var vals = [
          'id',
          'uid',
          'date',
          'enabled',
          'deleted',
          'user',
          'partySize'
        ],
        results = {};
    Object.keys(req.body).forEach(function(key) {
      if (vals.indexOf(key) >= 0) {
        results[key] = req.body[key];
      }
    });
    //console.log(results);
    results.restaurant = req.body.restaurantId || req.body.restaurant;
    results.id = req.params.searchId;
    var oldUid = results.uid,
        uid = generateUid(results);
    results.uid = uid;
    checkUids(oldUid, uid, function() {
      userSearch.updateAttributes(
        results
      ).then(function(search) {
        getUserSearch(search.id, function(search) {
          if (oldUid !== uid) {
            checkUids(oldUid, uid, function() {
              opts.io.to("user:"+req.user.user).emit(
                'talk',
                {
                  objectType: "search-edit",
                  id: search.id
                }
              );
              pubClient.publish("disneydining:searchedit", JSON.stringify(search));
              if (req.user.mobile === false) {
                createUserModel(req.session.user, function(user) {
                  addUserToSession(user, req, function() {
                    sendBack(search, 200, res);
                  });
                });
              } else {
                sendBack(search, 200, res);
              }
            });
          } else {
            opts.io.to("user:"+req.user.user).emit(
              'talk',
              {
                objectType: "search-edit",
                id: search.id
              }
            );
            pubClient.publish("disneydining:searchedit", JSON.stringify(search));
            sendBack(search, 200, res);
          }
        });
      });
    });
  });
};

exports.getUserSearches = function(req, res) {
  var user = {id: req.user.user};
  getUserSearches(user, false, function(searches) {
    sendBack(searches, 200, res);
  });
};


exports.getRestaurants = function(req, res) {
  var lastUpdated = ("lastUpdated" in req.params) ? req.params.lastUpdated : null;
  getRestaurants(lastUpdated, function(restaurants) {
    sendBack(restaurants, 200, res);
  });
};

exports.searchRestaurants = function(req, res) {
  //console.log("searching for", req.params.name);
  searchRestaurants(
    req.params.name,
    function(restaurants) {
      sendBack(restaurants, 200, res);
    }
  );
};

exports.searchCarriers = function(req, res) {
  //console.log("searching for", req.params.name);
  searchCarriers(
    req.params.name,
    function(carriers) {
      sendBack(carriers, 200, res);
    }
  );
};

exports.deleteUserSearch = function(req, res) {
  models.UserSearches.find(
    req.params.searchId
  )
  .then(function(search) {
    if (search) {
      var attributes = {
            "deleted": 1,
            "enabled": 0,
            "deletedAt": moment.utc().format("YYYY-MM-DD HH:mm:ss")
          };
      search.updateAttributes(attributes).then(function() {
        checkUids(search.uid, null, function() {
          opts.io.to("user:"+req.user.user).emit(
            'talk',
            {
              objectType: "search-delete",
              id: search.id
            }
          );
          pubClient.publish("disneydining:searchdelete", JSON.stringify({id: search.id}));
          if (req.user.mobile) {
            sendBack({}, 200, res);
          } else {
            createUserModel(req.session.user, function(user) {
              addUserToSession(user, req, function() {
                sendBack({}, 200, res);
              });
            });
          }
        });
      });
    } else {
      pubClient.publish("disneydining:searchdelete", JSON.stringify({id: req.params.searchId}));
      if (req.user.mobile) {
        sendBack({}, 200, res);
      } else {
        createUserModel(req.session.user, function(user) {
          addUserToSession(user, req, function() {
            sendBack({}, 200, res);
          });
        });
      }
    }
  });
};

exports.getSearch = function(req, res) {
  //console.log("searching for", req.params.searchId);
  getUserSearch(
    req.params.searchId,
    function(search) {
      if (("session" in req && "user" in req.session) || ("user" in req)) {
        if (req.user.mobile) {
          sendBack([search], 200, res);
        } else {
          createUserModel(req.session.user, function(user) {
            addUserToSession(user, req, function() {
              sendBack(search, 200, res);
            });
          });
        }
      } else {
        var errorMsg = {
          status: "error",
          messsage: {
            response: "You are not logged in. Please login."
          }
        };
        sendBack(errorMsg, 401, res);
      }
    }
  );
};

exports.sendUserActivation = function(req, res) {
  if ("session" in req && "user" in req.session) {
    sendActivationEmail(req.session.user, function() {
      sendBack({}, 200, res);
    });
  } else {
    var errorMsg = {
          status: "error",
          messsage: {
            response: "Unable to activate user"
          }
        };
    sendBack(errorMsg, 401, res);
  }
};

exports.activateUser = function(req, res) {
  //console.log("Begin user activation:", req.params.token);
  var decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.update(req.params.token, 'hex', 'utf8');
  var userId = decipher.final('utf8'),
      userAttributes = {
        activated: true
      };
  //console.log("userId:", userId);
  models.Users.find(userId).then(function(user) {
    user.updateAttributes(userAttributes).then(function(user) {
      user = user.toJSON();
      getUser(user.id, true, function(user) {
        createUserModel(user, function(user) {
          addUserToSession(user, req, function() {
            sendBack(user, 200, res);
          });
        });
      });
    });
  });

};

exports.makePayment = function(req, res) {
  var payment = req.body,
      type = (payment.type === "extraSearches") ? "Extra Searches" : payment.subscription.ucfirst() + " Subscription";
  payment.number = payment.number.replace(/\s+/g, '');
  payment.expiration = payment.expiration.replace(/\s+/g, '');
  //console.log("payment: ", payment);
  stripe.charges.create(
    {
      amount: payment.amount * 100,
      currency: "usd",
      card: {
        number: payment.number,
        exp_month: payment.expiration.split("/")[0],
        exp_year: payment.expiration.split("/")[1],
        cvc: payment.security,
        name: payment.name,
        address_zip: req.session.user.zipCode
      },
      receipt_email: req.session.user.email,
      description: "Disney Dining Scout: " + type + " charge for " + payment.name
    },
    function(err, charge) {
      var paid = {};
      if (err) {
        //console.log("error: ", err);
        paid = {
          userId: payment.userId,
          amount: payment.amount,
          subscription: payment.subscription,
          transId: err.raw.charge,
          date: moment.utc().format("YYYY-MM-DD HH:m:ssZ"),
          discountCode: payment.discountCode,
          discount: payment.discount,
          expires: null,
          cardType: payment.cardType,
          last4: payment.number.slice(-4),
          failureCode: err.code,
          failureMess: err.message
        };
      } else {
        //console.log("charge: ", charge);
        var expirationDate = (payment.type === "subscription") ? expires(payment.subscription, req.session.user) : null;
        paid = {
          userId: payment.userId,
          amount: payment.amount,
          subscription: payment.subscription,
          transId: charge.id,
          date: moment.utc(charge.created, "X").format("YYYY-MM-DD HH:m:ssZ"),
          discountCode: payment.discountCode,
          discount: payment.discount,
          expires: expirationDate,
          cardType: payment.cardType,
          last4: charge.card.last4,
          failureCode: null,
          failureMess: null
        };
      }
      async.waterfall(
        [
          function(cb){
            models.Payments.create(paid).then(
              function(paymentRec) {
                cb(null, paymentRec);
              }
            );
          },
          function(paymentRec, cb){
            var sub;
            if (paid.expires !== null) {
              if (payment.type === "subscription") {
                var monthly = (payment.subscription === "pro") ? true : false,
                    unlimited = (payment.subscription === "pro") ? true : false;
                sub = {
                  user: payment.userId,
                  type: payment.subscription,
                  unlimited: unlimited,
                  monthly: monthly,
                  expires: paid.expires
                };
                models.Subscriptions.create(sub).then(
                  function(subscription) {
                    cb(null, paymentRec, subscription);
                  }
                );
              }
            } else if (payment.type === "extraSearches") {
              sub = {
                user: payment.userId,
                subscription: payment.subscriptionId,
                numberOfSearches: payment.numberOfSearches
              };
              models.ExtraSearches.create(sub).then(
                function(subscription) {
                  cb(null, paymentRec, subscription);
                }
              );
            } else {
              cb(null, paymentRec, null);
            }
          }
        ],
        function (err, paymentRec, subscription) {
          if (paid.expires !== null) {
            updateUserExpires(
              req.session.user.id,
              expirationDate,
              function(user) {
                req.session.user = user;
                sendBack(paymentRec, 200, res);
              }
            );
          } else {
            createUserModel(
              req.session.user,
              function(user) {
                req.session.user = user;
                sendBack(paymentRec, 200, res);
              }
            );
          }
        }
      );
    }
  );
};

exports.getUser = function(req, res) {
  getUser(req.params.userId, true, function(user) {
    createUserModel(user, function(user) {
      if (req.user.mobile) {
        delete user.availableSearches;
        delete user.extraSearches;
        delete user.subscription;
        delete user.totalPaidSearches;
        user = [user];
      }
      sendBack(user, 200, res);
    });
  });
};

var sendBack = function(data, status, res) {
  res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
  res.writeHead(status, { 'Content-type': 'application/json' });
  res.write(JSON.stringify(data), 'utf-8');
  res.end('\n');
};

var getUser = function(userId, toJson, callback) {
  async.waterfall([
    function(cb){
      models.Users.find(userId).then(function(user) {
        if (toJson) {
          user = user.toJSON();
        }
        cb(null, user);
      });
    },
    function(user, cb){
      if (user.carrier !== "") {
        models.SmsGateways.find(user.carrier).then(function(carrier) {
          user.sms = carrier.toJSON();
          cb(null, user);
        });
      } else {
        user.sms = {};
        cb(null, user);
      }

    }
  ], function (err, user) {
   callback(user);
  });

};

var updateUserPassword = function(user, password, cb) {
  bcrypt.hash(password, 8, function(err, hash) {
    var userAttributes = {
      password: hash
    };
    user.updateAttributes(userAttributes).then(function(user) {
      user = user.toJSON();
      createUserModel(user, function(user) {
        cb(user);
      });
    });
  });
};

var updateUserExpires = function(userId, expires, cb) {
  var userAttributes = {
    subExpires: expires
  };
  models.Users.find(userId).then(function(user) {
    user.updateAttributes(userAttributes).then(function(user) {
      user = user.toJSON();
      createUserModel(user, function(user) {
        cb(user);
      });
    });
  });
};

var getRestaurants = function(updatedAt, callback) {
  var deletedAt = (updatedAt === null) ? "AND deletedAt IS NULL " : "",
      sql = 'SELECT * ' +
        'FROM restaurants ' +
        'WHERE updatedAt >= :updatedAt ' +
        deletedAt +
        'ORDER BY name ASC ';
  updatedAt = updatedAt || 31536000;
  db.dining.query(
    sql,
    {
      replacements: {
        updatedAt: moment.utc(updatedAt, "X").format("YYYY-MM-DD HH:m:ssZ")
      },
      type: Sequelize.QueryTypes.SELECT
    }
  ).then(function(restaurants) {
    callback(restaurants);
  });
};

var getRestaurant = function(id, callback) {
  models.Restaurants.find(id).then(function(restaurants) {
    var convertToJson = function(item, cback) {
          cback(null, item.toJSON());
        };
    async.map(restaurants, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var searchRestaurants = function(name, callback) {
  models.Restaurants.findAll({
    where: {
      name: {
        like: "%"+name+"%"
      }
    },
    order: "name ASC"
  }).then(function(restaurants) {
    var convertToJson = function(item, cback) {
          cback(null, item.toJSON());
        };
    async.map(restaurants, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var searchCarriers = function(name, callback) {
  models.SmsGateways.findAll({
    where: {
      name: {
        like: "%"+name+"%"
      }
    },
    order: "name ASC"
  }).then(function(carriers) {
    var convertToJson = function(item, cback) {
          cback(null, item.toJSON());
        };
    async.map(carriers, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var generateUid = function(search) {
  var md5 = crypto.createHash('md5'),
      timestamp = moment(search.date, "YYYY-MM-DD HH:mm:ssZ").format("X"),
      uid = md5.update(search.restaurant + timestamp + search.partySize).digest("base64");

  return uid;
};

var checkUids = function(oldUid, newUid, callback) {
  async.waterfall([
    function(cb){
      var goNext = function() {
            cb(null);
          };
      if (oldUid !== null) {
        models.UserSearches.findAndCountAll({
          where: {
            uid: oldUid,
            deleted: 0,
            enabled: 1
          }
        })
        .then(function(result) {
          //console.log(result.count);
          if (result.count === 0) {
            models.GlobalSearches.find({
              where: {
                uid: oldUid
              }
            }).then(function(search) {
              if (search) {
                search.destroy().then(function() {
                  goNext();
                });
              } else {
                goNext();
              }
            });
          } else {
            goNext();
          }
        });
      } else {
        goNext();
      }
    },
    function(cb){
      if (newUid !== null) {
        models.GlobalSearches.findAndCountAll({
          where: {
            uid: newUid
          }
        }).then(function(result) {
          if (result.count > 0) {
            cb(null, null);
          } else {
            models.GlobalSearches.create({
              "uid": newUid,
              "lastChecked": "1970-01-01 00:00:00"
            }).then(function(search) {
              cb(null, search);
            });
          }
        });
      } else {
        cb(null, null);
      }
    }
  ],function(err, globalSearch) {
    callback(globalSearch);
  });
};

var createUserModel = function(user, cb) {
  if (typeof user !== "undefined" && "id" in user) {
    async.waterfall([
      function(callback){
        getUserSearches(
          user,
          false,
          function(searches) {
            //console.log("searches", searches);
            user.searches = searches;
            callback(null, user);
          }
        );
      },
      function(user, callback) {
        getUserPayments(
          user.id,
          function(payments) {
            //console.log("payments", payments);
            user.payments = payments;
            callback(null, user);
          }
        );
      },
      function(user, callback) {
        getSubscription(
          user,
          function(subscription) {
            console.log("subscription",subscription);
            user = underscore.extend(user, subscription);
            callback(null, user);
          }
        );
      }
    ],function(err, results) {
        cb(results);
    });
  } else {
    //console.log("Missing user!");
    cb(null);
  }
};

var getUserSearches = function(user, active, callback) {
  console.log("isActive:", active);
  active = active || false;
  var where = {
      user: user.id,
      deleted: 0,
      enabled: 1
    };
  if (active) {
    where.date = {
      gte: Sequelize.literal("UTC_TIMESTAMP()")
    };
  }
  models.UserSearches.findAll({
    where: where,
    order: [Sequelize.literal('(CASE WHEN date < UTC_TIMESTAMP() THEN 0 ELSE 1 END) DESC'), Sequelize.literal('date ASC')]
  }).then(function(searches) {
    var convertToJson = function(item, cback) {
          getUserSearch(item.id, function(search) {
            cback(null, search);
          });
        };
    async.map(searches, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var getUserPayments = function(userId, callback) {
  models.Payments.findAll({
    where: {
      userId: userId,
      failureCode: {$eq: null}
    },
    order: [Sequelize.literal('date DESC')]
  }).then(function(payments) {
    var convertToJson = function(item, cback) {
          cback(null, item.toJSON());
        };
    async.map(payments, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var getUserSearch = function(id, callback) {
  async.waterfall([
    function(cb){
      models.UserSearches.find({
        where: {
          id: id,
          deleted: 0,
          enabled: 1
      }}).then(function(search) {
        search = search.toJSON();
        cb(null, search);
      });
    },
    function(search, cb){
      models.Restaurants.find(search.restaurant).then(
        function(restaurant) {
          if (restaurant) {
            search.restaurant = restaurant.toJSON();
            cb(null, search);
          } else {
            cb("cannot find restaurant", null);
          }
        }
      );
    },
    function(search, cb) {
      models.SearchLogs.findAll({
        where: {
          uid: search.uid
        },
        order: 'dateSearched DESC',
        limit: 10
      }).then(function(logs) {
          var convertToJson = function(item, cback) {
                item.times = ( item.times !== "" ) ? JSON.parse(item.times) : [];
                cback(null, item);
              };
          async.map(logs, convertToJson, function(err, results){
            search.logs = results;
            cb(null, search);
          });
      });
    }
  ], function (err, search) {
   callback(search);
  });
};

var getSubscription = function(user, callback) {
  async.waterfall([
    function(cb){
      models.Subscriptions.find(
        {
          where: {
            user: user.id
          },
          order: 'expires DESC'
        }
      ).then(
        function(subscription) {
          subscription = (subscription) ? subscription.toJSON() : subscription;
          cb(null, subscription);
        }
      );
    },
    function(subscription, cb) {
      getUserSearches(
        user,
        true,
        function(searches) {
          //console.log("searches", searches);
          cb(null, subscription, searches);
        }
      );
    },
    function(subscription, activeSearches, cb) {
      var calc = function(extraSearches) {
        var number = 2,
            type = {
              "standard" : {
                number: 4
              },
              "plus" : {
                number: 8
              },
              "pro" : {
                number: 101001
              },
            },
            sub = {
              subscription: subscription,
              extraSearches: extraSearches,
              totalPaidSearches: 2,
              availableSearches: 2
            };
        if (subscription) {
          if (subscription.unlimited) {
            number = 101001;
          } else {
            number = type[subscription.type].number;
            //console.log("extraSearches:", extraSearches);
            if (extraSearches) {
              number += parseInt(extraSearches.totalSearches, 10);
            }
          }
        }
        sub.totalPaidSearches = number;
        sub.availableSearches = number - activeSearches.length;
        cb(null, sub);
      };
      if (subscription) {
        models.ExtraSearches.findAll(
          {
            where: {
              subscription: subscription.id
            },
            attributes: [
              [Sequelize.fn('SUM', Sequelize.col('numberOfSearches')), 'totalSearches'],
              'subscription'
            ],
            group: ['subscription'],
            order: 'id DESC'
          }
        ).then(
          function(extraSearches) {
            extraSearches = (extraSearches.length > 0) ? extraSearches[0].toJSON() : {totalSearches: 0};
            calc(extraSearches);
          }
        );
      } else {
        calc([]);
      }
    }
  ], function (err, sub) {
   callback(sub);
  });
};

var expireActivationCode = function(code, callback) {
  var tokenAttributes = {
        "used": 1
      };
  models.ActivationCodes.find({where:{token:code}}).then(function(token) {
    token.updateAttributes(tokenAttributes).then(function(token) {
      callback(token);
    });
  });
};

var sendActivationEmail = function(user, callback) {
  emailTemplates(emailTemplatesDir, function(err, template) {
    if (err) {
      //console.log(err);
    } else {
      // Send a single email
      // An example users object with formatted email function
      var cipher = crypto.createCipher('aes-256-cbc', key);
      cipher.update(user.id.toString(), 'utf8', 'hex');
      user.token = cipher.final('hex');
      // Send a single email
      template('activation', user, function(err, html, text) {
        if (err) {
          //console.log(err);
        } else {
          transport.sendMail({
            from: 'Disney Dining Scout <noreply@disneydining.io>',
            to: user.email,
            subject: 'Account Activation',
            html: html,
            generateTextFromHTML: true
          }, function(err, responseStatus) {
            if (err) {
              //console.log(err);
            } else {
              //console.log(responseStatus.message);
            }

            callback();
          });
        }
      });
    }
  });
};

var expires = function(sub, user) {
  var expires = moment.utc(user.subExpires, "YYYY-MM-DD HH:mm:ssZ"),
      subLength = (sub === "standard") ? 6 : 12,
      subExpires = moment.utc().add(subLength, "M");
  if (moment(expires).isAfter()) {
    subExpires = expires.add(subLength, "M");
  }

  return subExpires.format("YYYY-MM-DD 00:00:00+0:00");
};

var addUserToSession = function(user, request, cb) {
  if ("session" in request) {
    if (user !== null) { request.session.user = user; }
    cb();
  } else {
    request.session.regenerate(function(err) {
      if (user !== null) { request.session.user = user; }
      cb();
    });
  }
};

var addUserDeviceToken = function(device, callback) {
  models.DeviceTokens.findAll(
    {
      where: {
        token: device.token
      }
    }
  ).then(
    function(records) {
      if (records.length === 0) {
        models.DeviceTokens.create(device).then(
          function(record) {
            models.DeviceTokens.destroy(
              { 
                where: {
                  uuid: device.uuid,
                  token: {
                    ne: device.token
                  }
                }
              },
              {}
            ).then(
              function(affectedRows) {
                callback(record);
              }
            );
          },
          function(error) {
            var errorMsg = {
                  success: false,
                  data: {
                    message: "Failed to save device token.",
                    code: error.code,
                    error: "deviceToken"
                  }
                };
            callback(errorMsg);
          }
        );
      } else {
        callback(records[0]);
      }
    },
    function(error) {
      var errorMsg = {
            success: false,
            data: {
              message: "Failed to save device token.",
              code: error.code,
              error: "deviceToken"
            }
          };
      callback(errorMsg);
    }
  );

};

var heatmapUid = function(uid) {
  var sql = 'SELECT DATE_FORMAT(dateSearched,"%Y-%m-%d %H:00:00") as date, count(*) as count ' +
        'FROM searchLogs ' +
        'WHERE uid = :uid AND foundSeats = 1 ' +
        'GROUP BY hour( dateSearched ) , day( dateSearched ) ' +
        'ORDER BY dateSearched ASC ';
};

function pad(num, size) {
    var s = num+"";
    while (s.length < size) { s = "0" + s; }
    return s;
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

String.prototype.ucfirst = function(notrim) {
  var s = notrim ? this : this.replace(/(?:(?:^|\n)\s+|\s+(?:$|\n))/g,'').replace(/\s+/g,' ');
  return s.length > 0 ? s.charAt(0).toUpperCase() + s.slice(1) : s;
};

}());
