(function(){
  "use strict";

var fs = require('fs'),
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
    moment = require('moment'),
    redis = require("redis"),
    emailTemplatesDir = path.resolve(__dirname, '..', 'email', 'templates'),
    emailTemplates = require('email-templates'),
    db = {},
    Schemas = {},
    models = {},
    DocumentTypes = {},
    Workflows = {},
    opts = {},
    config = {},
    reconnectTries = 0, cacheBuster = moment().format("X"),
    hmac, signature, connection, client, key,
    transport, acl, subClient, analytics = "",
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


exports.initialize = function() {
  //Initialize PGsql
  //getConnection();

  //Initialize Email Client
  var setSubscription = function() {
        subClient.subscribe("disneydining");
        subClient.on("message", function (channel, message) {
          console.log("channel ", channel, ": ", message);
          message = JSON.parse(message);
          message.objectType = "search-update";
          opts.io.room(message.uid).broadcast('talk', message);
        });
      };
  transport = nodemailer.createTransport(smtpTransport({
    host: opts.configs.get("mail:host"),
    port: opts.configs.get("mail:port"),
    ignoreTLS: true
  }));
  transport.use('compile', htmlToText());

  key = opts.configs.get("key");

  console.log(opts.configs.get("redis"));
  subClient = redis.createClient(
    opts.configs.get("redis:port"),
    opts.configs.get("redis:host")
  );
  if (opts.configs.get("redis:db") && opts.configs.get("redis:db") > 0) {
    subClient.select(
      opts.configs.get("redis:db"),
      function() {
        console.log("Redis DB set to:", opts.configs.get("redis:db"));
        setSubscription();
      }
    );
  } else {
    setSubscription();
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
          timestamps: false
        }
  });

  models.Restaurants = db.dining.define('restaurants', {
    id:                   { type: Sequelize.STRING(255), primaryKey: true },
    name :                { type: Sequelize.STRING(255) }
  });

  models.UserSearches = db.dining.define('userSearches', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    restaurant:           { type: Sequelize.STRING(255) },
    created:              {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    date:                 {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
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
      defaultValue: '1969-01-01 00:00:00',
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
    lastSMSNotification:  {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    }
  });

  models.GlobalSearches = db.dining.define('globalSearches', {
    id:                   { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
    lastChecked:          {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
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
        defaultValue: '1969-01-01 00:00:00',
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
    created:              {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
      get: function(name) {
        return moment.utc(this.getDataValue(name)).format("YYYY-MM-DD HH:mm:ssZ");
      }
    },
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
    activated :           { type: Sequelize.BOOLEAN, defaultValue: 0 }
  });

  models.SmsGateways = db.dining.define('smsGateways', {
    id:                   { type: Sequelize.STRING(100), primaryKey: true },
    country :             { type: Sequelize.STRING(255) },
    name :                { type: Sequelize.STRING(255) },
    gateway :             { type: Sequelize.STRING(255) }
  });

  models.PasswordReset = db.dining.define('passwordReset', {
    id:                   { type: Sequelize.INTEGER(11), primaryKey: true },
    user :                { type: Sequelize.INTEGER(11) },
    token :               { type: Sequelize.STRING(255) },
    expire :              {
      type: Sequelize.DATE,
      defaultValue: '1969-01-01 00:00:00',
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

};

/************
* Routes
*************/

exports.index = function(req, res){
  var init = "$(document).ready(function() { Dining.start(); });",

      send = function() {
        fs.readFile(__dirname + '/../assets/templates/index.html', 'utf8', function(error, content) {
          if (error) { console.log(error); }
          var prefix = (opts.configs.get("prefix")) ? opts.configs.get("prefix") : "";
          init += (analytics.length > 0) ? analytics : "";
          var pageBuilder = handlebars.compile(content),
              html = pageBuilder({
                'init': init,
                'prefix':prefix,
                'cacheBuster': cacheBuster
              });

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.write(html, 'utf-8');
          res.end('\n');
        });
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
          init = "$(document).ready(function() { Dining.user = new Dining.Models.User(" + JSON.stringify(req.session.user) + "); Dining.start(); });";
          send();
        });
      });
    });
  } else {
    console.log(req.cookies);
    if ("remember" in req.cookies) {
      decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.update(req.cookies.remember, 'base64', 'utf8');
      userId = decipher.final('utf8');
      getUser(userId, true, function(user) {
        createUserModel(user, function(user) {
          addUserToSession(user, req, function() {
            init = "$(document).ready(function() { Dining.user = new Dining.Models.User(" + JSON.stringify(req.session.user) + "); Dining.start(); });";
            send();
          });
        });
      });
    } else {
      send();
    }

  }
};

