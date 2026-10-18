import { I18nManager } from 'react-native';
import { Gesture } from 'react-native-gesture-handler';
import { useSharedValue, withTiming } from 'react-native-reanimated';
import { useCalendar } from '../context/CalendarProvider';
import { useDragEvent } from '../context/DragEventProvider';
import { failOnScrollIntent } from '../utils/scrollIntent';
import { createTouchTrackerGesture } from '../utils/touchTrackerGesture';
import { clampValues, findNearestNumber, roundMinutes } from '../utils/utils';

const useDragEventGesture = () => {
  const {
    minuteHeight,
    columnWidth,
    hourWidth,
    visibleDateUnixAnim,
    calendarData,
    columns,
    numberOfDays,
    enableResourceScroll,
  } = useCalendar();
  const {
    isDraggingAnim,
    dragStartMinutes,
    dragStartUnix,
    roundedDragStartMinutes,
    dragStep,
    dragPosition,
    roundedDragStartUnix,
    roundedDragDuration,
    dragDuration,
    dragSelectedType,
    extraMinutes,
    initialDragState,
    isDraggingCreateAnim,
    dragX,
  } = useDragEvent();
  const initialX = useSharedValue(0);
  const initialY = useSharedValue(0);

  const findNearestIndex = (visibleUnix: number): number | undefined => {
    'worklet';
    let visibleIndex = calendarData.visibleDatesArray.indexOf(visibleUnix);
    if (visibleIndex === -1) {
      const nearestVisibleUnix = findNearestNumber(
        calendarData.visibleDatesArray,
        visibleUnix
      );
      const nearestVisibleIndex =
        calendarData.visibleDates[nearestVisibleUnix]?.index;
      if (nearestVisibleIndex === undefined) {
        return undefined;
      }
      visibleIndex = nearestVisibleIndex;
    }
    return visibleIndex;
  };

  const updateDragDurationForBottom = (
    translationY: number,
    initialStart: number,
    initialDuration: number
  ) => {
    'worklet';
    const diffMinutes = Math.floor(translationY / minuteHeight.value);
    let nextDuration = initialDuration + extraMinutes.value + diffMinutes;
    const roundedEndTime = roundMinutes(initialStart + nextDuration, dragStep);
    let nextRoundedDuration = roundedEndTime - initialStart;

    if (nextDuration < dragStep) {
      nextDuration = dragStep;
      nextRoundedDuration = dragStep;
    }

    dragDuration.value = nextDuration;
    roundedDragDuration.value = nextRoundedDuration;
  };

  /** Updates drag start and duration when dragging the top handle. */
  const updateDragDurationForTop = (
    translationY: number,
    initialStart: number,
    initialDuration: number
  ) => {
    'worklet';
    const minStart = initialStart + (initialDuration - dragStep);
    const initialY = (initialStart + extraMinutes.value) * minuteHeight.value;
    const newY = initialY + translationY;
    let newDragStart = Math.floor(newY / minuteHeight.value);
    let roundedDragStart = roundMinutes(newDragStart, dragStep, 'floor');

    const diffMinutes = Math.floor(translationY / minuteHeight.value);
    const diffRoundedMinutes = roundedDragStart - newDragStart;
    let nextDuration = initialDuration - extraMinutes.value - diffMinutes;
    let nextRoundedDuration = nextDuration - diffRoundedMinutes;

    if (nextDuration <= dragStep) {
      newDragStart = minStart;
      roundedDragStart = minStart;
      nextDuration = dragStep;
      nextRoundedDuration = dragStep;
    }

    dragStartMinutes.value = newDragStart;
    roundedDragStartMinutes.value = roundedDragStart;
    dragDuration.value = nextDuration;
    roundedDragDuration.value = nextRoundedDuration;
  };

  const updateDragStartPosition = (
    translationY: number,
    initialStart: number
  ) => {
    'worklet';
    const initialY = (initialStart + extraMinutes.value) * minuteHeight.value;
    const newY = initialY + translationY;
    const newDragStart = Math.floor(newY / minuteHeight.value);
    const roundedDragStart = roundMinutes(newDragStart, dragStep, 'floor');
    dragStartMinutes.value = newDragStart;
    roundedDragStartMinutes.value = roundedDragStart;
  };

  const updateDragPositionHorizontal = (
    translationX: number,
    initialDayUnix: number,
    initialXPosition: number
  ) => {
    'worklet';
    const initialDayUnixIndex = findNearestIndex(initialDayUnix);
    const visibleIndex = findNearestIndex(visibleDateUnixAnim.value);

    if (visibleIndex === undefined || initialDayUnixIndex === undefined) {
      return;
    }

    const dayIndexOffset = initialDayUnixIndex - visibleIndex;
    const extraX = initialXPosition - dayIndexOffset * columnWidth - hourWidth;
    const initialOffset = dayIndexOffset * columnWidth;
    const newX = initialOffset + translationX + extraX;
    const newDragDayIndex = Math.floor(newX / columnWidth);
    // RTL needs two corrections versus the LTR math above:
    //   1. The hour/time axis sits on the RIGHT in RTL, so the day grid is left-aligned at
    //      x≈0. `newX` has `hourWidth` subtracted (a left-axis assumption), so add it back —
    //      `newX + hourWidth` is the raw finger x, and the column from the left is
    //      `floor(fingerX / colW)`.
    //   2. The grid content is mirrored (scaleX:-1 in CalendarList), so physical column 0
    //      from the left shows the *latest* visible day. Reverse the column into a date
    //      offset across the visible window (`numberOfDays`, not `columns` == `daysToShow`).
    let dayOffset: number;
    if (I18nManager.isRTL) {
      const fingerX = newX + hourWidth;
      const rtlColumnFromLeft = clampValues(
        Math.floor(fingerX / columnWidth),
        0,
        numberOfDays - 1
      );
      dayOffset = numberOfDays - 1 - rtlColumnFromLeft;
    } else {
      dayOffset = clampValues(newDragDayIndex, 0, columns - 1);
    }
    const nextDayIndex = visibleIndex + dayOffset;
    const targetDayUnix = calendarData.visibleDatesArray[nextDayIndex];

    if (!targetDayUnix) {
      return;
    }

    dragStartUnix.value = targetDayUnix;
    roundedDragStartUnix.value = targetDayUnix;
  };

  const gesture = Gesture.Pan()
    .manualActivation(true)
    .onBegin(({ x, y }) => {
      initialX.value = x;
      initialY.value = y;
    })
    .onStart(() => {
      initialDragState.value = {
        dragStart: dragStartMinutes.value,
        dragStartUnix: dragStartUnix.value,
        dragDuration: dragDuration.value,
      };
    })
    .onUpdate(({ translationX, translationY, x, y }) => {
      dragPosition.value = { x, y, translationX, translationY };
      dragX.value = x;
      const {
        dragStart: initialStart,
        dragStartUnix: initialDayUnix,
        dragDuration: initialDuration,
      } = initialDragState.value;

      if (dragSelectedType.value === 'bottom') {
        updateDragDurationForBottom(
          translationY,
          initialStart,
          initialDuration
        );
      } else if (dragSelectedType.value === 'top') {
        updateDragDurationForTop(translationY, initialStart, initialDuration);
      } else {
        updateDragStartPosition(translationY, initialStart);
        if (!enableResourceScroll) {
          updateDragPositionHorizontal(
            translationX,
            initialDayUnix,
            initialX.value
          );
        }
      }
    })
    .onEnd(() => {
      dragStartMinutes.value = withTiming(roundedDragStartMinutes.value, {
        duration: 150,
      });
      dragDuration.value = withTiming(roundedDragDuration.value, {
        duration: 150,
      });
    })
    .onTouchesMove((event, state) => {
      if (isDraggingAnim.value && !isDraggingCreateAnim.value) {
        state.activate();
        return;
      }
      // Nothing is being dragged, so this touch belongs to whoever wants to scroll.
      failOnScrollIntent(event, state, initialX.value, initialY.value);
    })
    .onTouchesUp(() => {
      if (isDraggingAnim.value && !isDraggingCreateAnim.value) {
        isDraggingAnim.value = false;
        dragPosition.value = {
          x: -1,
          y: -1,
          translationX: -1,
          translationY: -1,
        };
      }
    });

  return gesture;
};

