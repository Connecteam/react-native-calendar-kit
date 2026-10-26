import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
} from 'react';
import {
  GestureResponderEvent,
  I18nManager,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { ScrollView } from 'react-native-gesture-handler';
import Animated, {
  AnimatedRef,
  runOnJS,
  useAnimatedReaction,
  useAnimatedRef,
  useScrollViewOffset,
  useSharedValue,
} from 'react-native-reanimated';
import { HorizontalVirtualizedList } from './HorizontalVirtualizedList';
import useLatestCallback from '../../hooks/useLatestCallback';
import { IS_REVERSED_RTL, toNativeOffsetX } from '../../utils/rtlOffset';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

interface CalendarListProps {
  count: number;
  renderItem: (item: { item: number; index: number }) => React.ReactNode;
  keyExtractor?: (item: number, index: number) => string;
  itemSize: number;
  drawDistance?: number;
  onScroll?: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  onLayout?: (event: LayoutChangeEvent) => void;
  style?: any;
  contentContainerStyle?: any;
  initialScrollIndex?: number;
  pagingEnabled?: boolean;
  snapToInterval?: number;
  initialOffset?: number;
  snapToOffsets?: number[];
  animatedRef?: AnimatedRef<Animated.ScrollView>;
  onVisibleColumnChanged?: (props: {
    index: number;
    column: number;
    columns: number;
    extraScrollData: Record<string, any>;
    offset: number;
  }) => void;
  columnsPerPage: number;
  extraScrollData?: any;
  scrollEventThrottle?: number;
  scrollEnabled?: boolean;
  simultaneousHandlers?: ComponentProps<
    typeof ScrollView
  >['simultaneousHandlers'];
  onLoad?: () => void;
  onTouchStart?: (event: GestureResponderEvent) => void;

  /**
   * Fires if a user initiates a scroll gesture.
   */
  onScrollBeginDrag?:
    | ((event: NativeSyntheticEvent<NativeScrollEvent>) => void)
    | undefined;

  /**
   * Fires when a user has finished scrolling.
   */
  onScrollEndDrag?:
    | ((event: NativeSyntheticEvent<NativeScrollEvent>) => void)
    | undefined;

  /**
   * Fires when scroll view has finished moving
   */
  onMomentumScrollEnd?:
    | ((event: NativeSyntheticEvent<NativeScrollEvent>) => void)
    | undefined;

  /**
   * Fires when scroll view has begun moving
   */
  onMomentumScrollBegin?:
    | ((event: NativeSyntheticEvent<NativeScrollEvent>) => void)
    | undefined;

  onWheel?: (event: WheelEvent) => void;
}

export interface CalendarListRef {
  scrollToIndex: (index: number, animated?: boolean) => void;
  scrollToOffset: (offset: number, animated?: boolean) => void;
  getMaxOffset: (visibleColumns?: number) => number;
  isScrollable: (offset: number, visibleColumns?: number) => boolean;
}

const DEFAULT_DRAW_DISTANCE = 600; // Larger buffer for horizontal scrolling

export const CalendarList = React.forwardRef<
  CalendarListRef,
  CalendarListProps
>(
  (
    {
      count,
      animatedRef,
      renderItem,
      keyExtractor = (item) => item.toString(),
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
      onWheel,
    },
    ref
  ) => {
    const scrollViewRef = useRef<ScrollView>(null);
    const [scrollOffset, setScrollOffset] = useState(initialOffset ?? 0);
    const isLoaded = useRef(false);

    const totalSize = count * itemSize;
    // See utils/rtlOffset: the scroll view's offset for a list position on Android in RTL.
    const maxOffsetX = IS_REVERSED_RTL ? totalSize - itemSize : -1;

    const visibleRange = useMemo(() => {
      if (count === 0) {
        return { start: 0, end: 0 };
      }

      const buffer = drawDistance;
      const scrollStart = Math.max(0, scrollOffset - buffer);
      const scrollEnd = scrollOffset + itemSize + buffer;
      const startIndex = Math.max(0, Math.floor(scrollStart / itemSize));
      const endIndex = Math.min(count - 1, Math.floor(scrollEnd / itemSize));
      return { start: startIndex, end: endIndex };
    }, [count, scrollOffset, drawDistance, itemSize]);

    const getItemPosition = useCallback(
      (index: number) => {
        return index * itemSize;
      },
      [itemSize]
    );

    const animScrollRef = useAnimatedRef<Animated.ScrollView>();
    const internalOffset = useSharedValue(
      toNativeOffsetX(initialOffset ?? 0, maxOffsetX)
    );
    const scrollOffsetAnim = useScrollViewOffset(animScrollRef, internalOffset);

    // Android re-sends all of a scroll view's props with every update, `contentOffset` included, so
    // it has to say where the list is whenever another prop (e.g. `scrollEnabled` while pinching)
    // changes. Left at the initial offset, it scrolled the list back to the first page shown.
    const lastInitialOffset = useRef(initialOffset);
    const contentOffset = useMemo(() => {
      const x =
        initialOffset !== lastInitialOffset.current
          ? toNativeOffsetX(initialOffset ?? 0, maxOffsetX)
          : internalOffset.value;
      lastInitialOffset.current = initialOffset;
      return { x, y: 0 };
      // eslint-disable-next-line react-hooks/exhaustive-deps -- recomputed when the other scroll view props change
    }, [
      initialOffset,
      scrollEnabled,
      pagingEnabled,
      snapToInterval,
      snapToOffsets,
      totalSize,
      maxOffsetX,
    ]);

    const nativeSnapToOffsets = useMemo(
      () =>
        maxOffsetX < 0 || !snapToOffsets
          ? snapToOffsets
          : snapToOffsets
              .map((offset) => maxOffsetX - offset)
              .filter((offset) => offset >= 0)
              .reverse(),
      [snapToOffsets, maxOffsetX]
    );

    const extraScrollDataRef = useRef(extraScrollData);
    extraScrollDataRef.current = extraScrollData;
    const onVisibleColumnChangedCb = useLatestCallback(onVisibleColumnChanged);

    const handleColumnChanged = useCallback(
      (offset: number) => {
        const columnWidth = itemSize / columnsPerPage;
        const startIndex = Math.floor(
          Math.round(offset / columnWidth) / columnsPerPage
        );
        const startOffset = startIndex * itemSize;
        const column = Math.round((offset - startOffset) / columnWidth);

        onVisibleColumnChangedCb?.({
          index: startIndex,
          column,
          columns: columnsPerPage,
          extraScrollData: extraScrollDataRef.current,
          offset,
        });
      },
      [itemSize, columnsPerPage, onVisibleColumnChangedCb]
    );

    useAnimatedReaction(
      () => scrollOffsetAnim.value,
      (nativeOffset) => {
        const offset = toNativeOffsetX(nativeOffset, maxOffsetX);
        runOnJS(handleColumnChanged)(offset);
        runOnJS(setScrollOffset)(offset);
      },
      [maxOffsetX]
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number, animated: boolean = true) => {
          if (index >= 0 && index < count) {
            const position = getItemPosition(index);
            scrollViewRef.current?.scrollTo({
              x: toNativeOffsetX(position, maxOffsetX),
              animated,
            });
          }
        },
        scrollToOffset: (offset: number, animated: boolean = true) => {
          scrollViewRef.current?.scrollTo({
            x: toNativeOffsetX(offset, maxOffsetX),
            animated,
          });
        },
        getMaxOffset: (visibleColumns?: number) => {
          if (!visibleColumns || !columnsPerPage) {
            return totalSize - itemSize;
          }

          const columnWidth = itemSize / columnsPerPage;
          return totalSize - columnWidth * visibleColumns;
        },
        isScrollable: (offset: number, visibleColumns?: number) => {
          let maxOffset: number;
          if (!visibleColumns || !columnsPerPage) {
            maxOffset = totalSize - itemSize;
          } else {
            const columnWidth = itemSize / columnsPerPage;
            maxOffset = totalSize - columnWidth * visibleColumns;
          }
          return offset >= 0 && offset <= maxOffset && offset !== scrollOffset;
        },
      }),
      [
        columnsPerPage,
        count,
        getItemPosition,
        itemSize,
        maxOffsetX,
        scrollOffset,
        totalSize,
      ]
    );

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
            scrollViewRef.current?.scrollTo({
              x: nativeOffset,
              animated: false,
            });
          }, 0);
        }
      }
    }, [initialScrollIndex, count, getItemPosition, initialOffset, maxOffsetX]);

    useEffect(() => {
      setTimeout(() => {
        if (!isLoaded.current) {
          isLoaded.current = true;
          onLoad?.();
        }
      }, 0);
    }, [onLoad]);

    const content = (
      <HorizontalVirtualizedList
        count={count}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        itemSize={itemSize}
        visibleRange={visibleRange}
        totalSize={totalSize}
        getItemPosition={getItemPosition}
        reversed={IS_REVERSED_RTL}
      />
    );

    const list = (
      <AnimatedScrollView
        ref={(node: any) => {
          scrollViewRef.current = node;
          animScrollRef?.(node);
          animatedRef?.(node);
        }}
        horizontal={true}
        style={IS_REVERSED_RTL ? [style, styles.ltr] : style}
        contentContainerStyle={[contentContainerStyle, { width: totalSize }]}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onLayout={onLayout}
        contentOffset={contentOffset}
        scrollEventThrottle={scrollEventThrottle}
        scrollEnabled={scrollEnabled}
        simultaneousHandlers={simultaneousHandlers}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pagingEnabled={pagingEnabled}
        disableIntervalMomentum={!!snapToOffsets || !!snapToInterval}
        snapToInterval={snapToInterval}
        onTouchStart={onTouchStart}
        snapToOffsets={nativeSnapToOffsets}
        {...{ onWheel }}>
        {isRTLMirrored ? (
          <View
            style={[{ width: totalSize, height: '100%' }, styles.mirrored]}>
            {content}
          </View>
        ) : (
          content
        )}
      </AnimatedScrollView>
    );

    if (!isRTLMirrored) {
      return list;
    }

    return <View style={styles.mirrored}>{list}</View>;
  }
);

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
  mirrored: { transform: [{ scaleX: -1 }] },
  ltr: { direction: 'ltr' },
});

CalendarList.displayName = 'CalendarList';
