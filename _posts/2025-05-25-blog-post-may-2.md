---
title: 'Swift Concurrency in Practice: Structured Concurrency, Actors, and AsyncSequence'
date: 2025-05-25
permalink: /posts/2025/05/blog-post-may-2/
tags:
  - iOS
  - Swift
  - Concurrency
  - Actors
  - AsyncAwait
excerpt: "Swift Concurrency makes async code safer and easier to reason about. This post shows practical patterns for using async/await, task groups, actors, and AsyncSequence in production iOS apps."
header:
  overlay_image: https://images.unsplash.com/photo-1558494949-ef010cbdcc31?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80
  overlay_filter: 0.5
  caption: "Swift concurrency and modern asynchronous programming patterns"
---

<!--more-->

## 1. Structured Concurrency

Swift Concurrency makes async code safer and easier to reason about. This post shows practical patterns for using `async/await`, task groups, actors, and `AsyncSequence` in production iOS apps.

## 1. Structured Concurrency

```swift
struct FeedService {
    func loadHome() async throws -> HomeViewModel {
        async let articles = fetchArticles()
        async let highlights = fetchHighlights()
        async let profile = fetchProfile()

        return try await HomeViewModel(
            articles: articles,
            highlights: highlights,
            profile: profile
        )
    }
}
```

Benefits: automatic child task cancellation, predictable lifetimes, and better error aggregation.

## 2. Task Groups for Fan‑out/Fan‑in

```swift
func fetchDetails(ids: [UUID]) async throws -> [Detail] {
    try await withThrowingTaskGroup(of: Detail.self) { group in
        for id in ids {
            group.addTask { try await fetchDetail(id: id) }
        }

        var results: [Detail] = []
        for try await detail in group { results.append(detail) }
        return results
    }
}
```

Control concurrency with a Semaphore or `AsyncSemaphore` if the backend has QPS limits.

## 3. Actors for Data Races

```swift
actor ImageCache {
    private var store: [URL: UIImage] = [:]

    func get(_ url: URL) -> UIImage? { store[url] }
    func set(_ image: UIImage, for url: URL) { store[url] = image }
}

let cache = ImageCache()

func loadImage(url: URL) async throws -> UIImage {
    if let cached = await cache.get(url) { return cached }
    let image = try await download(url)
    await cache.set(image, for: url)
    return image
}
```

Use `@MainActor` for UI types or view models that must run on the main thread.

## 4. Cancellation and Timeouts

```swift
func search(query: String) async throws -> [ResultItem] {
    try Task.checkCancellation()

    return try await withThrowingTaskGroup(of: [ResultItem].self) { group in
        let deadline = ContinuousClock().now.advanced(by: .seconds(2))

        group.addTask { try await searchRemote(query) }
        group.addTask { try await searchLocal(query) }

        return try await withTaskCancellationHandler {
            for try await result in group { return result }
            return []
        } onCancel: {
            group.cancelAll()
        }
    }
}
```

Propagate cancellation to child tasks and cancel stale requests when the query changes.

## 5. AsyncSequence for Streams

```swift
struct EventStream: AsyncSequence {
    typealias Element = Event

    struct AsyncIterator: AsyncIteratorProtocol {
        var client: EventClient
        mutating func next() async -> Event? { await client.nextEvent() }
    }

    let client: EventClient
    func makeAsyncIterator() -> AsyncIterator { AsyncIterator(client: client) }
}

@MainActor
final class EventViewModel: ObservableObject {
    @Published var events: [Event] = []

    func start(stream: EventStream) {
        Task { [weak self] in
            guard let self else { return }
            for await event in stream { self.events.append(event) }
        }
    }
}
```

Map streaming network data (Server‑Sent Events, WebSockets) into UI updates with back‑pressure handled by the runtime.

## 6. Testing Concurrency Code

```swift
final class FeedServiceTests: XCTestCase {
    func testLoadHome() async throws {
        let sut = FeedService()
        let home = try await sut.loadHome()
        XCTAssertFalse(home.articles.isEmpty)
    }
}
```

