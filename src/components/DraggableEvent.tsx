import type { FC } from 'react';
import React, { useCallback, useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  useAnimatedStyle,
  useDerivedValue,
} from 'react-native-reanimated';
import { MILLISECONDS_IN_MINUTE } from '../constants';
import { useBody } from '../context/BodyContext';
import {
  useDragEvent,
  useDragEventActions,
} from '../context/DragEventProvider';
import { useTheme } from '../context/ThemeProvider';
import { useTimezone } from '../context/TimeZoneProvider';
import type { ResourceItem, SelectedEventType } from '../types';
import { parseDateTime } from '../utils/dateUtils';
import { createTouchTrackerGesture } from '../utils/touchTrackerGesture';
import DragDot from './DragDot';

export interface DraggableEventProps {
  index: number;
  startUnix: number;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
  /** Start-of-day of the selected event, in milliseconds. */
  selectedStartUnix: number;
  /** Minutes from midnight to the selected event's start. */
  selectedStartMinutes: number;
  /** Length of the selected event, in minutes. */
  selectedDuration: number;
  renderEvent?: (
    event: SelectedEventType,
    options: {
      width: SharedValue<number>;
      height: SharedValue<number>;
    }
  ) => React.ReactElement | null;
  TopEdgeComponent?: React.ReactElement | null;
  BottomEdgeComponent?: React.ReactElement | null;
  containerStyle?: ViewStyle;
  resources?: ResourceItem[];
}

