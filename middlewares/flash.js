const { response } = require("express");
const { request } = require("http");

module.exports = function (req, res, next){

    if(req.session.flash){

        res.locals.flash = req.session.flash
        req.session.flash = undefined;

    }


    req.flash = function (type, content){
        if(req.session.flash === undefined){

            req.session.flash = {}


        }
        req.session.flash[type] = content



    }
    next();
}



