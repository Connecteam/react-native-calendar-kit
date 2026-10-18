import React from 'react';
interface HorizontalLineProps {
    borderColor: string;
    index: number;
    totalSlots: number;
    renderCustomHorizontalLine?: (props: {
        index: number;
        borderColor: string;
    }) => React.ReactNode;
}
declare const HorizontalLine: ({ index, borderColor, totalSlots, renderCustomHorizontalLine, }: HorizontalLineProps) => import("react/jsx-runtime").JSX.Element;
export default HorizontalLine;
