# Outside click listener for React

[![npm package](https://img.shields.io/npm/v/react-outside-click-listener.svg)](https://www.npmjs.org/package/react-outside-click-listener)

## Installation

```sh
npm install --save react-outside-click-listener
# or
yarn add react-outside-click-listener
```

## Usage example

```tsx
import { OutsideClickListener } from 'react-outside-click-listener';

function MyComponent() {
  return (
    <OutsideClickListener
      disabled={condition} // Disable by some condition
      ignore=".css-class" // CSS selector for ignored elements.
      events={['mousedown', 'touchstart']} // Events which detects as clicks. Default value.
      onOutsideClick={callback}
    >
      {/* Child must hold a ref to dom node. */}
      <Child />
    </OutsideClickListener>
  );
}
```