//Log in an existing user, starting a session


//Add a user
exports.addUser = function(req, res) {
  console.log("adding user");
  var code = req.body.activationCode;
  if ("activationCode" in req.body) {
    models.ActivationCodes.find({
      where: {
        token: code,
        used: 0
      }
    }).success(function(token) {
      if (token) {
        var request = req,
            user = {
              created: moment().format("YYYY-MM-DD HH:m:ss"),
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
          models.Users.create(user).success(function(userRec) {
            //console.log(userRec);
            userRec = userRec.toJSON();
            createUserModel(userRec, function(user) {
              expireActivationCode(code, function(code) {
                console.log("Sending back new user");
                addUserToSession(user, request, function() {
                  delete user.password;
                  sendActivationEmail(user, function() {
                    sendBack(user, 200, res);
                  });
                });
              });
            });
          }).error(function(error) {
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
      } else {
        var errorMsg = {
            success: false,
            data: {
              message: "Invalid invitation code",
              code: "ERR_INVALID_INVITE_CODE"
            }
          };
        sendBack(errorMsg, 401, res);
      }
    });
  } else {
    var errorMsg = {
          success: false,
          data: {
            message: "Invalid invitation code",
            code: "ERR_INVALID_INVITE_CODE"
          }
        };
    sendBack(errorMsg, 401, res);
  }
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
  models.Users.find(req.params.userId).success(function(user) {
    user.updateAttributes(userAttributes).success(function(user) {
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
            console.log("Delete cookie");
            res.clearCookie('remember');
          }
          addUserToSession(user, request, function() {
            sendBack(user, 200, res);
          });
        });
      };
  models.Users.find({ where: { email: req.body.email } }).success(function(user) {
    if (user !== null) {
      bcrypt.compare(req.body.password, user.password, function(err, res) {
        if (res) {
          processUser(user);
        } else {
          var errorMsg = {
                status: "error",
                messsage: {
                  response: "Unable to authenticate user"
                }
              };
          sendBack(errorMsg, 401, res);
        }
      });
    } else {
      var errorMsg = {
            status: "error",
            messsage: {
              response: "Unable to authenticate user"
            }
          };
      sendBack(errorMsg, 401, res);
    }
  });
};

exports.resetPassword = function(req, res) {
  models.Users.find({
    where: {
      'email': req.body.email,
      'zipCode': req.body.zipCode
    }
  }).success(function(user) {
    if (user) {
      var passToken = {
            user: user.id,
            token: uuid.v4(),
            expire: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
          };
      user = user.toJSON();
      models.PasswordReset.create(passToken).success(function(result) {
        emailTemplates(emailTemplatesDir, function(err, template) {
          if (err) {
            console.log(err);
          } else {
            // Send a single email
            // An example users object with formatted email function
            user.token = passToken.token;
            // Send a single email
            template('resetPassword', user, function(err, html, text) {
              if (err) {
                console.log(err);
              } else {
                transport.sendMail({
                  from: 'Disney Dining Scout <noreply@disneydining.io>',
                  to: user.email,
                  subject: 'Password Reset Request',
                  html: html,
                  generateTextFromHTML: true
                }, function(err, responseStatus) {
                  if (err) {
                    console.log(err);
                  } else {
                    console.log(responseStatus.message);
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
        gt: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
      }
    }
  }).success(function(token) {
    if (token) {
      getUser(token.user, true, function(user) {
        token = token.toJSON();
        token = underscore.extend(token, user);
        console.log(token);
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
          gt: moment.utc().add(30, 'm').format('YYYY-MM-DD HH:mm:ss')
        }
      }
    }).success(function(token) {
      if (token) {
        getUser(token.user, true, function(user) {
          updateUserPassword(user, req.body.password, function(user) {
            var tokenAttributes = {
                  used: true
                };
            token.updateAttributes(tokenAttributes).success(function(token) {
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
    getUser(req.session.user.id, function(user) {
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
        'created',
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
  ).success(function(search) {
    console.log(search);

    getUserSearch(search.id, function(search) {
      checkUids(null, uid, function() {
        createUserModel(req.session.user, function(user) {
          req.session.user = user;
          sendBack(search, 200, res);
        });
      });
    });
  });
};

exports.updateSearch = function(req, res) {
  models.UserSearches
  .find(req.params.searchId)
  .success(function(userSearch) {
    var vals = [
          'id',
          'uid',
          'date',
          'enabled',
          'deleted',
          'created',
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
    results.id = req.params.searchId;
    var oldUid = results.uid,
        uid = generateUid(results);
    results.uid = uid;
    checkUids(oldUid, uid, function() {
      userSearch.updateAttributes(
        results
      ).success(function(search) {
        getUserSearch(search.id, function(search) {
          if (oldUid !== uid) {
            checkUids(oldUid, uid, function() {
              createUserModel(req.session.user, function(user) {
                addUserToSession(user, req, function() {
                  sendBack(search, 200, res);
                });
              });
            });
          } else {
            sendBack(search, 200, res);
          }
        });
      });
    });
  });
};

exports.getRestaurants = function(req, res) {
  getRestaurants(function(restaurants) {
    sendBack(restaurants, 200, res);
  });
};

exports.searchRestaurants = function(req, res) {
  console.log("searching for", req.params.name);
  searchRestaurants(
    req.params.name,
    function(restaurants) {
      sendBack(restaurants, 200, res);
    }
  );
};

exports.searchCarriers = function(req, res) {
  console.log("searching for", req.params.name);
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
  .success(function(search) {
    if (search) {
      var attributes = {
            "deleted": 1,
            "enabled": 0
          };
      search.updateAttributes(attributes).success(function() {
        checkUids(search.uid, null, function() {
          createUserModel(req.session.user, function(user) {
            addUserToSession(user, req, function() {
              sendBack({}, 200, res);
            });
          });
        });
      });
    }
  });
};

exports.getSearch = function(req, res) {
  console.log("searching for", req.params.searchId);
  getUserSearch(
    req.params.searchId,
    function(search) {
      if ("session" in req && "user" in req.session) {
        createUserModel(req.session.user, function(user) {
          addUserToSession(user, req, function() {
            sendBack(search, 200, res);
          });
        });
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
  console.log("Begin user activation:", req.params.token);
  var decipher = crypto.createDecipher('aes-256-cbc', key);
      decipher.update(req.params.token, 'base64', 'utf8');
  var userId = decipher.final('utf8'),
      userAttributes = {
        activated: true
      };

  models.Users.find(userId).success(function(user) {
    user.updateAttributes(userAttributes).success(function(user) {
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

var sendBack = function(data, status, res) {
  res.setHeader('Cache-Control', 'max-age=0, must-revalidate, no-cache, no-store');
  res.writeHead(status, { 'Content-type': 'application/json' });
  res.write(JSON.stringify(data), 'utf-8');
  res.end('\n');
};

var getUser = function(userId, toJson, callback) {
  toJson = toJson || true;
  async.waterfall([
    function(cb){
      models.Users.find(userId).success(function(user) {
        if (toJson) {
          user = user.toJSON();
        }
        cb(null, user);
      });
    },
    function(user, cb){
      if (user.carrier !== "") {
        models.SmsGateways.find(user.carrier).success(function(carrier) {
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
    user.updateAttributes(userAttributes).success(function(user) {
      user = user.toJSON();
      createUserModel(user, function(user) {
        cb(user);
      });
    });
  });
};

var getRestaurants = function(callback) {
  models.Restaurants.findAll({
    order: "name ASC"
  }).success(function(restaurants) {
    var convertToJson = function(item, cback) {
          cback(null, item.toJSON());
        };
    async.map(restaurants, convertToJson, function(err, results){
      callback(results);
    });
  });
};

var getRestaurant = function(id, callback) {
  models.Restaurants.find(id).success(function(restaurant) {
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
  }).success(function(restaurants) {
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
  }).success(function(carriers) {
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
      timestamp = moment(search.date, "YYYY-MM-DD HH:m:ss").format("X"),
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
        .success(function(result) {
          console.log(result.count);
          if (result.count === 0) {
            models.GlobalSearches.find({
              where: {
                uid: oldUid
              }
            }).success(function(search) {
              if (search) {
                search.destroy().success(function() {
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
        }).success(function(result) {
          if (result.count > 0) {
            cb(null, null);
          } else {
            models.GlobalSearches.create({
              "uid": newUid,
              "lastChecked": "1969-01-01 00:00:00"
            }).success(function(search) {
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
  if ("id" in user) {
    async.waterfall([
      function(callback){
        getUserSearches(user, function(searches) {
          console.log("searches", searches);
          user.searches = searches;
          callback(null, user);
        });
      }
    ],function(err, results) {
        cb(results);
    });
  } else {
    console.log("Missing user!");
    cb(null);
  }
};

var getUserSearches = function(user, callback) {
  models.UserSearches.findAll({
    where: {
      user: user.id,
      deleted: 0,
      enabled: 1
    },
    order: [Sequelize.literal('(CASE WHEN date < UTC_TIMESTAMP() THEN 0 ELSE 1 END) DESC'), Sequelize.literal('date ASC')]
  }).success(function(searches) {
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

var getUserSearch = function(id, callback) {
  async.waterfall([
    function(cb){
      models.UserSearches.find({
        where: {
          id: id,
          deleted: 0,
          enabled: 1
      }}).success(function(search) {
        search = search.toJSON();
        cb(null, search);
      });
    },
    function(search, cb){
      models.Restaurants.find(search.restaurant).success(function(restaurant) {
        search.restaurant = restaurant.toJSON();
        cb(null, search);
      });
    },
    function(search, cb) {
      models.SearchLogs.findAll({
        where: {
          uid: search.uid
        },
        order: 'dateSearched DESC',
        limit: 10
      }).success(function(logs) {
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

var expireActivationCode = function(code, callback) {
  var tokenAttributes = {
        "used": 1
      };
  models.ActivationCodes.find({where:{token:code}}).success(function(token) {
    token.updateAttributes(tokenAttributes).success(function(token) {
      callback(token);
    });
  });
};

var sendActivationEmail = function(user, callback) {
  emailTemplates(emailTemplatesDir, function(err, template) {
    if (err) {
      console.log(err);
    } else {
      // Send a single email
      // An example users object with formatted email function
      var cipher = crypto.createCipher('aes-256-cbc', key);
      cipher.update(user.id.toString(), 'utf8', 'base64');
      user.token = cipher.final('base64');
      // Send a single email
      template('activation', user, function(err, html, text) {
        if (err) {
          console.log(err);
        } else {
          transport.sendMail({
            from: 'Disney Dining Scout <noreply@disneydining.io>',
            to: user.email,
            subject: 'Account Activation',
            html: html,
            generateTextFromHTML: true
          }, function(err, responseStatus) {
            if (err) {
              console.log(err);
            } else {
              console.log(responseStatus.message);
            }

            callback();
          });
        }
      });
    }
  });
};

var addUserToSession = function(user, request, cb) {
  if ("session" in request) {
    if (user !== null) request.session.user = user;
    cb();
  } else {
    req.session.regenerate(function(err) {
      if (user !== null) request.session.user = user;
      cb();
    });
  }
};

function pad(num, size) {
    var s = num+"";
    while (s.length < size) s = "0" + s;
    return s;
}

if (!String.prototype.trim) {
  String.prototype.trim = function () {
    return this.replace(/^\s+|\s+$/g, '');
  };
}

}());
