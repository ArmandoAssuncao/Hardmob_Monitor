'use strict';

//set Color badge
chrome.browserAction.setBadgeBackgroundColor({ color: [68, 138, 255, 255] });

var CONSTANTS = (function() {
     const privateVars = {
         'URL': 'http://www.hardmob.com.br/promocoes/',
         'INTERVAL': {
             'MIN_MINUTE': 30, // 20 min
             'MAX_MINUTE': 59, // 59 mins
             'MIN_HOUR': 1, //1 hour
             'MAX_HOUR': 20, //20 hours
             'MIN_DAY': 1, // 1 day
             'MAX_DAY': 5, //5 days
         },
         'OPTIONS': {
            set_words: 'set_words',
            set_time_intverval: 'set_time_intverval',
            set_state_monitoring: 'set_state_monitoring'
        }
     };

    return {
        get: function(name) { return privateVars[name]; }
    };
})();

let ARRAY_WORDS;
let ID_INTERVAL;
let TIME_INTERVAL = {};
let SET_STATE_MONITORING;


chrome.storage.sync.get(function(obj){
    console.log("Load words"); //TODO: delete
    console.log('OBJ:', obj); //TODO: delete
    ARRAY_WORDS = obj.words;
    SET_STATE_MONITORING = obj.set_state_monitoring || true;
    TIME_INTERVAL.time = obj.time_interval.time || CONSTANTS.get('INTERVAL').MIN_HOUR;
    TIME_INTERVAL.type = obj.time_interval.type || 'HOUR';

    if(SET_STATE_MONITORING)
        StartOrStopMonitoring();
});

//execute options
var backgroundFunction = function(opt, val){
    var msg = {option: opt, values: val};

    console.log('MSG: ', msg); //TODO: delete

    switch(msg.option) {
        case CONSTANTS.get('OPTIONS').set_words:
            setWords(msg.values);
            break;
        case CONSTANTS.get('OPTIONS').set_time_intverval:
            setTimeInterval(msg.values.time, msg.values.type);
            break;
        case CONSTANTS.get('OPTIONS').set_state_monitoring:
            setStateMonitoring(msg.values);
            break;
    }
}

function setWords(words){
    const sanitizedWords = words.map(function(word){
        if(word !== undefined && word !== "" && typeof word === 'string')
            return word.trim().toLowerCase();
    });

    ARRAY_WORDS = new Set(sanitizedWords);

    //save words
    chrome.storage.local.remove('words');
    chrome.storage.sync.set({'words': sanitizedWords}, function(){
        console.log("set storage"); // TODO: delete callback
    });
}

function setTimeInterval(time, type){
    if(type !== 'MINUTE' && type !== 'HOUR' && type !== 'DAY')
        type = 'HOUR';

    if(type === 'MINUTE')
        time = time < CONSTANTS.get('INTERVAL').MIN_MINUTE ? CONSTANTS.get('INTERVAL').MIN_MINUTE : time; // < 20 min
    else if(type === 'HOUR')
        time = time < CONSTANTS.get('INTERVAL').MIN_HOUR ? CONSTANTS.get('INTERVAL').MIN_HOUR : time; // < 23 hour
    else if(time === 'DAY')
        time = time > CONSTANTS.get('INTERVAL').MIN_DAY ? CONSTANTS.get('INTERVAL').MIN_DAY : time; // > 5 days


    TIME_INTERVAL.time = time;
    TIME_INTERVAL.type= type;

    chrome.storage.sync.set({'time_interval': TIME_INTERVAL}, function(){
        console.log("set storage interval"); // TODO: delete callback
    });

    StartOrStopMonitoring();
}

function setStateMonitoring(val){
    if(typeof val !== 'boolean') return;
    
    SET_STATE_MONITORING = val;

    chrome.storage.sync.set({'set_state_monitoring': SET_STATE_MONITORING}, function(){
        console.log("set storage"); // TODO: delete callback
    });

    StartOrStopMonitoring();
}

function sendRequest(url, callback) {
    var req = new XMLHttpRequest();
    if (!req) return;

    const method = "GET";

    req.onreadystatechange = function () {
        if (req.readyState != 4) return;
        if (req.status != 200 && req.status != 304) {
            console.log('HTTP error: ' + req.status);
            return;
        }
        callback(req);
    }

    req.open(method, url, true);
    req.send();
}

function searchWords(text){
    let arrayThread = [];

    let elementHtml = document.createElement("html");
    elementHtml.innerHTML = text;
    let threads = elementHtml.querySelector("#threads");
    let threadsTitle = threads.querySelectorAll(".threadtitle");

    // Get title and link thread
    threadsTitle.forEach(function(elem, index){
        let thread = elem.querySelector("a.title");
        let threadLink = thread.href;
        let threadTitle = thread.textContent;

        // Check if have the words in titles
        ARRAY_WORDS.forEach(function(word){
            if(threadTitle.toLowerCase().search(word) != -1){
                let obj = {'title': threadTitle, 'link': threadLink};

                //to next thread, if duplicate
                for(let i=0; i < arrayThread.length; i++)
                    if(obj.link === arrayThread[i].link)
                        return;

                arrayThread.push(obj);
            }            
        });
    });

    saveThreadsInStorage(arrayThread);
}

function StartOrStopMonitoring(){
    if(!SET_STATE_MONITORING){
        clearInterval(ID_INTERVAL);
        return;
    }

    let interval;

    switch(TIME_INTERVAL.type){
        case 'MINUTE': interval = TIME_INTERVAL.time * 60*1000; break;
        case 'HOUR': interval = TIME_INTERVAL.time * 60*60*1000; break;
        case 'DAY': interval = TIME_INTERVAL.time * 60*60*24*1000; break;
    }

    ID_INTERVAL = setInterval(function(){
        sendRequest(CONSTANTS.get('URL'), function(req){
            searchWords(req.responseText);
        });
    }, interval);

    sendRequest(CONSTANTS.get('URL'), function(req){
        searchWords(req.responseText);
    });
}


function saveThreadsInStorage(threads){
    chrome.storage.sync.set({'threads': threads}, function(){
        console.log("set storage threads"); // TODO: delete callback
    });

    //set badge text
    chrome.browserAction.setBadgeText({text: threads.length.toString()});

    console.log(threads); // TODO: delete
}