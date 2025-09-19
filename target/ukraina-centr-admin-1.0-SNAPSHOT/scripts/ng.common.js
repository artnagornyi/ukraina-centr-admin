/*Date field*/
var clientBundle = clientBundle || {};
(function(){
    $.urlParam = function(name){
        var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(window.location.href);
        return (results && results[1]) || 0;
    };

    window.DateField = function($input) {
        var now = new Date();
        this.options = {
            field : $input[0],
            firstDay: 1,
            defaultDate: now,
            minDate: now,
            maxDate: new Date(now.getTime() + 6*30*24*60*60*1000),
            setDefaultDate: true
        };
        if (clientBundle.previous_month) {
            this.options.i18n = {
                previousMonth : clientBundle.previous_month,
                nextMonth     : clientBundle.next_month,
                months        : clientBundle.months.split(','),
                weekdays      : clientBundle.weekdays.split(','),
                weekdaysShort : clientBundle.weeksdays_short.split(',')
            }
        }
    };

    DateField.prototype = {
        constructor : DateField,

        setSelectedDate : function (selectedDate) {
            this.options.defaultDate = selectedDate;
            return this;
        },

        setSelectFunction: function(selectFunction) {
            this.options.onSelect = selectFunction;
            return this;
        },

        setDisableDayFunction: function(disableDayFunction) {
            this.options.disableDayFn = disableDayFunction;
            return this;
        },

        setMaxDate: function(maxDate) {
            this.options.maxDate = maxDate;
            return this;
        },

        createPikaday: function() {
            return new Pikaday(this.options);
        }
    };

})();

/*Popup*/
(function(){
    var toBeBlurred = [];
    var wrapperZindex = 1000;
    var popupZindex = 1003;

    function isIE() {
        return window.navigator.userAgent.indexOf("MSIE ") > 0;
    }

    function setMultibrowserProperty($element, property, value) {
        $element.css(property, value);
        $element.css('-webkit-'+property, value);
        $element.css('-ms-'+property, value);
        $element.css('-moz-'+property, value);
        $element.css('-o-'+property, value);
    }

    function getPopupLeft(popup) {
        return ($(window).width() - popup.width())/2;
    }

    function getPopupTop(popup) {
        var top = $(window).scrollTop() + ($(window).height() - popup.height())/2;

        return top > 0? top : 50;
    }

    function addBackgroundBlur() {
        if (!toBeBlurred.length) {
            toBeBlurred = [$('header'), $('.uc-banner'), $('.order-board-wrapper'), $('.page-content'), $('footer')];
        }
        for (var i = 0; i < toBeBlurred.length; i++) {
            setMultibrowserProperty(toBeBlurred[i], 'filter', 'blur(6px)');
        }
    }

    function removeBackgroundBlur() {
        for (var i = 0; i < toBeBlurred.length; i++) {
            setMultibrowserProperty(toBeBlurred[i], 'filter', 'blur(0px)');
        }
    }

    window.Popup = function(title, innerHTML, styles, onCreated) {
        this.id = $.now();
        this.title = title;
        this.styles = styles;
        this.wasShown = false;
        this.isShown = false;
        this.innerHTML = innerHTML;
        this.onCreated = onCreated;
        this.isDestroyed = false;

        this.show = function() {
            if (this.isDestroyed) return;
            if (this.isShown) return;
            if (this.wasShown) {
                this.$popupWrapper.show();
                this.isShown = true;
                return;
            }
            var that = this;
            wrapperZindex += 2;
            popupZindex += 2;
            that.$popupWrapper = $('<div id="popup-'+that.id+'"></div>');


            var back = $('<div class="popup-back" style="width:'+$(document).width()+'px; height:'+$(document).height()+'px; z-index:'+wrapperZindex+'"></div>');
            addBackgroundBlur();
            that.$popupWrapper.append(back);
            that.$popup = $('<div class="popup-self ' + that.styles + '" style="z-index:'+popupZindex+'"></div>');
            that.$popupWrapper.append(that.$popup);
            that.$popup.append($('<div class="popup-header"><span class="popup-title">'+that.title+'</span><div class="popup-close-block"><a href="#" class="popup-close"></a></div></div>'));
            that.$popupContent = $('<div class="popup-content"><div class="message-container"></div></div>');
            that.$popupContent.append($(that.innerHTML));
            that.$popup.append(that.$popupContent);
            $(document.body).append(that.$popupWrapper);
            $('#popup-'+that.id + ' .popup-close').on('click', function(event) {event.preventDefault(); that.destroy(); return false;});

            if (!that.wasShown && that.onCreated) that.onCreated.call(that, '#popup-'+that.id);
            that.$popup.css({top: getPopupTop(that.$popup),
                            left: getPopupLeft(that.$popup)});
            that.isShown = true;
        };

        this.hide = function() {
            if (this.isDestroyed) return;
            if (!this.isShown) return;
            this.wasShown = true;
            this.$popupWrapper.hide();
            this.isShown = false;
        };

        this.destroy = function() {
            if (this.isDestroyed) return;
            this.isShown = false;
            this.wasShown = false;
            this.$popupWrapper.remove();
            this.$popupWrapper = null;
            this.$popup = null;
            this.innerHTML = null;
            this.isDestroyed = true;
            removeBackgroundBlur();
        };
    }

})();

