---
title: 'Swift Concurrency: Mastering async/await and Actors'
date: 2024-08-20
permalink: /posts/2024/08/blog-post-august-2/
tags:
  - iOS
  - Swift
  - Concurrency
  - async/await
  - Actors
---

Swift concurrency with async/await and actors has revolutionized how we write concurrent code in iOS. This modern approach eliminates callback hell and makes concurrent programming more intuitive. Let's explore practical implementations with real, working code examples.

## 1. **Basic async/await Implementation**

```swift
import Foundation

// MARK: - Basic Async Functions
class DataService {
    func fetchUser(id: UUID) async throws -> User {
        // Simulate network delay
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        
        return User(
            id: id,
            name: "John Doe",
            email: "john@example.com",
            avatar: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func fetchUserPosts(userId: UUID) async throws -> [Post] {
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 seconds
        
        return [
            Post(id: UUID(), title: "First Post", content: "Hello World", author: User(id: userId, name: "", email: "", avatar: nil, createdAt: Date(), updatedAt: Date()), tags: [], likes: 0, comments: 0, isLiked: false, createdAt: Date(), updatedAt: Date()),
            Post(id: UUID(), title: "Second Post", content: "Another post", author: User(id: userId, name: "", email: "", avatar: nil, createdAt: Date(), updatedAt: Date()), tags: [], likes: 0, comments: 0, isLiked: false, createdAt: Date(), updatedAt: Date())
        ]
    }
}

// MARK: - Concurrent Data Fetching
class UserProfileViewModel: ObservableObject {
    @Published var user: User?
    @Published var posts: [Post] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private let dataService = DataService()
    
    func loadUserProfile(userId: UUID) async {
        await MainActor.run {
            isLoading = true
            error = nil
        }
        
        do {
            // Fetch user and posts concurrently
            async let user = dataService.fetchUser(id: userId)
            async let posts = dataService.fetchUserPosts(userId: userId)
            
            let (fetchedUser, fetchedPosts) = try await (user, posts)
            
            await MainActor.run {
                self.user = fetchedUser
                self.posts = fetchedPosts
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error
                self.isLoading = false
            }
        }
    }
}
```

## 2. **Actor Implementation for Thread Safety**

```swift
// MARK: - Bank Account Actor
actor BankAccount {
    private var balance: Double
    private let accountNumber: String
    
    init(accountNumber: String, initialBalance: Double) {
        self.accountNumber = accountNumber
        self.balance = initialBalance
    }
    
    func deposit(amount: Double) async throws {
        guard amount > 0 else {
            throw BankError.invalidAmount
        }
        
        balance += amount
        print("Deposited \(amount). New balance: \(balance)")
    }
    
    func withdraw(amount: Double) async throws {
        guard amount > 0 else {
            throw BankError.invalidAmount
        }
        
        guard balance >= amount else {
            throw BankError.insufficientFunds
        }
        
        balance -= amount
        print("Withdrew \(amount). New balance: \(balance)")
    }
    
    func getBalance() async -> Double {
        return balance
    }
    
    func transfer(amount: Double, to otherAccount: BankAccount) async throws {
        try await withdraw(amount: amount)
        try await otherAccount.deposit(amount: amount)
    }
}

enum BankError: Error {
    case invalidAmount
    case insufficientFunds
}

// MARK: - Usage Example
class BankingApp {
    func performTransactions() async {
        let account1 = BankAccount(accountNumber: "123", initialBalance: 1000)
        let account2 = BankAccount(accountNumber: "456", initialBalance: 500)
        
        // Concurrent transactions
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                try? await account1.deposit(amount: 200)
            }
            
            group.addTask {
                try? await account1.withdraw(amount: 100)
            }
            
            group.addTask {
                try? await account1.transfer(amount: 150, to: account2)
            }
        }
        
        let finalBalance1 = await account1.getBalance()
        let finalBalance2 = await account2.getBalance()
        
        print("Account 1 balance: \(finalBalance1)")
        print("Account 2 balance: \(finalBalance2)")
    }
}
```

## 3. **Task Management and Cancellation**

