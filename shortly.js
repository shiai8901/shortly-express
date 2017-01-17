var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var bcrypt = require('bcrypt-nodejs');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
app.use(cookieParser());
app.use(session({
  secret: 'whatever',
  resave: false,
  saveUninitialized: true
}));
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

var checkUser = function(req, res, next) {
  if (req.session.user) {
    console.log(req.session.user, ' logged in!');
    next();
  } else {
    req.session.error = 'Access denied.';
    res.redirect('/login');
  }
};

app.get('/', checkUser, function(req, res) {
  res.render('index');

  // res.cookie('visited', '/');
  // res.redirect('/login');
});

app.get('/login', function(req, res) {
  res.cookie('visited', 'login');
  res.render('login');
});

app.get('/create', function(req, res) {
  res.redirect('/login');
  // res.render('index');
});

app.get('/signup', function(req, res) {
  res.render('signup');
});
app.post('/signup', function(req, res) {
  // console.log('POST signup: ', req.body);
  new User(req.body).fetch().then(function(found) {
    if (found) {
      res.status(200).send('This username is already taken.');
    } else {
      var hash = bcrypt.hashSync(req.body.password);
      // console.log('signup, password', req.body.password, 'hash: ', hash);
      Users.create({
        username: req.body.username,
        password: hash
      }).then(function() {
        // res.location = '/';
        req.session.regenerate(function() {
          req.session.user = req.body.username;
          req.session.cookie.expires = new Date(Date.now() + 30000);
          res.redirect('/');
        });
      });
    }
  });
}); 

app.post('/login', function(req, res) {
  // console.log('POST login: ', req.body);
  var username = req.body.username;
  var password = req.body.password;
  //var hash = bcrypt.hashSync(password);
  //console.log('Login, password', password, 'hash: ', hash);
  new User({'username': username}).fetch().then(function(found) {
    console.log('found, ', found);
    if (found) {
      bcrypt.compare(password, found.attributes.password, function(err, res) {
        if (err) {
          console.error('User name and password do not match.');
        } 
      });
      req.session.regenerate(function() {
        req.session.user = username;
        req.session.cookie.expires = new Date(Date.now() + 30000);
        res.redirect('/');
      });
      // res.status(200).redirect('/');
    } else {
      res.status(404).redirect('/login');
    }
  });

});

app.get('/links', function(req, res) {
  // res.cookie('visited', 'links');
  // console.log('auth', req.cookies);
  // console.log('!req.cookies', !req.cookies);
  //console.log('res', res.cookie());
  if (req.cookies.post) {
    Links.reset().fetch().then(function(links) {
      res.status(200).send(links.models);   
    }); 
  } else {
    res.redirect('/login');
  }
  // if (!req.cookies) {
  //   res.redirect('/login');
  // } else {
  //   res.cookie('links', 'yes');
  //   Links.reset().fetch().then(function(links) {
  //     res.status(200).send(links.models);   
  //   });
  // }
  // Links.reset().fetch().then(function(links) {
  //   res.status(200).send(links.models);
    // res.redirect('/login');
});

app.post('/links', 
function(req, res) {
  var uri = req.body.url;
  res.cookie('post', 'yes');
  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.sendStatus(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.status(200).send(found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.sendStatus(404);
        }

        Links.create({
          url: uri,
          title: title,
          baseUrl: req.headers.origin
        })
        .then(function(newLink) {
          res.status(200).send(newLink);
        });
      });
    }
  });
});

app.get('/logout', function(req, res) {
  req.session.destroy(function() {
    res.redirect('/');
  });
});
/************************************************************/
// Write your authentication routes here
/************************************************************/



/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        linkId: link.get('id')
      });

      click.save().then(function() {
        link.set('visits', link.get('visits') + 1);
        link.save().then(function() {
          return res.redirect(link.get('url'));
        });
      });
    }
  });
});

module.exports = app;
