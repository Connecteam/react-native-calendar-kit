import React from 'react';
import type { DraggableEventProps } from './DraggableEvent';
import { ResourceItem } from '../types';
interface MultipleBodyItemProps {
    pageIndex: number;
    startUnix: number;
    renderDraggableEvent?: (props: DraggableEventProps) => React.ReactElement | null;
    resources?: ResourceItem[];
}
declare const BodyItem: ({ pageIndex, startUnix, renderDraggableEvent, resources, }: MultipleBodyItemProps) => import("react/jsx-runtime").JSX.Element;
export default BodyItem;
