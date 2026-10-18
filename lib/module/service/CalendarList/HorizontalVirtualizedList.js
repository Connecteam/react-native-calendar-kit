import React, { useMemo } from 'react';
import { I18nManager } from 'react-native';
import { View } from './View';
export const HorizontalVirtualizedList = /*#__PURE__*/React.memo(({
  count,
  renderItem,
  keyExtractor,
  itemSize,
  visibleRange,
  totalSize,
  getItemPosition
}) => {
  const renderItems = useMemo(() => {
    const items = [];
    const firstVisiblePosition = getItemPosition(visibleRange.start);
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < count) {
        const key = keyExtractor(i, i);
        const absolutePosition = getItemPosition(i);
        const relativePosition = Math.round(absolutePosition - firstVisiblePosition);
        items.push(/*#__PURE__*/React.createElement(View, {
          key: key,
          style: {
            position: 'absolute',
            left: relativePosition,
            width: itemSize,
            height: '100%'
          }
        }, renderItem({
          item: i,
          index: i
        })));
      }
    }
    return items;
  }, [visibleRange.start, visibleRange.end, count, keyExtractor, getItemPosition, renderItem, itemSize]);
  const firstVisiblePosition = visibleRange.start > 0 ? getItemPosition(visibleRange.start) : 0;
  return /*#__PURE__*/React.createElement(View, {
    style: {
      position: 'relative',
      width: totalSize,
      height: '100%',
      // Connecteam: in RTL, React Native lays the items' `left` out from the right edge, but
      // doesn't mirror transforms, so the shift has to run the other way to keep the items
      // where their positions say.
      transform: [{
        translateX: I18nManager.isRTL ? -firstVisiblePosition : firstVisiblePosition
      }]
    }
  }, renderItems);
});
HorizontalVirtualizedList.displayName = 'HorizontalVirtualizedList';
//# sourceMappingURL=HorizontalVirtualizedList.js.map