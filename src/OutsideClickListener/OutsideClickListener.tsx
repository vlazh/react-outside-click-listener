import React, { useCallback, useEffect, useRef } from 'react';

/** Map of elements and selectors */
export type HtmlTagSelectorMap = { [P in keyof JSX.IntrinsicElements]?: string | undefined };

export interface OutsideClickListenerProps {
  /**
   * Useful for dropdowns, when dropdown box is not expanded set this prop to `true` to avoid unnesessary `onOutsideClick` event.
   */
  disabled?: boolean;
  onOutsideClick: (nativeEvent: Event) => void;
  events?: (keyof GlobalEventHandlersEventMap)[];
  stopPropagation?: boolean;
  children: React.ReactElement & { ref?: React.Ref<Node> };
  /**
   * `id` or `Ref` or `Node`.
   * The most top parent node of child node to detect outside click.
   * Clicks of outside of `topNode` is not catched.
   * Useful if you need avoid propogation click event from child node to `topNode`.
   */
  topNode?: React.RefObject<Element> | Element | string | null;
  /** Do not fire `onOutsideClick` event for these elements (and their children) */
  ignore?: HtmlTagSelectorMap | ((node: Element) => boolean) | string /** selectors */;
  /** Same as `topNode` but for `ignore` */
  ignoreTopNode?: React.RefObject<Element> | Element | string | null;
  /**
   * Detect window `blur` event and interpret it as outside click.
   * Useful in iframes.
   */
  windowBlurAsOutsideClick?: boolean;
}

function setRef<T extends Node = Node>(
  ref: Exclude<React.Ref<T>, null | React.RefObject<T>> | React.MutableRefObject<T | null>,
  value: T | null
): void {
  if (typeof ref === 'function') {
    ref(value);
  } else {
    // eslint-disable-next-line no-param-reassign
    ref.current = value;
  }
}

function findUp(
  el: Element,
  mapOrSelectors: HtmlTagSelectorMap | string,
  topNode?: Element | null
): boolean {
  const tag = el.nodeName.toLowerCase();
  if (typeof mapOrSelectors === 'string') {
    if (el.matches(mapOrSelectors)) return true;
  } else if (
    tag in mapOrSelectors &&
    (mapOrSelectors[tag] == null || el.matches(mapOrSelectors[tag]))
  ) {
    return true;
  }
  if (el === topNode || !el.parentElement) {
    return false;
  }
  return findUp(el.parentElement, mapOrSelectors, topNode);
}

function getNode(node: NonNullable<OutsideClickListenerProps['topNode']>): Element | null {
  if (typeof node === 'string') {
    const el = document.getElementById(node);
    if (!el) {
      console.warn(`HTML element with id=${node} not found.`);
    }
    return el;
  }
  if (typeof node === 'object' && (node as React.RefObject<Element>).current instanceof Element) {
    return (node as React.RefObject<Element>).current;
  }
  return node as Element;
}

/**
 * Children must hold a ref to dom node.
 */
export default function OutsideClickListener({
  disabled = false,
  onOutsideClick,
  events = ['mousedown', 'touchstart'],
  stopPropagation = true,
  topNode,
  ignore,
  ignoreTopNode,
  windowBlurAsOutsideClick,
  children,
}: OutsideClickListenerProps): JSX.Element {
  const selfNodeRef = useRef<Element>(null);
  const ignoreRef = useRef(ignore);
  ignoreRef.current = ignore;

  const refHandler = React.useCallback(
    (node: Element | null) => {
      children.ref && setRef(children.ref, node); // pass ref to child ref handler if exists
      setRef(selfNodeRef, node);
    },
    [children.ref]
  );

  const outsideClickHandler = useCallback<OutsideClickListenerProps['onOutsideClick']>(
    (event) => {
      if (disabled || !selfNodeRef.current) return;

      const eventSourceNode = event.target instanceof Element ? event.target : undefined;

      // Ignore clicks on the component itself.
      if (eventSourceNode && selfNodeRef.current.contains(eventSourceNode)) {
        return;
      }

      const { current: ignoreMapOrFn } = ignoreRef;
      if (eventSourceNode && ignoreMapOrFn) {
        const isIgnored =
          typeof ignoreMapOrFn === 'function'
            ? ignoreMapOrFn(eventSourceNode)
            : findUp(eventSourceNode, ignoreMapOrFn, ignoreTopNode ? getNode(ignoreTopNode) : null);

        if (isIgnored) {
          // Just ignore and do nothing
          return;
        }
      }

      if (eventSourceNode && topNode) {
        const node = getNode(topNode);
        // If eventSourceNode is child of topNode
        if (node && node.contains(eventSourceNode)) {
          stopPropagation && event.stopPropagation();
          onOutsideClick(event);
        }
        // Otherwise do nothing
        return;
      }

      stopPropagation && event.stopPropagation();
      onOutsideClick(event);
    },
    [disabled, ignoreTopNode, onOutsideClick, stopPropagation, topNode]
  );

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    if (disabled) return () => {};

    const node = topNode ? getNode(topNode) : document;
    node && events.forEach((event) => node.addEventListener(event, outsideClickHandler));

    windowBlurAsOutsideClick && window.addEventListener('blur', outsideClickHandler);

    return () => {
      node && events.forEach((event) => node.removeEventListener(event, outsideClickHandler));

      windowBlurAsOutsideClick && window.removeEventListener('blur', outsideClickHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsideClickHandler, disabled, topNode]);

  return <>{React.cloneElement(children, { ref: refHandler })}</>;
}
