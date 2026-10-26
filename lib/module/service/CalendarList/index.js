import React, { useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { I18nManager, StyleSheet, View } from 'react-native';
import { ScrollView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedReaction, useAnimatedRef, useScrollViewOffset, useSharedValue } from 'react-native-reanimated';
import { HorizontalVirtualizedList } from './HorizontalVirtualizedList';
import useLatestCallback from '../../hooks/useLatestCallback';
import { IS_REVERSED_RTL, toNativeOffsetX } from '../../utils/rtlOffset';
const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);
const DEFAULT_DRAW_DISTANCE = 600; // Larger buffer for horizontal scrolling

export const CalendarList = /*#__PURE__*/React.forwardRef(({
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
  simultaneousHandlers,
  onLoad,
  onTouchStart,
  onScrollBeginDrag,
  onMomentumScrollBegin,
  onMomentumScrollEnd,
  onScrollEndDrag,
  onWheel
}, ref) => {
  const scrollViewRef = useRef(null);
  const [scrollOffset, setScrollOffset] = useState(initialOffset ?? 0);
  const isLoaded = useRef(false);
  const totalSize = count * itemSize;
  // See utils/rtlOffset: the scroll view's offset for a list position on Android in RTL.
  const maxOffsetX = IS_REVERSED_RTL ? totalSize - itemSize : -1;
  const visibleRange = useMemo(() => {
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
  const getItemPosition = useCallback(index => {
    return index * itemSize;
  }, [itemSize]);
  const animScrollRef = useAnimatedRef();
  const internalOffset = useSharedValue(toNativeOffsetX(initialOffset ?? 0, maxOffsetX));
  const scrollOffsetAnim = useScrollViewOffset(animScrollRef, internalOffset);

  // Android re-sends all of a scroll view's props with every update, `contentOffset` included, so
  // it has to say where the list is whenever another prop (e.g. `scrollEnabled` while pinching)
  // changes. Left at the initial offset, it scrolled the list back to the first page shown.
  const lastInitialOffset = useRef(initialOffset);
  const contentOffset = useMemo(() => {
    const x = initialOffset !== lastInitialOffset.current ? toNativeOffsetX(initialOffset ?? 0, maxOffsetX) : internalOffset.value;
    lastInitialOffset.current = initialOffset;
    return {
      x,
      y: 0
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the other scroll view props change
  }, [initialOffset, scrollEnabled, pagingEnabled, snapToInterval, snapToOffsets, totalSize, maxOffsetX]);
  const nativeSnapToOffsets = useMemo(() => maxOffsetX < 0 || !snapToOffsets ? snapToOffsets : snapToOffsets.map(offset => maxOffsetX - offset).filter(offset => offset >= 0).reverse(), [snapToOffsets, maxOffsetX]);
  const extraScrollDataRef = useRef(extraScrollData);
  extraScrollDataRef.current = extraScrollData;
  const onVisibleColumnChangedCb = useLatestCallback(onVisibleColumnChanged);
  const handleColumnChanged = useCallback(offset => {
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
  useAnimatedReaction(() => scrollOffsetAnim.value, nativeOffset => {
    const offset = toNativeOffsetX(nativeOffset, maxOffsetX);
    runOnJS(handleColumnChanged)(offset);
    runOnJS(setScrollOffset)(offset);
  }, [maxOffsetX]);
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index, animated = true) => {
      if (index >= 0 && index < count) {
        var _scrollViewRef$curren;
        const position = getItemPosition(index);
        (_scrollViewRef$curren = scrollViewRef.current) === null || _scrollViewRef$curren === void 0 || _scrollViewRef$curren.scrollTo({
          x: toNativeOffsetX(position, maxOffsetX),
          animated
        });
      }
    },
    scrollToOffset: (offset, animated = true) => {
      var _scrollViewRef$curren2;
      (_scrollViewRef$curren2 = scrollViewRef.current) === null || _scrollViewRef$curren2 === void 0 || _scrollViewRef$curren2.scrollTo({
        x: toNativeOffsetX(offset, maxOffsetX),
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
  }), [columnsPerPage, count, getItemPosition, itemSize, maxOffsetX, scrollOffset, totalSize]);
  useLayoutEffect(() => {
    if (count > 0) {
      let offset = initialOffset;
      if (typeof initialScrollIndex === 'number') {
        const targetIndex = Math.min(initialScrollIndex, count - 1);
        offset = getItemPosition(targetIndex);
      }
      if (offset !== undefined) {
        const nativeOffset = toNativeOffsetX(offset, maxOffsetX);
        setTimeout(() => {
          var _scrollViewRef$curren3;
          (_scrollViewRef$curren3 = scrollViewRef.current) === null || _scrollViewRef$curren3 === void 0 || _scrollViewRef$curren3.scrollTo({
            x: nativeOffset,
            animated: false
          });
        }, 0);
      }
    }
  }, [initialScrollIndex, count, getItemPosition, initialOffset, maxOffsetX]);
  useEffect(() => {
    setTimeout(() => {
      if (!isLoaded.current) {
        isLoaded.current = true;
        onLoad === null || onLoad === void 0 || onLoad();
      }
    }, 0);
  }, [onLoad]);
  const content = /*#__PURE__*/React.createElement(HorizontalVirtualizedList, {
    count: count,
    renderItem: renderItem,
    keyExtractor: keyExtractor,
    itemSize: itemSize,
    visibleRange: visibleRange,
    totalSize: totalSize,
    getItemPosition: getItemPosition,
    reversed: IS_REVERSED_RTL
  });
  const list = /*#__PURE__*/React.createElement(AnimatedScrollView, {
    ref: node => {
      scrollViewRef.current = node;
      animScrollRef === null || animScrollRef === void 0 || animScrollRef(node);
      animatedRef === null || animatedRef === void 0 || animatedRef(node);
    },
    horizontal: true,
    style: IS_REVERSED_RTL ? [style, styles.ltr] : style,
    contentContainerStyle: [contentContainerStyle, {
      width: totalSize
    }],
    onScroll: onScroll,
    onScrollBeginDrag: onScrollBeginDrag,
    onScrollEndDrag: onScrollEndDrag,
    onMomentumScrollBegin: onMomentumScrollBegin,
    onMomentumScrollEnd: onMomentumScrollEnd,
    onLayout: onLayout,
    contentOffset: contentOffset,
    scrollEventThrottle: scrollEventThrottle,
    scrollEnabled: scrollEnabled,
    simultaneousHandlers: simultaneousHandlers,
    showsHorizontalScrollIndicator: false,
    showsVerticalScrollIndicator: false,
    pagingEnabled: pagingEnabled,
    disableIntervalMomentum: !!snapToOffsets || !!snapToInterval,
    snapToInterval: snapToInterval,
    onTouchStart: onTouchStart,
    snapToOffsets: nativeSnapToOffsets,
    onWheel
  }, isRTLMirrored ? /*#__PURE__*/React.createElement(View, {
    style: [{
      width: totalSize,
      height: '100%'
    }, styles.mirrored]
  }, content) : content);
  if (!isRTLMirrored) {
    return list;
  }
  return /*#__PURE__*/React.createElement(View, {
    style: styles.mirrored
  }, list);
});

/**
 * Connecteam: calendar-kit's own `isRTL` is hardcoded false, so RTL is done here. Applies to both
 * the day bar and the grid, which are both CalendarLists.
 *
 * iOS mirrors: the scroll view and its content are each flipped horizontally, so the content reads
 * in its normal orientation while the list scrolls and lays out its pages right to left.
 *
 * Android lays the pages out right to left inside a left-to-right scroll view instead, with each
 * page laid out RTL, and converts the scroll view's offset (utils/rtlOffset). Nothing is drawn
 * flipped: text drawn through the flips missed Skia's text-blob cache on older Android (seen on
 * Android 13), whose lookup is linear, and the GPU layer that hid that was redrawn in full on every
 * pinch frame. Either way RenderThread fell seconds behind and the app ended in an ANR. The scroll
 * view can't be RTL itself either: Android's horizontal scroll view snaps to the far end once its
 * content is laid out in RTL, which threw away the initial offset.
 */
const isRTLMirrored = I18nManager.isRTL && !IS_REVERSED_RTL;
const styles = StyleSheet.create({
  mirrored: {
    transform: [{
      scaleX: -1
    }]
  },
  ltr: {
    direction: 'ltr'
  }
});
CalendarList.displayName = 'CalendarList';
//# sourceMappingURL=index.js.map