// ==UserScript==
// @name NoName Club expand replies
// @namespace https://github.com/T1mL3arn
// @description Добавляет в элементы ленты кнопку *развернуть* рядом с колличеством ответов. Кнопка дает развернуть/свернуть ответы к теме. Теперь не нужно переходить на страницу темы, чтобы прочитать комментарии пользователей.
// @author T1mL3arn
// @version 1.0
// @icon https://nnm-club.me/favicon.ico
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
// @run-at document-end
// @noframes
// @grant none
// @license GPLv3 
// @homepageURL https://github.script.repo
// @supportURL https://github.script.issues
// ==/UserScript==

(()=>{
    let log = function(){
        console.log(`[ ${GM_info.script.name} ] : `, ...arguments);
    }
    
    let error = function(){
        console.error(`[ ${GM_info.script.name} ] Error : `, ...arguments);
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

    let css = `
    .nnm-show-replies__a-disabled {
        text-decoration: none !important;
        pointer-events: none !important;
        color: #777 !important;
    }
    `;
    addStyle(css);

    // parse current page to find if there are any cards with ANSWERS icon there 
    let cards = $('.pline').has('a.pcomm[href^=viewtopic.php]');

    if(cards.length == 0)   return;

    // add new button 
    cards.each((ind, elt)=>{
        if(getRepliesCount(elt) == 0) return;

        let goToForumBtn = $(elt).find('a.pcomm[href^=viewtopic.php]');
        let href = goToForumBtn[0].href;
        
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

        let text = await fetchPageText(href);
        if(!text){
            btn.text(' развернуть');
            return;
        }
        
        let forumElement = new DOMParser().parseFromString(text, 'text/html');
        let replies = parseRepliesAndGetElement(forumElement);

        let container = $('<div>').append(replies).css({'max-height': '600px', 'overflow-y': 'auto'}); 
        
        $(cardElt).after(container);

        btn.text(' свернуть');
        btn.click(e => hideAnswers(container, btn));
        
        let nav = new Nav(forumElement, href, container);
        container.prepend(nav.getElement());
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

    function hideAnswers(answers, btn) {
        btn.unbind('click');
        answers.hide();
        btn.text(' развернуть');
        btn.click(e => showAnswers(answers, btn));
    }

    function showAnswers(answers, btn) {
        btn.unbind('click');
        answers.show();
        btn.text(' свернуть');
        btn.click(e => hideAnswers(answers, btn));
    }

    class Nav {
        constructor(documentElement, href, container){
            this.elt = $('<div>');
            // parse pages
            let pageNav = $(documentElement).find('span.nav:contains(Страницы:)');
            if(!pageNav) return;

            // first element in set should contain page links
            let anchors = $(pageNav[0]).find('a');
            let pages = [href].concat(anchors.map((i, elt) => elt.href).get());
            // remove link to "next" page
            pages.pop();
            if(pages.length < 2) return;

            let html = pages.reduce((acc, curr, ind) => acc + `<a href="${curr}">${ind}</a> `, 'Страницы: ');
            this.elt.append(html).css({"font-weight": "bold", "padding": "10px", "padding-left": "0"});
            
            anchors = this.elt.find('a');
            anchors.first().addClass("nnm-show-replies__a-disabled");
            anchors.click(e => $(e.target).addClass("nnm-show-replies__a-disabled"));
            anchors.click(async e => {
                e.preventDefault();
                ///TODO cache results somehow
                let replies = await getReplies(e.target.href);
                anchors.each((i,elt) => $(elt).removeClass("nnm-show-replies__a-disabled"))
                if(!replies) return;

                $(e.target).addClass("nnm-show-replies__a-disabled");

                container.find('.forumline')
                            .before(replies)
                            .remove();
            });
        }

        /** Returns a jquery object */
        getElement(){
            return this.elt;
        }
    }

    async function getReplies(href) {
        let pageText = await fetchPageText(href);
        return !pageText ? null : parseRepliesAndGetElement(pageText);
    }

    async function fetchPageText(href) {
        let response = await fetch(href);
        if(!response.ok) {
            error(`Cannot fetch page "${href}"`);
            return null;
        }

        let blob = await response.blob();
        let pageText = await blobToText(blob);

        return pageText;
    }

    function parseRepliesAndGetElement(data){
        let documentElement;
        if(typeof data == 'string')
            documentElement = new DOMParser().parseFromString(data, 'text/html');
        else
            documentElement = data;

        let replies = 
        $(documentElement)
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

        return replies;
    }

    function addStyle(css){
        let head = document.getElementsByTagName('head')[0];
        if (head) {
            let style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.textContent = css;
            head.appendChild(style);
        }
    }
})();