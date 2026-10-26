"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _react = require("react");
var _reactNativeGestureHandler = require("react-native-gesture-handler");
var _reactNativeReanimated = require("react-native-reanimated");
var _CalendarProvider = require("../context/CalendarProvider");
var _rtlOffset = require("../utils/rtlOffset");
var _utils = require("../utils/utils");
var _reactNative = require("react-native");
const OVERSCROLL_HEIGHT = 8;
const SETTLE_DURATION_MS = 200;
const IS_ANDROID = _reactNative.Platform.OS === 'android';
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
    maxOffsetX
  } = (0, _CalendarProvider.useCalendar)();
  const pinchGestureRef = (0, _react.useRef)(undefined);
  // Scale accumulated by the web wheel zoom below.
  const lastScale = (0, _reactNativeReanimated.useSharedValue)(1);
  const startHeight = (0, _reactNativeReanimated.useSharedValue)(0);
  // Grid position under the fingers, in row heights from the first hour line.
  const anchorRow = (0, _reactNativeReanimated.useSharedValue)(0);
  const hasAnchor = (0, _reactNativeReanimated.useSharedValue)(false);
  const lastFocalY = (0, _reactNativeReanimated.useSharedValue)(0);
  const isSettling = (0, _reactNativeReanimated.useSharedValue)(false);
  // Whether the current touch sequence became a pinch. Unlike `isPinching`, which stays set while
  // the height settles, this is cleared as soon as the gesture ends.
  const isPinchActive = (0, _reactNativeReanimated.useSharedValue)(false);
  // Horizontal position when the second finger landed, which the grid is held at during a pinch.
  const pinchOffsetX = (0, _reactNativeReanimated.useSharedValue)(0);

  // Android: the native scroll view follows the second finger, so the grid drifts sideways by a day
  // or two before the pinch takes over, and keeps drifting until its scrolling is turned off, which
  // leaves it between days with a stale date label. Putting it back where it was undoes that.
  const restoreHorizontalOffset = () => {
    'worklet';

    (0, _reactNativeReanimated.scrollTo)(gridListRef, (0, _rtlOffset.toNativeOffsetX)(pinchOffsetX.value, maxOffsetX.value), 0, false);
  };

  /**
   * Android: both scroll views run alongside the pinch (see CalendarBody), so neither can cancel
   * it, and they turn their scrolling off while this is set, so they don't scroll under two fingers
   * and fight `scrollToAnchor`. One-finger scrolling is never held back: blocking the scroll views
   * with `blocksExternalGesture` instead left the first drag after a zoom stuck. Driven through
   * React state rather than `setNativeProps`, which didn't reliably give the horizontal list its
   * scrolling back.
   */
  const [isPinchGestureActive, setIsPinchGestureActive] = (0, _react.useState)(false);
  const applyAnchor = (height, focalY) => {
    'worklet';

    const maxOffset = Math.max(0, timelineHeight.value - scrollVisibleHeightAnim.value);
    const offset = anchorRow.value * height + spaceFromTop - focalY;
    (0, _reactNativeReanimated.scrollTo)(verticalListRef, 0, (0, _utils.clampValues)(offset, 0, maxOffset), false);
  };
  const scrollToAnchor = (height, focalY) => {
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
  (0, _reactNativeReanimated.useAnimatedReaction)(() => timeIntervalHeight.value, height => {
    if (isSettling.value) {
      scrollToAnchor(height, lastFocalY.value);
    }
  });

  // Connecteam: the grid row under the fingers stays under them for the whole pinch, instead of
  // drifting with the accumulated scale, and `isPinching` tells event cards when the height has
  // settled (see Events' useSettledMinuteHeight).
  const pinchGesture = _reactNativeGestureHandler.Gesture.Pinch().onBegin(() => {
    pinchOffsetX.value = offsetX.value;
  }).onTouchesDown(({
    numberOfTouches
  }) => {
    if (numberOfTouches === 2 && !isPinchActive.value) {
      pinchOffsetX.value = offsetX.value;
    }
  }).onStart(() => {
    isPinchActive.value = true;
    if (IS_ANDROID) {
      restoreHorizontalOffset();
      (0, _reactNativeReanimated.runOnJS)(setIsPinchGestureActive)(true);
    }
    isSettling.value = false;
    startHeight.value = timeIntervalHeight.value;
    hasAnchor.value = false;
    isPinching.value = true;
  }).onUpdate(({
    focalY,
    scale
  }) => {
    if (IS_ANDROID && offsetX.value !== pinchOffsetX.value) {
      restoreHorizontalOffset();
    }
    if (!hasAnchor.value) {
      anchorRow.value = (offsetY.value + focalY - spaceFromTop) / startHeight.value;
      hasAnchor.value = true;
    }
    lastFocalY.value = focalY;
    const newHeight = (0, _utils.clampValues)(startHeight.value * scale, minTimeIntervalHeight - OVERSCROLL_HEIGHT, maxTimeIntervalHeight + OVERSCROLL_HEIGHT);
    timeIntervalHeight.value = newHeight;
    scrollToAnchor(newHeight, focalY);
  }).onEnd(() => {
    const finalHeight = (0, _utils.clampValues)(timeIntervalHeight.value, minTimeIntervalHeight, maxTimeIntervalHeight);
    if (finalHeight === timeIntervalHeight.value) {
      isPinching.value = false;
      return;
    }
    isSettling.value = true;
    timeIntervalHeight.value = (0, _reactNativeReanimated.withTiming)(finalHeight, {
      duration: SETTLE_DURATION_MS
    }, finished => {
      if (finished) {
        isSettling.value = false;
        isPinching.value = false;
      }
    });
  }).onFinalize(() => {
    if (IS_ANDROID && isPinchActive.value) {
      restoreHorizontalOffset();
      // Again once scrolling is back on, in case the list had settled onto a snap point.
      requestAnimationFrame(restoreHorizontalOffset);
      (0, _reactNativeReanimated.runOnJS)(setIsPinchGestureActive)(false);
    }
    isPinchActive.value = false;
    if (!isSettling.value) {
      isPinching.value = false;
    }
  }).enabled(allowPinchToZoom).withRef(pinchGestureRef);
  const containerRef = (0, _react.useRef)(null);
  const onWheel = (0, _react.useCallback)(event => {
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
      const clampedHeight = (0, _utils.clampValues)(newHeight, minTimeIntervalHeight, maxTimeIntervalHeight);

      // Only update if within bounds
      if (clampedHeight !== timeIntervalHeight.value) {
        const heightDiff = clampedHeight - timeIntervalHeight.value;

        // Calculate scaling origin point relative to current scroll position
        const scaleOrigin = (focalY + offsetY.value) / timeIntervalHeight.value;

        // Adjust scroll position to maintain focal point
        const newOffsetY = offsetY.value + heightDiff * scaleOrigin;
        timeIntervalHeight.value = clampedHeight;
        offsetY.value = newOffsetY;
        (0, _reactNativeReanimated.scrollTo)(verticalListRef, 0, newOffsetY, false);
      }
      lastScale.value = newScale;
    }
  }, [lastScale, offsetY, timeIntervalHeight, verticalListRef, minTimeIntervalHeight, maxTimeIntervalHeight]);
  (0, _react.useEffect)(() => {
    var _verticalListRef$curr, _verticalListRef$curr2;
    if (!verticalListRef || _reactNative.Platform.OS !== 'web') {
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
    pinchGestureRef,
    isPinchGestureActive
  };
};
var _default = exports.default = usePinchToZoom;
//# sourceMappingURL=usePinchToZoom.js.map