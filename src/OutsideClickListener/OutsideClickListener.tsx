import React, { useCallback, useEffect, useRef } from 'react';

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
  topNode?: React.RefObject<Node> | Node | string | null;
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

function getNode(node: NonNullable<OutsideClickListenerProps['topNode']>): Node | null {
  if (typeof node === 'string') {
    const el = document.getElementById(node);
    if (!el) {
      console.warn(`HTML element with id=${node} not found.`);
    }
    return el;
  }
  if (typeof node === 'object' && (node as React.RefObject<Node>).current instanceof Node) {
    return (node as React.RefObject<Node>).current;
  }
  return node as Node;
}

/**
 * Children must hold a ref to dom node.
 */
export default function OutsideClickListener({
  disabled = false,
  onOutsideClick,
  topNode,
  children,
}: OutsideClickListenerProps): JSX.Element {
  const selfNodeRef = useRef<Node | null>(null);

  const refHandler = React.useCallback(
    (node: Node | null) => {
      children.ref && setRef(children.ref, node); // pass ref to child ref handler if exists
      setRef(selfNodeRef, node);
    },
    [children.ref]
  );

  const outsideClickHandler = useCallback<OutsideClickListenerProps['onOutsideClick']>(
    (event) => {
      if (disabled || !selfNodeRef.current) return;

      const eventSourceNode = event.target as Node;
      // Ignore clicks on the component itself.
      if (selfNodeRef.current.contains(eventSourceNode)) {
        return;
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
    [disabled, onOutsideClick, topNode]
  );

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
