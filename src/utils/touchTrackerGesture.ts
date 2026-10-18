import { Gesture } from 'react-native-gesture-handler';

const NEVER_ACTIVATE_DURATION_MS = 1_000_000_000;
const NEVER_FAIL_DISTANCE = 1_000_000;

/**
 * A gesture that never activates or fails on its own, so it sees every touch event of the sequence.
 *
 * `Gesture.Manual()` behaves the same, but neither its iOS recognizer nor its Android handler ever finishes when
 * the touch ends. On iOS that leaves UIKit's touch sequence open, and a home swipe that backgrounds the app then
 * freezes every touch in the app until relaunch (react-native-gesture-handler 2.25). On Android the handler stays
 * in the orchestrator, in BEGAN, for the rest of the session. A long press that can never trigger is finished by
 * the platform when the touch lifts.
 */
export const createTouchTrackerGesture = () =>
  Gesture.LongPress()
    .minDuration(NEVER_ACTIVATE_DURATION_MS)
    .maxDistance(NEVER_FAIL_DISTANCE)
    .shouldCancelWhenOutside(false);
