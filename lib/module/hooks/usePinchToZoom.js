import { useCallback, useEffect, useRef } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { scrollTo, useAnimatedReaction, useSharedValue, withTiming } from 'react-native-reanimated';
import { useCalendar } from '../context/CalendarProvider';
import { clampValues } from '../utils/utils';
import { Platform } from 'react-native';
const OVERSCROLL_HEIGHT = 8;
const SETTLE_DURATION_MS = 200;
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
    isPinching
  } = useCalendar();
  const pinchGestureRef = useRef(undefined);
  // Scale accumulated by the web wheel zoom below.
  const lastScale = useSharedValue(1);
  const startHeight = useSharedValue(0);
  // Grid position under the fingers, in row heights from the first hour line.
  const anchorRow = useSharedValue(0);
  const hasAnchor = useSharedValue(false);
  const lastFocalY = useSharedValue(0);
  const isSettling = useSharedValue(false);
  const scrollToAnchor = (height, focalY) => {
    'worklet';

    const maxOffset = Math.max(0, timelineHeight.value - scrollVisibleHeightAnim.value);
    const offset = anchorRow.value * height + spaceFromTop - focalY;
    scrollTo(verticalListRef, 0, clampValues(offset, 0, maxOffset), false);
  };

  // Keeps the anchor under the last focal point while the height eases back into bounds.
  useAnimatedReaction(() => timeIntervalHeight.value, height => {
    if (isSettling.value) {
      scrollToAnchor(height, lastFocalY.value);
    }
  });

  // Connecteam: the grid row under the fingers stays under them for the whole pinch, instead of
  // drifting with the accumulated scale, and `isPinching` tells event cards when the height has
  // settled (see Events' useSettledMinuteHeight).
  const pinchGesture = Gesture.Pinch().onStart(() => {
    isSettling.value = false;
    startHeight.value = timeIntervalHeight.value;
    hasAnchor.value = false;
    isPinching.value = true;
  }).onUpdate(({
    focalY,
    scale
  }) => {
    if (!hasAnchor.value) {
      anchorRow.value = (offsetY.value + focalY - spaceFromTop) / startHeight.value;
      hasAnchor.value = true;
    }
    lastFocalY.value = focalY;
    const newHeight = clampValues(startHeight.value * scale, minTimeIntervalHeight - OVERSCROLL_HEIGHT, maxTimeIntervalHeight + OVERSCROLL_HEIGHT);
    timeIntervalHeight.value = newHeight;
    scrollToAnchor(newHeight, focalY);
  }).onEnd(() => {
    const finalHeight = clampValues(timeIntervalHeight.value, minTimeIntervalHeight, maxTimeIntervalHeight);
    if (finalHeight === timeIntervalHeight.value) {
      isPinching.value = false;
      return;
    }
    isSettling.value = true;
    timeIntervalHeight.value = withTiming(finalHeight, {
      duration: SETTLE_DURATION_MS
    }, finished => {
      if (finished) {
        isSettling.value = false;
        isPinching.value = false;
      }
    });
  }).onFinalize(() => {
    if (!isSettling.value) {
      isPinching.value = false;
    }
  }).enabled(allowPinchToZoom).withRef(pinchGestureRef);
  const containerRef = useRef(null);
  const onWheel = useCallback(event => {
    if (event.ctrlKey) {
      var _containerRef$current;
      event.preventDefault();

      // More stable scale calculation
      const scaleDelta = -event.deltaY * 0.01;
      const newScale = Math.max(0.1, lastScale.value + scaleDelta);

      // Get container bounds for proper focal point calculation
      const containerBounds = (_containerRef$current = containerRef.current) === null || _containerRef$current === void 0 ? void 0 : _containerRef$current.getBoundingClientRect();
      const containerTop = (containerBounds === null || containerBounds === void 0 ? void 0 : containerBounds.top) || 0;
      const focalY = event.clientY - containerTop;

      // Calculate height change based on scale difference
      const scaleFactor = newScale / lastScale.value;
      const newHeight = timeIntervalHeight.value * scaleFactor;

      // Clamp height within allowed bounds
      const clampedHeight = clampValues(newHeight, minTimeIntervalHeight, maxTimeIntervalHeight);

      // Only update if within bounds
      if (clampedHeight !== timeIntervalHeight.value) {
        const heightDiff = clampedHeight - timeIntervalHeight.value;

        // Calculate scaling origin point relative to current scroll position
        const scaleOrigin = (focalY + offsetY.value) / timeIntervalHeight.value;

        // Adjust scroll position to maintain focal point
        const newOffsetY = offsetY.value + heightDiff * scaleOrigin;
        timeIntervalHeight.value = clampedHeight;
        offsetY.value = newOffsetY;
        scrollTo(verticalListRef, 0, newOffsetY, false);
      }
      lastScale.value = newScale;
    }
  }, [lastScale, offsetY, timeIntervalHeight, verticalListRef, minTimeIntervalHeight, maxTimeIntervalHeight]);
  useEffect(() => {
    var _verticalListRef$curr, _verticalListRef$curr2;
    if (!verticalListRef || Platform.OS !== 'web') {
      return;
    }
    const scrollNode = (_verticalListRef$curr = verticalListRef.current) === null || _verticalListRef$curr === void 0 || (_verticalListRef$curr2 = _verticalListRef$curr.getScrollableNode) === null || _verticalListRef$curr2 === void 0 ? void 0 : _verticalListRef$curr2.call(_verticalListRef$curr);
    containerRef.current = scrollNode;
    scrollNode === null || scrollNode === void 0 || scrollNode.addEventListener('wheel', onWheel, {
      passive: false
    });
    return () => {
      scrollNode === null || scrollNode === void 0 || scrollNode.removeEventListener('wheel', onWheel);
    };
  }, [onWheel, verticalListRef]);
  return {
    pinchGesture,
    pinchGestureRef
  };
};
export default usePinchToZoom;
//# sourceMappingURL=usePinchToZoom.js.map