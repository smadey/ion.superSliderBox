(function(ionic, angular) {
    'use strict';

    ionic.views.SuperSlider = ionic.views.View.inherit({
        initialize: function(options) {
            var slider = this;

            // utilities
            var noop = function() {}; // simple no operation function
            var offloadFn = function(fn) {
                setTimeout(fn || noop, 0);
            }; // offload a functions execution

            // check browser capabilities
            var browser = {
                addEventListener: !!window.addEventListener,
                touch: ('ontouchstart' in window) || window.DocumentTouch && document instanceof DocumentTouch,
                transitions: (function(temp) {
                    var props = ['transitionProperty', 'WebkitTransition', 'MozTransition', 'OTransition', 'msTransition'];
                    for (var i in props)
                        if (temp.style[props[i]] !== undefined) return true;
                    return false;
                })(document.createElement('swipe'))
            };


            var container = options.el;

            // quit if no root element
            if (!container) return;
            var element = container.children[0];
            var slides, slidePos, wh, length;
            options = options || {};
            var index = parseInt(options.startSlide, 10) || 0;
            var speed = options.speed || 300;
            options.continuous = options.continuous !== undefined ? options.continuous : true;

            var whCssName, ltCssName, posName;
            if (options.direction === 'vertical') {
                options.direction = 'vertical';
                whCssName = 'height';
                ltCssName = 'top';
                posName = 'y';
            } else {
                options.direction = 'horizontal';
                whCssName = 'width';
                ltCssName = 'left';
                posName = 'x';
            }

            function setup() {

                // cache slides
                slides = element.children;
                length = slides.length;

                // set continuous to false if only one slide
                if (slides.length < 2) options.continuous = false;

                //special case if two slides
                if (browser.transitions && options.continuous && slides.length < 3) {
                    element.appendChild(slides[0].cloneNode(true));
                    element.appendChild(element.children[1].cloneNode(true));
                    slides = element.children;
                }

                // create an array to store current positions of each slide
                slidePos = new Array(slides.length);

                // determine width or height of each slide from the nearest ionic-content
				var ionicContent = ionic.DomUtil.getParentWithClass(container, 'scroll-content');
				if (options.direction === 'vertical') {
					wh = ionicContent.clientHeight;
				} else {
					wh = ionicContent.clientWidth;
				}

                element.style[whCssName] = (slides.length * wh) + 'px';

                // stack elements
                var pos = slides.length;
                while (pos--) {

                    var slide = slides[pos];

                    slide.style[whCssName] = wh + 'px';
                    slide.setAttribute('data-index', pos);

                    if (browser.transitions) {
                        slide.style[ltCssName] = (pos * -wh) + 'px';
                        move(pos, index > pos ? -wh : (index < pos ? wh : 0), 0);
                    }

                }

                // reposition elements before and after index
                if (options.continuous && browser.transitions) {
                    move(circle(index - 1), -wh, 0);
                    move(circle(index + 1), wh, 0);
                }

                if (!browser.transitions) element.style[ltCssName] = (index * -wh) + 'px';

                container.style.visibility = 'visible';

                options.slidesChanged && options.slidesChanged();
            }

            function prev() {

                if (options.continuous) slide(index - 1);
                else if (index) slide(index - 1);

            }

            function next() {

                if (options.continuous) slide(index + 1);
                else if (index < slides.length - 1) slide(index + 1);

            }

            function circle(index) {

                // a simple positive modulo using slides.length
                return (slides.length + (index % slides.length)) % slides.length;

            }

            function slide(to, slideSpeed) {

                // do nothing if already on requested slide
                if (index == to) return;

                if (browser.transitions) {

                    var direction = Math.abs(index - to) / (index - to); // 1: backward, -1: forward

                    // get the actual position of the slide
                    if (options.continuous) {
                        var natural_direction = direction;
                        direction = -slidePos[circle(to)] / wh;

                        // if going forward but to < index, use to = slides.length + to
                        // if going backward but to > index, use to = -slides.length + to
                        if (direction !== natural_direction) to = -direction * slides.length + to;

                    }

                    var diff = Math.abs(index - to) - 1;

                    // move all the slides between index and to in the right direction
                    while (diff--) move(circle((to > index ? to : index) - diff - 1), wh * direction, 0);

                    to = circle(to);

                    move(index, wh * direction, slideSpeed || speed);
                    move(to, 0, slideSpeed || speed);

                    if (options.continuous) move(circle(to - direction), -(wh * direction), 0); // we need to get the next in place

                } else {

                    to = circle(to);
                    animate(index * -wh, to * -wh, slideSpeed || speed);
                    //no fallback for a circular continuous if the browser does not accept transitions
                }

                index = to;
                offloadFn(options.callback && options.callback(index, slides[index]));
            }

            function move(index, dist, speed) {

                translate(index, dist, speed);
                slidePos[index] = dist;

            }

            function translate(index, dist, speed) {

                var slide = slides[index];
                var style = slide && slide.style;

                if (!style) return;

                style.webkitTransitionDuration =
                    style.MozTransitionDuration =
                    style.msTransitionDuration =
                    style.OTransitionDuration =
                    style.transitionDuration = speed + 'ms';

                style.webkitTransform =
                style.msTransform =
                    style.MozTransform =
                    style.OTransform = 'translate' + posName.toUpperCase() + '(' + dist + 'px)';

            }

            function animate(from, to, speed) {

                // if not an animation, just reposition
                if (!speed) {

                    element.style[ltCssName] = to + 'px';
                    return;

                }

                var start = +new Date();

                var timer = setInterval(function() {

                    var timeElap = +new Date() - start;

                    if (timeElap > speed) {

                        element.style.left = to + 'px';

                        if (delay) begin();

                        options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

                        clearInterval(timer);
                        return;

                    }

                    element.style[ltCssName] = (((to - from) * (Math.floor((timeElap / speed) * 100) / 100)) + from) + 'px';

                }, 4);

            }

            // setup auto slideshow
            var delay = options.auto || 0;
            var interval;

            function begin() {

                interval = setTimeout(next, delay);

            }

            function stop() {

                delay = options.auto || 0;
                clearTimeout(interval);

            }


            // setup initial vars
            var start = {};
            var delta = {};
            var isScrolling;

            // setup event capturing
            var events = {

                handleEvent: function(event) {
                    if (event.type == 'mousedown' || event.type == 'mouseup' || event.type == 'mousemove') {
                        event.touches = [{
                            pageX: event.pageX,
                            pageY: event.pageY
                        }];
                    }

                    switch (event.type) {
                        case 'mousedown':
                            this.start(event);
                            break;
                        case 'touchstart':
                            this.start(event);
                            break;
                        case 'touchmove':
                            this.touchmove(event);
                            break;
                        case 'mousemove':
                            this.touchmove(event);
                            break;
                        case 'touchend':
                            offloadFn(this.end(event));
                            break;
                        case 'mouseup':
                            offloadFn(this.end(event));
                            break;
                        case 'webkitTransitionEnd':
                        case 'msTransitionEnd':
                        case 'oTransitionEnd':
                        case 'otransitionend':
                        case 'transitionend':
                            offloadFn(this.transitionEnd(event));
                            break;
                        case 'resize':
                            offloadFn(setup);
                            break;
                    }

                    if (options.stopPropagation) event.stopPropagation();

                },
                start: function(event) {

                    var touches = event.touches[0];

                    // measure start values
                    start = {

                        // get initial touch coords
                        x: touches.pageX,
                        y: touches.pageY,

                        // store time to determine touch duration
                        time: +new Date()

                    };

                    // used for testing first move event
                    isScrolling = undefined;

                    // reset delta and end measurements
                    delta = {};

                    // attach touchmove and touchend listeners
                    if (browser.touch) {
                        element.addEventListener('touchmove', this, false);
                        element.addEventListener('touchend', this, false);
                    } else {
                        element.addEventListener('mousemove', this, false);
                        element.addEventListener('mouseup', this, false);
                        document.addEventListener('mouseup', this, false);
                    }
                },
                touchmove: function(event) {

                    // ensure swiping with one touch and not pinching
                    // ensure sliding is enabled
                    if (event.touches.length > 1 ||
                        event.scale && event.scale !== 1 ||
                        slider.slideIsDisabled) {
                        return;
                    }

                    if (options.disableScroll) event.preventDefault();

                    var touches = event.touches[0];

                    // measure change in x and y
                    delta = {
                        x: touches.pageX - start.x,
                        y: touches.pageY - start.y
                    };

                    // determine if scrolling test has run - one time test
                    if (typeof isScrolling == 'undefined') {
                        isScrolling = !!(options.direction === 'vertical' ? (isScrolling || Math.abs(delta.x) > Math.abs(delta.y)) : (isScrolling || Math.abs(delta.x) < Math.abs(delta.y)));
                    }

                    // if user is not trying to scroll vertically
                    if (!isScrolling) {

                        // prevent native scrolling
                        event.preventDefault();

                        // stop slideshow
                        stop();

                        // increase resistance if first or last slide
                        if (options.continuous) { // we don't add resistance at the end

                            translate(circle(index - 1), delta[posName] + slidePos[circle(index - 1)], 0);
                            translate(index, delta[posName] + slidePos[index], 0);
                            translate(circle(index + 1), delta[posName] + slidePos[circle(index + 1)], 0);

                        } else {

                            delta[posName] =
                                delta[posName] /
                                ((!index && delta[posName] > 0 || // if first slide and sliding left
                                        index == slides.length - 1 && // or if last slide and sliding right
                                        delta[posName] < 0 // and if sliding at all
                                    ) ?
                                    (Math.abs(delta[posName]) / wh + 1) // determine resistance level
                                    : 1); // no resistance if false

                            // translate 1:1
                            translate(index - 1, delta[posName] + slidePos[index - 1], 0);
                            translate(index, delta[posName] + slidePos[index], 0);
                            translate(index + 1, delta[posName] + slidePos[index + 1], 0);
                        }

                    }

                },
                end: function(event) {

                    // measure duration
                    var duration = +new Date() - start.time;

                    // determine if slide attempt triggers next/prev slide
                    var isValidSlide =
                        Number(duration) < 250 && // if slide duration is less than 250ms
                        Math.abs(delta[posName]) > 20 || // and if slide amt is greater than 20px
                        Math.abs(delta[posName]) > wh / 2; // or if slide amt is greater than half the width

                    // determine if slide attempt is past start and end
                    var isPastBounds = (!index && delta[posName] > 0) || // if first slide and slide amt is greater than 0
                        (index == slides.length - 1 && delta[posName] < 0); // or if last slide and slide amt is less than 0

                    if (options.continuous) isPastBounds = false;

                    // determine direction of swipe (true:right, false:left)
                    var direction = delta[posName] < 0;

                    // if not scrolling vertically
                    if (!isScrolling) {

                        if (isValidSlide && !isPastBounds) {

                            if (direction) {

                                if (options.continuous) { // we need to get the next in this direction in place

                                    move(circle(index - 1), -wh, 0);
                                    move(circle(index + 2), wh, 0);

                                } else {
                                    move(index - 1, -wh, 0);
                                }

                                move(index, slidePos[index] - wh, speed);
                                move(circle(index + 1), slidePos[circle(index + 1)] - wh, speed);
                                index = circle(index + 1);

                            } else {
                                if (options.continuous) { // we need to get the next in this direction in place

                                    move(circle(index + 1), wh, 0);
                                    move(circle(index - 2), -wh, 0);

                                } else {
                                    move(index + 1, wh, 0);
                                }

                                move(index, slidePos[index] + wh, speed);
                                move(circle(index - 1), slidePos[circle(index - 1)] + wh, speed);
                                index = circle(index - 1);

                            }

                            options.callback && options.callback(index, slides[index]);

                        } else {

                            if (options.continuous) {

                                move(circle(index - 1), -wh, speed);
                                move(index, 0, speed);
                                move(circle(index + 1), wh, speed);

                            } else {

                                move(index - 1, -wh, speed);
                                move(index, 0, speed);
                                move(index + 1, wh, speed);
                            }

                        }

                    }

                    // kill touchmove and touchend event listeners until touchstart called again
                    if (browser.touch) {
                        element.removeEventListener('touchmove', events, false);
                        element.removeEventListener('touchend', events, false);
                    } else {
                        element.removeEventListener('mousemove', events, false);
                        element.removeEventListener('mouseup', events, false);
                        document.removeEventListener('mouseup', events, false);
                    }

                },
                transitionEnd: function(event) {

                    if (parseInt(event.target.getAttribute('data-index'), 10) == index) {

                        if (delay) begin();

                        options.transitionEnd && options.transitionEnd.call(event, index, slides[index]);

                    }

                }

            };

            // Public API
            this.update = function() {
                setTimeout(setup);
            };
            this.setup = function() {
                setup();
            };

            this.loop = function(value) {
                if (arguments.length) options.continuous = !!value;
                return options.continuous;
            };

            this.enableSlide = function(shouldEnable) {
                    if (arguments.length) {
                        this.slideIsDisabled = !shouldEnable;
                    }
                    return !this.slideIsDisabled;
                },
                this.slide = this.select = function(to, speed) {
                    // cancel slideshow
                    stop();

                    slide(to, speed);
                };

            this.prev = this.previous = function() {
                // cancel slideshow
                stop();

                prev();
            };

            this.next = function() {
                // cancel slideshow
                stop();

                next();
            };

            this.stop = function() {
                // cancel slideshow
                stop();
            };

            this.start = function() {
                begin();
            };

            this.autoPlay = function(newDelay) {
                if (!delay || delay < 0) {
                    stop();
                } else {
                    delay = newDelay;
                    begin();
                }
            };

            this.currentIndex = this.selected = function() {
                // return current index position
                return index;
            };

            this.slidesCount = this.count = function() {
                // return total number of slides
                return length;
            };

            this.kill = function() {
                // cancel slideshow
                stop();

                // reset element
                element.style[whCssName] = '';
                element.style[ltCssName] = '';

                // reset slides
                var pos = slides.length;
                while (pos--) {

                    var slide = slides[pos];
                    slide.style[whCssName] = '';
                    slide.style[ltCssName] = '';

                    if (browser.transitions) translate(pos, 0, 0);

                }

                // removed event listeners
                if (browser.addEventListener) {

                    // remove current event listeners
                    element.removeEventListener('touchstart', events, false);
                    element.removeEventListener('webkitTransitionEnd', events, false);
                    element.removeEventListener('msTransitionEnd', events, false);
                    element.removeEventListener('oTransitionEnd', events, false);
                    element.removeEventListener('otransitionend', events, false);
                    element.removeEventListener('transitionend', events, false);
                    window.removeEventListener('resize', events, false);

                } else {

                    window.onresize = null;

                }
            };

            this.load = function() {
                // trigger setup
                setup();

                // start auto slideshow if applicable
                if (delay) begin();


                // add event listeners
                if (browser.addEventListener) {

                    // set touchstart event on element
                    if (browser.touch) {
                        element.addEventListener('touchstart', events, false);
                    } else {
                        element.addEventListener('mousedown', events, false);
                    }

                    if (browser.transitions) {
                        element.addEventListener('webkitTransitionEnd', events, false);
                        element.addEventListener('msTransitionEnd', events, false);
                        element.addEventListener('oTransitionEnd', events, false);
                        element.addEventListener('otransitionend', events, false);
                        element.addEventListener('transitionend', events, false);
                    }

                    // set resize event on window
                    window.addEventListener('resize', events, false);

                } else {

                    window.onresize = function() {
                        setup();
                    }; // to play nice with old IE

                }
            };

        }
    });

    angular.module('ionic.ui.superSlideBox', [])
    .directive('ionSuperSlideBox', [
        '$timeout',
        '$compile',
        '$ionicSlideBoxDelegate',
        '$ionicHistory',
        function($timeout, $compile, $ionicSlideBoxDelegate, $ionicHistory) {
            return {
                restrict: 'E',
                replace: true,
                transclude: true,
                scope: {
                    autoPlay: '=',
                    doesContinue: '@',
                    slideInterval: '@',
                    showPager: '@',
                    pagerClick: '&',
                    disableScroll: '@',
                    onSlideChanged: '&',
                    direction: '=?',
                    activeSlide: '=?'
                },
                controller: ['$scope', '$element', '$attrs', function($scope, $element, $attrs) {
                    var _this = this;

                    var continuous = $scope.$eval($scope.doesContinue) === true;
                    var shouldAutoPlay = angular.isDefined($attrs.autoPlay) ? !!$scope.autoPlay : false;
                    var slideInterval = shouldAutoPlay ? $scope.$eval($scope.slideInterval) || 4000 : 0;

                    var slider = new ionic.views.SuperSlider({
                        el: $element[0],
                        auto: slideInterval,
                        continuous: continuous,
                        direction: $scope.direction,
                        startSlide: $scope.activeSlide,
                        slidesChanged: function() {
                            $scope.currentSlide = slider.currentIndex();

                            // Try to trigger a digest
                            $timeout(function() {});
                        },
                        callback: function(slideIndex) {
                            $scope.currentSlide = slideIndex;
                            $scope.onSlideChanged({
                                index: $scope.currentSlide,
                                $index: $scope.currentSlide
                            });
                            $scope.$parent.$broadcast('slideBox.slideChanged', slideIndex);
                            $scope.activeSlide = slideIndex;
                            // Try to trigger a digest
                            $timeout(function() {});
                        }
                    });

                    slider.enableSlide($scope.$eval($attrs.disableScroll) !== true);

                    $scope.$watch('activeSlide', function(nv) {
                        if (angular.isDefined(nv)) {
                            slider.slide(nv);
                        }
                    });

                    $scope.$on('slideBox.nextSlide', function() {
                        slider.next();
                    });

                    $scope.$on('slideBox.prevSlide', function() {
                        slider.prev();
                    });

                    $scope.$on('slideBox.setSlide', function(e, index) {
                        slider.slide(index);
                    });

                    //Exposed for testing
                    this.__slider = slider;

                    var deregisterInstance = $ionicSlideBoxDelegate._registerInstance(
                        slider, $attrs.delegateHandle,
                        function() {
                            return $ionicHistory.isActiveScope($scope);
                        }
                    );
                    $scope.$on('$destroy', deregisterInstance);

                    this.slidesCount = function() {
                        return slider.slidesCount();
                    };

                    this.onPagerClick = function(index) {
                        void 0;
                        $scope.pagerClick({
                            index: index
                        });
                    };

                    $timeout(function() {
                        slider.load();
                    });
                }],
                template: '<div class="slider">' +
                    '<div class="slider-slides" ng-transclude>' +
                    '</div>' +
                    '</div>',

                link: function($scope, $element, $attr, slideBoxCtrl) {
                    // If the pager should show, append it to the slide box
                    if ($scope.$eval($scope.showPager) !== false) {
                        var childScope = $scope.$new();
                        var pager = angular.element('<ion-super-pager></ion-super-pager>');
                        $element.append(pager);
                        $compile(pager)(childScope);
                    }
                }
            };
        }
    ])
    .directive('ionSuperSlide', function() {
        return {
            restrict: 'E',
            require: '^ionSuperSlideBox',
            compile: function(element, attr) {
                element.addClass('slider-slide');
                return function($scope, $element, $attr) {};
            },
        };
    })

    .directive('ionSuperPager', function() {
        return {
            restrict: 'E',
            replace: true,
            require: '^ionSuperSlideBox',
            template: '<div class="slider-pager"><span class="slider-pager-page" ng-repeat="slide in numSlides() track by $index" ng-class="{active: $index == currentSlide}" ng-click="pagerClick($index)"><i class="icon ion-record"></i></span></div>',
            link: function($scope, $element, $attr, slideBox) {
                var selectPage = function(index) {
                    var children = $element[0].children;
                    var length = children.length;
                    for (var i = 0; i < length; i++) {
                        if (i == index) {
                            children[i].classList.add('active');
                        } else {
                            children[i].classList.remove('active');
                        }
                    }
                };

                $scope.pagerClick = function(index) {
                    slideBox.onPagerClick(index);
                };

                $scope.numSlides = function() {
                    return new Array(slideBox.slidesCount());
                };

                $scope.$watch('currentSlide', function(v) {
                    selectPage(v);
                });
            }
        };

    });

})(ionic, angular);
