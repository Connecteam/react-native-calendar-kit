import type { GestureStateManager, GestureTouchEvent } from 'react-native-gesture-handler';
/** Fails a drag pan that has not been claimed once the finger has travelled far enough to be a scroll. */
export declare const failOnScrollIntent: (event: GestureTouchEvent, state: GestureStateManager, initialX: number, initialY: number) => void;
