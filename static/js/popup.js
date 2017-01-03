'use strict';

let CONSTANTS;
var OPTIONS;
let backgroundFunction;

function loadBackgroundPage(){
    chrome.runtime.getBackgroundPage(function(window){
        CONSTANTS = window.CONSTANTS;
        OPTIONS = window.CONSTANTS.get('OPTIONS');

        backgroundFunction = window.backgroundFunction;

        loadStorage();
    });
}

let ARRAY_WORDS;
let THREADS;
let TIME_INTERVAL = {};
let SET_STATE_MONITORING;

function loadStorage(){
    chrome.storage.sync.get(function(obj){
        ARRAY_WORDS = obj.words;
        THREADS = obj.threads;
        SET_STATE_MONITORING = obj.set_state_monitoring;
        TIME_INTERVAL.time = obj.time_interval.time;
        TIME_INTERVAL.type = obj.time_interval.type;

        setElementsValues();
    });
}

document.addEventListener('DOMContentLoaded', function () {
    loadBackgroundPage();

    $('#body_title').text(chrome.i18n.getMessage('name'));

    instanceTagsInput();
    selectTypeInterval();
    instanceToggle();
});


function setElementsValues(){
    defineWords();
    defineThreads();

    //define slider
    if(TIME_INTERVAL.type === 'MINUTE')
        $('#interval_radio_min').click();
    else if(TIME_INTERVAL.type === 'HOUR')
        $('#interval_radio_hour').click();
    else if(TIME_INTERVAL.type === 'DAY')
        $('#interval_radio_day').click();

    //define toggle
    if(SET_STATE_MONITORING)
        $('#toggle_monitoring').bootstrapToggle('on');
    else
        $('#toggle_monitoring').bootstrapToggle('off');

    $('#btn_save').click(function(){
        saveWordsInStorage();
        saveIntervalInStorage();
        disableSaveButton();
    });

    saveStateMonitoringInStorage();
}

function instanceTagsInput(val, minVal, maxVal, strTypeVal){
    $('#word_tags').tagsinput({
        confirmKeys: [13],
        maxTags: 8,
        maxChars: 20,
        minChars: 2
    });
}

function instanceSlider(val, minVal, maxVal, strTypeVal){
    $('#time_interval').bootstrapSlider({
        tooltip: 'show',
        tooltip_position: 'bottom',
        value: val,
        step: 1,
        formatter: function(value){ return value.toString() +' '+ strTypeVal; },
        min: minVal,
        max: maxVal
    });

    //$('#time_interval').bootstrapSlider('refresh');
}

function instanceToggle(){
    $('#toggle_monitoring').bootstrapToggle({
        on: 'Ativado',
        off: 'Desativado'
        //size: 'small'
    });
}

function defineWords(){
    $('#word_tags').tagsinput('removeAll');

    ARRAY_WORDS.forEach(function(elem){
        $('#word_tags').tagsinput('add', elem);
    });
}

function defineThreads(){
    let table = $('#table_threads tbody');

    THREADS.forEach(function(elem, index){
        let elementTr = $('<tr>');
        let elementTh = $('<th>');
        let elementTd = $('<td>');
        let elementA = $('<a>');

        elementTh.text(index+1);

        elementTd.append(elementA);
        elementA.attr('href', elem.link);
        elementA.attr('target', '_blank');
        elementA.text(elem.title);

        elementTr.append(elementTh).append(elementTd);

        table.append(elementTr);
    });
}

function selectTypeInterval(){
    $('#interval_radios input').click(function(){
        switch($(this).val()){
            case 'interval_minute':
                instanceSlider(TIME_INTERVAL.time, CONSTANTS.get('INTERVAL').MIN_MINUTE, CONSTANTS.get('INTERVAL').MAX_MINUTE, 'minuto(s)');
                break;
            case 'interval_hour':
                instanceSlider(TIME_INTERVAL.time, CONSTANTS.get('INTERVAL').MIN_HOUR, CONSTANTS.get('INTERVAL').MAX_HOUR, 'hora(s)');
                break;
            case 'interval_day':
                instanceSlider(TIME_INTERVAL.time, CONSTANTS.get('INTERVAL').MIN_DAY, CONSTANTS.get('INTERVAL').MAX_DAY, 'dias(s)');
                break;
        }
    });
}

function saveWordsInStorage(){
    backgroundFunction(OPTIONS.set_words, $('#word_tags').tagsinput('items'));
}

function saveIntervalInStorage(){
    let type;
    switch($('#interval_radios input:checked').val()){
        case 'interval_minute':
            type = 'MINUTE';
            break;
        case 'interval_hour':
            type = 'HOUR';
            break;
        case 'interval_day':
            type= 'DAY';
            break;
    }

    backgroundFunction(OPTIONS.set_time_intverval, {time: $('#time_interval').bootstrapSlider('getValue'), type: type});
}

function saveStateMonitoringInStorage(){
    $('#toggle_monitoring').change(function() {
        backgroundFunction(OPTIONS.set_state_monitoring, $(this).prop('checked'));
    });
}

//Disables button to avoid consecutive clicks
function disableSaveButton(){
    setTimeout(function(){
        $('#btn_save').attr('disabled', false);
    }, 5000);
    $('#btn_save').attr('disabled', true);
}