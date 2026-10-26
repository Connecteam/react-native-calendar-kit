import React from 'react';
interface HorizontalVirtualizedListProps {
    count: number;
    renderItem: (item: {
        item: number;
        index: number;
    }) => React.ReactNode;
    keyExtractor: (item: number, index: number) => string;
    itemSize: number;
    visibleRange: {
        start: number;
        end: number;
    };
    totalSize: number;
    getItemPosition: (index: number) => number;
    /** Lays the items out right to left; see CalendarList. */
    reversed?: boolean;
}
export declare const HorizontalVirtualizedList: React.MemoExoticComponent<({ count, renderItem, keyExtractor, itemSize, visibleRange, totalSize, getItemPosition, reversed, }: HorizontalVirtualizedListProps) => import("react/jsx-runtime").JSX.Element>;
export {};
