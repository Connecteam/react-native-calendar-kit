/// <reference types="react" />
declare function useLazyRef<T>(initializer: () => null extends T ? never : T): import("react").MutableRefObject<T>;
export default useLazyRef;
