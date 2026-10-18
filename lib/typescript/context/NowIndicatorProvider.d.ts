import React from 'react';
import type { SharedValue } from 'react-native-reanimated';
export interface NowIndicatorContext {
    currentDateUnix: number;
    currentTime: SharedValue<number>;
}
interface NowIndicatorProviderProps {
    children?: React.ReactNode;
}
declare const NowIndicatorProvider: ({ children }: NowIndicatorProviderProps) => import("react/jsx-runtime").JSX.Element;
export default NowIndicatorProvider;
export declare const useNowIndicator: () => NowIndicatorContext;
