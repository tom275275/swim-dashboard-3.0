define('ClassBookingV2Controller', ['knockout', 'FilterManager', 'BookMeConstants'], function (ko, filterManager, constants) {
    function ClassBookingV2Controller(options) {

        var me = this;
        this.loadZeroEventsInARow = 0;
        this.pagesLoaded = 0;
        this.after = null;
        this.allItemsLoaded = false;
        this.occurrences = [];
        this.firstLoadedOccurenceStartDate = null;
        this.selectedDate = null;
        this.isLoading = false;
        this.filters = ko.observableArray([]);
        this.onSelectedFilterChanged = ko.observable('');

        this.isDateRangeEnabled = function () {
            return me.filters().some(function (filter) {
                return filter.FilterGroupKind == constants.EventFilterValueKinds.dateRange.id;
            });
        }

        this.onSelectedFilterChanged.subscribe(function () {
            me.reset(me.selectedDate);
            me.loadItems();
        });

        this.settings = $.extend(true, {}, {
            calendarId: 0,
            widgetId: 0,
            isEmbedded: false,
            occurrenceDateFormat: '',
            instructorInfo: '.bm-class-teacher-wrapper',
            loadingWidget: '#bm-overlay',
            numberOfDaysToLoad: 14,

            // empty function to prevent null references.
            setParentWindowHeightCallback: function () { },

            view: {
                url: '',
                classItemsContainer: '#classes',
                stickyHeaders: '.marker',
                noEventsMsgId: '#noEventsWereFoundMsg',
                loadMoreButton: '#load-more',
                classesListTemplate: '#list-classes-template',
                classesView: '#classes-view'
            },

            filter: {
                url: ''
            }
        }, options);

        this.init = function () {
            me.fetchFiltersData();
            me.initLoadMoreListener();

            ko.applyBindings(this, $(me.settings.view.classesView)[0]);
        };

        this.initLoadMoreListener = function () {
            $(me.settings.view.loadMoreButton).click(function (e) {
                me.loadItems(null, e);
                return true;
            });
        };

        this.showLoading = function () {
            me.isLoading = true;
            $(me.settings.loadingWidget).show();
            $(me.settings.view.stickyHeaders).css("z-index", "99");
        };

        this.hideLoading = function () {
            me.isLoading = false;
            $(me.settings.loadingWidget).hide();
        };

        this.loadAdditionalItems = function () {
            if (!me.allItemsLoaded && $(me.settings.view.classItemsContainer).visible(false, false, 'vertical'))
                me.loadItems();
        };

        this.registerMarkers = function () {
            var visibleMarkers = $(me.settings.view.stickyHeaders + ':visible');

            visibleMarkers.each(function (index, marker) {
                if ($.isScrollToFixed(marker)) {
                    return true;
                }

                // The last element always does not have a limit
                if (index == visibleMarkers.length - 1) {
                    $(marker).scrollToFixed();
                } else {
                    var nextMarker = $(visibleMarkers[index + 1]);
                    $(marker).scrollToFixed({
                        limit: nextMarker.offset().top - 180,
                        removeOffsets: true
                    });
                }

                return true;
            });
        };

        this.getFiltersData = function () {
            return filterManager.getAllFilters();
        };

        this.loadItems = function (date, event) {
            if (me.isLoading)
                return;

            me.showLoading();

            if (!date && me.occurrences.length > 0) {
                var lastDate = me.occurrences[me.occurrences.length - 1];
                if (lastDate.getTime() === me.classesMaxEndDate.getTime()) {
                    date = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + 1, 0, 0, 0, 0);
                } else {
                    date = new Date(me.classesMaxEndDate.getFullYear(), me.classesMaxEndDate.getMonth(), me.classesMaxEndDate.getDate() + 1, 0, 0, 0, 0);
                }
            }
            $.ajaxAntiForgeryPost({
                url: me.settings.view.url,
                type: "POST",
                data: {
                    calendarId: me.settings.calendarId,
                    widgetId: me.settings.widgetId,
                    page: me.pagesLoaded,
                    dateString: kendo.toString(date, 'yyyy-MM-dd'),
                    values: me.getFiltersData(),
                    after: me.after
                }
            }).done(function (result) {
                if (result.classes && result.classes.length) {
                    var classesTemplate = kendo.template($(me.settings.view.classesListTemplate).html());

                    var classesHtml = classesTemplate(result.classes);
                    $(me.settings.view.classItemsContainer).append(classesHtml);
                    var firstLoadedEventHeaderElement = null;

                    $(result.classes).each(function (index, item) {
                        if (event && index == 0) {
                            firstLoadedEventHeaderElement = $(me.settings.view.classItemsContainer).find('.bm-marker-row:last .bm-marker-container');
                        }
                        var occurrenceDate = kendo.parseDate(item.OccurrenceDate, me.settings.occurrenceDateFormat);
                        occurrenceDate = new Date(occurrenceDate.getFullYear(), occurrenceDate.getMonth(), occurrenceDate.getDate(), 0, 0, 0, 0);

                        if (me.occurrences.indexOf(occurrenceDate) < 0)
                            me.occurrences.push(occurrenceDate);
                    });
                }

                if (result.classesMaxEndDateString) {
                    var classesMaxEndDate = kendo.parseDate(result.classesMaxEndDateString, me.settings.untilDateFormat);
                    classesMaxEndDate = new Date(classesMaxEndDate.getFullYear(), classesMaxEndDate.getMonth(), classesMaxEndDate.getDate(), 0, 0, 0, 0);
                    me.classesMaxEndDate = classesMaxEndDate;
                }

                me.bindInstructorPopupEvent();
                me.bindDescriptionPopupEvent();
                me.bindBookingUrls();
                me.registerMarkers();
                me.allItemsLoaded = (result.classes.length < me.settings.numberOfDaysToLoad);

                me.loadAdditionalItems();

                me.toggleNoEventsWereFoundMsgVisibility();

                me.settings.setParentWindowHeightCallback();
                me.hideLoading();

                if (result.classes.length) {
                    me.firstLoadedOccurenceStartDate = kendo.parseDate(result.classes[0].OccurrenceDate, me.settings.occurrenceDateFormat);
                }

                if (result.classes.length === 0 && me.isDateRangeEnabled()) {
                    $(me.settings.view.loadMoreButton).hide();
                }
                if (result.classes.length === 0 && !me.isDateRangeEnabled()) {
                    me.loadZeroEventsInARow += 1;
                    if (me.loadZeroEventsInARow > 1) {
                        $(me.settings.view.loadMoreButton).hide();
                    } else {
                        me.pagesLoaded += 1;

                        me.loadItems();
                        return;
                    }
                }
                if (result.classes.length) {
                    me.loadZeroEventsInARow = 0;
                    $(me.settings.view.loadMoreButton).show();
                }

                if (firstLoadedEventHeaderElement) {
                    firstLoadedEventHeaderElement.focus();
                }
                me.after = result.nextKey;
            });
        };

        this.toggleNoEventsWereFoundMsgVisibility = function () {

            if ($(me.settings.view.classItemsContainer).children('.bm-marker-row').length == 0) // If Events table #classes has no data
            {
                var textContainer = $(me.settings.view.noEventsMsgId + ' span');
                var currentText = textContainer.text();

                // We have cases when a custom error is rendered in noEventsMsgId,
                // in that case we should not overwrite it and should show to a user.
                // In other case case - show a default error as below.
                if (currentText == '')
                    textContainer.text('No events were found.');

                $(me.settings.view.noEventsMsgId).show();
            } else
                $(me.settings.view.noEventsMsgId).hide();
        };

        this.fetchFiltersData = function () {
            me.showLoading();

            $.ajax({
                url: me.settings.filter.url,
                type: "GET",
                dataType: "json",
                data: {
                    calendarId: me.settings.calendarId,
                    widgetId: me.settings.widgetId
                }
            }).done(function (items) {
                me.filters(items.filterGroups);

                me.hideLoading();

                // when DisplayFilters setting is disabled and no filters are fetched -
                // system should load events without filters panel
                if (!me.filters().length) {
                    me.loadItems();
                }
            });
        };

        this.reset = function (date) {
            me.pagesLoaded = 0;
            me.allItemsLoaded = false;
            me.occurrences = [];
            me.after = null;
            me.loadZeroEventsInARow = 0;
            $(me.settings.view.classItemsContainer).empty();
            $(me.settings.view.loadMoreButton).show();
            me.loadItems(date);
        };

        this.bindInstructorPopupEvent = function () {
            $(me.settings.instructorInfo).each(function (index, item) {
                var teacherId = $(item).find('.bm-class-teacher').attr('data-teacherId');
                var hasTeacherContent = $('.bm-teacher-tooltip', $(item)).length;

                if (teacherId != '' && teacherId != 'null' && hasTeacherContent > 0) {
                    var tooltip = $(item).kendoTooltip({
                        content: $(item).parent().find('.bm-teacher-tooltip-wrapper').html(),
                        autoHide: false,
                        show: onShow
                    }).data("kendoTooltip");

                    $(item).on({
                        focus: function () {
                            tooltip.show();
                        },
                        touchstart: function () {
                            tooltip.show();
                        },
                        blur: function () {
                            tooltip.hide();
                        },
                        mouseleave: function (e) {
                            if ($(e.relatedTarget) !== $('.k-animation-container') &&
                                $(e.relatedTarget).parents('.k-animation-container').length == 0) {
                                tooltip.hide();
                            }
                        }
                    });
                }
            });
        };

        this.toggleDescriptiontooltip = function (item, tooltip) {
            if (!tooltip.options.isOpened) {
                tooltip.show();
                tooltip.options.isOpened = true;
                $(item).attr('aria-hidden', 'true');

                if ($('#tempInfoForScreenReaders').length) {
                    $('#tempInfoForScreenReaders').text(tooltip.content.text());

                    setTimeout(function () {
                        $('#tempInfoForScreenReaders').html('');
                    }, 2000);
                }
            } else {
                tooltip.hide();
                tooltip.options.isOpened = false;
                $(item).attr('aria-hidden', 'false');
            }
        };

        this.bindDescriptionPopupEvent = function () {
            $('.bm-event-description-icon').each(function (index, item) {
                var tooltip = $(item).kendoTooltip({
                    iframe: false,
                    width: 250,
                    autoHide: true,
                    isOpened: false
                }).data("kendoTooltip");

                $(item).on('keypress', function (e) {
                    if (e.keyCode == kendo.keys.ENTER || e.keyCode == kendo.keys.SPACEBAR) {
                        me.toggleDescriptiontooltip(item, tooltip);
                    }
                }).on('click', function () {
                    me.toggleDescriptiontooltip(item, tooltip);

                }).blur(function () {
                    tooltip.hide();
                    tooltip.options.isOpened = false;
                    $(item).attr('aria-hidden', 'false');
                });
            });
        };

        this.bindBookingUrls = function () {
            $('input[data-class-url]').each(function (index, item) {
                $(item).off('click.openLandingPage').on('click.openLandingPage', function () {
                    var url = $(item).attr('data-class-url');

                    if (me.settings.isEmbedded)
                        window.open(url, '_blank');
                    else
                        window.location = url;
                });
            });
        };

        this.filtersButtonClick = function () {
            filterManager.mobileView.showFiltersPanel();
        };

        this.filtersButtonKeyPress = function () {
            if (event.keyCode == 32 || event.keyCode == 13) {
                this.filtersButtonClick();
                event.preventDefault();
            }
        };

        this.closeFiltersPanelIconClick = function () {
            filterManager.mobileView.hideFiltersPanel();
        };

        this.closeFiltersPanelIconKeyPress = function () {
            if (event.keyCode == 32 || event.keyCode == 13) {
                this.closeFiltersPanelIconClick();
                event.preventDefault();
            }
        };
    };

    function onShow(e) {
        var currentWindow = e && e.sender && e.sender.popup && e.sender.popup.element ? e.sender.popup.element.closest('.k-animation-container') : null;
        var otherWindows = $(".k-animation-container");
        if (currentWindow) {
            otherWindows = otherWindows.not(currentWindow);
        }

        otherWindows.hide();

        $(document).off("mouseleave", ".k-animation-container", hideWindow).on("mouseleave", ".k-animation-container", hideWindow);
        $(document).off("mouseover", ".k-animation-container", showWindow).on("mouseover", ".k-animation-container", showWindow);
    }

    function hideWindow() {
        $(this).hide();
    }

    function showWindow() {
        $(this).show();
    }

    return ClassBookingV2Controller;
});