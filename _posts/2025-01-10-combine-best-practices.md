---
title: "Mastering Combine in 2025: Production Patterns, Pitfalls, and Testing"
date: 2025-01-10
permalink: /posts/2025/01/combine-best-practices/
tags:
  - iOS
  - Swift
  - Combine
  - Architecture
  - Testing
---

Combine is still a fantastic fit for reactive pipelines in UIKit and SwiftUI. This guide codifies production patterns I use for teams shipping at scale—focusing on back‑pressure, cancellation, retries, schedulers, and testability. ⚙️

## 1) Define inputs/outputs explicitly (avoid AnyPublisher everywhere)

Create typed facades for clarity and testability.

```swift
// MARK: - API
protocol ArticleService {
  func fetchFeed() -> AnyPublisher<[Article], Error>
  func fetchDetail(id: UUID) -> AnyPublisher<ArticleDetail, Error>
}

// MARK: - ViewModel IO
struct FeedInput {
  let appear: AnyPublisher<Void, Never>
  let pullToRefresh: AnyPublisher<Void, Never>
}

struct FeedOutput {
  let items: AnyPublisher<[ArticleRowViewModel], Never>
  let isRefreshing: AnyPublisher<Bool, Never>
  let error: AnyPublisher<String?, Never>
}
```

## 2) Back‑pressure and debouncing 🧯

Throttle noisy inputs (search, scrolling) with `debounce`/`throttle` and ensure UI picks main run loop.

```swift
func bindSearch(
  query: AnyPublisher<String, Never>,
  service: SearchService
) -> AnyPublisher<[Result], Never> {
  query
    .removeDuplicates()
    .debounce(for: .milliseconds(250), scheduler: DispatchQueue.main)
    .flatMapLatest { q in
      service.search(q)
        .catch { _ in Just([]) }
    }
    .receive(on: DispatchQueue.main)
    .eraseToAnyPublisher()
}

// Helper: Rx-like flatMapLatest
extension Publisher {
  func flatMapLatest<T: Publisher>(_ transform: @escaping (Output) -> T) -> AnyPublisher<T.Output, Failure> where T.Failure == Failure {
    map(transform)
      .switchToLatest()
      .eraseToAnyPublisher()
  }
}
```

## 3) Cancellation and lifetimes ⏳

Use a `Set<AnyCancellable>` per owner. For one‑shot chains inside methods, store cancellables locally.

```swift
final class FeedViewModel: ObservableObject {
  @Published private(set) var rows: [ArticleRowViewModel] = []
  @Published private(set) var isRefreshing = false
  @Published private(set) var errorMessage: String?

  private var bag = Set<AnyCancellable>()

  func load(service: ArticleService) {
    isRefreshing = true
    service.fetchFeed()
      .map { $0.map(ArticleRowViewModel.init) }
      .receive(on: DispatchQueue.main)
      .sink(receiveCompletion: { [weak self] completion in
        guard let self else { return }
        self.isRefreshing = false
        if case .failure(let e) = completion { self.errorMessage = e.localizedDescription }
      }, receiveValue: { [weak self] rows in
        self?.rows = rows
      })
      .store(in: &bag)
  }
}
```

## 4) Retries with jitter and circuit breakers 🔁

```swift
extension Publisher {
  func retryWithJitter(_ times: Int, base: Double = 0.3) -> AnyPublisher<Output, Failure> {
    self.catch { _ -> AnyPublisher<Output, Failure> in
      var attempt = 0
      return Deferred {
        Future<Output, Failure> { promise in
          func scheduleRetry() {
            guard attempt < times else { return }
            attempt += 1
            let backoff = base * pow(2, Double(attempt))
            let jitter = Double.random(in: 0...(backoff * 0.2))
            DispatchQueue.global().asyncAfter(deadline: .now() + backoff + jitter) {
              _ = self.retry(0).sink(receiveCompletion: { comp in
                if case .failure(let e) = comp { scheduleRetry() } // continue
              }, receiveValue: { value in
                promise(.success(value))
              })
            }
          }
          scheduleRetry()
        }
      }.eraseToAnyPublisher()
    }.eraseToAnyPublisher()
  }
}
```

For APIs: add a simple circuit breaker (open on consecutive failures, half‑open after cool‑down).

## 5) Sharing work and caching 📦

Use `share(replay:scope:)` to avoid duplicate side effects.

```swift
let feedShared = service.fetchFeed()
  .share(replay: 1, scope: .whileConnected)

let rows = feedShared.map { $0.map(ArticleRowViewModel.init) }
let featured = feedShared.map { $0.prefix(3) }
```

## 6) Bridging async/await and Combine 🔗

Leverage `Future` for one‑shot bridges, or expose async streams as `AnyPublisher`.

```swift
func loadUser() -> AnyPublisher<User, Error> {
  Future { promise in
    Task {
      do { promise(.success(try await api.user())) }
      catch { promise(.failure(error)) }
    }
  }
  .eraseToAnyPublisher()
}
```

## 7) Testing pipelines 🧪

Use `ImmediateScheduler`/`TestScheduler` patterns and deterministic inputs.

```swift
final class FeedViewModelTests: XCTestCase {
  func testLoadSuccess() {
    let service = StubService(result: .success([Article(id: UUID(), title: "Hello")]))
    let vm = FeedViewModel()
    vm.load(service: service)
    XCTAssertEqual(vm.rows.count, 1)
    XCTAssertFalse(vm.isRefreshing)
  }
}
```

## 8) Checklist ✅

- Explicit IO types, minimal `AnyPublisher` in signatures
- Debounce/throttle noisy inputs, receive(on: .main)
- Clear lifetimes; localized cancellables when appropriate
- Retries with jitter; simple breakers for flaky endpoints
- Share side effects; cache with replay
- Bridge to async/await where natural
- Deterministic tests with fakes and schedulers

References: Apple’s Combine documentation, WWDC sessions, and open‑source operator libraries.


