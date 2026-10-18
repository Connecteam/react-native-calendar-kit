import type { FC, PropsWithChildren } from 'react';
import { type GestureResponderEvent } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type HapticService from '../service/HapticService';
import type { DateOrDateTime, DateTimeType, OnEventResponse, ResourceItem, SelectedEventType } from '../types';
export type DragEventContextProps = {
    dragStep: number;
    allowDragToEdit: boolean;
    draggingEvent?: SelectedEventType;
    dragStartMinutes: SharedValue<number>;
    dragDuration: SharedValue<number>;
    isDraggingAnim: SharedValue<boolean>;
    draggingId: string | undefined;
    selectedEvent?: SelectedEventType;
    dragPosition: SharedValue<{
        x: number;
        y: number;
        translationX: number;
        translationY: number;
    }>;
    dragStartUnix: SharedValue<number>;
    roundedDragStartMinutes: SharedValue<number>;
    roundedDragDuration: SharedValue<number>;
    dragSelectedType: SharedValue<'center' | 'top' | 'bottom' | undefined>;
    roundedDragStartUnix: SharedValue<number>;
    dragSelectedStartUnix: SharedValue<number>;
    dragSelectedStartMinutes: SharedValue<number>;
    dragSelectedDuration: SharedValue<number>;
    isDraggingSelectedEvent: SharedValue<boolean>;
    extraMinutes: SharedValue<number>;
    selectedEventId: string | undefined;
    initialDragState: SharedValue<{
        dragStart: number;
        dragStartUnix: number;
        dragDuration: number;
    }>;
    allowDragToCreate: boolean;
    defaultDuration: number;
    isDraggingCreateAnim: SharedValue<boolean>;
    isDragging: boolean;
    dragX: SharedValue<number>;
    /**
     * Set when the drag is ending because the gesture was taken away rather than released —
     * the touch was cancelled, or the app left the foreground with a finger down.
     *
     * Must be written before `isDraggingAnim` is cleared, since that is what starts the
     * teardown that reads it. Cleared again by `resetDragState`.
     */
    isDragInterrupted: SharedValue<boolean>;
};
export type DragEventActionsContextProps = {
    triggerDragEvent?: (initialDrag: {
        start: DateTimeType;
        end: DateTimeType;
        startIndex?: number;
        dragX?: number;
    }, event?: OnEventResponse) => void;
    triggerDragSelectedEvent: (initialDrag: {
        startIndex: number;
        type: 'center' | 'top' | 'bottom';
        resourceIndex?: number;
        resourceId?: string;
    }) => void;
    /**
     * Worklet. Opens a drag on the selected event from the UI thread.
     *
     * Must be called before the first touch move of the gesture, so the body's pan gesture
     * sees `isDraggingAnim` and the `drag*` values it derives `initialDragState` from without
     * waiting on the JS thread.
     */
    claimDragSelectedEvent: (initialDrag: {
        startIndex: number;
        type: 'center' | 'top' | 'bottom';
    }) => void;
    triggerDragCreateEvent?: (props: DateOrDateTime, event: GestureResponderEvent) => void;
};
declare const DragEventProvider: FC<PropsWithChildren<{
    dragStep: number;
    allowDragToEdit: boolean;
    selectedEvent?: SelectedEventType;
    allowDragToCreate: boolean;
    defaultDuration: number;
    hapticService: HapticService;
    resources?: ResourceItem[];
}>>;
export default DragEventProvider;
export declare const useDragEvent: () => DragEventContextProps;
export declare const useDragEventActions: () => DragEventActionsContextProps;
