import React from 'react';

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
  /** Do not fire `onOutsideClick` event for these elements (and their children).
   * Tag selector map, callback, css selector. */
  ignore?: HtmlTagSelectorMap | ((node: Element) => boolean) | string;
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
    ref.current = value;
  }
}

function findUp(
  el: Element,
  mapOrSelectors: HtmlTagSelectorMap | string,
  topNode?: Element | null
): boolean {
  const tag = el.nodeName.toLowerCase() as keyof HtmlTagSelectorMap;
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
 * Child must hold a ref to dom node.
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
  const selfNodeRef = React.useRef<Element>(null);
  const ignoreRef = React.useRef(ignore);
  ignoreRef.current = ignore;

  const refHandler = React.useCallback(
    (node: Element | null) => {
      if (children.ref) setRef(children.ref, node); // pass ref to child ref handler if exists
      setRef(selfNodeRef, node);
    },
    [children.ref]
  );

  const outsideClickHandler = React.useCallback<OutsideClickListenerProps['onOutsideClick']>(
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
          if (stopPropagation) event.stopPropagation();
          onOutsideClick(event);
        }
        // Otherwise do nothing
        return;
      }

      if (stopPropagation) event.stopPropagation();
      onOutsideClick(event);
    },
    [disabled, ignoreTopNode, onOutsideClick, stopPropagation, topNode]
  );

  React.useEffect(() => {
    if (disabled) return undefined;

    const node = topNode ? getNode(topNode) : document;
    if (node) events.forEach((event) => node.addEventListener(event, outsideClickHandler));
    if (windowBlurAsOutsideClick) window.addEventListener('blur', outsideClickHandler);

    return () => {
      if (node) events.forEach((event) => node.removeEventListener(event, outsideClickHandler));
      if (windowBlurAsOutsideClick) window.removeEventListener('blur', outsideClickHandler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outsideClickHandler, disabled, topNode]);

  return <>{React.cloneElement(children, { ref: refHandler })}</>;
}