/**
 * Notices the touch ending even when the drag gesture above is no longer listening.
 *
 * That gesture fails itself while nothing is being dragged, so the calendar can scroll. A drag
 * started by a long press right after such a failure has no live handler left to see the release,
 * and `isDraggingAnim` is never cleared: the floating drag box stays on top of the calendar until
 * the screen is remounted.
 *
 * A touch-tracker gesture never activates and never fails on its own, so it keeps receiving touch
 * events for the whole gesture and can close the drag out.
 *
 * Cancels matter as much as releases here. The system takes the touch away without ever lifting it
 * when the app goes to the background with a finger down, when a call or the notification shade
 * arrives, or when a system edge gesture wins — and every one of those used to leave
 * `isDraggingAnim` set, which wedges the calendar: the drag pan then activates on every touch, so
 * the grid no longer scrolls and the shift no longer moves.
 */
export const useDragReleaseTracker = () => {
  const {
    isDraggingAnim,
    isDraggingCreateAnim,
    dragPosition,
    isDragInterrupted,
  } = useDragEvent();

  const endDrag = (interrupted: boolean) => {
    'worklet';
    if (isDraggingAnim.value && !isDraggingCreateAnim.value) {
      // Set before the flag below, which is what starts the teardown that reads it.
      isDragInterrupted.value = interrupted;
      isDraggingAnim.value = false;
      dragPosition.value = {
        x: -1,
        y: -1,
        translationX: -1,
        translationY: -1,
      };
    }
  };

  return createTouchTrackerGesture()
    .onTouchesUp(() => {
      'worklet';
      endDrag(false);
    })
    .onTouchesCancelled(() => {
      'worklet';
      endDrag(true);
    });
};

export default useDragEventGesture;
