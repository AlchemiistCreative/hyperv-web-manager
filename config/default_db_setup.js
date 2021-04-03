let connection = require('./db')
let bcrypt = require('bcrypt')
module.exports = function (){
    DefaultPassword = 'admin' 
    var hashedPassword = bcrypt.hashSync(DefaultPassword, 10)
    
    var sql = `INSERT INTO config SET id = 1 ON DUPLICATE KEY UPDATE id = 1`

    var sql2 = `INSERT INTO users SET id = 1, username = 'admin', password = ? ON DUPLICATE KEY UPDATE id = 1`

    
    connection.query(sql, (err) => {
        if (err) throw err

    });;
    connection.query(sql2,[hashedPassword], (err) => {
        if (err) throw err

    });;

}



