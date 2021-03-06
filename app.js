'use strict';

//IMPORTING
var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var passport = require('passport');
var session = require('express-session');
//var fs = require('fs');
var logger = require('morgan');                     //HTTP request logger - will show requests in Command Prompt
var cors = require('cors');

var config = require('./config');

var fs = require('fs');

// Load environment
const _ENV_NAME = process.env.NAME || 'development';
config = config[_ENV_NAME];

// Mongoose Connection
mongoose.Promise = global.Promise;
mongoose.connect(config.mongoUrl, { useCreateIndex: true, useNewUrlParser: true }, (err) => {
  if (err)
    console.log(err);
  else
    console.log('Connected to mLab !');
});

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: false }));

// passport config
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));

//CORS middleware
app.use(cors());
// var allowCrossDomain = function (req, res, next) {
//   res.header('Access-Control-Allow-Origin', '*');
//   res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
//   res.header('Access-Control-Allow-Headers', '*');

//   // fs.appendFile(__dirname + '/logs.txt', new Date() + '\r\n' + req.url + '\r\n' + JSON.stringify(req.body) + '\r\n\r\n');

//   next();
// }
// app.use(allowCrossDomain);

// Importing Routing files
var routes = require('./routes/index');
var keyword = require('./routes/keyword');
var added = require('./routes/added');
var user = require('./routes/user');
var noti = require('./routes/noti');
var ques = require('./routes/ques');
var rec_for_man = require('./routes/rec_for_man');
var growth_rec = require('./routes/growth_rec');
var beliefs = require('./routes/beliefs');
var facList = require('./routes/facList');
var openQues = require('./routes/openQues');
var openMCQ = require('./routes/openMCQ');
var openUser = require('./routes/openUser');
var openMCQUser = require('./routes/openMCQUser');
var library = require('./routes/library');
var team = require('./routes/team');
var competency = require('./routes/competency');
var growth_rec_assessor = require('./routes/growth_rec_assessor');
var role_fitment = require('./routes/role_fitment');
var profile_synthesis = require('./routes/profile_synthesis');
var rank_strengths = require('./routes/rank_strengths');

// linking callback function to route
app.use('/', routes);
app.use('/keyword', keyword);
app.use('/added', added);
app.use('/user', user);
app.use('/noti', noti);
app.use('/ques', ques);
app.use('/rec_for_man', rec_for_man);
app.use('/beliefs', beliefs);
app.use('/growth_rec', growth_rec);
app.use('/facList', facList);
app.use('/openQues', openQues);
app.use('/openMCQ', openMCQ);
app.use('/openUser', openUser);
app.use('/openMCQUser', openMCQUser);
app.use('/library', library);
app.use('/team', team);
app.use('/competency', competency);
app.use('/growth_rec_assessor', growth_rec_assessor);
app.use('/role_fitment', role_fitment);
app.use('/profile_synthesis', profile_synthesis);
app.use('/rank_strengths', rank_strengths);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found!');
  err.status = 404;
  next(err);
});

//blog.info(';oiuahdf');
//blog.error('8tgyubk80y');

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
  app.use(function (err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
  });
};

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});

// Secure traffic only
app.all('*', function (req, res, next) {
  console.log('req start: ', req.secure, req.hostname, req.url, app.get('port'));
  if (req.secure) {
    return next();
  };

  res.redirect('https://' + req.hostname + ':' + app.get('secPort') + req.url);
});

module.exports = app;
