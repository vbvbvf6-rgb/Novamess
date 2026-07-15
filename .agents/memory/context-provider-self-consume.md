---
name: context-provider-self-consume
description: A component must never call useContext() for a context it also renders the Provider for in the same return — that hook call executes outside the provider's own subtree.
---

A React component that returns `<SomeProvider>{...}</SomeProvider>` cannot also call `useSomeContext()` in its own body — the hook call happens in the parent's render scope, before/outside the provider it returns, so it always throws "must be used within a Provider" (even though the mistake can look fine in dev if the crash path isn't exercised, then surface reliably in a production build/bundle order).

**Why:** Found this exact bug in `MainAppInner` (artifacts/pulse/src/App.tsx) — it called `useAppContext()` directly while also rendering `<AppProvider>` as its own return value.

**How to apply:** Fix by extracting the context-consuming logic into a small child component (e.g. `MainAppEffects`) rendered *inside* the `<Provider>` tree, not in the same component instance that renders the provider.
