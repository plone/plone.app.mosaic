Improve performance by caching `parseRegistry()` results per-request and adding `@view.memoize` to the `MainTemplate.layout` property.

JavaScript frontend performance improvements:

- Parallel tile initialization: tiles now load concurrently via `Promise.all()` instead of sequentially.
- Replace 12 regex string replacements in `getDomTreeFromHtml()` with a single `DOMParser.parseFromString()` call.
- Efficient blur: recursive walk of only the DOM spine (~50-100 nodes) instead of `querySelectorAll("*")` + `getComputedStyle()` on 500-2000+ elements.
- Parallel dynamic imports: `ActionManager` and `LayoutManager` loaded concurrently.
- Fix `applyLayout()` Promise chain: replace jQuery `$.ajax` with native `fetch()` + `async/await`.
- Fix `scanRegistry()` memory leak: use namespaced events to prevent handler accumulation.
- Cache tile buttons in `focus()`: reuse existing buttons instead of rebuilding on every click.
- Remove unnecessary `regenerator-runtime` imports (native async/await supported by browserslist target).

@petschki
