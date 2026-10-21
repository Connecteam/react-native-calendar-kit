"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeReanimated = require("react-native-reanimated");
var _ActionsProvider = require("../context/ActionsProvider");
var _BodyContext = require("../context/BodyContext");
var _CalendarProvider = require("../context/CalendarProvider");
var _DragEventProvider = require("../context/DragEventProvider");
var _EventsProvider = require("../context/EventsProvider");
var _TimeZoneProvider = require("../context/TimeZoneProvider");
var _dateUtils = require("../utils/dateUtils");
var _EventItem = _interopRequireDefault(require("./EventItem"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
/**
 * JS copy of the minute height for the page's events, updated once a pinch settles. One reaction per
 * page instead of one per event card (see EventItem's staticSize).
 */
function useSettledMinuteHeight() {
  const {
    minuteHeight
  } = (0, _BodyContext.useBody)();
  const {
    isPinching,
    settledMinuteHeight
  } = (0, _CalendarProvider.useCalendar)();
  const [settled, setSettled] = (0, _react.useState)(() => settledMinuteHeight.current);
  (0, _reactNativeReanimated.useAnimatedReaction)(() => ({
    height: minuteHeight.value,
    pinching: isPinching.value
  }), (current, previous) => {
    if (current.pinching) {
      return;
    }
    if (previous && !previous.pinching && previous.height === current.height) {
      return;
    }
    (0, _reactNativeReanimated.runOnJS)(setSettled)(current.height);
  }, []);
  return settled;
}
const Events = ({
  startUnix,
  visibleDates,
  resources
}) => {
  const totalResources = resources === null || resources === void 0 ? void 0 : resources.length;
  const {
    renderEvent,
    numberOfDays,
    columnWidth,
    enableResourceScroll
  } = (0, _BodyContext.useBody)();
  const settledMinuteHeight = useSettledMinuteHeight();
  const {
    onPressEvent,
    onLongPressEvent,
    onEventsRendered,
    onEventsUnmounted
  } = (0, _ActionsProvider.useActions)();
  const {
    draggingId,
    selectedEventId
  } = (0, _DragEventProvider.useDragEvent)();
  const {
    timeZone
  } = (0, _TimeZoneProvider.useTimezone)();
  const {
    triggerDragEvent
  } = (0, _DragEventProvider.useDragEventActions)();
  const resourcesIds = (0, _react.useMemo)(() => {
    return resources === null || resources === void 0 ? void 0 : resources.map(resource => resource.id);
  }, [resources]);
  const {
    data: eventsByDate,
    source
  } = (0, _EventsProvider.useRegularEvents)(startUnix, numberOfDays, visibleDates);

  // Days this page shows, reported after each commit so the app knows what is
  // actually on screen and which `events` prop it was built from.
  const pageDays = (0, _react.useMemo)(() => {
    const totalDays = numberOfDays === 1 ? 1 : 7;
    const days = [];
    for (let i = 0; i < totalDays; i++) {
      const dayUnix = (0, _dateUtils.parseDateTime)(startUnix).plus({
        days: i
      }).toMillis();
      if (visibleDates[dayUnix]) {
        days.push(dayUnix);
      }
    }
    return days;
  }, [startUnix, numberOfDays, visibleDates]);
  (0, _react.useEffect)(() => {
    onEventsRendered === null || onEventsRendered === void 0 || onEventsRendered(pageDays, source);
  }, [pageDays, source, eventsByDate, onEventsRendered]);
  (0, _react.useEffect)(() => () => onEventsUnmounted === null || onEventsUnmounted === void 0 ? void 0 : onEventsUnmounted(pageDays), [pageDays, onEventsUnmounted]);
  const events = (0, _react.useMemo)(() => {
    if (!enableResourceScroll) {
      return eventsByDate;
    }
    return eventsByDate.filter(event => event.resourceId && (resourcesIds === null || resourcesIds === void 0 ? void 0 : resourcesIds.includes(event.resourceId)));
  }, [enableResourceScroll, eventsByDate, resourcesIds]);
  const _triggerDragEvent = (0, _react.useCallback)((event, resEvent) => {
    if (!event.start.dateTime || !event.end.dateTime) {
      return;
    }
    const eventStart = (0, _dateUtils.forceUpdateZone)(event._internal.startUnix, timeZone).startOf('day');
    const originalStart = (0, _dateUtils.forceUpdateZone)((0, _dateUtils.parseDateTime)(event.start.dateTime, {
      zone: event.start.timeZone
    }), timeZone).startOf('day');
    const startIndex = eventStart.diff(originalStart, 'days').days;
    triggerDragEvent({
      start: {
        dateTime: event.start.dateTime,
        timeZone: event.start.timeZone
      },
      end: {
        dateTime: event.end.dateTime,
        timeZone: event.end.timeZone
      },
      startIndex,
      dragX: event._internal.resourceIndex && totalResources ? event._internal.resourceIndex * (columnWidth / totalResources) + resEvent.nativeEvent.locationX : undefined
    }, event);
  }, [timeZone, triggerDragEvent, columnWidth, totalResources]);
  const _onLongPressEvent = (0, _react.useCallback)((event, resEvent) => {
    const clonedEvent = {
      ...event,
      _internal: undefined
    };
    delete clonedEvent._internal;
    onLongPressEvent === null || onLongPressEvent === void 0 || onLongPressEvent(clonedEvent, resEvent);
  }, [onLongPressEvent]);
  if (events.length === 0) {
    return null;
  }
  const _renderEvent = event => {
    return /*#__PURE__*/_react.default.createElement(_EventItem.default, {
      key: event.localId,
      event: event,
      startUnix: startUnix,
      renderEvent: renderEvent,
      onPressEvent: onPressEvent,
      onLongPressEvent: triggerDragEvent ? _triggerDragEvent : onLongPressEvent ? _onLongPressEvent : undefined,
      isDragging: draggingId === event.localId || selectedEventId === event.localId,
      visibleDates: visibleDates,
      totalResources: totalResources,
      minuteHeight: settledMinuteHeight
    });
  };
  return /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    pointerEvents: "box-none",
    style: _reactNative.StyleSheet.absoluteFill
  }, events.map(_renderEvent));
};
var _default = exports.default = Events;
//# sourceMappingURL=Events.js.map