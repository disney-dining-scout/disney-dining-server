var request = require('request'),
    nodemailer = require('nodemailer'),
    redis = require("redis"),
    client = redis.createClient(),
    moment = require('moment'),
    fiveHrsAgo = moment().subtract('hours', 5).format("X"),
    numbers = [], times,
    transport = nodemailer.createTransport("sendmail", {
      path: "/usr/sbin/sendmail",
      args: ["-t", "-f", "voss.matthew@gmail.com"]
    }),
    mailOptions = {
        from: "9795745795 <9795745795@messaging.sprintpcs.com>", // sender address
        to: "9795745795@messaging.sprintpcs.com, 9794923876@messaging.sprintpcs.com", // list of receivers
        subject: "Times found for Ohana", // Subject line
        text: "The availables times " // plaintext body
    },
    redisSearch = function(err, response) {
      if (err) console.log(err);
      console.log("search-response:", response);
      var args = [ 'disney-dining'];
      times[0].offers.forEach(function(time, index) {
        var res = moment(time.dateTime).zone(time.dateTime),
            ts = res.format("X");
        if (response.indexOf(ts) ===  -1) {
          //console.log(res.format("H:mm"));
          mailOptions.text += (index > 0) ? " and " :  "";
          mailOptions.text += res.format("H:mmA");
          args.push(moment().format("X"), res.format("X"));
        }
      });
      console.log(mailOptions.text, args);
      if (args.length > 1) {
        client.zadd(args, function (err, response) {
          if (err) console.log(err);
          console.log(response);
          /*
          transport.sendMail(mailOptions, function(error, response){
            if (error) {
                console.log(error);
            } else{
                console.log("Message sent:", response);
            }
            transport.close(); // shut down the connection pool
          });
          */
          client.quit();
        });
      } else {
        client.quit();
      }
    };

var getTimes = function() {
  request = request.defaults({jar: true});
  request('https://disneyworld.disney.go.com/dining/', function (error, response, body) {
    request(
      "https://disneyworld.disney.go.com/authentication/get-client-token/",
      function (error, response, body) {
        var tokens = JSON.parse(body);
        //console.log(tokens);
        request(
          {
            url: "https://disneyworld.disney.go.com/api/wdpro/finder-service/public/finder/dining-availability/90002606;entityType=restaurant",
            method: "GET",
            qs: {
              "searchDate": "2014-11-18",
              "partySize": "4",
              "searchTime": "18:30"
            },
            headers: {
              "Accept": "application/json",
              "Accept-Encoding": "sdch",
              "Accept-Language": "en-US,en;q=0.8",
              "Authorization": "BEARER "+tokens.access_token,
              "Connection": "keep-alive",
              "Host": "disneyworld.disney.go.com",
              "Referer": "https://disneyworld.disney.go.com/dining/",
              "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/34.0.1847.14 Safari/537.36",
              "X-Requested-With": "XMLHttpRequest",
              "Content-Type": "application/x-www-form-urlencoded"
            }
          },function (error, response, body) {
            if (!error) {
              var seats = JSON.parse(body);
              console.log(seats);
              if ("errors" in seats) {
                console.log(seats.errors);
              } else {
                times = seats.availability["90002606;entityType=restaurant"];
                times = times.availableTimes;
                console.log(times[0]);
                if (times.length > 0 &&
                  "unavailableReason" in times[0] === false) {
                  //console.log(times[0].offers);
                  var day = moment(times[0].offers[0].dateTime);
                  mailOptions.text += "on ";
                  mailOptions.text += day.format("MMM Do");
                  mailOptions.text += " are: ";
                  console.log(fiveHrsAgo);
                  var args = [ 'disney-dining', '+inf', fiveHrsAgo ];
                  client.zrevrangebyscore(args, redisSearch);

                } else {
                  client.quit();
                  console.log("No times available!");
                }
              }
            }
          }
        );
      }
    );
  });
};

var argsRm = [ 'disney-dining', '-inf', "("+fiveHrsAgo ];
client.zremrangebyscore(argsRm, function() {
  getTimes();
});

