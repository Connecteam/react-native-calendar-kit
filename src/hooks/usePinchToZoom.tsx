import { useCallback, useEffect, useRef, useState } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import type { GestureType } from 'react-native-gesture-handler';
import {
  runOnJS,
  scrollTo,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useCalendar } from '../context/CalendarProvider';
import { clampValues } from '../utils/utils';
import { Platform } from 'react-native';

const OVERSCROLL_HEIGHT = 8;
const SETTLE_DURATION_MS = 200;
const IS_ANDROID = Platform.OS === 'android';

const usePinchToZoom = () => {
  const {
    verticalListRef,
    maxTimeIntervalHeight,
    minTimeIntervalHeight,
    timeIntervalHeight,
    timelineHeight,
    scrollVisibleHeightAnim,
    spaceFromTop,
    offsetY,
    allowPinchToZoom,
    isPinching,
    gridListRef,
    offsetX,
  } = useCalendar();

  const pinchGestureRef = useRef<GestureType | undefined>(undefined);
  // Scale accumulated by the web wheel zoom below.
  const lastScale = useSharedValue(1);

  const startHeight = useSharedValue(0);
  // Grid position under the fingers, in row heights from the first hour line.
  const anchorRow = useSharedValue(0);
  const hasAnchor = useSharedValue(false);
  const lastFocalY = useSharedValue(0);
  const isSettling = useSharedValue(false);
  // Whether the current touch sequence became a pinch. Unlike `isPinching`, which stays set while
  // the height settles, this is cleared as soon as the gesture ends.
  const isPinchActive = useSharedValue(false);
  // Horizontal position when the second finger landed, which the grid is held at during a pinch.
  const pinchOffsetX = useSharedValue(0);

  // Android: the native scroll view follows the second finger, so the grid drifts sideways by a day
  // or two before the pinch takes over, and keeps drifting until its scrolling is turned off, which
  // leaves it between days with a stale date label. Putting it back where it was undoes that.
  const restoreHorizontalOffset = () => {
    'worklet';
    scrollTo(gridListRef, pinchOffsetX.value, 0, false);
  };

  /**
   * Android: both scroll views run alongside the pinch (see CalendarBody), so neither can cancel
   * it, and they turn their scrolling off while this is set, so they don't scroll under two fingers
   * and fight `scrollToAnchor`. One-finger scrolling is never held back: blocking the scroll views
   * with `blocksExternalGesture` instead left the first drag after a zoom stuck. Driven through
   * React state rather than `setNativeProps`, which didn't reliably give the horizontal list its
   * scrolling back.
   */
  const [isPinchGestureActive, setIsPinchGestureActive] = useState(false);

  const applyAnchor = (height: number, focalY: number) => {
    'worklet';
    const maxOffset = Math.max(
      0,
      timelineHeight.value - scrollVisibleHeightAnim.value
    );
    const offset = anchorRow.value * height + spaceFromTop - focalY;
    scrollTo(verticalListRef, 0, clampValues(offset, 0, maxOffset), false);
  };

  const scrollToAnchor = (height: number, focalY: number) => {
    'worklet';
    applyAnchor(height, focalY);
    if (IS_ANDROID) {
      // The new height reaches the native scroll view a frame later, which clamps an offset past
      // its old content height: apply the anchor again once the taller content is laid out.
      requestAnimationFrame(() => {
        applyAnchor(timeIntervalHeight.value, lastFocalY.value);
      });
    }
  };

  // Keeps the anchor under the last focal point while the height eases back into bounds.
  useAnimatedReaction(
    () => timeIntervalHeight.value,
    (height) => {
      if (isSettling.value) {
        scrollToAnchor(height, lastFocalY.value);
      }
    }
  );

  // Connecteam: the grid row under the fingers stays under them for the whole pinch, instead of
  // drifting with the accumulated scale, and `isPinching` tells event cards when the height has
  // settled (see Events' useSettledMinuteHeight).
  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchOffsetX.value = offsetX.value;
    })
    .onTouchesDown(({ numberOfTouches }) => {
      if (numberOfTouches === 2 && !isPinchActive.value) {
        pinchOffsetX.value = offsetX.value;
      }
    })
    .onStart(() => {
      isPinchActive.value = true;
      if (IS_ANDROID) {
        restoreHorizontalOffset();
        runOnJS(setIsPinchGestureActive)(true);
      }
      isSettling.value = false;
      startHeight.value = timeIntervalHeight.value;
      hasAnchor.value = false;
      isPinching.value = true;
    })
    .onUpdate(({ focalY, scale }) => {
      if (IS_ANDROID && offsetX.value !== pinchOffsetX.value) {
        restoreHorizontalOffset();
      }
      if (!hasAnchor.value) {
        anchorRow.value =
          (offsetY.value + focalY - spaceFromTop) / startHeight.value;
        hasAnchor.value = true;
      }
      lastFocalY.value = focalY;

      const newHeight = clampValues(
        startHeight.value * scale,
        minTimeIntervalHeight - OVERSCROLL_HEIGHT,
        maxTimeIntervalHeight + OVERSCROLL_HEIGHT
      );
      timeIntervalHeight.value = newHeight;
      scrollToAnchor(newHeight, focalY);
    })
    .onEnd(() => {
      const finalHeight = clampValues(
        timeIntervalHeight.value,
        minTimeIntervalHeight,
        maxTimeIntervalHeight
      );
      if (finalHeight === timeIntervalHeight.value) {
        isPinching.value = false;
        return;
      }
      isSettling.value = true;
      timeIntervalHeight.value = withTiming(
        finalHeight,
        { duration: SETTLE_DURATION_MS },
        (finished) => {
          if (finished) {
            isSettling.value = false;
            isPinching.value = false;
          }
        }
      );
    })
    .onFinalize(() => {
      if (IS_ANDROID && isPinchActive.value) {
        restoreHorizontalOffset();
        // Again once scrolling is back on, in case the list had settled onto a snap point.
        requestAnimationFrame(restoreHorizontalOffset);
        runOnJS(setIsPinchGestureActive)(false);
      }
      isPinchActive.value = false;
      if (!isSettling.value) {
        isPinching.value = false;
      }
    })
    .enabled(allowPinchToZoom)
    .withRef(pinchGestureRef);

  const containerRef = useRef<HTMLElement | null>(null);
  const onWheel = useCallback(
    (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();

        // More stable scale calculation
        const scaleDelta = -event.deltaY * 0.01;
        const newScale = Math.max(0.1, lastScale.value + scaleDelta);

        // Get container bounds for proper focal point calculation
        const containerBounds = containerRef.current?.getBoundingClientRect();
        const containerTop = containerBounds?.top || 0;
        const focalY = event.clientY - containerTop;

        // Calculate height change based on scale difference
        const scaleFactor = newScale / lastScale.value;
        const newHeight = timeIntervalHeight.value * scaleFactor;

        // Clamp height within allowed bounds
        const clampedHeight = clampValues(
          newHeight,
          minTimeIntervalHeight,
          maxTimeIntervalHeight
        );

        // Only update if within bounds
        if (clampedHeight !== timeIntervalHeight.value) {
          const heightDiff = clampedHeight - timeIntervalHeight.value;

          // Calculate scaling origin point relative to current scroll position
          const scaleOrigin =
            (focalY + offsetY.value) / timeIntervalHeight.value;

          // Adjust scroll position to maintain focal point
          const newOffsetY = offsetY.value + heightDiff * scaleOrigin;

          timeIntervalHeight.value = clampedHeight;
          offsetY.value = newOffsetY;

          scrollTo(verticalListRef, 0, newOffsetY, false);
        }

        lastScale.value = newScale;
      }
    },
    [
      lastScale,
      offsetY,
      timeIntervalHeight,
      verticalListRef,
      minTimeIntervalHeight,
      maxTimeIntervalHeight,
    ]
  );

  useEffect(() => {
    if (!verticalListRef || Platform.OS !== 'web') {
      return;
    }

    const scrollNode = verticalListRef.current?.getScrollableNode?.();
    containerRef.current = scrollNode;
    scrollNode?.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      scrollNode?.removeEventListener('wheel', onWheel);
    };
  }, [onWheel, verticalListRef]);

  return { pinchGesture, pinchGestureRef, isPinchGestureActive };
};

export default usePinchToZoom;
