"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = exports.DraggableEvent = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeGestureHandler = require("react-native-gesture-handler");
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
var _constants = require("../constants");
var _BodyContext = require("../context/BodyContext");
var _DragEventProvider = require("../context/DragEventProvider");
var _ThemeProvider = require("../context/ThemeProvider");
var _TimeZoneProvider = require("../context/TimeZoneProvider");
var _dateUtils = require("../utils/dateUtils");
var _touchTrackerGesture = require("../utils/touchTrackerGesture");
var _DragDot = _interopRequireDefault(require("./DragDot"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
function _extends() { return _extends = Object.assign ? Object.assign.bind() : function (n) { for (var e = 1; e < arguments.length; e++) { var t = arguments[e]; for (var r in t) ({}).hasOwnProperty.call(t, r) && (n[r] = t[r]); } return n; }, _extends.apply(null, arguments); }
const DraggableEvent = ({
  startUnix,
  visibleDates,
  index,
  selectedStartUnix,
  selectedStartMinutes,
  selectedDuration,
  renderEvent,
  resources,
  TopEdgeComponent,
  BottomEdgeComponent,
  containerStyle
}) => {
  const theme = (0, _ThemeProvider.useTheme)((0, _react.useCallback)(state => {
    return {
      primaryColor: state.colors.primary,
      eventContainerStyle: state.eventContainerStyle,
      eventTitleStyle: state.eventTitleStyle
    };
  }, []));
  const {
    minuteHeight,
    columnWidth,
    start,
    numberOfDays
  } = (0, _BodyContext.useBody)();
  const {
    dragSelectedStartUnix,
    dragSelectedDuration,
    dragSelectedStartMinutes,
    selectedEvent,
    isDraggingAnim,
    isDragging: isDraggingState
  } = (0, _DragEventProvider.useDragEvent)();
  const {
    triggerDragSelectedEvent,
    claimDragSelectedEvent
  } = (0, _DragEventProvider.useDragEventActions)();
  const totalResources = resources && resources.length > 1 ? resources.length : 1;
  const eventWidth = columnWidth / totalResources;
  const eventWidthAnim = (0, _reactNativeReanimated.useDerivedValue)(() => eventWidth, [eventWidth]);
  const resourceIndex = (0, _react.useMemo)(() => {
    if (!resources) {
      return -1;
    }
    return resources.findIndex(resource => resource.id === (selectedEvent === null || selectedEvent === void 0 ? void 0 : selectedEvent.resourceId));
  }, [resources, selectedEvent === null || selectedEvent === void 0 ? void 0 : selectedEvent.resourceId]);
  const left = (0, _react.useMemo)(() => {
    var _visibleDates$startUn;
    const diffDays = ((_visibleDates$startUn = visibleDates[startUnix]) === null || _visibleDates$startUn === void 0 ? void 0 : _visibleDates$startUn.diffDays) ?? 1;
    return (diffDays - 1) * columnWidth;
  }, [visibleDates, startUnix, columnWidth]);

  /**
   * Laid out from the selected event's own times, passed down as plain numbers.
   *
   * These used to be read from the `dragSelected*` shared values, which mirror the same
   * times but are written by an effect up in the provider. That was a frame behind this
   * component whenever a selection appears: the box mounted while they still held -1 and
   * drew itself zero-height at the top of the grid before snapping into place.
   */
  const top = (0, _reactNativeReanimated.useDerivedValue)(() => {
    const startDayUnix = selectedStartUnix ?? dragSelectedStartUnix.value;
    const startMinutes = selectedStartMinutes ?? dragSelectedStartMinutes.value;
    if (index > 0) {
      const selectedStart = startDayUnix + startMinutes * _constants.MILLISECONDS_IN_MINUTE;
      const diffMinutes = (startUnix - selectedStart) / _constants.MILLISECONDS_IN_MINUTE;
      return (0 - diffMinutes - start) * minuteHeight.value;
    }
    return (startMinutes - start) * minuteHeight.value;
  }, [startUnix, start, index, selectedStartUnix, selectedStartMinutes]);
  const eventHeight = (0, _reactNativeReanimated.useDerivedValue)(() => (selectedDuration ?? dragSelectedDuration.value) * minuteHeight.value, [selectedDuration]);
  const startX = resourceIndex !== -1 ? resourceIndex * eventWidth : 0;
  const animView = (0, _reactNativeReanimated.useAnimatedStyle)(() => {
    return {
      top: top.value,
      height: eventHeight.value
    };
  }, [resourceIndex]);

  /**
   * Opens the drag on the UI thread, the moment the finger lands.
   *
   * The tap gestures below have to run on the JS thread, because the trigger they call
   * reaches back into React. Leaving the drag to be opened there cost the first frames of
   * every drag and resize: `isDraggingAnim` — the flag the body's pan gesture waits on
   * before it activates — only flipped after a UI -> JS -> UI round trip, so nothing
   * followed the finger until it completed, and a fast flick spent that whole window handing
   * the touch to the calendar's scroll views, which panned the grid instead. Claiming here
   * writes every value the pan reads (`isDraggingAnim`, `dragSelectedType` and the
   * `drag*` values behind `initialDragState`) before the first touch move can arrive.
   */
  const claimGesture = type => (0, _touchTrackerGesture.createTouchTrackerGesture)().onTouchesDown(() => {
    'worklet';

    claimDragSelectedEvent({
      startIndex: index,
      type
    });
  });
  const dragGesture = type => _reactNativeGestureHandler.Gesture.Simultaneous(claimGesture(type), _reactNativeGestureHandler.Gesture.Tap().runOnJS(true).onTouchesDown(() => {
    triggerDragSelectedEvent({
      startIndex: index,
      type,
      resourceIndex
    });
  }).onTouchesUp(() => {
    isDraggingAnim.value = false;
  }));
  const gesture = dragGesture('center');
  const topEdgeGesture = dragGesture('top');
  const bottomEdgeGesture = dragGesture('bottom');
  return /*#__PURE__*/_react.default.createElement(_reactNativeReanimated.default.View, {
    style: [styles.container, {
      width: eventWidth,
      left: startX + left
    }, animView, isDraggingState && styles.dragging]
  }, selectedEvent && /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [_reactNative.StyleSheet.absoluteFill, theme.eventContainerStyle, styles.event, {
      backgroundColor: (selectedEvent === null || selectedEvent === void 0 ? void 0 : selectedEvent.color) ?? (_reactNative.Platform.OS === 'android' ? theme.primaryColor : 'transparent'),
      borderColor: theme.primaryColor
    }, containerStyle]
  }, renderEvent ? renderEvent(selectedEvent, {
    width: eventWidthAnim,
    height: eventHeight
  }) : /*#__PURE__*/_react.default.createElement(_reactNative.Text, {
    style: [styles.eventTitle, theme.eventTitleStyle]
  }, selectedEvent.title)), /*#__PURE__*/_react.default.createElement(_reactNativeGestureHandler.GestureDetector, {
    gesture: gesture
  }, /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [_reactNative.StyleSheet.absoluteFill, {
      cursor: 'pointer'
    }]
  })), /*#__PURE__*/_react.default.createElement(_reactNativeGestureHandler.GestureDetector, {
    gesture: topEdgeGesture
  }, TopEdgeComponent || /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [styles.dot, styles.dotLeft, numberOfDays === 1 && styles.dotLeftSingle]
  }, /*#__PURE__*/_react.default.createElement(_DragDot.default, null))), /*#__PURE__*/_react.default.createElement(_reactNativeGestureHandler.GestureDetector, {
    gesture: bottomEdgeGesture
  }, BottomEdgeComponent || /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [styles.dot, styles.dotRight, numberOfDays === 1 && styles.dotRightSingle]
  }, /*#__PURE__*/_react.default.createElement(_DragDot.default, null))));
};
exports.DraggableEvent = DraggableEvent;
const styles = _reactNative.StyleSheet.create({
  container: {
    position: 'absolute'
  },
  /**
   * Hides this box for as long as the floating dragging event is what represents the
   * event on screen, so the two are never drawn at once and never both missing.
   *
   * Deliberately a plain style driven by React state rather than part of the animated
   * style above. The dragging event is mounted and unmounted by that same state, so
   * tying visibility to it hands over inside a single commit. Reanimated applies the
   * animated style from the UI thread instead, on its own frame, which left a frame
   * where the dragging event was already gone and this box was not yet visible.
   */
  dragging: {
    opacity: 0
  },
  dot: {
    position: 'absolute',
    borderRadius: 12,
    width: 24,
    height: 24,
    cursor: 'pointer'
  },
  event: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 3
  },
  dotLeft: {
    top: -12,
    left: -12
  },
  dotRight: {
    bottom: -12,
    right: -12
  },
  eventTitle: {
    fontSize: 12,
    paddingHorizontal: 2
  },
  dotLeftSingle: {
    left: 0
  },
  dotRightSingle: {
    right: 0
  }
});
const DraggableEventWrapper = ({
  startUnix,
  visibleDates,
  renderEvent,
  renderDraggableEvent,
  resources
}) => {
  const {
    selectedEvent
  } = (0, _DragEventProvider.useDragEvent)();
  const {
    timeZone
  } = (0, _TimeZoneProvider.useTimezone)();
  const endUnix = (0, _react.useMemo)(() => {
    const lastDate = Object.values(visibleDates).pop();
    if (!lastDate) {
      return 0;
    }
    return (0, _dateUtils.parseDateTime)(lastDate.unix).plus({
      days: 1
    }).toMillis();
  }, [visibleDates]);

  /**
   * Derived straight from `selectedEvent` rather than from the `dragSelected*` shared
   * values it feeds.
   *
   * Those are written in an effect and were read back through an animated reaction, so
   * mounting the box cost a JS -> UI -> JS round trip after the selection was already
   * known. Selecting an event as a drag ends therefore landed one or two commits after
   * the dragging event had been torn down, leaving the event drawn only by its dimmed
   * original in the grid — a visible blink and a shift in width, since that one is laid
   * out by the packed-event math rather than the full column this box uses.
   */
  const selection = (0, _react.useMemo)(() => {
    var _selectedEvent$start, _selectedEvent$end;
    const empty = {
      dates: [],
      unix: -1,
      minutes: -1,
      duration: -1
    };
    if (!(selectedEvent !== null && selectedEvent !== void 0 && (_selectedEvent$start = selectedEvent.start) !== null && _selectedEvent$start !== void 0 && _selectedEvent$start.dateTime) || !(selectedEvent !== null && selectedEvent !== void 0 && (_selectedEvent$end = selectedEvent.end) !== null && _selectedEvent$end !== void 0 && _selectedEvent$end.dateTime)) {
      return empty;
    }
    const eventStart = (0, _dateUtils.parseDateTime)(selectedEvent.start.dateTime, {
      zone: selectedEvent.start.timeZone
    }).setZone(timeZone);
    const eventEnd = (0, _dateUtils.parseDateTime)(selectedEvent.end.dateTime, {
      zone: selectedEvent.end.timeZone
    }).setZone(timeZone);
    const unix = (0, _dateUtils.parseDateTime)(eventStart.toISODate()).toMillis();
    const minutes = eventStart.hour * 60 + eventStart.minute;
    const duration = eventEnd.diff(eventStart, 'minutes').minutes;
    const dragStartUnix = unix + minutes * _constants.MILLISECONDS_IN_MINUTE;
    const dragEndUnix = dragStartUnix + duration * _constants.MILLISECONDS_IN_MINUTE;
    const isValidStart = dragStartUnix >= startUnix && dragStartUnix < endUnix;
    const isValidEnd = dragEndUnix > startUnix && dragEndUnix < endUnix;
    if (!isValidStart && !isValidEnd) {
      return empty;
    }
    const startDate = (0, _dateUtils.parseDateTime)(dragStartUnix).startOf('day');
    const endDate = (0, _dateUtils.parseDateTime)(dragEndUnix).startOf('day');
    const diffDays = endDate.diff(startDate, 'day').days;
    if (diffDays === 0) {
      return {
        dates: [unix],
        unix,
        minutes,
        duration
      };
    }
    const dates = [];
    for (let i = 0; i <= diffDays; i++) {
      dates.push((0, _dateUtils.parseDateTime)(unix).plus({
        days: i
      }).toMillis());
    }
    return {
      dates,
      unix,
      minutes,
      duration
    };
  }, [selectedEvent, timeZone, startUnix, endUnix]);
  return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, null, selection.dates.map((date, index) => {
    if (!visibleDates[date]) {
      return null;
    }
    const eventProps = {
      startUnix: date,
      visibleDates,
      index,
      selectedStartUnix: selection.unix,
      selectedStartMinutes: selection.minutes,
      selectedDuration: selection.duration,
      renderEvent,
      resources
    };
    if (renderDraggableEvent) {
      return /*#__PURE__*/_react.default.createElement(_react.default.Fragment, {
        key: `${date}-${index}`
      }, renderDraggableEvent(eventProps));
    }
    return /*#__PURE__*/_react.default.createElement(DraggableEvent, _extends({
      key: `${date}-${index}`
    }, eventProps));
  }));
};
var _default = exports.default = DraggableEventWrapper;
//# sourceMappingURL=DraggableEvent.js.map