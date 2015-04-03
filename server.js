(function(){
  "use strict";

  /*  ==============================================================
      Include required packages
  =============================================================== */

  var session = require('express-session'),
      cors = require('cors'),
      bodyParser = require('body-parser'),
      methodOverride = require('method-override'),
      errorhandler = require('errorhandler'),
      cookieParser = require('cookie-parser'),
      favicon = require('serve-favicon'),
      compression = require('compression'),
      morgan = require('morgan'),
      eJwt = require('express-jwt'),
      fs = require('fs'),
      nconf = require('nconf'),
      path = require('path'),
      redis = require("redis"),
      url = require('url'),
      config, configFile, opts = {}, userSockets = [], publicKey, privateKey,
      redisConfig = {
          "host": "localhost",
          "port": "6379",
          "ttl": 43200,
          "db": 0
      };

  /*  ==============================================================
      Configuration
  =============================================================== */

  //used for session and password hashes
  var salt = '20sdkfjk23';

  if (process.argv[2]) {
    if (fs.lstatSync(process.argv[2])) {
      configFile = require(process.argv[2]);
    } else {
      configFile = process.cwd() + '/config/settings.json';
    }
  } else {
    configFile = process.cwd()+'/config/settings.json';
  }

  config = nconf
    .argv()
    .env("__")
    .file({ file: configFile });

  if (config.get("log")) {
    var access_logfile = fs.createWriteStream(config.get("log"), {flags: 'a'});
  }

  if (config.get("ssl")) {
    opts.https = {};
    if (config.get("ssl:key")) {
        opts.https.key = fs.readFileSync(config.get("ssl:key"));
    }
    if (config.get("ssl:cert")) {
        opts.https.cert = fs.readFileSync(config.get("ssl:cert"));
    }
    if (config.get("ssl:ca")) {
      opts.https.ca = [];
      config.get("ssl:ca").forEach(function (ca, index, array) {
        opts.https.ca.push(fs.readFileSync(ca));
      });
    }
    console.log("Express will listen: https");
  }

  if (config.get("tokenKey:public")) {
    publicKey = fs.readFileSync(config.get("tokenKey:public")).toString('utf8');
    config.set("publicKey", publicKey);
  }

  if (config.get("tokenKey:private")) {
    privateKey = fs.readFileSync(config.get("tokenKey:private")).toString('utf8');
    config.set("privateKey", privateKey);
  }

  //Session Conf
  if (config.get("redis")) {
    redisConfig = config.get("redis");
  }

  var redisClient = redis.createClient(redisConfig.port, redisConfig.host),
      RedisStore = require('connect-redis')(session),
      allowCrossDomain = function(req, res, next) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', '*');
        res.header('Access-Control-Allow-Headers', '*');

        // intercept OPTIONS method
        if ('OPTIONS' === req.method) {
          res.send(200);
        }
        else {
          next();
        }
      };
  opts.secret = salt;
  opts.store = new RedisStore(redisConfig);

  var app = module.exports = require("sockpress").init(opts),
      router = app.express.Router(),
      apiRouter = app.express.Router();

  // Express Configuration
  var oneDay = 86400000;

  app.use(compression());
  /**
  if ("log" in config) {
    app.use(app.express.logger({stream: access_logfile }));
  }
  **/
  app.use(cookieParser());
  app.use(favicon(path.join(__dirname, 'assets','images','favicon.ico')));
  app.use(app.express.static(__dirname + '/public'));     // set the static files location
  app.use('/css', app.express.static(__dirname + '/public/css'));
  app.use('/js', app.express.static(__dirname + '/public/js'));
  app.use('/images', app.express.static(__dirname + '/public/images'));
  app.use('/img', app.express.static(__dirname + '/public/images'));
  app.use('/fonts', app.express.static(__dirname + '/public/fonts'));
  app.use('/css/lib/fonts', app.express.static(__dirname + '/public/fonts'));
  app.use('/assets', app.express.static(__dirname + '/assets'));
  app.use('/lib', app.express.static(__dirname + '/lib'));
  app.use('/bower_components', app.express.static(__dirname + '/bower_components'));
  app.use(morgan('dev')); // log every request to the console
  app.use(bodyParser.urlencoded({'extended':'true'})); // parse application/x-www-form-urlencoded
  app.use(bodyParser.json()); // parse application/json
  app.use(bodyParser.json({ type: 'application/vnd.api+json' })); // parse application/vnd.api+json as json
  app.use(methodOverride('X-HTTP-Method-Override')); // override with the X-HTTP-Method-Override header in the request
  app.use(cors());
  app.use(
    eJwt(
      {
        secret: publicKey
      }
    ).unless(
      function (req) {
        var skipPaths = [
              "/",
              "/new",
              "/robots.txt",
              "/payments",
              "/searches",
              "/start",
              "/user-profile",
              "/update-notifications",
              "/change-password",
              "/api/user/authenticate",
              "/api/user",
              "/api/mobile/login",
              "/user/password/reset",
              "/api/search/carriers",
              "/api/mobile/token/refresh/"
            ],
            inPath = skipPaths.indexOf(req.originalUrl),
            fileExtension = function(url) {
              return url.split('.').pop().split(/\#|\?/)[0];
            },
            carriers = new RegExp('^(/api/search/carriers/\\w+)$'),
            restaurants = new RegExp('^(/api/search/restaurants/\\w+)$'),
            activation = new RegExp('^(/api/user/activation/\\w+)$'),
            activation0 = new RegExp('^(/activation/\\w+)$');
        if (inPath > -1) {
          console.log("skip based on url");
          return true;
        } else if (carriers.test(req.originalUrl)) {
          return true;
        } else if (activation.test(req.originalUrl) || activation0.test(req.originalUrl)) {
          return true;
        } else if (restaurants.test(req.originalUrl)) {
          return true;
        } else {
          console.log("do not skip based on url");
          var ext = fileExtension(req.originalUrl),
              index = ['otf', 'woff', 'ttf', 'svg', 'eot', 'png', 'jpg', 'html', 'css', 'js', 'map'].indexOf(ext),
              val = (index > -1) ? true : false;
          return val;
        }
      }
    )
  );

  var routes = require('./routes'),
      ioEvents = require('./ioEvents');

  routes.setKey("configs", config);
  routes.initialize();
  ioEvents.initialize(config);

  /*  ==============================================================
      Routes
  =============================================================== */

  //Standard Routes
  router.get('/', routes.index);
  router.get('/searches', routes.index);
  router.get('/payments', routes.index);
  router.get('/user-profile', routes.index);
  router.get('/change-password', routes.index);
  router.get('/update-notifications', routes.index);
  router.get('/start', routes.index);
  router.get('/new', routes.index);
  router.get('/activation/:token', routes.index);
  app.use('/', router);

  //API
  apiRouter.post('/user/authenticate', routes.authUser);
  apiRouter.post('/user', routes.addUser);
  apiRouter.get('/user/:userId', routes.getUser);
  apiRouter.put('/user/:userId', routes.updateUser);
  apiRouter.get('/user/searches/all', routes.getUserSearches);
  apiRouter.get('/user/authenticate/logout', routes.logoutUser);
  apiRouter.get('/user/activation/send', routes.sendUserActivation);
  apiRouter.put('/user/activation/:token', routes.activateUser);
  apiRouter.delete('/user/:userId', routes.logoutUser);
  apiRouter.post('/user/password/reset', routes.resetPassword);
  apiRouter.put('/user/password/update/:userId', routes.updatePassword);
  apiRouter.post('/user/password/update', routes.updatePassword);
  apiRouter.get('/restaurants', routes.getRestaurants);
  apiRouter.get('/restaurants/:lastUpdated', routes.getRestaurants);
  apiRouter.get('/search/restaurants/:name', routes.searchRestaurants);
  apiRouter.get('/search/carriers/:name', routes.searchCarriers);
  apiRouter.post('/search', routes.addSearch);
  apiRouter.get('/search/:searchId', routes.getSearch);
  apiRouter.put('/search/:searchId', routes.updateSearch);
  apiRouter.delete('/search/:searchId', routes.deleteUserSearch);
  apiRouter.post('/token/check', routes.checkResetToken);
  apiRouter.post('/charge', routes.makePayment);
  apiRouter.post('/mobile/login', routes.mobileAuth);
  apiRouter.post('/mobile/messaging/token', routes.addUserDeviceToken);
  apiRouter.post('/mobile/token/refresh', routes.mobileRefreshToken);
  app.use('/api', apiRouter);

  /*  ==============================================================
      Socket.IO Routes
  =============================================================== */

  routes.setKey("io", app.io);
  app.io.route('ready', ioEvents.connection);
  app.io.route('room:join', ioEvents.onJoinRoom);
  app.io.route('room:leave', ioEvents.onLeaveRoom);
  app.io.route('refreshToken', ioEvents.refreshToken);

  /*  ==============================================================
      Launch the server
  =============================================================== */
  var port = (config.get("port")) ? config.get("port") : 3001;
  app.listen(port);

}());
