---
name: Mobile/orientation bug patterns
description: Recurring patterns for mobile, landscape, and safe-area bugs found across the Nova frontend.
---

## Key patterns to check when building/reviewing mobile UI

### Landscape textarea overflow
Max height of 140px for textareas covers the entire visible area in landscape mobile (viewport ~320px). Always cap dynamically:
```js
const maxH = Math.min(140, Math.floor(window.innerHeight / 4));
```

### Modals on small screens
Any bottom-sheet or centered modal needs `max-h-[90dvh] overflow-y-auto` to stay within the viewport. Without this, the lower portion of the modal is unreachable on iPhone SE or landscape.

### Stories / fullscreen safe-area in landscape
Portrait safe-area is `env(safe-area-inset-top)` only. In landscape, iPhone notch moves to the SIDE — must also apply `env(safe-area-inset-left)` and `env(safe-area-inset-right)` to progress bars and header elements.

### Hover-only action buttons
Never use `opacity-0 group-hover:opacity-100` for important actions (recall, etc.) — touch devices have no hover state. Use `opacity-100 md:opacity-0 md:group-hover:opacity-100` instead.

### Canvas getContext null assertion
`canvas.getContext("2d")` can return null in constrained environments or if canvas size is 0. Always null-check, never use `!` assertion.

### Event listener cleanup
Anonymous functions passed to `addEventListener` cannot be removed. Always store the handler in a named variable before adding, then use the same reference to remove.

### Autofocus on mobile
`inputRef.current?.focus()` in a useEffect causes the keyboard to pop up on mobile. Gate with `window.matchMedia("(hover: hover)").matches` to restrict autofocus to pointer devices only.

### Video note camera switching
For mobile video notes, record the camera `MediaStream` directly with bounded video/audio bitrates. If `applyConstraints` is unavailable, replace the video track on the same stream object instead of creating a new stream; this keeps `MediaRecorder` alive and avoids a dark/frozen recording after a lens switch.

**Why:** recording a canvas fed by a preview element can turn dark when mobile browsers reinitialize the camera during a front/rear switch, and swapping streams can end the recorder.

**How to apply:** keep the preview circular with CSS/object-cover, but do not use the preview canvas as the recording source unless a platform-specific fallback is required.

### Image processing race condition
When multiple images can be selected in rapid succession, use a ref-based request ID counter to cancel stale callbacks:
```js
const loadIdRef = useRef(0);
const myId = ++loadIdRef.current;
img.onload = () => { if (loadIdRef.current !== myId) return; ... };
```

### Calls modal keyboard handling
Centered modals (`top-1/2 -translate-y-1/2`) get pushed off screen when mobile keyboard opens. Use a bottom-sheet pattern on small screens: `bottom-0 sm:top-1/2 rounded-t-3xl sm:rounded-3xl`.
