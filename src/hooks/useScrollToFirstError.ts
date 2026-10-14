import { useCallback, useRef } from 'react';
import { TextInput, findNodeHandle } from 'react-native';
import type { FieldErrors, FieldValues } from 'react-hook-form';

/** Ref type for KeyboardAwareScrollView (scrollToFocusedInput is provided by the lib). */
export interface ScrollViewScrollToFocusedInput {
  scrollToFocusedInput?: (
    reactNode: number | null | object,
    extraHeight?: number,
    keyboardOpeningTime?: number
  ) => void;
}

const SCROLL_DELAY_MS = 150;
const EXTRA_SCROLL_HEIGHT = 80;

/**
 * Returns a callback for react-hook-form's handleSubmit(onValid, onInvalid).
 * On validation failure, focuses the first invalid field (in fieldOrder) that has
 * a TextInput ref, then scrolls the KeyboardAwareScrollView to bring it into view.
 */
export function useScrollToFirstError<T extends FieldValues>(
  fieldOrder: (keyof T)[],
  fieldRefs: Partial<Record<keyof T, React.RefObject<TextInput | null>>>,
  scrollViewRef: React.RefObject<ScrollViewScrollToFocusedInput | null>
): (errors: FieldErrors<T>) => void {
  const fieldRefsRef = useRef(fieldRefs);
  fieldRefsRef.current = fieldRefs;

  return useCallback(
    (errors: FieldErrors<T>) => {
      const refs = fieldRefsRef.current;
      for (const field of fieldOrder) {
        if (errors[field]) {
          const ref = refs[field];
          if (ref?.current) {
            ref.current.focus();
            setTimeout(() => {
              const node = findNodeHandle(ref.current);
              if (node && scrollViewRef.current?.scrollToFocusedInput) {
                scrollViewRef.current.scrollToFocusedInput(
                  node,
                  EXTRA_SCROLL_HEIGHT
                );
              }
            }, SCROLL_DELAY_MS);
            break;
          }
        }
      }
    },
    [fieldOrder, scrollViewRef]
  );
}
