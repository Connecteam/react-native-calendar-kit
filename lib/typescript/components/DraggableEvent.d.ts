import type { FC } from 'react';
import React from 'react';
import type { ViewStyle } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { ResourceItem, SelectedEventType } from '../types';
export interface DraggableEventProps {
    index: number;
    startUnix: number;
    visibleDates: Record<string, {
        diffDays: number;
        unix: number;
    }>;
    /**
     * Start-of-day of the selected event, in milliseconds. Callers that don't have the selection's
     * times (the resource overlay) leave out this and the two below, which then fall back to the
     * `dragSelected*` shared values.
     */
    selectedStartUnix?: number;
    /** Minutes from midnight to the selected event's start. */
    selectedStartMinutes?: number;
    /** Length of the selected event, in minutes. */
    selectedDuration?: number;
    renderEvent?: (event: SelectedEventType, options: {
        width: SharedValue<number>;
        height: SharedValue<number>;
    }) => React.ReactElement | null;
    TopEdgeComponent?: React.ReactElement | null;
    BottomEdgeComponent?: React.ReactElement | null;
    containerStyle?: ViewStyle;
    resources?: ResourceItem[];
}
export declare const DraggableEvent: FC<DraggableEventProps>;
interface DraggableEventWrapperProps {
    startUnix: number;
    visibleDates: Record<string, {
        diffDays: number;
        unix: number;
    }>;
    renderEvent?: (event: SelectedEventType, options: {
        width: SharedValue<number>;
        height: SharedValue<number>;
    }) => React.ReactElement | null;
    renderDraggableEvent?: (event: DraggableEventProps) => React.ReactElement | null;
    resources?: ResourceItem[];
}
declare const DraggableEventWrapper: FC<DraggableEventWrapperProps>;
export default DraggableEventWrapper;
