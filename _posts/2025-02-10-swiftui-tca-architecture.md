---
title: "Architecting SwiftUI Apps with The Composable Architecture (TCA)"
date: 2025-02-10
permalink: /posts/2025/02/swiftui-tca-architecture/
tags:
  - iOS
  - Swift
  - SwiftUI
  - TCA
  - Architecture
---

TCA scales SwiftUI apps by making state, actions, effects, and dependencies explicit. This primer shows a production‑grade shape: feature isolation, dependency injection, effect cancellation, testing, and navigation. 🧩

## 1) Feature anatomy

```swift
import ComposableArchitecture

struct Feed: Reducer {
  struct State: Equatable {
    var items: IdentifiedArrayOf<Item.State> = []
    var isLoading = false
    var alert: AlertState<Action>?
  }

  enum Action: Equatable {
    case task
    case itemsResponse(Result<[Item.State], Error>)
    case item(id: Item.State.ID, action: Item.Action)
    case retryTapped
    case alertDismissed
  }

  @Dependency(\.["feedClient"]) var feedClient: () async throws -> [Item.State]

  var body: some ReducerOf<Self> {
    Reduce { state, action in
      switch action {
      case .task, .retryTapped:
        state.isLoading = true
        return .run { send in
          await send(.itemsResponse(Result { try await feedClient() }))
        }

      case let .itemsResponse(.success(items)):
        state.isLoading = false
        state.items = IdentifiedArray(uniqueElements: items)
        return .none

      case let .itemsResponse(.failure(error)):
        state.isLoading = false
        state.alert = .init(title: { TextState(error.localizedDescription) })
        return .none

      case .item, .alertDismissed:
        return .none
      }
    }
    .forEach(\.$items, action: /Action.item) { Item() }
  }
}
```

## 2) View binding and effects

```swift
struct FeedView: View {
  let store: StoreOf<Feed>

  var body: some View {
    WithViewStore(store, observe: { $0 }) { vs in
      List {
        ForEachStore(store.scope(state: \.$items, action: Feed.Action.item)) { itemStore in
          ItemView(store: itemStore)
        }
      }
      .overlay { if vs.isLoading { ProgressView() } }
      .task { await vs.send(.task).finish() }
      .alert(store: store.scope(state: \.$alert), dismiss: .alertDismissed)
      .refreshable { vs.send(.retryTapped) }
    }
  }
}
```

## 3) Dependencies and cancellation

Inject side effects via `DependencyValues` so tests can stub them. Use `.run` with cooperative cancellation.

```swift
enum FeedClientKey: DependencyKey {
  static let liveValue: () async throws -> [Item.State] = {
    try await Task.sleep(nanoseconds: 300_000_000)
    return [Item.State(id: UUID(), title: "Hello")]
  }
}

extension DependencyValues { subscript(key: String) -> any Sendable { get { self[FeedClientKey.self] } set { self[FeedClientKey.self] = newValue as! () async throws -> [Item.State] } } }
```

## 4) Testing reducers 🧪

```swift
@MainActor
final class FeedTests: XCTestCase {
  func testHappyPath() async {
    let store = TestStore(initialState: Feed.State()) { Feed() }
    store.dependencies["feedClient"] = { [Item.State(id: UUID(), title: "A")] }
    await store.send(.task) { $0.isLoading = true }
    await store.receive(.itemsResponse(.success([Item.State(id: .init(), title: "A")]))) {
      $0.isLoading = false
      $0.items.count = 1
    }
  }
}
```

## 5) Navigation

Model navigation as state. Drive `NavigationStack` from store to avoid hidden sources of truth.

```swift
struct App: Reducer {
  struct State: Equatable { var path = StackState<Screen.State>() }
  enum Action: Equatable { case path(StackAction<Screen.State, Screen.Action>) }
  var body: some ReducerOf<Self> { Reduce { _, _ in .none } .forEach(\.$path, action: /Action.path) { Screen() } }
}
```

TCA’s explicitness pays off in large apps: feature isolation, reliable tests, crash‑free navigation, and production‑safe effects.


