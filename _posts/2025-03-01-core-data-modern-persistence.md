---
title: "Core Data in 2025: Modern Persistence Patterns for SwiftUI and Concurrency"
date: 2025-03-01
permalink: /posts/2025/03/core-data-modern-persistence/
tags:
  - iOS
  - Swift
  - CoreData
  - Persistence
  - SwiftUI
---

Core Data remains the go‑to ORM on Apple platforms. This post shows a clean, modern setup that works with Swift Concurrency, background contexts, diffable snapshots, and testing. 🗄️

## 1) Stack: NSPersistentContainer + background contexts

```swift
enum Persistence {
  static let container: NSPersistentContainer = {
    let c = NSPersistentContainer(name: "Model")
    c.loadPersistentStores { _, error in precondition(error == nil, "Store error: \(String(describing: error))") }
    c.viewContext.mergePolicy = NSMergeByPropertyObjectTrumpMergePolicy
    c.viewContext.automaticallyMergesChangesFromParent = true
    return c
  }()

  static var viewContext: NSManagedObjectContext { container.viewContext }
  static func bgContext() -> NSManagedObjectContext { container.newBackgroundContext() }
}
```

## 2) Async fetch/save helpers 🧵

```swift
extension NSManagedObjectContext {
  func performAsync<T>(_ work: @escaping (NSManagedObjectContext) throws -> T) async throws -> T {
    try await withCheckedThrowingContinuation { cont in
      self.perform {
        do { cont.resume(returning: try work(self)) }
        catch { cont.resume(throwing: error) }
      }
    }
  }
}
```

## 3) Import pipeline: deduplicate + batch insert 🚚

```swift
struct ArticleDTO: Decodable { let id: UUID; let title: String }

func upsertArticles(_ dtos: [ArticleDTO]) async throws {
  let ctx = Persistence.bgContext()
  try await ctx.performAsync { ctx in
    for dto in dtos {
      let req: NSFetchRequest<Article> = Article.fetchRequest()
      req.predicate = NSPredicate(format: "id == %@", dto.id as CVarArg)
      let obj = try ctx.fetch(req).first ?? Article(context: ctx)
      obj.id = dto.id
      obj.title = dto.title
    }
    if ctx.hasChanges { try ctx.save() }
  }
}
```

## 4) SwiftUI integration 🧩

```swift
@main
struct AppMain: App {
  var body: some Scene {
    WindowGroup {
      FeedView()
        .environment(\.managedObjectContext, Persistence.viewContext)
    }
  }
}

struct FeedView: View {
  @FetchRequest(sortDescriptors: [NSSortDescriptor(keyPath: \Article.title, ascending: true)])
  private var articles: FetchedResults<Article>

  var body: some View {
    List(articles) { Text($0.title ?? "") }
  }
}
```

## 5) Lightweight migrations & merge policies 🔧

- Prefer additive schema changes; bump model version and set current.
- Use `NSMergeByPropertyObjectTrumpMergePolicy` to resolve client‑wins vs server‑wins as needed.
- Turn on `automaticallyMergesChangesFromParent` to reflect background saves.

## 6) Testing 🧪

```swift
final class PersistenceTests: XCTestCase {
  func testInsertFetch() throws {
    let c = NSPersistentContainer(name: "Model")
    let desc = NSPersistentStoreDescription()
    desc.type = NSInMemoryStoreType
    c.persistentStoreDescriptions = [desc]
    c.loadPersistentStores(completionHandler: {_,_ in })

    let ctx = c.viewContext
    let a = Article(context: ctx); a.id = UUID(); a.title = "Hello"
    try ctx.save()

    let req: NSFetchRequest<Article> = Article.fetchRequest()
    let results = try ctx.fetch(req)
    XCTAssertEqual(results.count, 1)
  }
}
```

This setup delivers safe concurrency, smooth SwiftUI updates, and reliable imports without blocking the main thread.


