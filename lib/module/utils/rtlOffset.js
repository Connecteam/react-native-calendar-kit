import { I18nManager, Platform } from 'react-native';

/**
 * Connecteam: on Android in RTL the day bar and the grid lay their pages out right to left inside
 * a left-to-right scroll view, instead of being mirrored with `scaleX: -1` (see CalendarList). The
 * scroll view's own offset then runs the other way from the list position the rest of the calendar
 * works in (`offsetX`, page and day indexes), so the two are converted at the scroll view.
 */
export const IS_REVERSED_RTL = I18nManager.isRTL && Platform.OS === 'android';

/**
 * Converts between a list position and the scroll view's offset; the conversion is its own
 * inverse. `maxOffsetX` is the scroll view's largest offset, or -1 when the list isn't reversed.
 */
export const toNativeOffsetX = (offset, maxOffsetX) => {
  'worklet';

  return maxOffsetX < 0 ? offset : maxOffsetX - offset;
};
//# sourceMappingURL=rtlOffset.js.map