"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.toNativeOffsetX = exports.IS_REVERSED_RTL = void 0;
var _reactNative = require("react-native");
/**
 * Connecteam: on Android in RTL the day bar and the grid lay their pages out right to left inside
 * a left-to-right scroll view, instead of being mirrored with `scaleX: -1` (see CalendarList). The
 * scroll view's own offset then runs the other way from the list position the rest of the calendar
 * works in (`offsetX`, page and day indexes), so the two are converted at the scroll view.
 */
const IS_REVERSED_RTL = exports.IS_REVERSED_RTL = _reactNative.I18nManager.isRTL && _reactNative.Platform.OS === 'android';

/**
 * Converts between a list position and the scroll view's offset; the conversion is its own
 * inverse. `maxOffsetX` is the scroll view's largest offset, or -1 when the list isn't reversed.
 */
const toNativeOffsetX = (offset, maxOffsetX) => {
  'worklet';

  return maxOffsetX < 0 ? offset : maxOffsetX - offset;
};
exports.toNativeOffsetX = toNativeOffsetX;
//# sourceMappingURL=rtlOffset.js.map