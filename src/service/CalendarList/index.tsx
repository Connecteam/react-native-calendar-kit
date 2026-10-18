import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
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
    const internalOffset = useSharedValue(initialOffset ?? 0);
    const scrollOffsetAnim = useScrollViewOffset(animScrollRef, internalOffset);

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
      (offset) => {
        runOnJS(handleColumnChanged)(offset);
        runOnJS(setScrollOffset)(offset);
      }
    );

    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: (index: number, animated: boolean = true) => {
          if (index >= 0 && index < count) {
            const position = getItemPosition(index);
            scrollViewRef.current?.scrollTo({
              x: position,
              animated,
            });
          }
        },
        scrollToOffset: (offset: number, animated: boolean = true) => {
          scrollViewRef.current?.scrollTo({
            x: offset,
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
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({
              x: offset,
              animated: false,
            });
          }, 0);
        }
      }
    }, [initialScrollIndex, count, getItemPosition, initialOffset]);

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
        style={style}
        contentContainerStyle={[contentContainerStyle, { width: totalSize }]}
        onScroll={onScroll}
        onScrollBeginDrag={onScrollBeginDrag}
        onScrollEndDrag={onScrollEndDrag}
        onMomentumScrollBegin={onMomentumScrollBegin}
        onMomentumScrollEnd={onMomentumScrollEnd}
        onLayout={onLayout}
        contentOffset={{ x: initialOffset ?? 0, y: 0 }}
        scrollEventThrottle={scrollEventThrottle}
        scrollEnabled={scrollEnabled}
        showsHorizontalScrollIndicator={false}
        showsVerticalScrollIndicator={false}
        pagingEnabled={pagingEnabled}
        disableIntervalMomentum={!!snapToOffsets || !!snapToInterval}
        snapToInterval={snapToInterval}
        onTouchStart={onTouchStart}
        snapToOffsets={snapToOffsets}
        {...{ onWheel }}>
        {isRTLMirrored ? (
          <View style={[{ width: totalSize, height: '100%' }, styles.mirrored]}>
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

    return (
      <View
        // Android only: draw the mirrored list into its own GPU layer, so the flip is applied to
        // the finished layer rather than to every text draw inside it. Drawn through the two
        // flips directly, the calendar's text kept missing Skia's text-blob cache on older
        // Android (seen on Android 13), whose cache lookup is linear: after a few pulls to
        // refresh, RenderThread spent seconds per frame in GrTextBlobRedrawCoordinator and the
        // whole app stopped taking touches (ANR).
        renderToHardwareTextureAndroid
        style={styles.mirrored}>
        {list}
      </View>
    );
  }
);

/**
 * Connecteam: calendar-kit's own `isRTL` is hardcoded false, so RTL is done by mirroring. The
 * scroll view and its content are each flipped horizontally: the content reads in its normal
 * orientation, while the list scrolls and lays out its pages right to left. Applies to both the
 * day bar and the grid, which are both CalendarLists.
 */
const isRTLMirrored = I18nManager.isRTL;

const styles = StyleSheet.create({
  mirrored: { transform: [{ scaleX: -1 }] },
});

CalendarList.displayName = 'CalendarList';
