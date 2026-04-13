"""Benchmark: parseRegistry() per-request cache performance."""
from plone.app.mosaic.registry import PARSE_REGISTRY_CACHE_KEY
from plone.app.mosaic.testing import PLONE_APP_MOSAIC_INTEGRATION
from plone.registry.interfaces import IRegistry
from zope.component import getUtility

import time
import unittest


def _measure(func, iterations):
    """Run func `iterations` times and return (mean_ms, std_ms, times)."""
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        func()
        elapsed = (time.perf_counter() - start) * 1000
        times.append(elapsed)
    mean = sum(times) / len(times)
    variance = sum((t - mean) ** 2 for t in times) / len(times)
    std = variance**0.5
    return mean, std, times


def _bar(value, max_value, width=30):
    filled = int(round(value / max_value * width)) if max_value > 0 else 0
    filled = min(filled, width)
    return "█" * filled + "░" * (width - filled)


class TestBenchmarkParseRegistry(unittest.TestCase):
    layer = PLONE_APP_MOSAIC_INTEGRATION

    def test_benchmark_parse_registry(self):
        """Benchmark: parseRegistry() with and without per-request cache."""
        from plone.app.mosaic.interfaces import IMosaicRegistryAdapter

        registry = getUtility(IRegistry)
        adapter = IMosaicRegistryAdapter(registry)
        request = self.layer["request"]
        iterations = 50
        calls_per_iteration = 10

        # Count registry records to show context
        mosaic_records = sum(
            1
            for r in registry.records
            if r.startswith("plone.app.mosaic")
        )

        print("\n")
        print("=" * 72)
        print("  BENCHMARK: MosaicRegistry.parseRegistry() — Per-Request Cache")
        print("=" * 72)
        print()
        print(f"  Mosaic registry records: {mosaic_records}")
        print(f"  Calls per iteration: {calls_per_iteration}")
        print(f"  Iterations: {iterations}")
        print()

        # WITHOUT cache: clear cache before each call
        def run_no_cache():
            for _ in range(calls_per_iteration):
                request.environ.pop(PARSE_REGISTRY_CACHE_KEY, None)
                try:
                    del request.__annotations__[PARSE_REGISTRY_CACHE_KEY]
                except (AttributeError, KeyError):
                    pass
                adapter.parseRegistry()

        # WITH cache: clear only once at start, let cache work
        def run_with_cache():
            request.environ.pop(PARSE_REGISTRY_CACHE_KEY, None)
            try:
                del request.__annotations__[PARSE_REGISTRY_CACHE_KEY]
            except (AttributeError, KeyError):
                pass
            for _ in range(calls_per_iteration):
                adapter.parseRegistry()

        # Warmup
        for _ in range(5):
            run_no_cache()
            run_with_cache()

        mean_no_cache, std_no_cache, _ = _measure(run_no_cache, iterations)
        mean_cached, std_cached, _ = _measure(run_with_cache, iterations)

        speedup = mean_no_cache / mean_cached if mean_cached > 0 else 1.0
        max_val = max(mean_no_cache, mean_cached)

        bar_no = _bar(mean_no_cache, max_val, 40)
        bar_ca = _bar(mean_cached, max_val, 40)

        print(f"  {'Method':<20} {'Mean (ms)':>10} {'Std (ms)':>10}  Chart")
        print(f"  {'─' * 20} {'─' * 10} {'─' * 10}  {'─' * 40}")
        print(
            f"  {'No cache':<20} {mean_no_cache:>9.2f}  {std_no_cache:>9.2f}  {bar_no}"
        )
        print(
            f"  {'With cache':<20} {mean_cached:>9.2f}  {std_cached:>9.2f}  {bar_ca}"
        )
        print()
        print(f"  Speedup: {speedup:.1f}x")
        print()
        print("=" * 72)
        print()
