## @ai-json-renderer/react

React renderer and helpers for AI-generated JSON UI.

This package takes JSON produced by a model (using the catalog from @ai-json-renderer/core) and renders it into real React components. It also includes providers and hooks to handle data, actions, validation, and streaming.

What it provides

- `Renderer` to render JSON UI trees
- Providers for data, actions, visibility, and validation
- `useUIStream` hook for streaming JSONL responses
- Shared types and helpers for React apps

Install

```bash
pnpm add @ai-json-renderer/react
```

Basic example

```tsx
import {
	Renderer,
	JSONUIProvider,
	DataProvider,
	VisibilityProvider,
	ActionProvider,
	useUIStream,
} from "@ai-json-renderer/react";

export function App() {
	const { tree, isLoading, generate } = useUIStream({
		endpoint: "/api/generate",
	});

	return (
		<DataProvider initialData={{}}>
			<VisibilityProvider>
				<ActionProvider handlers={{}}>
					<JSONUIProvider>
						<button onClick={() => generate("Create a dashboard")}
							disabled={isLoading}
						>
							Generate
						</button>
						<Renderer tree={tree} />
					</JSONUIProvider>
				</ActionProvider>
			</VisibilityProvider>
		</DataProvider>
	);
}
```

How it works

1) Your API returns JSONL (streamed JSON lines).
2) `useUIStream` reads that stream and builds a UI tree.
3) `Renderer` turns the tree into real components.
4) Providers supply data, actions, and validation.

What it supports

- Streaming updates while the model responds
- Safe rendering limited to your catalog
- Data binding for real values and charts
- Action handlers for buttons and forms
- Visibility and validation rules
