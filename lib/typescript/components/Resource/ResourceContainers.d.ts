import React from 'react';
import { ResourceItem } from '../../types';
interface ResourceContainerProps {
    resources?: ResourceItem[];
    renderItem: (item: {
        items: ResourceItem[];
        index: number;
    }) => React.ReactNode;
    itemSize: number;
    visibleRange: {
        start: number;
        end: number;
    };
    totalSize: number;
    getItemPosition: (index: number) => number;
    resourcePerPage: number;
}
export declare const ResourceContainer: React.MemoExoticComponent<({ resources, renderItem, itemSize, visibleRange, totalSize, resourcePerPage, getItemPosition, }: ResourceContainerProps) => import("react/jsx-runtime").JSX.Element>;
export {};
