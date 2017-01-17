var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');



var User = db.Model.extend({
  tableName: 'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model, attrs, options) {
      console.log('creating user obj');
      // var salt = bcrypt.genSalt(function(salt) {
      //   model.set('salt', salt);
      // });
      // var hashedPasscode = bcrypt.hash(model.get('passcode'), salt, function() {
      //   model.set('passcode', hashedPasscode);
      // });
      // model.set('password', password);
      // model.set('username', username);
    });
    // console.log('this', this);
  }
});

module.exports = User;