export const DraggableEvent: FC<DraggableEventProps> = ({
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
  containerStyle,
}) => {
  const theme = useTheme(
    useCallback((state) => {
      return {
        primaryColor: state.colors.primary,
        eventContainerStyle: state.eventContainerStyle,
        eventTitleStyle: state.eventTitleStyle,
      };
    }, [])
  );
  const { minuteHeight, columnWidth, start, numberOfDays } = useBody();
  const {
    selectedEvent,
    isDraggingAnim,
    isDragging: isDraggingState,
  } = useDragEvent();
  const { triggerDragSelectedEvent, claimDragSelectedEvent } =
    useDragEventActions();
  const totalResources =
    resources && resources.length > 1 ? resources.length : 1;

  const eventWidth = columnWidth / totalResources;

  const eventWidthAnim = useDerivedValue(() => eventWidth, [eventWidth]);

  const resourceIndex = useMemo(() => {
    if (!resources) {
      return -1;
    }

    return resources.findIndex(
      (resource) => resource.id === selectedEvent?.resourceId
    );
  }, [resources, selectedEvent?.resourceId]);
  const left = useMemo(() => {
    const diffDays = visibleDates[startUnix]?.diffDays ?? 1;
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
  const top = useDerivedValue(() => {
    if (index > 0) {
      const selectedStart =
        selectedStartUnix + selectedStartMinutes * MILLISECONDS_IN_MINUTE;
      const diffMinutes = (startUnix - selectedStart) / MILLISECONDS_IN_MINUTE;
      return (0 - diffMinutes - start) * minuteHeight.value;
    }
    return (selectedStartMinutes - start) * minuteHeight.value;
  }, [startUnix, start, index, selectedStartUnix, selectedStartMinutes]);

  const eventHeight = useDerivedValue(
    () => selectedDuration * minuteHeight.value,
    [selectedDuration]
  );
  const startX = resourceIndex !== -1 ? resourceIndex * eventWidth : 0;

  const animView = useAnimatedStyle(() => {
    return {
      top: top.value,
      height: eventHeight.value,
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
  const claimGesture = (type: 'center' | 'top' | 'bottom') =>
    createTouchTrackerGesture().onTouchesDown(() => {
      'worklet';
      claimDragSelectedEvent({ startIndex: index, type });
    });

  const dragGesture = (type: 'center' | 'top' | 'bottom') =>
    Gesture.Simultaneous(
      claimGesture(type),
      Gesture.Tap()
        .runOnJS(true)
        .onTouchesDown(() => {
          triggerDragSelectedEvent({
            startIndex: index,
            type,
            resourceIndex,
          });
        })
        .onTouchesUp(() => {
          isDraggingAnim.value = false;
        })
    );

  const gesture = dragGesture('center');
  const topEdgeGesture = dragGesture('top');
  const bottomEdgeGesture = dragGesture('bottom');

  return (
    <Animated.View
      style={[
        styles.container,
        { width: eventWidth, left: startX + left },
        animView,
        isDraggingState && styles.dragging,
      ]}>
      {selectedEvent && (
        <View
          style={[
            StyleSheet.absoluteFill,
            theme.eventContainerStyle,
            styles.event,
            {
              backgroundColor:
                selectedEvent?.color ??
                (Platform.OS === 'android'
                  ? theme.primaryColor
                  : 'transparent'),
              borderColor: theme.primaryColor,
            },
            containerStyle,
          ]}>
          {renderEvent ? (
            renderEvent(selectedEvent, {
              width: eventWidthAnim,
              height: eventHeight,
            })
          ) : (
            <Text style={[styles.eventTitle, theme.eventTitleStyle]}>
              {selectedEvent.title}
            </Text>
          )}
        </View>
      )}
      <GestureDetector gesture={gesture}>
        <View style={[StyleSheet.absoluteFill, { cursor: 'pointer' }]} />
      </GestureDetector>
      <GestureDetector gesture={topEdgeGesture}>
        {TopEdgeComponent || (
          <View
            style={[
              styles.dot,
              styles.dotLeft,
              numberOfDays === 1 && styles.dotLeftSingle,
            ]}>
            <DragDot />
          </View>
        )}
      </GestureDetector>
      <GestureDetector gesture={bottomEdgeGesture}>
        {BottomEdgeComponent || (
          <View
            style={[
              styles.dot,
              styles.dotRight,
              numberOfDays === 1 && styles.dotRightSingle,
            ]}>
            <DragDot />
          </View>
        )}
      </GestureDetector>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
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
    opacity: 0,
  },
  dot: {
    position: 'absolute',
    borderRadius: 12,
    width: 24,
    height: 24,
    cursor: 'pointer',
  },
  event: {
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 3,
  },
  dotLeft: { top: -12, left: -12 },
  dotRight: { bottom: -12, right: -12 },
  eventTitle: { fontSize: 12, paddingHorizontal: 2 },
  dotLeftSingle: { left: 0 },
  dotRightSingle: { right: 0 },
});

interface DraggableEventWrapperProps {
  startUnix: number;
  visibleDates: Record<string, { diffDays: number; unix: number }>;
  renderEvent?: (
    event: SelectedEventType,
    options: {
      width: SharedValue<number>;
      height: SharedValue<number>;
    }
  ) => React.ReactElement | null;
  renderDraggableEvent?: (
    event: DraggableEventProps
  ) => React.ReactElement | null;
  resources?: ResourceItem[];
}

const DraggableEventWrapper: FC<DraggableEventWrapperProps> = ({
  startUnix,
  visibleDates,
  renderEvent,
  renderDraggableEvent,
  resources,
}) => {
  const { selectedEvent } = useDragEvent();
  const { timeZone } = useTimezone();

  const endUnix = useMemo(() => {
    const lastDate = Object.values(visibleDates).pop();
    if (!lastDate) {
      return 0;
    }
    return parseDateTime(lastDate.unix).plus({ days: 1 }).toMillis();
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
  const selection = useMemo(() => {
    const empty = { dates: [] as number[], unix: -1, minutes: -1, duration: -1 };
    if (!selectedEvent?.start?.dateTime || !selectedEvent?.end?.dateTime) {
      return empty;
    }

    const eventStart = parseDateTime(selectedEvent.start.dateTime, {
      zone: selectedEvent.start.timeZone,
    }).setZone(timeZone);
    const eventEnd = parseDateTime(selectedEvent.end.dateTime, {
      zone: selectedEvent.end.timeZone,
    }).setZone(timeZone);

    const unix = parseDateTime(eventStart.toISODate()).toMillis();
    const minutes = eventStart.hour * 60 + eventStart.minute;
    const duration = eventEnd.diff(eventStart, 'minutes').minutes;

    const dragStartUnix = unix + minutes * MILLISECONDS_IN_MINUTE;
    const dragEndUnix = dragStartUnix + duration * MILLISECONDS_IN_MINUTE;
    const isValidStart = dragStartUnix >= startUnix && dragStartUnix < endUnix;
    const isValidEnd = dragEndUnix > startUnix && dragEndUnix < endUnix;
    if (!isValidStart && !isValidEnd) {
      return empty;
    }

    const startDate = parseDateTime(dragStartUnix).startOf('day');
    const endDate = parseDateTime(dragEndUnix).startOf('day');
    const diffDays = endDate.diff(startDate, 'day').days;
    if (diffDays === 0) {
      return { dates: [unix], unix, minutes, duration };
    }

    const dates = [];
    for (let i = 0; i <= diffDays; i++) {
      dates.push(parseDateTime(unix).plus({ days: i }).toMillis());
    }
    return { dates, unix, minutes, duration };
  }, [selectedEvent, timeZone, startUnix, endUnix]);

  return (
    <>
      {selection.dates.map((date, index) => {
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
          resources,
        };

        if (renderDraggableEvent) {
          return (
            <React.Fragment key={`${date}-${index}`}>
              {renderDraggableEvent(eventProps)}
            </React.Fragment>
          );
        }

        return <DraggableEvent key={`${date}-${index}`} {...eventProps} />;
      })}
    </>
  );
};

export default DraggableEventWrapper;
