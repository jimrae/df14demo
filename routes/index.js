/**
 * 
 * Copyright 2014 Xede Consulting Group
 *
 */
var crypto = require("crypto");
var fs = require('fs');
var path = require('path');
var configuration = require("../configuration.js");
var https = require('https');
var envelope;
var objdata;
var winston = require('winston');
var util = require('util');

exports.index = function(req, res) {
    var testData = require("../samplesession.json");
    res.render('index', {
        title: "Xede DF14 Demo",
        signedRequestJson: JSON.stringify(testData)
    });
};

exports.authenticate = function(req, res) {
    var bodyArray = req.body.signed_request.split(".");
    var consumerSecret = bodyArray[0];
    var encoded_envelope = bodyArray[1];
    var check = crypto.createHmac("sha256", configuration.CONSUMER_SECRET).update(encoded_envelope).digest("base64");
    if (check === consumerSecret) {
        envelope = JSON.parse(new Buffer(encoded_envelope, "base64").toString("ascii"));
        req.session.salesforce = envelope;
        res.render('index', {
            title: envelope.context.user.userName,
            signedRequestJson: JSON.stringify(envelope)
        });
    }
};

exports.xede = function(req, res){
    res.writeHead(301,
        {Location: 'http://www.xede.com'}
    );
    res.end();
}


function getString(s) {
    var out;
    if (typeof s != 'undefined') {
        out = s;
    } else {
        out = "";
    }
    return out;
}
exports.quote = function(req, res) {
    objdata = req.session.salesforce.context.environment.parameters;
    var stream;
    var filename;
    var launchError="";
    var targetPath = path.normalize(configuration.TARGETPATH);
    if(fs.existsSync(targetPath)){
        if (objdata.Quote_Number__c != null) {
            stream = fs.createWriteStream(path.join(targetPath, "DemoUpdate.txt"));
            filename = "DemoUpdate.txt";
        } else {
            stream = fs.createWriteStream(path.join(targetPath, "DemoCreate.txt"));
            filename = "DemoCreate.txt";
        } 
        stream.on('error', function (err) {
                    winston.error('Error writing Output file: '+objdata+' : '+err);
        });
        if (objdata.Id != null) {
            stream.once('open', function(fd) {
                stream.write("BillToFirstName: \"" + getString(objdata.Contact__r.FirstName) + "\"" + "\r\n");
                stream.write("BillToLastName: \"" + getString(objdata.Contact__r.LastName) + "\"" + "\r\n");
                stream.write("BillToCompany: \"" + getString(objdata.Account.Name) + "\"" + "\r\n");
                stream.write("QuoteNum: \"" + getString(objdata.Quote_Number__c) + "\"" + "\r\n");
                stream.write("SalesRep: \"" + getString(objdata.Owner.LastName) + ", " + getString(objdata.Owner.FirstName) + "\"" + "\r\n");
                stream.write("SalesRepPhone: \"" + getString(objdata.Owner.Phone) + "\"" + "\r\n");
                stream.write("SalesRepEmail: \"" + getString(objdata.Owner.Email) + "\"" + "\r\n");
                stream.write("SFDCOppId: \"" + getString(objdata.Id) + "\"" + "\r\n");
                stream.end();
            });
        } else {
            stream.once('open', function(fd) {
                stream.write("No Account Data Available" + "\r\n");
                stream.end();
            });
        }

        var exec = require('child_process').exec;
        var appName;

        if(filename=='DemoUpdate.txt'){
            appName='write.exe';
        }else{
            appName='notepad.exe';
        }
        var eOptions = { 
            encoding: 'utf8',
            timeout: 0,
            maxBuffer: 200*1024,
            killSignal: 'SIGTERM'
        };
        
        var child = exec(appName +' '+filename,eOptions, function(error, stdout, stderr) {
            winston.debug(child);
            if (error != null) {
                winston.error(appName +' Exec Error: ' +error+' STDERR: '+stderr);
                launchError=error.stack;
            }
        });
        
        child.stdout.on('data', function(data) {
            winston.log('info','stdout: ' + data);
        });
        child.stderr.on('data', function(data) {
            winston.error('stdout: ' + data);
        });
        child.on('close', function(code) {
            winston.log('info','Application closing code: ' + code);
        });
        if (objdata.Account != null && launchError.length==0) {
            var url = (envelope.client.instanceUrl).replace('https://', '');
            var upath= envelope.context.links.chatterFeedsUrl + "/record/" + objdata.Id + "/feed-items";
            var body = {
                body: {
                    messageSegments: [{
                        type: "Text",
                        text: "Quote Submitted for " + objdata.Account.Name
                    }]
                }
            };
            var options = {
                host: url,
                path: upath,
                port: 443,
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + envelope.client.oauthToken,
                    'Content-Type': 'application/json'
                }
            };
            var req2 = https.request(options, function(res2) {
                res2.setEncoding('utf8');
                var body = '';
                res2.on('data', function(chunk) {
                    body += chunk;
                });
                res2.on('error', function(e) {
                    winston.error('problem with chatter request: ' + e.message + '\n\n' + e.stack);
                });

                res2.on('end',function(){
                    winston.log('info','End Chatter Post: '+res2.statusCode);
                    if(res2.statusCode!=201){
                        winston.error(body);
                    }
                });
            });
            req2.on('error', function(e) {
                winston.error('problem with request: ' + e.message + '\n\n' + e.stack);
                winston.error('HOST: ' + req2.hostname);
            });

            req2.write(JSON.stringify(body));
            req2.end();
        }
        var sendMessage;
        if(launchError.length<2){
            sendMessage='Quote Submitted for ' + objdata.Account.Name;
        }else{
            sendMessage='Error Submitting Quote: ' + launchError;
        }
        res.send(sendMessage);
    }else {
        winston.log('error','Processing Error occured: '+launchError);
        res.send('No Quote to Submit\n or Error in Application Path:'+launchError);
    }
};