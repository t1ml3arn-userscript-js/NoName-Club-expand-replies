// ==UserScript==
// @name NoName Club popup messages
// @namespace https://github.com/T1mL3arn
// @description Scripting is fun
// @author My Name
// @version 0.1
// @icon 
// @match *://nnm-club.me/*
// @match *://nnmclub.to/*
// @match *://ipv6.nnmclub.to/*
// @match *://nnmclub.tv/*
// @match *://ipv6.nnm-club.me/*
// @match *://ipv6.nnm-club.lib/*
// @match *://nnm-club.lib/*
// @match *://nnmclub5toro7u65.onion/*
// @match https://[2a01:d0:e451:0:6e6e:6d2d:636c:7562]/*
// @match http://[2001:470:1f15:f1::1113]/*
// @match nnm-club.i2p
// @exclude-match 
// @require 
// @resource 
// @run-at document-end
// @noframes
// @grant none
// @license GPLv3 
// @homepageURL 
// @supportURL 
// @downloadURL 
// @updateURL 
// ==/UserScript==

(()=>{
    let log = function(){
        console.log(`[ ${GM_info.script.name} ] : `, ...arguments);
    }
    
    let error = function(){
        console.error(`[ ${GM_info.script.name} ] Error : `, ...arguments);
    }
    
    // key-value topic storage
    // key - link to a forum page
    // value - elt which holds answers
    let topics = {};

    let topic = {
        repliesCount: 0,
        href: '',
        pages: [],
        container: null
    }

    /**
        TODO test matching ALL mirrors including ipv6, onion, i2p
       https://nnm-club.me/forum/viewtopic.php?t=1191445
       https://nnm-club.me/forum/viewtopic.php?t=1000470&start=1470#post_9390225
        
        nnm-club.me
        nnmclub.to
        
        ipv6.nnm-club.me
        ipv6.nnmclub.to
        ipv6.nnm-club.lib
        nnmclub.tv
        nnm-club.lib
        nnmclub5toro7u65.onion
        https://[2a01:d0:e451:0:6e6e:6d2d:636c:7562]
        nnm-club.i2p
     */

    ///TODO some guards to test if markup is changed ?

    // parse current page to find if there are any cards with ANSWERS icon there 
    let cards = $('.pline').has('a.pcomm[href^=viewtopic.php]');

    if(cards.length == 0)   return;

    // add new button 
    cards.each((ind, elt)=>{
        let goToForumBtn = $(elt).find('a.pcomm[href^=viewtopic.php]');
        
        let href = goToForumBtn[0].href;
        topics[href] = {
            repliesCount: getRepliesCount(elt),
            href,
            pages:  []
        };
        
        let loadAnswersBtn = $('<span>')
            .text(' развернуть')
            .css('white-space', 'pre')
            .attr('data-href', href);
        
        goToForumBtn
        .after(loadAnswersBtn)
        .after($('<span>').text(' | ').addClass('vbot'));
        
        loadAnswersBtn.click(e => loadAnswers(elt, loadAnswersBtn));
    });

    async function loadAnswers(cardElt, btn){
        
        btn.text(' загрузка ');
        btn.unbind('click');

        let href = btn.attr('data-href');

        let response = await fetch(href);
        if(!response.ok) {
            error(`Cannot fetch forum page "${href}"`);
            btn.text(' развернуть');
            return;
        }

        let blob = await response.blob();
        let forumPage = await blobToText(blob);
        let forumDOM = new DOMParser().parseFromString(forumPage, 'text/html');

        let replies = 
        $(forumDOM)
            // remove first post
            .find('.forumline > tbody > tr.row1:nth-child(2)')
                .remove()
            .end()
            // remove sorting form
            .find('.forumline form > span.gensmall')
                .remove()
            .end()
            // return replies
            .find('.forumline');
        
        let container = topics[href].container = $('<div>'); 
        
        $(cardElt).after(
            container.append(replies).css({'max-height': '600px', 'overflow-y': 'auto'})
        );

        btn.text(' свернуть');
        btn.click(e => hideAnswers(container, btn));
        
        return;

        ///TODO extract num of pages
        let pageNav = $('span.nav:contains(Страницы:)');
        if(pageNav){
            // first element in set should contain page links
            let pagesLinks = $(pageNav[0]).filter('a');

        }
    }
    
    function blobToText(blob){
        // response.text() returns string in UTF-8
        // but nnm club uses windows-1251 charset
        // so here is a trick to get a string in that charset using a blob and File API
        
        return new Promise((resolve, reject) => {
            let reader = new FileReader();
            reader.onload = event => resolve(event.target.result);
            reader.onabort = event => reject(event);
            reader.onerror = event => reject(event);
            reader.readAsText(blob, 'windows-1251');
        });
    }

    function getRepliesCount(topicElt) {
        let raw = $(topicElt).find('a.pcomm.tit-b.bold').text();
        return parseInt(raw);
    }

    async function hideAnswers(answers, btn) {
        btn.unbind('click');
        if(answers.data('isAnimated') != 1){
            answers.data('isAnimated', 1);
            await new Promise((resolve, rej) => answers.hide(0, resolve));
            answers.data('isAnimated', 0);
        }
        btn.text(' развернуть');
        btn.click(e => showAnswers(answers, btn));
    }

    async function showAnswers(answers, btn) {
        btn.unbind('click');
        if(answers.data('isAnimated') != 1){
            answers.data('isAnimated', 1);
            await new Promise((resolve, rej) => answers.show(0, resolve));
            answers.data('isAnimated', 0);
        }
        btn.text(' свернуть');
        btn.click(e => hideAnswers(answers, btn));
    }

})();