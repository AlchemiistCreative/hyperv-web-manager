let mysql = require('mysql');
let connection = mysql.createConnection({
  host     : '127.0.0.1',
  user     : 'admin',
  password : 'Password123',
  database : 'HV_MAN'
});

connection.connect();


module.exports = connection;