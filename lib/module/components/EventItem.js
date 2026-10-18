import isEqual from 'lodash.isequal';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { MILLISECONDS_IN_DAY } from '../constants';
import { useBody } from '../context/BodyContext';
import { useTheme } from '../context/ThemeProvider';
import Text from './Text';

// Native Date instead of luxon for the per-event day walk: luxon's `plus`/`startOf` dominated the JS
// profile when mounting a page of events (unit normalisation is very slow on Hermes). calendar-kit
// never changes luxon's default zone, so both operate in the device's local zone.
function plusOneLocalDay(unix) {
  const date = new Date(unix);
  date.setDate(date.getDate() + 1);
  return date.getTime();
}
function localDayStart(unix) {
  const date = new Date(unix);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}
const EventItem = ({
  event: eventInput,
  startUnix,
  renderEvent,
  onPressEvent,
  onLongPressEvent,
  isDragging,
  visibleDates,
  totalResources,
  minuteHeight: settledMinuteHeight
}) => {
  const theme = useTheme(useCallback(state => {
    return {
      eventContainerStyle: state.eventContainerStyle,
      eventTitleStyle: state.eventTitleStyle
    };
  }, []));
  const {
    minuteHeight,
    start,
    end,
    rightEdgeSpacing,
    overlapEventsSpacing,
    columnWidth,
    resourcePerPage,
    enableResourceScroll
  } = useBody();
  const {
    _internal,
    ...event
  } = eventInput;
  const timeRange = end - start;
  const {
    duration,
    startMinutes = 0,
    total,
    index,
    columnSpan,
    startUnix: eventStartUnix,
    widthPercentage,
    xOffsetPercentage,
    resourceIndex
  } = _internal;
  const data = useMemo(() => {
    const maxDuration = end - start;
    let newStart = startMinutes - start;
    let totalDuration = Math.min(duration, maxDuration);
    if (newStart < 0) {
      totalDuration += newStart;
      newStart = 0;
    }
    let diffDays = Math.floor((eventStartUnix - startUnix) / MILLISECONDS_IN_DAY);
    if (eventStartUnix < startUnix) {
      for (let dayUnix = eventStartUnix; dayUnix < startUnix; dayUnix = plusOneLocalDay(dayUnix)) {
        const dayStartUnix = localDayStart(dayUnix);
        if (!visibleDates[dayStartUnix]) {
          diffDays++;
        }
      }
    } else {
      for (let dayUnix = startUnix; dayUnix < eventStartUnix; dayUnix = plusOneLocalDay(dayUnix)) {
        const dayStartUnix = localDayStart(dayUnix);
        if (!visibleDates[dayStartUnix]) {
          diffDays--;
        }
      }
    }
    return {
      totalDuration,
      startMinutes: newStart,
      diffDays
    };
  }, [duration, end, eventStartUnix, start, startMinutes, startUnix, visibleDates]);
  const childColumns = enableResourceScroll ? resourcePerPage : totalResources && totalResources > 0 ? totalResources : 1;
  const widthPercent = useMemo(() => {
    if (total && columnSpan) {
      const availableWidth = columnWidth / childColumns - rightEdgeSpacing;
      const totalColumns = total - columnSpan;
      const overlapSpacing = totalColumns * overlapEventsSpacing / total;
      const eventWidth = availableWidth / total * columnSpan - overlapSpacing;
      const percent = eventWidth / availableWidth;
      return percent;
    }
    const basePercent = widthPercentage ? widthPercentage / 100 : 1;
    return basePercent;
  }, [widthPercentage, columnSpan, rightEdgeSpacing, overlapEventsSpacing, total, columnWidth, childColumns]);
  const availableWidth = columnWidth / childColumns - rightEdgeSpacing;
  const eventWidth = widthPercent * availableWidth;
  const eventPosX = useMemo(() => {
    const colWidth = columnWidth / childColumns;
    const startOffset = resourceIndex ? (enableResourceScroll ? resourceIndex % resourcePerPage : resourceIndex) * colWidth : 0;
    let left = data.diffDays * colWidth + startOffset;
    if (xOffsetPercentage) {
      left += availableWidth * (xOffsetPercentage / 100);
    } else if (columnSpan && index) {
      left += (eventWidth + overlapEventsSpacing) * (index / columnSpan);
    }
    return left;
  }, [availableWidth, childColumns, columnSpan, columnWidth, data.diffDays, enableResourceScroll, eventWidth, index, overlapEventsSpacing, resourceIndex, resourcePerPage, xOffsetPercentage]);
  const _onPressEvent = () => {
    if (onPressEvent) {
      onPressEvent(eventInput);
    }
  };
  const _onLongPressEvent = resEvent => {
    onLongPressEvent(eventInput, resEvent);
  };
  const opacity = isDragging ? 0.5 : 1;

  // Plain-number size so a card can lay out without reading animated values on mount; it follows
  // the pinch once it settles.
  const staticSize = useMemo(() => {
    const settledHeight = settledMinuteHeight ?? minuteHeight.value;
    return {
      width: eventWidth,
      height: data.totalDuration * settledHeight - 1
    };
  }, [settledMinuteHeight, minuteHeight, eventWidth, data.totalDuration]);

  // Real shared values for renderEvent consumers that read size in a worklet. Plain mutables kept in
  // sync with staticSize instead of derived values, so mounting a page registers no per-event
  // mappers; they follow a pinch once it settles rather than every frame.
  const widthAnim = useSharedValue(staticSize.width);
  const heightAnim = useSharedValue(staticSize.height);
  const syncedSize = useRef(staticSize);
  useEffect(() => {
    // Skips the mount (already initialised) so a page mount does not queue a UI write per event.
    if (syncedSize.current === staticSize) {
      return;
    }
    syncedSize.current = staticSize;
    widthAnim.value = staticSize.width;
    heightAnim.value = staticSize.height;
  }, [staticSize, widthAnim, heightAnim]);
  const size = useMemo(() => ({
    width: widthAnim,
    height: heightAnim
  }), [widthAnim, heightAnim]);
  return /*#__PURE__*/React.createElement(View, {
    style: [styles.container, {
      width: eventWidth,
      left: eventPosX + 1,
      height: `${(data.totalDuration - 1) / timeRange * 100}%`,
      top: `${(data.startMinutes + 1) / timeRange * 100}%`
    }]
  }, /*#__PURE__*/React.createElement(Pressable, {
    style: state => [StyleSheet.absoluteFill, {
      opacity: state.pressed ? 0.6 : 1
    }],
    disabled: !onPressEvent && !onLongPressEvent,
    onPress: onPressEvent ? _onPressEvent : undefined,
    onLongPress: onLongPressEvent ? _onLongPressEvent : undefined
  }, /*#__PURE__*/React.createElement(View, {
    style: [styles.contentContainer, !!xOffsetPercentage && styles.overlapEvent, {
      backgroundColor: event.color
    }, theme.eventContainerStyle, {
      opacity
    }]
  }, renderEvent ? renderEvent(eventInput, size, staticSize) : /*#__PURE__*/React.createElement(Text, {
    style: [styles.title, theme.eventTitleStyle, {
      color: event.titleColor
    }]
  }, event.title))));
};
export default /*#__PURE__*/React.memo(EventItem, (prev, next) => {
  return isEqual(prev.event, next.event) && isEqual(prev.visibleDates, next.visibleDates) && prev.startUnix === next.startUnix && prev.minuteHeight === next.minuteHeight && prev.renderEvent === next.renderEvent && prev.isDragging === next.isDragging && prev.onPressEvent === next.onPressEvent && prev.onLongPressEvent === next.onLongPressEvent;
});
const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    overflow: 'hidden'
  },
  title: {
    fontSize: 12,
    paddingHorizontal: 2
  },
  contentContainer: {
    borderRadius: 2,
    width: '100%',
    height: '100%',
    overflow: 'hidden'
  },
  overlapEvent: {
    borderWidth: 1,
    borderColor: '#FFF'
  }
});
//# sourceMappingURL=EventItem.js.map