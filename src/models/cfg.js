let connection = require('../config/db')


class CFG {

    constructor(row) {

        this.row = row
    }


    get vm_name(){
        return this.row.VMNAME

    }
    get vm_uptime(){

        return this.row.VMUPTIME
    }
    get vm_state(){

        return this.row.VMSTATE
    }
    get vm_id(){

        return this.row.VMID
    }
    get system_logs(){

        return this.row.logs
    }
    get system_logs_date(){

        return this.row.created_time
    }
    get system_logs_id(){

        return this.row.id
    }
    get switch(){

        return this.row.switch
    }

    get img(){

        return this.row.images
    }

    get username(){

        return this.row.username
    }
    get hostname(){

        return this.row.hostname
    }
    get refresh_interval(){

        return this.row.refresh_interval
    }
    get inventory_path(){

        return this.row.inventory_path
    }
    get vhd_path(){

        return this.row.vhd_path
    }
    get ldap_url(){

        return this.row.ldap_url
    }
    get base_dn(){

        return this.row.base_dn
    }
    get memory(){
        return this.row.MEMORYSTARTUP
    }
    get cpu(){
        return this.row.CPU
    }
    get ip(){
        return this.row.IP
    }
    static delete(name,cb) {

    

        connection.query('DELETE FROM VMS_UNIQUE WHERE VMNAME=?', [name], (err, result) => {
            if (err) throw err

            cb(result);

        });


    }

    static get_vms(cb){

        connection.query('SELECT * FROM VMS_UNIQUE', (err, rows) => {
            if (err) throw err
            cb(rows.map((row) => new CFG(row)));

        } )

    }

    static get_sw(cb){

        connection.query('SELECT * FROM switch', (err, rows) => {
            if (err) throw err
            cb(rows.map((row) => new CFG(row)));

        } )

    }
    static get_logs(cb){

        connection.query('SELECT * FROM logs', (err, rows) => {
            if (err) throw err
            cb(rows.map((row) => new CFG(row)));

        } )

    }
    static get_img(cb){

        connection.query('SELECT * FROM img', (err, rows) => {
            if (err) throw err
            cb(rows.map((row) => new CFG(row)));

        } )

    }
    static get_config(cb){

        connection.query('SELECT * FROM config', (err, rows) => {
            if (err) throw err
            cb(rows.map((row) => new CFG(row)));

        } )

    }
    static get_users(username, password){

        connection.query('SELECT password FROM users WHERE username = ? AND password = ?',[username, password], (err, results, fields) => {
            if (err) throw err


        } )

    }
    static add_config(username,hostname, cb){

        connection.query('UPDATE config SET username = ?, hostname = ? WHERE id = 1', [username, hostname], (err, result) => {
            if (err) throw err

            cb(result);

        });

    }
    static add_interval(interval, cb){

        connection.query('UPDATE config SET refresh_interval = ? WHERE id = 1', [interval], (err, result) => {
            if (err) throw err

            cb(result);

        });

    }
    static add_ldap(ldap_url,base_dn, cb){

        connection.query('UPDATE config SET ldap_url = ?, base_dn = ? WHERE id = 1', [ldap_url, base_dn], (err, result) => {
            if (err) throw err

            cb(result);

        });

    }
    static add_credentials(username,password, cb){

        connection.query('UPDATE users SET username = ?, password = ? WHERE id = 1', [username, password], (err, result) => {
            if (err) throw err

            cb(result);

        });

    }
    static add_inventory_path(inventory_path,vhd_path, cb){

        connection.query('UPDATE config SET inventory_path = ?, vhd_path = ? WHERE id = 1', [inventory_path, vhd_path], (err, result) => {
            if (err) throw err

            cb(result);

        });

    }
}


module.exports = CFG