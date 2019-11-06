'use strict';

//set Color badge
chrome.browserAction.setBadgeBackgroundColor({ color: [68, 138, 255, 255] });

var CONSTANTS = (function() {
     const privateVars = {
         'URL': 'https://www.hardmob.com.br/forums/407-Promocoes',
         'INTERVAL': {
             'MIN_MINUTE': 30, // 30 min
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

let TAGS;
let ID_INTERVAL;
let TIME_INTERVAL = {};
let SET_STATE_MONITORING;

chrome.storage.sync.get(function(obj){
    //storage not empty
    if(Object.keys(obj).length !== 0){
        initVariables(obj);
    }
    else{
        //set default values
        obj.words = [];
        obj.set_state_monitoring = true;
        obj.time_interval = {
            time: CONSTANTS.get('INTERVAL').MIN_HOUR,
            type: 'HOUR'
        };

        //set in storage and init variables
        chrome.storage.sync.set(obj, function(){
            chrome.storage.sync.get(function(obj){
                initVariables(obj)
            });
        });
    }
});

function initVariables(obj){
    TAGS = obj.words;
    SET_STATE_MONITORING = obj.set_state_monitoring;

    TIME_INTERVAL.time = obj.time_interval.time;
    TIME_INTERVAL.type = obj.time_interval.type;

    if(SET_STATE_MONITORING)
        StartOrStopMonitoring();
}

//execute options
var backgroundFunction = function(opt, val){
    var msg = {option: opt, values: val};

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

    TAGS = new Set(sanitizedWords);

    //save words
    chrome.storage.local.remove('words');
    chrome.storage.sync.set({'words': sanitizedWords});
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

    chrome.storage.sync.set({'time_interval': TIME_INTERVAL});

    StartOrStopMonitoring();
}

function setStateMonitoring(val){
    if(typeof val !== 'boolean') return;
    
    SET_STATE_MONITORING = val;

    chrome.storage.sync.set({'set_state_monitoring': SET_STATE_MONITORING});

    StartOrStopMonitoring();
}

function sendRequest(url, callback) {
    let req = new XMLHttpRequest();
    if (!req) return;

    const method = "GET";

    req.onreadystatechange = function () {
        if (req.readyState != 4) return;
        if (req.status != 200 && req.status != 304) {
            console.log('HTTP error: ' + req.status);
            return;
        }
        const text = req.responseText;

        req.onreadystatechange = null;
        req = null;

        callback(text);
    }

    req.open(method, url, true);
    req.send();
}

function searchWords(text){
    let arrayThread = [];

    const elementHtml = document.createElement("html");
    elementHtml.innerHTML = text;
    const threads = elementHtml.querySelector("#threads");
    let threadsTitle = threads.querySelectorAll(".threadtitle");


    // Check if have the words in titles
    TAGS.forEach(function(tag){
        //separate tag in words, if necessary
        const words = tag.split('&&').map(function(elem){return elem.trim()});

        // return new array without threads duplicates
        threadsTitle = [].filter.call(threadsTitle, function(elem){
            let thread = elem.querySelector("a.title");
            let threadLink = thread.href;
            let threadTitle = thread.textContent;

            let contains = true;

            //check if thread title contains all words
            for (let i=0; i < words.length; i++) {
                if(threadTitle.toLowerCase().search(words[i]) == -1){
                    contains = false;
                    break;
                }
            }

            //insert obj
            if(contains){
                let obj = {'title': threadTitle, 'link': threadLink};
                arrayThread.push(obj);
                return false;
            }

            return true;
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
        sendRequest(CONSTANTS.get('URL'), function(reqText){
            searchWords(reqText);
        });
    }, interval);

    sendRequest(CONSTANTS.get('URL'), function(reqText){
        searchWords(reqText);
    });
}


function fireNotification(threads){
    let msg = "";
    for (let i = 0; i < threads.length; i++) {
        msg += threads[i].title + "\n";
    }
    let opt = {
        type: "basic",
        title: "Novas promoções no Hardmob!",
        message: msg,
        iconUrl: "icon48.png"
    };
    let notification = chrome.notifications.create("novasPromocoes", opt);

    // Then show the notification.
    notification.show();
}

function saveThreadsInStorage(threads){
    chrome.storage.sync.set({'threads': threads});

    //set badge text
    if(threads.length == 0){
        chrome.browserAction.setBadgeText({text: '' });
    }
    else{
        chrome.browserAction.setBadgeText({text: threads.length.toString()});
        fireNotification(threads);
    }
}