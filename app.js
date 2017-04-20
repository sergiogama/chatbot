/**
 * Module dependencies.
 */

var express = require('express'),
    routes = require('./routes'),
    http = require('http'),
    path = require('path'),
    fs = require('fs');
var cfenv = require('cfenv');

var chatbot = require('./config/bot.js');


var app = express();

var db;

var cloudant;

var fileToUpload;

var dbCredentials = {
    dbName: 'my_sample_db'
};

var bodyParser = require('body-parser');
var methodOverride = require('method-override');
var errorHandler = require('errorhandler');

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.engine('html', require('ejs').renderFile);
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());
app.use(methodOverride());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/style', express.static(path.join(__dirname, '/views/style')));

// development only
if ('development' == app.get('env')) {
    app.use(errorHandler());
}

function getDBCredentialsUrl(jsonData) {
    var vcapServices = JSON.parse(jsonData);
    // Pattern match to find the first instance of a Cloudant service in
    // VCAP_SERVICES. If you know your service key, you can access the
    // service credentials directly by using the vcapServices object.
    for (var vcapService in vcapServices) {
        if (vcapService.match(/cloudant/i)) {
            return vcapServices[vcapService][0].credentials.url;
        }
    }
}

function initDBConnection() {
    //When running on Bluemix, this variable will be set to a json object
    //containing all the service credentials of all the bound services
    if (process.env.VCAP_SERVICES) {
        dbCredentials.url = getDBCredentialsUrl(process.env.VCAP_SERVICES);
    } else { 
        dbCredentials.url = getDBCredentialsUrl(fs.readFileSync("vcap-local.json", "utf-8"));
    }

    cloudant = require('cloudant')(dbCredentials.url);

    // check if DB exists if not create
    cloudant.db.create(dbCredentials.dbName, function(err, res) {
        if (err) {
            console.log('Could not create new db: ' + dbCredentials.dbName + ', it might already exist.');
        }
    });

    db = cloudant.use(dbCredentials.dbName);
}

//initDBConnection();

app.get('/', routes.chat);



// load local VCAP configuration
var vcapLocal = null
if (require('fs').existsSync('./vcap-local.json')) {
    try {
        vcapLocal = require("./vcap-local.json");
        console.log("Loaded local VCAP", vcapLocal);
    }
    catch (e) {
        console.error(e);
    }
}

// get the app environment from Cloud Foundry, defaulting to local VCAP
var appEnvOpts = vcapLocal ? {
    vcap: vcapLocal
} : {}
var appEnv = cfenv.getAppEnv(appEnvOpts);
var appName;
if (appEnv.isLocal) {
    require('dotenv').load();
}






// =====================================
// WATSON CONVERSATION FOR ANA =========
// =====================================
app.post('/api/watson', function (req, res) {
    processChatMessage(req, res);
}); // End app.post 'api/watson'

function processChatMessage(req, res) {
    chatbot.sendMessage(req, function (err, data) {
        if (err) {
            console.log("Error in sending message: ", err);
            res.status(err.code || 500).json(err);
        }
        else {
//            Logs.find({
//                selector: {
//                    'conversation': data.context.conversation_id
//                }
//            }, function (err, result) {
//                if (err) {
//                    console.log("Cannot find log for conversation id of ", data.context.conversation_id);
//                }
//                else if (result.docs.length > 0) {
//                    var doc = result.docs[0];
//                    console.log("Sending log updates to dashboard");
                    //console.log("doc: ", doc);
//                    io.sockets.emit('logDoc', doc);
//                }
//                else {
//                    console.log("No log file found.");
//                }
//            });
            var context = data.context;
//            var owner = req.user.username;
            res.status(200).json(data);
        }
    });
}






http.createServer(app).listen(app.get('port'), '0.0.0.0', function() {
    console.log('Express server listening on port ' + app.get('port'));
});