Use `XCTest`'s async support and `@TestActor` isolation where appropriate.

These patterns yield predictable, cancelable, and testable async code that scales with product complexity without introducing data races or callback hell.



## 7. Actor Reentrancy, Isolation, and Non‑isolated APIs

Actors are reentrant: they may suspend between `await` points and process other messages. Guard invariants carefully.

```swift
actor RateLimiter {
    private var lastCall: Date = .distantPast
    private let minInterval: TimeInterval = 0.2

    func execute<T>(_ work: @Sendable () async throws -> T) async rethrows -> T {
        let now = Date()
        let delta = now.timeIntervalSince(lastCall)
        if delta < minInterval { try await Task.sleep(nanoseconds: UInt64((minInterval - delta) * 1_000_000_000)) }
        lastCall = Date()
        return try await work()
    }
}
```

Expose computed properties that are cheap as `nonisolated` if they don’t access actor state, to avoid hops.

## 8. Sendable, @MainActor, and Isolation Violations

Mark cross‑concurrency data as `Sendable` to prevent thread‑unsafety.

```swift
struct Profile: Sendable { let id: UUID; let name: String }

@MainActor
final class ProfileViewModel: ObservableObject {
    @Published var state: State = .idle
}
```

Use `@unchecked Sendable` only for carefully audited, immutable wrappers.

## 9. Structured Cancellation Patterns

Tie the lifetime of work to view lifecycles.

```swift
@MainActor
final class SearchViewModel: ObservableObject {
    @Published var results: [ResultItem] = []
    private var searchTask: Task<Void, Never>?

    func updateQuery(_ q: String) {
        searchTask?.cancel()
        searchTask = Task { [weak self] in
            guard let self else { return }
            do {
                let items = try await self.search(query: q)
                self.results = items
            } catch is CancellationError { /* ignore */ }
        }
    }
}
```

## 10. AsyncSequence Operators and Back‑pressure

Compose sequences with transformations and buffering.

```swift
extension AsyncSequence {
    func throttle(for interval: Duration) -> AsyncThrowingStream<Element, Error> where Self: Sendable {
        AsyncThrowingStream { continuation in
            Task {
                var last = ContinuousClock.now
                for try await value in self {
                    let now = ContinuousClock.now
                    if now.durationSince(last) >= interval { 
                        continuation.yield(value)
                        last = now
                    }
                }
                continuation.finish()
            }
        }
    }
}
```

Use buffering (`AsyncChannel`, `AsyncStream(bufferingPolicy:)`) to decouple producers/consumers.

## 11. Task Priorities, Detachment, and Executors

Prefer structured tasks; use `Task.detached` sparingly for fire‑and‑forget, and set priorities intentionally.

```swift
Task(priority: .userInitiated) { await refreshAboveTheFold() }
Task(priority: .utility) { await prefetchBelowTheFold() }
```

Avoid doing heavy work on the main actor; annotate compute‑heavy APIs as non‑main.

## 12. Bridging Combine and Async/Await

```swift
extension Publisher where Failure == Never {
    func values() async -> AsyncStream<Output> {
        AsyncStream { continuation in
            let cancellable = sink { continuation.finish() } receiveValue: { continuation.yield($0) }
            continuation.onTermination = { _ in cancellable.cancel() }
        }
    }
}
```

This lets you iterate publisher values with `for await` to simplify view models.

## 13. Testing Concurrency: Determinism and Time

Use `ImmediateClock`/`TestClock` or dependency‑injected clocks to control time in tests.

```swift
struct Timeouts { var clock: any Clock = ContinuousClock() }

final class SearchTests: XCTestCase {
    func testThrottle() async throws {
        let testClock = TestClock()
        // Inject testClock into throttled sequence to advance time deterministically
    }
}
```

## 14. Concurrency Checklist

- No actor isolation violations at build with strict concurrency checks
- Cancellation on navigation and query change
- Bounded parallelism for fan‑out requests
- `@MainActor` only where UI‑critical
- Back‑pressure on streams; buffering where needed
