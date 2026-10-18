import React from 'react';
import { type GestureResponderEvent } from 'react-native';
import type { EventStaticSize, OnEventResponse, PackedEvent, SizeAnimation } from '../types';
interface EventItemProps {
    event: PackedEvent;
    startUnix: number;
    renderEvent?: (event: PackedEvent, size: SizeAnimation, staticSize: EventStaticSize) => React.ReactNode;
    onPressEvent?: (event: OnEventResponse) => void;
    onLongPressEvent?: (event: PackedEvent, resEvent: GestureResponderEvent) => void;
    isDragging?: boolean;
    visibleDates: Record<string, {
        diffDays: number;
        unix: number;
    }>;
    totalResources?: number;
    /** JS copy of the minute height, updated when a pinch settles (see Events). */
    minuteHeight?: number;
}
declare const _default: React.NamedExoticComponent<EventItemProps>;
export default _default;
