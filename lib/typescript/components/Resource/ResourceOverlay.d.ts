import React from 'react';
import { ResourceItem } from '../../types';
import { DraggableEventProps } from './ResourceDraggableEvent';
declare const ResourceOverlay: ({ totalSize, resources, renderDraggableEvent, }: {
    totalSize: number;
    resources: ResourceItem[];
    renderDraggableEvent?: ((event: DraggableEventProps) => React.ReactElement | null) | undefined;
}) => import("react/jsx-runtime").JSX.Element;
export default ResourceOverlay;
