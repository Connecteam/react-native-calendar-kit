import React, { useCallback, useMemo } from 'react';
import { I18nManager } from 'react-native';
import { View } from './View';
export const HorizontalVirtualizedList = /*#__PURE__*/React.memo(({
  count,
  renderItem,
  keyExtractor,
  itemSize,
  visibleRange,
  totalSize,
  getItemPosition,
  reversed = false
}) => {
  const getPosition = useCallback(index => getItemPosition(reversed ? count - 1 - index : index), [getItemPosition, reversed, count]);
  // Leftmost rendered item: the last one when reversed.
  const firstVisiblePosition = reversed ? getPosition(visibleRange.end) : visibleRange.start > 0 ? getPosition(visibleRange.start) : 0;
  const renderItems = useMemo(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < count) {
        const key = keyExtractor(i, i);
        const absolutePosition = getPosition(i);
        const relativePosition = Math.round(absolutePosition - firstVisiblePosition);
        items.push(/*#__PURE__*/React.createElement(View, {
          key: key,
          style: {
            position: 'absolute',
            left: relativePosition,
            width: itemSize,
            height: '100%',
            direction: reversed ? 'rtl' : undefined
          }
        }, renderItem({
          item: i,
          index: i
        })));
      }
    }
    return items;
  }, [visibleRange.start, visibleRange.end, count, keyExtractor, getPosition, firstVisiblePosition, renderItem, itemSize, reversed]);
  return /*#__PURE__*/React.createElement(View, {
    style: {
      position: 'relative',
      width: totalSize,
      height: '100%',
      // Connecteam: in a mirrored RTL list, React Native lays the items' `left` out from the
      // right edge, but doesn't mirror transforms, so the shift has to run the other way to
      // keep the items where their positions say. A reversed list is laid out left to right.
      transform: [{
        translateX: I18nManager.isRTL && !reversed ? -firstVisiblePosition : firstVisiblePosition
      }]
    }
  }, renderItems);
});
HorizontalVirtualizedList.displayName = 'HorizontalVirtualizedList';
//# sourceMappingURL=HorizontalVirtualizedList.js.map