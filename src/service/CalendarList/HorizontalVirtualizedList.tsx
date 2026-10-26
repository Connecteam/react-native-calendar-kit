import React, { useCallback, useMemo } from 'react';
import { I18nManager } from 'react-native';
import { View } from './View';

interface HorizontalVirtualizedListProps {
  count: number;
  renderItem: (item: { item: number; index: number }) => React.ReactNode;
  keyExtractor: (item: number, index: number) => string;
  itemSize: number;
  visibleRange: { start: number; end: number };
  totalSize: number;
  getItemPosition: (index: number) => number;
  /** Lays the items out right to left; see CalendarList. */
  reversed?: boolean;
}

export const HorizontalVirtualizedList = React.memo(
  ({
    count,
    renderItem,
    keyExtractor,
    itemSize,
    visibleRange,
    totalSize,
    getItemPosition,
    reversed = false,
  }: HorizontalVirtualizedListProps) => {
    const getPosition = useCallback(
      (index: number) => getItemPosition(reversed ? count - 1 - index : index),
      [getItemPosition, reversed, count]
    );
    // Leftmost rendered item: the last one when reversed.
    const firstVisiblePosition = reversed
      ? getPosition(visibleRange.end)
      : visibleRange.start > 0
        ? getPosition(visibleRange.start)
        : 0;

    const renderItems = useMemo(() => {
      const items: React.ReactNode[] = [];

      for (let i = visibleRange.start; i <= visibleRange.end; i++) {
        if (i < count) {
          const key = keyExtractor(i, i);
          const absolutePosition = getPosition(i);
          const relativePosition = Math.round(
            absolutePosition - firstVisiblePosition
          );

          items.push(
            <View
              key={key}
              style={{
                position: 'absolute',
                left: relativePosition,
                width: itemSize,
                height: '100%',
                direction: reversed ? 'rtl' : undefined,
              }}>
              {renderItem({ item: i, index: i })}
            </View>
          );
        }
      }

      return items;
    }, [
      visibleRange.start,
      visibleRange.end,
      count,
      keyExtractor,
      getPosition,
      firstVisiblePosition,
      renderItem,
      itemSize,
      reversed,
    ]);

    return (
      <View
        style={{
          position: 'relative',
          width: totalSize,
          height: '100%',
          // Connecteam: in a mirrored RTL list, React Native lays the items' `left` out from the
          // right edge, but doesn't mirror transforms, so the shift has to run the other way to
          // keep the items where their positions say. A reversed list is laid out left to right.
          transform: [
            {
              translateX:
                I18nManager.isRTL && !reversed
                  ? -firstVisiblePosition
                  : firstVisiblePosition,
            },
          ],
        }}>
        {renderItems}
      </View>
    );
  }
);

HorizontalVirtualizedList.displayName = 'HorizontalVirtualizedList';
