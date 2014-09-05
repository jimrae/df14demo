/**
 *
 * Dreamforce 14 Demo Application 
 * Copyright 2014 Xede Consulting Group
 * Jim Rae jrae@xede.com
 * @jimrae2009
 *
 */
 
var express = require('express');
var routes = require('./routes');
var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var configuration = require("./configuration.js");


var dir = path.normalize(configuration.LOGPATH);
if(!fs.existsSync(dir)){
    fs.mkdirSync(dir, 0766, function(err){
    	if(err){ 
        	console.error(err);
        	console.error("ERROR! Can't make the directory! \n");    
        }
    });   
}
var winston = require('winston');
var logf = path.join(dir,configuration.LOGFILE);
var loge = path.join(dir,'EXCEPTIONS-'+configuration.LOGFILE);
winston.add(winston.transports.File, { filename: logf});

winston.handleExceptions(new winston.transports.File({ filename: loge }));

var sslkey = fs.readFileSync('ssl-key.pem');
var sslcert = fs.readFileSync('ssl-cert.pem');

var options = {
    key: sslkey,
    cert: sslcert,
    requestCert: false,
    rejectUnauthorized: false,
    agent: false
};

var app = express();

// all environments
app.set('port', process.env.PORT || 8443);
app.set('host', 'localhost');
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.favicon());

app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser('Dreamforce is Awesome'));
app.use(express.session());
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
  app.use(express.logger('dev'));
}else{
  winston.remove(winston.transports.Console);
}


app.get('/', routes.index);
app.get('/quote',routes.quote);
app.post('/authenticate', routes.authenticate);
app.get('/xede',routes.xede);

https.createServer(options, app).listen(app.get('port'), function(){
  winston.log('info','Express server listening on port ' + app.get('port'));
});