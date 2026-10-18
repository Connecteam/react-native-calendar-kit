"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.CalendarList = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _reactNativeGestureHandler = require("react-native-gesture-handler");
var _reactNativeReanimated = _interopRequireWildcard(require("react-native-reanimated"));
var _HorizontalVirtualizedList = require("./HorizontalVirtualizedList");
var _useLatestCallback = _interopRequireDefault(require("../../hooks/useLatestCallback"));
function _interopRequireDefault(e) { return e && e.__esModule ? e : { default: e }; }
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const AnimatedScrollView = _reactNativeReanimated.default.createAnimatedComponent(_reactNativeGestureHandler.ScrollView);
const DEFAULT_DRAW_DISTANCE = 600; // Larger buffer for horizontal scrolling

const CalendarList = exports.CalendarList = /*#__PURE__*/_react.default.forwardRef(({
  count,
  animatedRef,
  renderItem,
  keyExtractor = item => item.toString(),
  itemSize,
  drawDistance = DEFAULT_DRAW_DISTANCE,
  onScroll,
  onLayout,
  style,
  contentContainerStyle,
  initialScrollIndex,
  pagingEnabled = false,
  snapToInterval,
  initialOffset,
  snapToOffsets,
  onVisibleColumnChanged,
  columnsPerPage,
  extraScrollData,
  scrollEventThrottle = 16,
  scrollEnabled = true,
  onLoad,
  onTouchStart,
  onScrollBeginDrag,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  onWheel
}, ref) => {
  const scrollViewRef = (0, _react.useRef)(null);
  const [scrollOffset, setScrollOffset] = (0, _react.useState)(initialOffset ?? 0);
  const isLoaded = (0, _react.useRef)(false);
  const totalSize = count * itemSize;
  const visibleRange = (0, _react.useMemo)(() => {
    if (count === 0) {
      return {
        start: 0,
        end: 0
      };
    }
    const buffer = drawDistance;
    const scrollStart = Math.max(0, scrollOffset - buffer);
    const scrollEnd = scrollOffset + itemSize + buffer;
    const startIndex = Math.max(0, Math.floor(scrollStart / itemSize));
    const endIndex = Math.min(count - 1, Math.floor(scrollEnd / itemSize));
    return {
      start: startIndex,
      end: endIndex
    };
  }, [count, scrollOffset, drawDistance, itemSize]);
  const getItemPosition = (0, _react.useCallback)(index => {
    return index * itemSize;
  }, [itemSize]);
  const animScrollRef = (0, _reactNativeReanimated.useAnimatedRef)();
  const internalOffset = (0, _reactNativeReanimated.useSharedValue)(initialOffset ?? 0);
  const scrollOffsetAnim = (0, _reactNativeReanimated.useScrollViewOffset)(animScrollRef, internalOffset);
  const extraScrollDataRef = (0, _react.useRef)(extraScrollData);
  extraScrollDataRef.current = extraScrollData;
  const onVisibleColumnChangedCb = (0, _useLatestCallback.default)(onVisibleColumnChanged);
  const handleColumnChanged = (0, _react.useCallback)(offset => {
    const columnWidth = itemSize / columnsPerPage;
    const startIndex = Math.floor(Math.round(offset / columnWidth) / columnsPerPage);
    const startOffset = startIndex * itemSize;
    const column = Math.round((offset - startOffset) / columnWidth);
    onVisibleColumnChangedCb === null || onVisibleColumnChangedCb === void 0 || onVisibleColumnChangedCb({
      index: startIndex,
      column,
      columns: columnsPerPage,
      extraScrollData: extraScrollDataRef.current,
      offset
    });
  }, [itemSize, columnsPerPage, onVisibleColumnChangedCb]);
  (0, _reactNativeReanimated.useAnimatedReaction)(() => scrollOffsetAnim.value, offset => {
    (0, _reactNativeReanimated.runOnJS)(handleColumnChanged)(offset);
    (0, _reactNativeReanimated.runOnJS)(setScrollOffset)(offset);
  });
  (0, _react.useImperativeHandle)(ref, () => ({
    scrollToIndex: (index, animated = true) => {
      if (index >= 0 && index < count) {
        var _scrollViewRef$curren;
        const position = getItemPosition(index);
        (_scrollViewRef$curren = scrollViewRef.current) === null || _scrollViewRef$curren === void 0 || _scrollViewRef$curren.scrollTo({
          x: position,
          animated
        });
      }
    },
    scrollToOffset: (offset, animated = true) => {
      var _scrollViewRef$curren2;
      (_scrollViewRef$curren2 = scrollViewRef.current) === null || _scrollViewRef$curren2 === void 0 || _scrollViewRef$curren2.scrollTo({
        x: offset,
        animated
      });
    },
    getMaxOffset: visibleColumns => {
      if (!visibleColumns || !columnsPerPage) {
        return totalSize - itemSize;
      }
      const columnWidth = itemSize / columnsPerPage;
      return totalSize - columnWidth * visibleColumns;
    },
    isScrollable: (offset, visibleColumns) => {
      let maxOffset;
      if (!visibleColumns || !columnsPerPage) {
        maxOffset = totalSize - itemSize;
      } else {
        const columnWidth = itemSize / columnsPerPage;
        maxOffset = totalSize - columnWidth * visibleColumns;
      }
      return offset >= 0 && offset <= maxOffset && offset !== scrollOffset;
    }
  }), [columnsPerPage, count, getItemPosition, itemSize, scrollOffset, totalSize]);
  (0, _react.useLayoutEffect)(() => {
    if (count > 0) {
      let offset = initialOffset;
      if (typeof initialScrollIndex === 'number') {
        const targetIndex = Math.min(initialScrollIndex, count - 1);
        offset = getItemPosition(targetIndex);
      }
      if (offset !== undefined) {
        setTimeout(() => {
          var _scrollViewRef$curren3;
          (_scrollViewRef$curren3 = scrollViewRef.current) === null || _scrollViewRef$curren3 === void 0 || _scrollViewRef$curren3.scrollTo({
            x: offset,
            animated: false
          });
        }, 0);
      }
    }
  }, [initialScrollIndex, count, getItemPosition, initialOffset]);
  (0, _react.useEffect)(() => {
    setTimeout(() => {
      if (!isLoaded.current) {
        isLoaded.current = true;
        onLoad === null || onLoad === void 0 || onLoad();
      }
    }, 0);
  }, [onLoad]);
  const content = /*#__PURE__*/_react.default.createElement(_HorizontalVirtualizedList.HorizontalVirtualizedList, {
    count: count,
    renderItem: renderItem,
    keyExtractor: keyExtractor,
    itemSize: itemSize,
    visibleRange: visibleRange,
    totalSize: totalSize,
    getItemPosition: getItemPosition
  });
  const list = /*#__PURE__*/_react.default.createElement(AnimatedScrollView, {
    ref: node => {
      scrollViewRef.current = node;
      animScrollRef === null || animScrollRef === void 0 || animScrollRef(node);
      animatedRef === null || animatedRef === void 0 || animatedRef(node);
    },
    horizontal: true,
    style: isRTLMirrored ? [style, styles.ltr] : style,
    contentContainerStyle: [contentContainerStyle, {
      width: totalSize
    }],
    onScroll: onScroll,
    onScrollBeginDrag: onScrollBeginDrag,
    onScrollEndDrag: onScrollEndDrag,
    onMomentumScrollBegin: onMomentumScrollBegin,
    onMomentumScrollEnd: onMomentumScrollEnd,
    onLayout: onLayout,
    contentOffset: {
      x: initialOffset ?? 0,
      y: 0
    },
    scrollEventThrottle: scrollEventThrottle,
    scrollEnabled: scrollEnabled,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    pagingEnabled: pagingEnabled,
    disableIntervalMomentum: !!snapToOffsets || !!snapToInterval,
    snapToInterval: snapToInterval,
    onTouchStart: onTouchStart,
    snapToOffsets: snapToOffsets,
    onWheel
  }, isRTLMirrored ? /*#__PURE__*/_react.default.createElement(_reactNative.View, {
    style: [{
      width: totalSize,
      height: '100%'
    }, styles.mirrored, styles.rtl]
  }, content) : content);
  if (!isRTLMirrored) {
    return list;
  }
  return /*#__PURE__*/_react.default.createElement(_reactNative.View
  // Android only: draw the mirrored list into its own GPU layer, so the flip is applied to
  // the finished layer rather than to every text draw inside it. Drawn through the two
  // flips directly, the calendar's text kept missing Skia's text-blob cache on older
  // Android (seen on Android 13), whose cache lookup is linear: after a few pulls to
  // refresh, RenderThread spent seconds per frame in GrTextBlobRedrawCoordinator and the
  // whole app stopped taking touches (ANR).
  , {
    renderToHardwareTextureAndroid: true,
    style: styles.mirrored
  }, list);
});

/**
 * Connecteam: calendar-kit's own `isRTL` is hardcoded false, so RTL is done by mirroring. The
 * scroll view and its content are each flipped horizontally: the content reads in its normal
 * orientation, while the list scrolls and lays out its pages right to left. Applies to both the
 * day bar and the grid, which are both CalendarLists.
 *
 * The scroll view itself is laid out LTR, and only its content RTL. Android's native horizontal
 * scroll view handles RTL on its own by snapping to the far end once its content is laid out,
 * which threw away the initial offset and showed an empty stretch of the list. iOS has no such
 * behavior, so this changes nothing there.
 */
const isRTLMirrored = _reactNative.I18nManager.isRTL;
const styles = _reactNative.StyleSheet.create({
  mirrored: {
    transform: [{
      scaleX: -1
    }]
  },
  ltr: {
    direction: 'ltr'
  },
  rtl: {
    direction: 'rtl'
  }
});
CalendarList.displayName = 'CalendarList';
//# sourceMappingURL=index.js.map