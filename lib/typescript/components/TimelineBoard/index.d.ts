import React from 'react';
import { ResourceItem } from '../../types';
interface TimelineBoardProps {
    pageIndex: number;
    dateUnix: number;
    visibleDates: Record<number, {
        diffDays: number;
        unix: number;
    }>;
    resources?: ResourceItem[];
}
declare const _default: React.MemoExoticComponent<({ pageIndex, dateUnix, visibleDates, resources, }: TimelineBoardProps) => import("react/jsx-runtime").JSX.Element>;
export default _default;
