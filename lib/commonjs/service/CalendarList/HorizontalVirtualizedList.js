"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.HorizontalVirtualizedList = void 0;
var _react = _interopRequireWildcard(require("react"));
var _reactNative = require("react-native");
var _View = require("./View");
function _interopRequireWildcard(e, t) { if ("function" == typeof WeakMap) var r = new WeakMap(), n = new WeakMap(); return (_interopRequireWildcard = function (e, t) { if (!t && e && e.__esModule) return e; var o, i, f = { __proto__: null, default: e }; if (null === e || "object" != typeof e && "function" != typeof e) return f; if (o = t ? n : r) { if (o.has(e)) return o.get(e); o.set(e, f); } for (const t in e) "default" !== t && {}.hasOwnProperty.call(e, t) && ((i = (o = Object.defineProperty) && Object.getOwnPropertyDescriptor(e, t)) && (i.get || i.set) ? o(f, t, i) : f[t] = e[t]); return f; })(e, t); }
const HorizontalVirtualizedList = exports.HorizontalVirtualizedList = /*#__PURE__*/_react.default.memo(({
  count,
  renderItem,
  keyExtractor,
  itemSize,
  visibleRange,
  totalSize,
  getItemPosition,
  reversed = false
}) => {
  const getPosition = (0, _react.useCallback)(index => getItemPosition(reversed ? count - 1 - index : index), [getItemPosition, reversed, count]);
  // Leftmost rendered item: the last one when reversed.
  const firstVisiblePosition = reversed ? getPosition(visibleRange.end) : visibleRange.start > 0 ? getPosition(visibleRange.start) : 0;
  const renderItems = (0, _react.useMemo)(() => {
    const items = [];
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i < count) {
        const key = keyExtractor(i, i);
        const absolutePosition = getPosition(i);
        const relativePosition = Math.round(absolutePosition - firstVisiblePosition);
        items.push(/*#__PURE__*/_react.default.createElement(_View.View, {
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
  return /*#__PURE__*/_react.default.createElement(_View.View, {
    style: {
      position: 'relative',
      width: totalSize,
      height: '100%',
      // Connecteam: in a mirrored RTL list, React Native lays the items' `left` out from the
      // right edge, but doesn't mirror transforms, so the shift has to run the other way to
      // keep the items where their positions say. A reversed list is laid out left to right.
      transform: [{
        translateX: _reactNative.I18nManager.isRTL && !reversed ? -firstVisiblePosition : firstVisiblePosition
      }]
    }
  }, renderItems);
});
HorizontalVirtualizedList.displayName = 'HorizontalVirtualizedList';
//# sourceMappingURL=HorizontalVirtualizedList.js.map