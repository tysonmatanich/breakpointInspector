/*! breakpointInspector | Author: Tyson Matanich, 2013 | License: MIT */
(function (window) {

    var accessErrors, mediaQueries, isRunning, isDirty;

    var addMedia = function (media) {
        if (mediaQueries[media]) {
            mediaQueries[media] += 1;
        } else {
            mediaQueries[media] = 1;
        }
    };

    var parseCssRules = function (cssRules) {
        var rule, i;
        for (i in cssRules) {
            rule = cssRules[i];

            // Check if its a media rule
            if (rule.media && rule.media && rule.media.mediaText != "") {
                addMedia(rule.media.mediaText);
            }

            // Look for nested rules
            if (rule.cssRules) {
                parseCssRules(rule.cssRules);
            }
        }
    };

    var ajax = function (obj) {
        if (window.XMLHttpRequest) {
            var xmlhttp = new XMLHttpRequest();
            xmlhttp.onreadystatechange = function () {
                if (xmlhttp.readyState == 4 && xmlhttp.status == 200) {
                    obj.success(xmlhttp.responseText);
                }
            };
            xmlhttp.open(obj.type, obj.url, true);
            xmlhttp.send();
        }
    };

    var reInit = function () {
        var t = setTimeout(function () {
            if (!isRunning && isDirty) {
                init();
            } else {
                reInit();
            }
        }, 0)
    };

    var parseCrossDomainLink = function (link) {
        var url = 'http://query.yahooapis.com/v1/public/yql?q=select * from html where url = "' + encodeURIComponent(link.href) + '" &format=json';
        ajax({
            url: url,
            type: "GET",
            success: function (data) {
                var result = "";
                try {
                    var d = JSON.parse(data);
                    result = d.query.results.body.p
                } catch (e) { }
                result;
                if (result != "") {
                    var styleElement = document.createElement("style");
                    styleElement.setAttribute("data-href", link.href);
                    if (link.media) {
                        styleElement.media = link.media;
                    }
                    styleElement.appendChild(document.createTextNode(result));
                    link.parentNode.insertBefore(styleElement, link);
                    removeElement(link);

                    // Mark as dirty and re-init
                    isDirty = true;
                    reInit();
                }
            }
        });
    };

    var parseStyleSheet = function (styleSheet) {
        if (styleSheet && styleSheet.ownerNode) {
            // Check the media attribute
            if (styleSheet.ownerNode.media != "") {
                addMedia(styleSheet.ownerNode.media);
            }

            var cssRules = null;
            try {
                // Need to access in a try/catch due to security errors in Firefox and Opera
                cssRules = styleSheet.ownerNode.sheet.cssRules;
            } catch (e) { }

            // Check if there are any CSS rules
            if (cssRules) {
                parseCssRules(cssRules);
            }
            // Check if its a link to a cross domain file
            else if (styleSheet.ownerNode.localName == "link") {
                accessErrors++;
                parseCrossDomainLink(styleSheet.ownerNode);
            }
        }
    };

    var findMediaQueries = function () {
        // Find the media queries used on the page
        accessErrors = 0;
        mediaQueries = {};
        var i;
        for (i in document.styleSheets) {
            parseStyleSheet(document.styleSheets[i]);
        }
    };

    var init = function () {
        isRunning = true;

        var id = "bp-tester";
        var selector = "#" + id;

        // Clean up existing elements
        removeElement(document.getElementById(id));
        removeElement(document.getElementById(id + "_style"));

        // Mark as clean
        isDirty = false;

        findMediaQueries();
        
        // Define styles
        var css = "#" + id + "{opacity:0.7;filter:alpha(opacity=70);border-bottom:0.313em solid #999;padding:0;background-color:#fff;color:#222;font-family:sans-serif;font-size:14px;line-height:1.25em;}";
        css += "#" + id + ":hover{opacity:0.95;filter:alpha(opacity=95);}";
        css += "@media (min-width:50.000em){#" + id + "{position:fixed;z-index:99999;top:0;right:0;bottom:0;border-bottom:0;border-left:0.313em solid #999;max-width:33%;}}";
        css += "#" + id + " .bpt-scroll{position:relative;height:100%;overflow:auto;}";
        css += "#" + id + " .bpt-title{font-weight:bold;margin:0.375em 0 0.250em 0.375em;padding-right:2.125em;position:relative;}#" + id + " .bpt-count{font-weight:normal; right:0.125em; top:0; position:absolute;font-style:italic;}";
        css += "#" + id + " .bpt-results{margin:0;padding:0.125em 0 0 0.375em;}#" + id + " ul.bpt-results li{position:relative;margin:0 0 0 1em;padding:0 2.125em 0 0;list-style:disc;}";
        css += "#" + id + " .bpt-project{margin:0.375em 0 0.250em 0.375em;position:relative;text-align:right;}#" + id + " .bpt-project a{color:#006a92;}";

        // Append the styles to the head
        var styleElement = document.createElement("style");
        styleElement.id = id + "_style";
        styleElement.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(styleElement);

        // Append markup
        var mainElement = document.createElement("div");
        mainElement.id = id;
        var bodyElement = document.getElementsByTagName("body")[0];
        bodyElement.insertBefore(mainElement, bodyElement.firstChild);

        // Generate markup
        var listMarkup = "";
        var mediaCount = 0;
        for (var q in mediaQueries) {
            listMarkup += '<li>' + q + ' <span class="bpt-count">' + mediaQueries[q] + '</span></li>';
            mediaCount += mediaQueries[q];
        }
        var outerMarkup = '<div class="bpt-scroll"><div class="bpt-title">Media queries <span class="bpt-count">' + mediaCount + '</span></div>';
        if (mediaCount > 0) {
            outerMarkup += '<ul class="bpt-results">' + listMarkup + '</ul>';
        } else {
            outerMarkup += '<div class="bpt-results">None found.</div>';
        }
        if (accessErrors > 0) {
            outerMarkup += '<div class="bpt-title" style="color:#d00;">Cross-domain files <span class="bpt-count">' + accessErrors + '</span></div>';
        }
        outerMarkup += '<div class="bpt-project"><a href="http://tysonmatanich.github.io/breakpointInspector/">project home</a></div></div>';

        // Output
        mainElement.innerHTML = outerMarkup;

        isRunning = false;
    };

    var removeElement = function (element) {
        if(element != null){
            if (typeof element.remove === "function") {
                element.remove();
            } else if (typeof element.removeNode === "function") {
                element.removeNode(true);
            } else if (typeof element.parentNode.removeChild === "function") {
                element.parentNode.removeChild(element);
            }
        }
    };

    init();

})(this);