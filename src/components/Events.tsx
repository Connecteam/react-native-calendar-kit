import type { FC } from 'react';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type GestureResponderEvent } from 'react-native';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';
import { useActions } from '../context/ActionsProvider';
import { useBody } from '../context/BodyContext';
import { useCalendar } from '../context/CalendarProvider';
import {
  useDragEvent,
  useDragEventActions,
} from '../context/DragEventProvider';
import { useRegularEvents } from '../context/EventsProvider';
import { useTimezone } from '../context/TimeZoneProvider';
import type { PackedEvent, ResourceItem } from '../types';
import { forceUpdateZone, parseDateTime } from '../utils/dateUtils';
import EventItem from './EventItem';

/**
 * JS copy of the minute height for the page's events, updated once a pinch settles. One reaction per
 * page instead of one per event card (see EventItem's staticSize).
 */
function useSettledMinuteHeight(): number {
  const { minuteHeight } = useBody();
  const { isPinching } = useCalendar();
  const [settled, setSettled] = useState(() => minuteHeight.value);

  useAnimatedReaction(
    () => ({ height: minuteHeight.value, pinching: isPinching.value }),
    (current, previous) => {
      if (current.pinching) {
        return;
      }
      if (previous && !previous.pinching && previous.height === current.height) {
        return;
      }
      runOnJS(setSettled)(current.height);
    },
    []
  );

  return settled;
}

const Events: FC<{
  startUnix: number;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
  resources?: ResourceItem[];
}> = ({ startUnix, visibleDates, resources }) => {
  const totalResources = resources?.length;
  const { renderEvent, numberOfDays, columnWidth, enableResourceScroll } =
    useBody();
  const settledMinuteHeight = useSettledMinuteHeight();
  const { onPressEvent, onLongPressEvent, onEventsRendered, onEventsUnmounted } =
    useActions();
  const { draggingId, selectedEventId } = useDragEvent();
  const { timeZone } = useTimezone();
  const { triggerDragEvent } = useDragEventActions();

  const resourcesIds = useMemo(() => {
    return resources?.map((resource) => resource.id);
  }, [resources]);

  const { data: eventsByDate, source } = useRegularEvents(
    startUnix,
    numberOfDays,
    visibleDates
  );

  // Days this page shows, reported after each commit so the app knows what is
  // actually on screen and which `events` prop it was built from.
  const pageDays = useMemo(() => {
    const totalDays = numberOfDays === 1 ? 1 : 7;
    const days: number[] = [];
    for (let i = 0; i < totalDays; i++) {
      const dayUnix = parseDateTime(startUnix).plus({ days: i }).toMillis();
      if (visibleDates[dayUnix]) {
        days.push(dayUnix);
      }
    }
    return days;
  }, [startUnix, numberOfDays, visibleDates]);

  useEffect(() => {
    onEventsRendered?.(pageDays, source);
  }, [pageDays, source, eventsByDate, onEventsRendered]);

  useEffect(
    () => () => onEventsUnmounted?.(pageDays),
    [pageDays, onEventsUnmounted]
  );

  const events = useMemo(() => {
    if (!enableResourceScroll) {
      return eventsByDate;
    }

    return eventsByDate.filter(
      (event) => event.resourceId && resourcesIds?.includes(event.resourceId)
    );
  }, [enableResourceScroll, eventsByDate, resourcesIds]);

  const _triggerDragEvent = useCallback(
    (event: PackedEvent, resEvent: GestureResponderEvent) => {
      if (!event.start.dateTime || !event.end.dateTime) {
        return;
      }

      const eventStart = forceUpdateZone(
        event._internal.startUnix,
        timeZone
      ).startOf('day');
      const originalStart = forceUpdateZone(
        parseDateTime(event.start.dateTime, { zone: event.start.timeZone }),
        timeZone
      ).startOf('day');
      const startIndex = eventStart.diff(originalStart, 'days').days;
      triggerDragEvent!(
        {
          start: {
            dateTime: event.start.dateTime,
            timeZone: event.start.timeZone,
          },
          end: {
            dateTime: event.end.dateTime,
            timeZone: event.end.timeZone,
          },
          startIndex,
          dragX:
            event._internal.resourceIndex && totalResources
              ? event._internal.resourceIndex * (columnWidth / totalResources) +
                resEvent.nativeEvent.locationX
              : undefined,
        },
        event
      );
    },
    [timeZone, triggerDragEvent, columnWidth, totalResources]
  );

  const _onLongPressEvent = useCallback(
    (event: PackedEvent, resEvent?: GestureResponderEvent) => {
      const clonedEvent = { ...event, _internal: undefined };
      delete clonedEvent._internal;
      onLongPressEvent?.(clonedEvent, resEvent);
    },
    [onLongPressEvent]
  );

  if (events.length === 0) {
    return null;
  }

  const _renderEvent = (event: PackedEvent) => {
    return (
      <EventItem
        key={event.localId}
        event={event}
        startUnix={startUnix}
        renderEvent={renderEvent}
        onPressEvent={onPressEvent}
        onLongPressEvent={
          triggerDragEvent
            ? _triggerDragEvent
            : onLongPressEvent
              ? _onLongPressEvent
              : undefined
        }
        isDragging={
          draggingId === event.localId || selectedEventId === event.localId
        }
        visibleDates={visibleDates}
        totalResources={totalResources}
        minuteHeight={settledMinuteHeight}
      />
    );
  };

  return (
    <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
      {events.map(_renderEvent)}
    </View>
  );
};

export default Events;
