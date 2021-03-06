/*!
 * Social Share Kit v1.0.15 (http://socialsharekit.com)
 * Copyright 2015 Social Share Kit / Kaspars Sprogis.
 * @Licensed under Creative Commons Attribution-NonCommercial 3.0 license:
 * https://github.com/darklow/social-share-kit/blob/master/LICENSE
 * ---
 */
var SocialShareKit = (function () {
    var supportsShare = /(twitter|facebook|google-plus|pinterest|tumblr|vk|linkedin|buffer|email|xing)/,
        sep = '*|*', wrap, _wrap;

    // Wrapper to support multiple instances per page by selector
    _wrap = function (opts) {
        var options = opts || {},
            selector = options.selector || '.ssk';
        this.nodes = $(selector);
        this.selects = $(selector + '-select');
        this.options = options;
    };

    // Instance related functions
    _wrap.prototype = {
        share: function () {
            var els = this.nodes,
                options = this.options,
                urlsToCount = {},
                selects = this.selects;

            var _init = function () {
                if (!els.length)
                    return;

                if (!Element.prototype.matches) {
                    Element.prototype.matches = Element.prototype.msMatchesSelector;
                }

                each(els, function (el) {
                    var network = elSupportsShare(el), uniqueKey;
                    if (!network) {
                        return;
                    }

                    if (el.getAttribute('data-ssk-ready'))
                        if (options.reinitialize && el._skkListener) {
                            removeEventListener(el, 'click', el._skkListener);
                        } else
                            return;

                    el.setAttribute('data-ssk-ready', true);
                    addEventListener(el, 'click', onClick);
                    el._skkListener = onClick

                    

                    // Gather icons with share counts
                    if (el.parentNode.className.indexOf('ssk-count') !== -1) {
                        network = network[0];
                        uniqueKey = network + sep + getShareUrl(options, network, el);
                        if (!(uniqueKey in urlsToCount)) {
                            urlsToCount[uniqueKey] = [];    
                        }       
                        urlsToCount[uniqueKey].push(el);
                    }
                });

                processShareCount();
            };

            var _select = function (e) {
                if (window.getSelection) {
                    var selection = window.getSelection();
                    if (selection && selection.getRangeAt && selection.rangeCount) {
                        var strSelection = selection.toString();
                        var range = selection.getRangeAt(0);
                        if (range.getClientRects) {
                            var rects = Array.prototype.slice.call(range.getClientRects());
                            var total = rects.length;
                            each(selects, function (el) {
                                var target = getSelectTarget(options, undefined, el);
                                if (strSelection === '' || !e.target.matches(target)) {
                                    el.style.display = 'none';
                                    return;
                                }
                                el.setAttribute('data-text', strSelection);
                                el.style.display = 'block';
                                var size = el.getBoundingClientRect();
                                var top, left;
                                switch(getSelectPosition(options, undefined, el)) {
                                    case 'center':
                                        var min = Math.min.apply(Math, rects.map(function(rect){ return rect.top; }));
                                        var center = rects.map(function(rect){ return rect.left + rect.width / 2; }).reduce(function(middle, avg){ return avg + middle; }) / total;
                                        left = (center - size.width / 2);
                                        top = (min - size.height + window.pageYOffset);
                                        break;
                                    case 'left':
                                        var min = Math.min.apply(Math, rects.map(function(rect){ return rect.top; }));
                                        top = (min - size.height + window.pageYOffset);
                                        left = Math.min.apply(Math, rects.map(function(rect){ return rect.left; }));
                                        break;
                                    case 'right':
                                        var min = Math.min.apply(Math, rects.map(function(rect){ return rect.top; }));
                                        top = (min - size.height + window.pageYOffset);
                                        left = Math.max.apply(Math, rects.map(function(rect){ return rect.right; })) - size.width;
                                        break;
                                }
                                el.style.top = top + 'px';
                                el.style.left = left + 'px';
                            });
                        }
                    }
                }
            };

            if (options.forceInit === true)
                _init();
            else
                ready(_init, _select);


            function onClick(e) {
                var target = preventDefault(e),
                    match = elSupportsShare(target),
                    network = match[0],
                    url;

                if (!match)
                    return;

                url = getUrl(options, network, target);
                if (!url)
                    return;

                // To use Twitter intent events, replace URL and use Twitter native share JS
                if (window.twttr && target.getAttribute('href').indexOf('twitter.com/intent/') !== -1) {
                    target.setAttribute('href', url);
                    return;
                }

                if (network !== 'email') {
                    var width, height;
                    if (network === 'buffer') {
                        width = 800;
                        height = 680;
                    } else {
                        width = 575;
                        height = 400;
                    }
                    var win = winOpen(url, width, height);

                    if (options.onOpen) {
                        options.onOpen(target, network, url, win);
                    }

                    if (options.onClose) {
                        var closeInt = window.setInterval(function () {
                            if (win.closed !== false) {
                                window.clearInterval(closeInt);
                                options.onClose(target, network, url, win);
                            }
                        }, 250);
                    }

                } else {
                    document.location = url;
                }
            }

            function processShareCount() {
                var a, ref;
                for (a in urlsToCount) {
                    ref = a.split(sep);
                    (function (els) {
                        getCount(ref[0], ref[1], options, function (cnt) {
                            for (var c in els)
                                addCount(els[c], cnt);
                        });
                    })(urlsToCount[a]);
                }
            }

            return this.nodes;
        }
    };

    wrap = function (selector) {
        return new _wrap(selector);
    };

    function init(opts) {
        return wrap(opts).share();
    }

    function ready(fn, select) {
        if (document.readyState != 'loading') {
            fn();
        } else if (document.addEventListener) {
            document.addEventListener('DOMContentLoaded', fn);
            
        } else {
            document.attachEvent('onreadystatechange', function () {
                if (document.readyState != 'loading')
                    fn();
            });
        }
        addEventListener(document, 'mouseup', select);
    }

    function $(selector) {
        return document.querySelectorAll(selector);
    }

    function each(elements, fn) {
        for (var i = 0; i < elements.length; i++)
            fn(elements[i], i);
    }

    function addEventListener(el, eventName, handler) {
        if (el.addEventListener) {
            el.addEventListener(eventName, handler);
        } else {
            el.attachEvent('on' + eventName, function () {
                handler.call(el);
            });
        }
    }

    function removeEventListener(el, eventName, handler) {
        if (el.removeEventListener)
            el.removeEventListener(eventName, handler);
        else
            el.detachEvent('on' + eventName, handler);
    }

    function elSupportsShare(el) {
        return el.className.match(supportsShare);
    }


    function preventDefault(e) {
        var evt = e || window.event; // IE8 compatibility
        if (evt.preventDefault) {
            evt.preventDefault();
        } else {
            evt.returnValue = false;
            evt.cancelBubble = true;
        }
        return evt.currentTarget || evt.srcElement;
    }

    function winOpen(url, width, height) {
        var win, left, top, opts;
        if (width && height) {
            left = (document.documentElement.clientWidth / 2 - width / 2);
            top = (document.documentElement.clientHeight - height) / 2;
            opts = 'status=1,resizable=yes' +
                ',width=' + width + ',height=' + height +
                ',top=' + top + ',left=' + left;
            win = window.open(url, '', opts);
        } else {
            win = window.open(url);
        }
        win.focus();
        return win;
    }

    function includes(array, item) {
        for (var i = 0, len = array.length; i < len; i++ ) {
            if (array[i] === item) {
                return true;
            }
        }
        return false;
    }

    function getSelectPosition(options, network, el) {
        var validPositions = ['center', 'left', 'right'];
        var dataOpts = getDataOpts(options, network, el),
        position = typeof dataOpts['position'] !== 'undefined' && includes(validPositions, dataOpts['position']) ? dataOpts['position'] : 'center';
        return position;
    }

    function getSelectTarget(options, network, el) {
        var dataOpts = getDataOpts(options, network, el),
        target = typeof dataOpts['target'] !== 'undefined' ? dataOpts['target'] : '*';
        return target;
    }

    function getUrl(options, network, el) {
        var url, dataOpts = getDataOpts(options, network, el),
            shareUrl = getShareUrl(options, network, el, dataOpts),
            title = typeof dataOpts['title'] !== 'undefined' ? dataOpts['title'] : getTitle(network),
            text = typeof dataOpts['text'] !== 'undefined' ? dataOpts['text'] : getText(network),
            image = dataOpts['image'] ? dataOpts['image'] : getMetaContent('og:image'),
            via = typeof dataOpts['via'] !== 'undefined' ? dataOpts['via'] : getMetaContent('twitter:site'),
            paramsObj = {
                shareUrl: shareUrl,
                title: title,
                text: text,
                image: image,
                via: via,
                options: options,
                shareUrlEncoded: function () {
                    return encodeURIComponent(this.shareUrl);
                }
            };
        switch (network) {
            case 'facebook':
                url = 'https://www.facebook.com/share.php?u=' + paramsObj.shareUrlEncoded();
                break;
            case 'twitter':
                url = 'https://twitter.com/intent/tweet?url=' + paramsObj.shareUrlEncoded() +
                    '&text=' + encodeURIComponent(title + (text && title ? ' - ' : '') + text);
                if (via)
                    url += '&via=' + via.replace('@', '');
                break;
            case 'google-plus':
                url = 'https://plus.google.com/share?url=' + paramsObj.shareUrlEncoded();
                break;
            case 'pinterest':
                url = 'https://pinterest.com/pin/create/button/?url=' + paramsObj.shareUrlEncoded() +
                    '&description=' + encodeURIComponent(text);
                if (image)
                    url += '&media=' + encodeURIComponent(image);
                break;
            case 'tumblr':
                url = 'https://www.tumblr.com/share/link?url=' + paramsObj.shareUrlEncoded() +
                    '&name=' + encodeURIComponent(title) +
                    '&description=' + encodeURIComponent(text);
                break;
            case 'linkedin':
                url = 'https://www.linkedin.com/shareArticle?mini=true&url=' + paramsObj.shareUrlEncoded() +
                    '&title=' + encodeURIComponent(title) +
                    '&summary=' + encodeURIComponent(text);
                break;
            case 'xing':
                url = 'https://www.xing.com/spi/shares/new?url=' + paramsObj.shareUrlEncoded();
                break;
            case 'vk':
                url = 'https://vkontakte.ru/share.php?url=' + paramsObj.shareUrlEncoded();
                break;
            case 'buffer':
                url = 'https://buffer.com/add?source=button&url=' + paramsObj.shareUrlEncoded() +
                    '&text=' + encodeURIComponent(text);
                break;
            case 'email':
                url = 'mailto:?subject=' + encodeURIComponent(title) +
                    '&body=' + encodeURIComponent(title + '\n' + shareUrl + '\n\n' + text + '\n');
                break;
        }

        paramsObj.networkUrl = url;

        if (options.onBeforeOpen) {
            options.onBeforeOpen(el, network, paramsObj)
        }

        return paramsObj.networkUrl;
    }

    function getShareUrl(options, network, el, dataOpts) {
        dataOpts = dataOpts || getDataOpts(options, network, el);
        return dataOpts['url'] || window.location.href;
    }

    function getTitle(network) {
        var title;
        if (network == 'twitter')
            title = getMetaContent('twitter:title');
        return title || document.title;
    }

    function getText(network) {
        var text;
        if (network == 'twitter')
            text = getMetaContent('twitter:description');
        return text || getMetaContent('description');
    }

    function getMetaContent(tagName, attr) {
        var text,
            tag = $('meta[' + (attr ? attr : tagName.indexOf('og:') === 0 ? 'property' : 'name') + '="' + tagName + '"]');
        if (tag.length) {
            text = tag[0].getAttribute('content') || '';
        }
        return text || ''
    }

    function truthyOrEmpty(value) {
        return value || value === '';
    }

    function getDataOpts(options, network, el) {
        var validOpts = ['url', 'title', 'text', 'image', 'position', 'target'],
            opts = {}, optValue, optKey, dataKey, a, parent = el.parentNode;
        network == 'twitter' && validOpts.push('via');
        for (a in validOpts) {
            optKey = validOpts[a];
            dataKey = 'data-' + optKey;
            var fromEl = el.getAttribute(dataKey);
            optValue = truthyOrEmpty(fromEl) && fromEl;
            if (!truthyOrEmpty(optValue)) {
                var fromParent = parent.getAttribute(dataKey);
                optValue = truthyOrEmpty(fromParent) && fromParent;
            }
            if (!truthyOrEmpty(optValue)) {
                optValue = (options[network] && typeof options[network][optKey] != 'undefined' ? options[network][optKey] : options[optKey]);
            }   
            if (typeof optValue != 'undefined') {
                opts[optKey] = optValue;
            }
        }
        return opts;
    }


    function addCount(el, cnt) {
        var newEl = document.createElement('div');
        newEl.innerHTML = cnt;
        newEl.className = 'ssk-num';
        el.appendChild(newEl);
    }

    function getCount(network, shareUrl, options, onReady) {
        var url, parseFunc, body,
            shareUrlEnc = encodeURIComponent(shareUrl);
        switch (network) {
            case 'facebook':
                url = 'https://graph.facebook.com/?id=' + shareUrlEnc;
                parseFunc = function (r) {
                    return onReady(r.share ? r.share.share_count : 0);
                };
                break;
            case 'twitter':
                if (options && options.twitter && options.twitter.countCallback) {
                    options.twitter.countCallback(shareUrl, onReady);
                }
                break;
            case 'google-plus':
                url = 'https://clients6.google.com/rpc?key=AIzaSyCKSbrvQasunBoV16zDH9R33D88CeLr9gQ';
                body = "[{\"method\":\"pos.plusones.get\",\"id\":\"p\"," +
                    "\"params\":{\"id\":\"" + shareUrl + "\",\"userId\":\"@viewer\",\"groupId\":\"@self\",\"nolog\":true}," +
                    "\"jsonrpc\":\"2.0\",\"key\":\"p\",\"apiVersion\":\"v1\"}]";
                parseFunc = function (r) {
                    r = JSON.parse(r);
                    if (r.length) {
                        return onReady(r[0].result.metadata.globalCounts.count);
                    }
                };
                ajax(url, parseFunc, body);
                return;
            case 'linkedin':
                url = 'https://www.linkedin.com/countserv/count/share?url=' + shareUrlEnc;
                parseFunc = function (r) {
                    return onReady(r.count);
                };
                break;
            case 'pinterest':
                url = 'https://api.pinterest.com/v1/urls/count.json?url=' + shareUrlEnc;
                parseFunc = function (r) {
                    return onReady(r.count);
                };
                break;
            case 'vk':
                url = 'https://vk.com/share.php?act=count&url=' + shareUrlEnc;
                parseFunc = function (r) {
                    return onReady(r);
                };
                break;
            case 'buffer':
                url = 'https://api.bufferapp.com/1/links/shares.json?url=' + shareUrlEnc;
                parseFunc = function (r) {
                    return onReady(r.shares);
                };
                break;
        }
        url && parseFunc && JSONPRequest(network, url, parseFunc, body);
    }

    function ajax(url, callback, body) {
        var request = new XMLHttpRequest();
        request.onreadystatechange = function () {
            if (this.readyState === 4) {
                if (this.status >= 200 && this.status < 400) {
                    callback(this.responseText);
                }
            }
        };
        request.open('POST', url, true);
        request.setRequestHeader('Content-Type', 'application/json');
        request.send(body);
    }

    function JSONPRequest(network, url, callback) {
        var callbackName = 'cb_' + network + '_' + Math.round(100000 * Math.random()),
            script = document.createElement('script');
        window[callbackName] = function (data) {
            try { // IE8
                delete window[callbackName];
            } catch (e) {
            }
            document.body.removeChild(script);
            callback(data);
        };
        if (network == 'vk') {
            window['VK'] = {
                Share: {
                    count: function (a, b) {
                        window[callbackName](b);
                    }
                }
            };
        } else if (network == 'google-plus') {
            window['services'] = {
                gplus: {
                    cb: window[callbackName]
                }
            };
        }
        script.src = url + (url.indexOf('?') >= 0 ? '&' : '?') + 'callback=' + callbackName;
        document.body.appendChild(script);
        return true;
    }

    return {
        init: init
    };
})();

window.SocialShareKit = SocialShareKit;