(function(){
    window.Message = function(message, seconds) {
        this.element = $('<div class="message" style="display: none;">'+message+'</div>');
        var that = this;
        this.timerId = setTimeout(function() {
            that.element.removeClass('shown');
            clearTimeout(that.timerId);
            var oneMoreTimer = setTimeout(function() {
                that.element.remove();
                clearTimeout(oneMoreTimer)
            }, 400);
        }, seconds? seconds : 3000);
        var popup = $('.popup-self');
        if (popup[0]) {
            popup.find('.message-container').append(this.element); //todo
        } else {
            $('#message-container').append(this.element);
        }
        this.element.addClass('shown');
        this.element.show();
    };
    
    Message.show = function (message, seconds) {
        new Message(message, seconds);
    }
})();

/*Ajax*/
(function(){
    window.Request = function(action, params) {
        var reqParams = params || {};
        this.settings = {
            url: '/'+action,
            type: 'POST',
            dataType: 'json',
            data: {data: JSON.stringify(reqParams)}
        };
        this.showLoading = true;
        this.displayErrorMessage = true;
    };

    window.Request.prototype.setUrl = function(url) {
        this.settings.url = url;
    };

    window.Request.prototype.setMethod = function(method) {
        this.settings.type = method;
    };

    window.Request.prototype.setShowLoading = function(showLoading) {
        this.showLoading = showLoading;
    };

    window.Request.prototype.setDisplayErrorMessage = function(displayErrorMessage) {
        this.displayErrorMessage = displayErrorMessage;
    };

    window.Request.prototype.send = function(callback, failCallback) {
        if (this.showLoading) loader.show();
        var that = this;
        $.ajax(this.settings)
            .done(function(data){
                if (data.errorMessage) {
                    if (that.displayErrorMessage) {
                        var popup = $('.popup-self');
                        if (popup[0] && popup.css('display') !== 'none') {
                            new Message(data.errorMessage, 5000);
                        } else {
                            var errorTitle = clientBundle.error? clientBundle.error : 'Помилка';
                            new Popup(errorTitle, '<div>' + data.errorMessage + '</div>', 'white', function(){}).show(); //TODO localize
                        }
                    } else {
                        if (failCallback) {
                            console.log(data.errorMessage);
                            failCallback();
                        }
                    }
                } else {
                    callback(data.data);
                }
            })
            .fail(function( jqXHR, textStatus, errorThrown ) {
                //smth wasn't caught by normal action exception handler
                if (failCallback) {
                    failCallback();
                } else {
                    var errorTitle = clientBundle.error? clientBundle.error : 'Помилка';
                    var service_is_temporarily_unavailable = clientBundle.service_is_temporarily_unavailable?
                        clientBundle.service_is_temporarily_unavailable :
                        'Сервіс тимчасово недоступний. Перепрошуємо за незручності';

                    new Popup(errorTitle, '<div>'+service_is_temporarily_unavailable+'</div>', '', function(){}).show(); //TODO localize
                }
            })
            .always(function() {
                if (that.showLoading) loader.hide();
            });

    }

    //adding ajax loader

    var showingCount = 0;

    window.loader = {
        isShown: false,
        background: null,
        loader: null,

        show: function(){
            showingCount += 1;
            if (this.isShown) return;

            if (!this.background) {
                $(document.body).append('<div class="popup-back light-op""></div><div class="ajax-loader""></div>');
                this.background = $('.popup-back.light-op');
                this.loader = $('.ajax-loader');
                this.background.css('z-index', 1110);
                this.loader.css('z-index', 1111);
            }
            this.background.show();
            this.background.css('width', $(document).width());
            this.background.css('height', $(document).height());
            this.loader.css('left', ($(window).width()-48)/2);
            this.loader.css('top', ($(window).height()-48)/2);
            this.loader.show();
            this.isShown = true;
        },

        hide: function() {
            showingCount -= 1;
            if (showingCount == 0) {
                this.background.hide();
                this.loader.hide();
                this.isShown = false;
            }
        }
    }
})();

