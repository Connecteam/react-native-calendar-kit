import React, { forwardRef, useCallback, useContext, useEffect, useImperativeHandle } from 'react';
import { DEFAULT_MIN_START_DIFFERENCE } from '../constants';
import useLazyRef from '../hooks/useLazyRef';
import { useSyncExternalStoreWithSelector } from '../hooks/useSyncExternalStoreWithSelector';
import { createStore } from '../storeBuilder';
import { forceUpdateZone, parseDateTime } from '../utils/dateUtils';
import { divideAllDayEvents, divideEvents, filterEvents, populateEvents, processAllDayEventMap, processEventOccurrences } from '../utils/eventUtils';
/**
 * Time span covered by `events`. Packing all of them (instead of a window
 * around the visible date) keeps every page in sync with the prop and avoids
 * re-packing on each page change. The admin calendar passes a bounded window;
 * the employee calendar passes its whole schedule cache (small: only the
 * user's own items), so there every events change repacks all of it.
 */
function getEventsBounds(events) {
  let minUnix = Infinity;
  let maxUnix = -Infinity;
  for (const event of events) {
    const start = event.start.dateTime ?? event.start.date;
    const end = event.end.dateTime ?? event.end.date;
    if (!start || !end) {
      continue;
    }
    const startUnix = parseDateTime(start, {
      zone: event.start.timeZone
    });
    const endUnix = parseDateTime(end, {
      zone: event.end.timeZone
    });
    minUnix = Math.min(minUnix, startUnix.startOf('day').toMillis());
    maxUnix = Math.max(maxUnix, endUnix.endOf('day').toMillis());
  }
  return {
    minUnix,
    maxUnix
  };
}
const EventsContext = /*#__PURE__*/React.createContext(undefined);
const EventsProvider = ({
  events = [],
  children,
  timeZone,
  firstDay,
  useAllDayEvent: showAllDay,
  hideWeekDays,
  minRegularEventMinutes = 1,
  overlapType = 'no-overlap',
  minStartDifference = DEFAULT_MIN_START_DIFFERENCE,
  resources
}, ref) => {
  const eventStore = useLazyRef(() => createStore({
    allDayEvents: {},
    allDayEventsByDay: {},
    regularEvents: {},
    eventCountsByDay: {},
    eventCountsByWeek: {},
    resources: undefined,
    source: []
  })).current;
  const notifyDataChanged = useCallback(() => {
    const {
      minUnix,
      maxUnix
    } = getEventsBounds(events);
    const {
      regular: regularEvents,
      allDays: allDayEvents
    } = filterEvents(events, minUnix, maxUnix, showAllDay);

    // Process regular events
    const regularEventMap = new Map();
    regularEvents.forEach(event => {
      const processedEvents = processEventOccurrences(event, minUnix, maxUnix, timeZone, (e, tz) => divideEvents(e, tz, minRegularEventMinutes));
      processedEvents.forEach(evt => {
        const dayStart = parseDateTime(evt._internal.startUnix).startOf('day').toMillis();
        if (!regularEventMap.has(dayStart)) {
          regularEventMap.set(dayStart, []);
        }
        regularEventMap.get(dayStart).push(evt);
      });
    });
    const packedRegularEvents = {};
    regularEventMap.forEach((rEvents, day) => {
      packedRegularEvents[day] = populateEvents(rEvents, {
        overlap: overlapType === 'overlap',
        minStartDifference,
        resources
      });
    });

    // Process all-day events
    const allDayEventMap = new Map();
    allDayEvents.forEach(event => {
      const processedEvents = processEventOccurrences(event, minUnix, maxUnix, timeZone, (e, tz) => divideAllDayEvents(e, tz, firstDay, hideWeekDays));
      processedEvents.forEach(evt => {
        const weekStart = evt._internal.weekStart;
        if (!weekStart) {
          return;
        }
        if (!allDayEventMap.has(weekStart)) {
          allDayEventMap.set(weekStart, []);
        }
        allDayEventMap.get(weekStart).push(evt);
      });
    });
    const {
      packedAllDayEvents,
      packedAllDayEventsByDay,
      eventCountsByWeek,
      eventCountsByDay
    } = processAllDayEventMap(allDayEventMap, timeZone, hideWeekDays);
    eventStore.setState({
      regularEvents: packedRegularEvents,
      allDayEvents: packedAllDayEvents,
      allDayEventsByDay: packedAllDayEventsByDay,
      eventCountsByDay,
      eventCountsByWeek,
      resources,
      source: events
    });
  }, [timeZone, events, showAllDay, hideWeekDays, eventStore, resources, minRegularEventMinutes, overlapType, minStartDifference, firstDay]);
  useImperativeHandle(ref, () => ({
    getEventsByDate: date => {
      const dateObj = parseDateTime(date);
      const dateUnix = dateObj.startOf('day').toMillis();
      const regularEvents = eventStore.getState().regularEvents[dateUnix];
      if (!regularEvents) {
        return [];
      }
      const targetUnix = forceUpdateZone(dateObj, timeZone).toMillis();
      const filteredEvents = regularEvents.filter(event => {
        const eventStart = parseDateTime(event.start.dateTime).toMillis();
        const eventEnd = parseDateTime(event.end.dateTime).toMillis();
        return eventStart <= targetUnix && eventEnd >= targetUnix;
      });
      return filteredEvents;
    }
  }));
  useEffect(() => {
    notifyDataChanged();
  }, [notifyDataChanged]);
  return /*#__PURE__*/React.createElement(EventsContext.Provider, {
    value: eventStore
  }, children);
};
export default /*#__PURE__*/forwardRef(EventsProvider);
export const useAllDayEvents = (date, numberOfDays, visibleDays) => {
  const eventsContext = useContext(EventsContext);
  const selectorByDate = useCallback(state => {
    const data = [];
    const eventCounts = {};
    const totalDays = numberOfDays === 1 ? 1 : 7;
    for (let i = 0; i < totalDays; i++) {
      const dateUnix = parseDateTime(date).plus({
        days: i
      }).toMillis();
      if (visibleDays[dateUnix]) {
        const events = state.allDayEvents[dateUnix];
        const count = state.eventCountsByDay[dateUnix];
        if (count) {
          eventCounts[dateUnix] = count;
        }
        if (events) {
          data.push(...events);
        }
      }
    }
    return {
      data,
      eventCounts
    };
  }, [date, numberOfDays, visibleDays]);
  if (!eventsContext) {
    throw new Error('useAllDayEvents must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectorByDate);
  return state;
};
export const useAllDayEventsByDay = date => {
  const eventsContext = useContext(EventsContext);
  const selectorByDate = useCallback(state => {
    const events = state.allDayEventsByDay[date] ?? [];
    const eventCounts = state.eventCountsByDay[date] ?? 0;
    return {
      data: events,
      eventCounts
    };
  }, [date]);
  if (!eventsContext) {
    throw new Error('useAllDayEvents must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectorByDate);
  return state;
};
export const useRegularEvents = (date, numberOfDays, visibleDays) => {
  const eventsContext = useContext(EventsContext);
  const selectorByDate = useCallback(state => {
    const data = [];
    const totalDays = numberOfDays === 1 ? 1 : 7;
    for (let i = 0; i < totalDays; i++) {
      const dateUnix = parseDateTime(date).plus({
        days: i
      }).toMillis();
      if (visibleDays[dateUnix]) {
        const events = state.regularEvents[dateUnix];
        if (events) {
          data.push(...events);
        }
      }
    }
    return {
      data,
      source: state.source
    };
  }, [date, numberOfDays, visibleDays]);
  if (!eventsContext) {
    throw new Error('useRegularEvents must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectorByDate);
  return state;
};
export const useEventCountsByWeek = type => {
  const eventsContext = useContext(EventsContext);
  const selectEventCountByWeek = useCallback(() => type === 'week' ? (eventsContext === null || eventsContext === void 0 ? void 0 : eventsContext.getState().eventCountsByWeek) ?? {} : (eventsContext === null || eventsContext === void 0 ? void 0 : eventsContext.getState().eventCountsByDay) ?? {}, [eventsContext, type]);
  if (!eventsContext) {
    throw new Error('useRegularEvents must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectEventCountByWeek);
  return state;
};
export const useResources = () => {
  const eventsContext = useContext(EventsContext);
  const selectResources = useCallback(() => eventsContext === null || eventsContext === void 0 ? void 0 : eventsContext.getState().resources, [eventsContext]);
  if (!eventsContext) {
    throw new Error('useResources must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectResources);
  return state;
};
export const useMonthEvents = (date, numberOfDays, visibleDays) => {
  const eventsContext = useContext(EventsContext);
  const selectorByDate = useCallback(state => {
    const data = {};
    for (let i = 0; i < numberOfDays; i++) {
      const dateUnix = parseDateTime(date).plus({
        days: i
      }).toMillis();
      if (visibleDays.includes(dateUnix)) {
        const events = state.regularEvents[dateUnix];
        if (events) {
          data[dateUnix] = events;
        }
      }
    }
    return {
      data
    };
  }, [date, numberOfDays, visibleDays]);
  if (!eventsContext) {
    throw new Error('useRegularEvents must be used within a EventsProvider');
  }
  const state = useSyncExternalStoreWithSelector(eventsContext.subscribe, eventsContext.getState, selectorByDate);
  return state;
};
//# sourceMappingURL=EventsProvider.js.map