```swift
// MARK: - Task Management
class TaskManager {
    private var tasks: [UUID: Task<Void, Never>] = [:]
    
    func startBackgroundTask(id: UUID, operation: @escaping () async -> Void) {
        let task = Task {
            await operation()
        }
        tasks[id] = task
    }
    
    func cancelTask(id: UUID) {
        tasks[id]?.cancel()
        tasks.removeValue(forKey: id)
    }
    
    func cancelAllTasks() {
        tasks.values.forEach { $0.cancel() }
        tasks.removeAll()
    }
}

// MARK: - Cancellable Data Fetching
class CancellableDataFetcher {
    private let taskManager = TaskManager()
    
    func fetchDataWithTimeout<T>(operation: @escaping () async throws -> T, timeout: TimeInterval) async throws -> T {
        return try await withThrowingTaskGroup(of: T.self) { group in
            group.addTask {
                try await operation()
            }
            
            group.addTask {
                try await Task.sleep(nanoseconds: UInt64(timeout * 1_000_000_000))
                throw TimeoutError()
            }
            
            let result = try await group.next()!
            group.cancelAll()
            return result
        }
    }
}

struct TimeoutError: Error {}

// MARK: - Usage
class DataFetcherExample {
    func fetchUserData() async {
        let fetcher = CancellableDataFetcher()
        
        do {
            let user = try await fetcher.fetchDataWithTimeout(
                operation: { 
                    try await Task.sleep(nanoseconds: 2_000_000_000)
                    return User(id: UUID(), name: "Test", email: "test@example.com", avatar: nil, createdAt: Date(), updatedAt: Date())
                },
                timeout: 1.0
            )
            print("User fetched: \(user.name)")
        } catch {
            print("Error: \(error)")
        }
    }
}
```

## 4. **SwiftUI Integration**

```swift
import SwiftUI

// MARK: - Async Image Loader
struct AsyncImageView: View {
    let url: URL?
    @State private var image: UIImage?
    @State private var isLoading = false
    @State private var error: Error?
    
    var body: some View {
        Group {
            if let image = image {
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fit)
            } else if isLoading {
                ProgressView()
            } else if error != nil {
                Image(systemName: "photo")
                    .foregroundColor(.gray)
            }
        }
        .task {
            await loadImage()
        }
    }
    
    private func loadImage() async {
        guard let url = url else { return }
        
        isLoading = true
        error = nil
        
        do {
            let (data, _) = try await URLSession.shared.data(from: url)
            if let loadedImage = UIImage(data: data) {
                image = loadedImage
            }
        } catch {
            self.error = error
        }
        
        isLoading = false
    }
}

// MARK: - Async List View
struct AsyncListView: View {
    @StateObject private var viewModel = UserProfileViewModel()
    let userId: UUID
    
    var body: some View {
        List {
            if let user = viewModel.user {
                Section("User Info") {
                    Text("Name: \(user.name)")
                    Text("Email: \(user.email)")
                }
            }
            
            Section("Posts") {
                ForEach(viewModel.posts) { post in
                    VStack(alignment: .leading) {
                        Text(post.title)
                            .font(.headline)
                        Text(post.content)
                            .font(.body)
                    }
                }
            }
        }
        .refreshable {
            await viewModel.loadUserProfile(userId: userId)
        }
        .task {
            await viewModel.loadUserProfile(userId: userId)
        }
    }
}
```

## 5. **Error Handling and Recovery**

```swift
// MARK: - Retry Mechanism
class RetryManager {
    func retry<T>(attempts: Int, delay: TimeInterval = 1.0, operation: @escaping () async throws -> T) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...attempts {
            do {
                return try await operation()
            } catch {
                lastError = error
                if attempt < attempts {
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        throw lastError ?? NSError(domain: "RetryError", code: -1)
    }
}

// MARK: - Fallback Strategy
class FallbackDataService {
    private let primaryService = DataService()
    private let retryManager = RetryManager()
    
    func fetchUserWithFallback(id: UUID) async throws -> User {
        do {
            return try await retryManager.retry(attempts: 3) {
                try await primaryService.fetchUser(id: id)
            }
        } catch {
            // Fallback to cached data or default user
            return User(
                id: id,
                name: "Default User",
                email: "default@example.com",
                avatar: nil,
                createdAt: Date(),
                updatedAt: Date()
            )
        }
    }
}
```

## **Summary**

Swift concurrency provides powerful tools for modern iOS development:

1. **async/await**: Simplifies asynchronous code and eliminates callback hell
2. **Actors**: Provide thread-safe data access without locks
3. **Task Management**: Handle cancellation and timeouts effectively
4. **SwiftUI Integration**: Seamless integration with reactive UI updates
5. **Error Handling**: Robust error handling with retry and fallback mechanisms

By mastering these concepts, you can write more maintainable, performant, and reliable concurrent code in your iOS applications. 