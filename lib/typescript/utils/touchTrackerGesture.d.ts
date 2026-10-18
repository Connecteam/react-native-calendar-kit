/**
 * A gesture that never activates or fails on its own, so it sees every touch event of the sequence.
 *
 * `Gesture.Manual()` behaves the same, but neither its iOS recognizer nor its Android handler ever finishes when
 * the touch ends. On iOS that leaves UIKit's touch sequence open, and a home swipe that backgrounds the app then
 * freezes every touch in the app until relaunch (react-native-gesture-handler 2.25). On Android the handler stays
 * in the orchestrator, in BEGAN, for the rest of the session. A long press that can never trigger is finished by
 * the platform when the touch lifts.
 */
export declare const createTouchTrackerGesture: () => import("react-native-gesture-handler/lib/typescript/handlers/gestures/longPressGesture").LongPressGesture;
