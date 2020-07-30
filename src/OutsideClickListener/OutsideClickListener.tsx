import React, { useCallback, useEffect, useRef } from 'react';

export type HtmlTagSelectorMap = { [P in keyof JSX.IntrinsicElements]?: string | undefined };

export interface OutsideClickListenerProps {
  /**
   * Useful for dropdowns, when dropdown box is not expanded set this prop to `true` to avoid unnesessary `onOutsideClick` event.
   */
  disabled?: boolean;
  onOutsideClick: (nativeEvent: Event) => void;
  children: React.ReactElement & { ref?: React.Ref<Node> };
  /**
   * `id` or `Ref` or `Node`.
   * The most top parent node of child node to detect outside click.
   * Clicks of outside of `topNode` is not catched.
   * Useful if you need avoid propogation click event from child node to `topNode`.
   */
  topNode?: React.RefObject<Element> | Element | string | null;
  /** Do not fire `onOutsideClick` event for these elements (and their children) */
  ignore?: HtmlTagSelectorMap | ((node: Element) => boolean);
  /** Same as `topNode` but for `ignore` */
  ignoreTopNode?: React.RefObject<Element> | Element | string | null;
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

function findUp(el: Element, map: HtmlTagSelectorMap, topNode?: Element | null): boolean {
  const tag = el.nodeName.toLowerCase();
  if (tag in map && (map[tag] == null || el.matches(map[tag]))) {
    return true;
  }
  if (el === topNode || !el.parentElement) {
    return false;
  }
  return findUp(el.parentElement, map, topNode);
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
  topNode,
  ignore,
  ignoreTopNode,
  children,
}: OutsideClickListenerProps): JSX.Element {
  const selfNodeRef = useRef<Element | null>(null);
  const ignoreRef = useRef(ignore);

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

      const eventSourceNode = event.target as Element;
      // Ignore clicks on the component itself.
      if (selfNodeRef.current.contains(eventSourceNode)) {
        return;
      }

      const { current: ignoreMapOrFn } = ignoreRef;
      if (ignoreMapOrFn) {
        const isIgnored =
          typeof ignoreMapOrFn === 'object'
            ? findUp(eventSourceNode, ignoreMapOrFn, ignoreTopNode ? getNode(ignoreTopNode) : null)
            : ignoreMapOrFn(eventSourceNode);

        if (isIgnored) {
          // Just ignore and do nothing
          return;
        }
      }

      if (topNode) {
        const node = getNode(topNode);
        // If eventSourceNode is child of topNode
        if (node && node.contains(eventSourceNode)) {
          event.stopPropagation();
          onOutsideClick(event);
        }
        // Otherwise do nothing
        return;
      }

      event.stopPropagation();
      onOutsideClick(event);
    },
    [disabled, ignoreTopNode, onOutsideClick, topNode]
  );

  useEffect(() => {
    ignoreRef.current = ignore;
  }, [ignore]);

  useEffect(() => {
    const node = topNode ? getNode(topNode) : document;

    if (!disabled && node) {
      node.addEventListener('mousedown', outsideClickHandler);
      node.addEventListener('touchstart', outsideClickHandler);
    }

    return () => {
      if (node) {
        node.removeEventListener('mousedown', outsideClickHandler);
        node.removeEventListener('touchstart', outsideClickHandler);
      }
    };
  }, [outsideClickHandler, disabled, topNode]);

  return <>{React.cloneElement(children, { ref: refHandler })}</>;
}
