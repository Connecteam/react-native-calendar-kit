/**
 * Finger travel, in points, before a touch is read as a scroll rather than the start of a drag.
 *
 * Drags on an event that is not selected yet, and drags to create, are started by a long press
 * (a `TouchableOpacity` on the event, or on the background), so between touch-down and the long
 * press firing the drag pans have no way to know a drag is coming. (Drags on the selected event
 * have no such gap: `DraggableEvent` claims them from the UI thread on touch-down.) Failing on the
 * very first touch move — a pixel of finger jitter is enough — kills the handler for the rest of
 * that touch, so when the long press does fire there is no live pan behind the drag box: the shift
 * never follows the finger and the calendar's scroll views pan the grid instead. Travel below this
 * threshold is left to the long press to claim.
 */
const SCROLL_INTENT_THRESHOLD = 12;

/** Fails a drag pan that has not been claimed once the finger has travelled far enough to be a scroll. */
export const failOnScrollIntent = (event, state, initialX, initialY) => {
  'worklet';

  const touch = event.allTouches[0];
  if (!touch) {
    state.fail();
    return;
  }
  const travel = Math.abs(touch.x - initialX) + Math.abs(touch.y - initialY);
  if (travel > SCROLL_INTENT_THRESHOLD) {
    state.fail();
  }
};
//# sourceMappingURL=scrollIntent.js.map