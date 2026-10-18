declare const useDragEventGesture: () => import("react-native-gesture-handler/lib/typescript/handlers/gestures/panGesture").PanGesture;
/**
 * Notices the touch ending even when the drag gesture above is no longer listening.
 *
 * That gesture fails itself while nothing is being dragged, so the calendar can scroll. A drag
 * started by a long press right after such a failure has no live handler left to see the release,
 * and `isDraggingAnim` is never cleared: the floating drag box stays on top of the calendar until
 * the screen is remounted.
 *
 * A touch-tracker gesture never activates and never fails on its own, so it keeps receiving touch
 * events for the whole gesture and can close the drag out.
 *
 * Cancels matter as much as releases here. The system takes the touch away without ever lifting it
 * when the app goes to the background with a finger down, when a call or the notification shade
 * arrives, or when a system edge gesture wins — and every one of those used to leave
 * `isDraggingAnim` set, which wedges the calendar: the drag pan then activates on every touch, so
 * the grid no longer scrolls and the shift no longer moves.
 */
export declare const useDragReleaseTracker: () => import("react-native-gesture-handler/lib/typescript/handlers/gestures/longPressGesture").LongPressGesture;
export default useDragEventGesture;