/*Cookies*/
(function(){

    window.cookies = {

        get: function(cname) {
            if (!document.cookie || document.cookie === '') return null;

            var name = cname + '=';
            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = $.trim(ca[i]);
                if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
            }
            return null;
        },

        set: function(cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires=" + d.toGMTString();
            document.cookie = cname + '=' + cvalue + '; ' + expires;
        },

        remove: function(cname) {
            document.cookie = cname + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        },

        removeAll: function() {
            if (!document.cookie || document.cookie === '') return;

            var ca = document.cookie.split(';');
            for (var i = 0; i < ca.length; i++) {
                var c = ca[i].trim();
                var pair = c.split('=');
                this.remove(pair[0].trim());
            }
        }
    }
})();

/*in-memory storage*/
(function(){
    var storage = {all:[{id: 'test'}]};
    window.dataStore = {

        has: function(id) {
            return this.get(id) != null;
        },

        get: function(id) {
            for (var type in storage) if (storage.hasOwnProperty(type)) {
                var result = this.getOfType(id, type);
                if (result) return result;
            }
            return null;
        },

        getByProperty: function(name, value, type) {
            var objs = storage[type];
            if (!objs) return;
            for (var i in objs) {
                var obj = objs[i];
                if (obj[name] === value) return obj;
            }
            return null;
        },

        getOfType: function(id, type) {
            var objs = storage[type];
                if (!objs) return;
                for (var i in objs) {
                    var obj = objs[i];
                    if (obj.id === id) return obj;
                }
            return null;
        },

        getAll: function(type) {
            return storage[type];
        },

        set: function(object, type) {
            if (!type) {
                storage.all[storage.all.length] = object;
            } else {
                if (!storage[type]) storage[type] = [];
                if (this.get(object.id)) this.remove(object.id);
                storage[type][storage[type].length] = object;
            }
        },

        setAll: function(objects, type) {
            for (var i = 0, size = objects.length; i < size; i++) {
                this.set(objects[i], type);
            }
        },

        remove: function(id) {
            for (var type in storage) if (storage.hasOwnProperty(type)) {
                var objs = storage[type];
                if (!objs) return;
                for (var i in objs) {
                    var obj = objs[i];
                    if (obj.id === id) {
                        objs.splice(i, 1);
                    }
                }
            }
        },

        removeAll: function(type) {
            delete storage[type];
        }
    }
})();

(function(){
    window.StringUtils = {
        isEmpty : function(str) { return !str || str === '' }
    };

    window.CurrencyUtils = {
        round: function(value, places) {
            var factor = Math.pow(10, places);
            value = value * factor;
            var tmp = Math.round(value);
            return tmp / factor;
        }
    };
})();