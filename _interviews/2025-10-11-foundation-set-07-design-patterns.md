---
title: "Foundation Set 7: iOS Design Patterns (30 Q&A)"
description: "Master iOS design patterns: Creational (Singleton, Factory, DI), Behavioral (Delegate, Observer, Notification), and Architectural (MVC, MVVM, VIPER). Essential for senior iOS roles."
date: 2025-10-11
category: foundation
permalink: /interviews/foundation-design-patterns/
tags:
  - Design Patterns
  - Architecture
  - Singleton
  - Delegate
  - MVVM
  - VIPER
difficulty: Medium-Hard
excerpt: "30 design pattern questions covering Creational patterns (object creation), Behavioral patterns (communication), and Architectural patterns (app structure). Critical for iOS architecture interviews."
---

## 🏗️ iOS Design Patterns - 30 Quick Q&A

Design patterns are **essential** for senior iOS roles. This set covers the 3 main categories you need to know.

---

## 🔹 Category 1: Creational Patterns (Object Creation) - Q1-10

### **Q1: What is the Singleton pattern and when should you use it?**
**A:** A class with only one instance accessible globally via `shared` or `default`. Use for truly unique resources (file manager, network session, app configuration).

**Example:**
```swift
class NetworkManager {
    static let shared = NetworkManager()
    private init() { }  // Prevent other instances
}
```

---

### **Q2: What are the downsides of Singletons?**
**A:** Hard to test (global state), tight coupling, hidden dependencies, memory never released, can cause threading issues.

---

### **Q3: What is Dependency Injection?**
**A:** Passing dependencies to an object instead of creating them internally. Makes code more testable and loosely coupled.

**Example:**
```swift
// Bad - creates dependency
class ViewModel {
    let api = NetworkAPI()  // Hard-coded!
}

// Good - injects dependency
class ViewModel {
    let api: NetworkAPI
    init(api: NetworkAPI) { self.api = api }  // Injected
}
```

---

### **Q4: What are the 3 types of Dependency Injection?**
**A:** 
1. **Constructor injection** - via init (most common, preferred)
2. **Property injection** - set property after creation
3. **Method injection** - pass dependency to method

---

### **Q5: What is the Factory pattern?**
**A:** A method that creates objects without exposing creation logic. Returns protocol/base class, hiding concrete implementation.

**Example:**
```swift
protocol Shape {
    func draw()
}

class ShapeFactory {
    static func createShape(type: String) -> Shape {
        switch type {
        case "circle": return Circle()
        case "square": return Square()
        default: return Circle()
        }
    }
}
```

---

### **Q6: What's the difference between Factory and Builder patterns?**
**A:** **Factory** creates objects in one step. **Builder** creates complex objects step-by-step with a fluent interface.

**Builder example:**
```swift
class URLRequestBuilder {
    private var request: URLRequest
    
    init(url: URL) {
        request = URLRequest(url: url)
    }
    
    func method(_ method: String) -> Self {
        request.httpMethod = method
        return self
    }
    
    func header(_ key: String, _ value: String) -> Self {
        request.setValue(value, forHTTPHeaderField: key)
        return self
    }
    
    func build() -> URLRequest {
        return request
    }
}

// Usage
let request = URLRequestBuilder(url: url)
    .method("POST")
    .header("Content-Type", "application/json")
    .build()
```

---

### **Q7: What is the Facade pattern?**
**A:** Provides a simplified interface to a complex subsystem. Hides complexity behind a single, easy-to-use class.

**Example:**
```swift
// Complex subsystems
class VideoDecoder { }
class AudioDecoder { }
class Renderer { }

// Facade - simple interface
class VideoPlayer {
    private let videoDecoder = VideoDecoder()
    private let audioDecoder = AudioDecoder()
    private let renderer = Renderer()
    
    func play(url: URL) {
        // Coordinates all subsystems
        videoDecoder.decode(url)
        audioDecoder.decode(url)
        renderer.display()
    }
}
```

---

### **Q8: What is the Prototype pattern?**
**A:** Creates new objects by copying (cloning) existing objects. In Swift, this is value types and `NSCopying` protocol.

---

### **Q9: What's the difference between Singleton and static methods?**
**A:** **Singleton** is an instance (can be passed around, conform to protocols). **Static methods** are namespaced functions (can't conform to protocols, no instance).

---

### **Q10: When would you NOT use a Singleton?**
**A:** When you need:
- Multiple instances with different configs
- Easy testing with mocks
- Thread-local instances
- Object lifecycle management (creation/destruction)

---

## 🔹 Category 2: Behavioral Patterns (Information Passing) - Q11-20

### **Q11: What is the Delegate pattern?**
**A:** One-to-one communication where an object delegates tasks to another. Uses protocol and weak reference to avoid retain cycles.

**Example:**
```swift
protocol TableViewDelegate: AnyObject {
    func didSelectRow(at index: Int)
}

class TableView {
    weak var delegate: TableViewDelegate?  // weak!
}
```

---

### **Q12: Why is delegate property marked weak?**
**A:** Prevents retain cycles. Delegate usually owns the delegating object, so strong reference would create a cycle.

---

### **Q13: What's the difference between Delegate and Notification?**
**A:** **Delegate**: one-to-one, type-safe, requires protocol. **Notification**: one-to-many, loosely coupled, uses NotificationCenter.

| Delegate | Notification |
|----------|--------------|
| 1-to-1 | 1-to-many |
| Type-safe | String-based (error-prone) |
| Direct reference | Loosely coupled |
| Synchronous | Can be async |

---

### **Q14: When would you use NotificationCenter?**
**A:** When multiple objects need to know about an event, or sender/receiver are loosely coupled (don't know about each other).

**Example:**
```swift
// Post
NotificationCenter.default.post(
    name: .userLoggedIn, 
    object: nil, 
    userInfo: ["userId": 123]
)

// Observe
NotificationCenter.default.addObserver(
    self, 
    selector: #selector(handleLogin), 
    name: .userLoggedIn, 
    object: nil
)
```

---

### **Q15: What is KVO (Key-Value Observing)?**
**A:** Objective-C pattern for observing property changes. Object notifies observers when property value changes.

**Swift alternative:** Use `@Published` properties and Combine, or `didSet` property observers.

---

### **Q16: What is the Observer pattern?**
**A:** Subject maintains list of observers and notifies them of state changes. Similar to pub/sub.

**Swift implementation:** Combine framework's `Publisher`/`Subscriber`.

---

### **Q17: What's the Target-Action pattern?**
**A:** UIKit pattern for handling UI events. Target is object, action is method to call. Used in UIButton, UIGestureRecognizer.

```swift
button.addTarget(
    self, 
    action: #selector(buttonTapped), 
    for: .touchUpInside
)
```

---

### **Q18: What is the Responder Chain?**
**A:** Chain of UIResponder objects that handle events. If object doesn't handle event, passes to next responder (view → superview → VC → window → app).

---

### **Q19: What's the difference between Delegate and Callbacks (closures)?**
**A:** **Delegate**: protocol-based, multiple methods, reusable. **Callback**: single closure, inline, one-time use.

---

### **Q20: What is the Strategy pattern?**
**A:** Defines family of algorithms, encapsulates each, makes them interchangeable. In Swift: pass closures or protocol implementations.

**Example:**
```swift
protocol SortStrategy {
    func sort(_ items: [Int]) -> [Int]
}

class BubbleSort: SortStrategy { }
class QuickSort: SortStrategy { }

class Sorter {
    var strategy: SortStrategy
    func sort(_ items: [Int]) -> [Int] {
        return strategy.sort(items)
    }
}
```

---

## 🔹 Category 3: Architectural Patterns (Code Structure) - Q21-30

### **Q21: What is MVC in iOS?**
**A:** **Model-View-Controller**: Model (data), View (UI), Controller (mediator). UIViewController is the controller.

**Flow:** View → Controller → Model → Controller → View

---

### **Q22: What's the problem with MVC in iOS?**
**A:** **Massive View Controller** - ViewController becomes huge, handling business logic, networking, UI updates. Hard to test.

---

### **Q23: What is MVVM?**
**A:** **Model-View-ViewModel**: Separates business logic into ViewModel. View binds to ViewModel properties (using Combine or delegates).

**Advantage:** ViewModel is testable (no UIKit dependencies).

**Example:**
```swift
class ViewModel {
    @Published var users: [User] = []
    
    func fetchUsers() {
        // Business logic here
        api.fetch { [weak self] users in
            self?.users = users
        }
    }
}

class ViewController {
    let viewModel = ViewModel()
    
    func viewDidLoad() {
        viewModel.$users.sink { [weak self] users in
            self?.tableView.reloadData()
        }
        viewModel.fetchUsers()
    }
}
```

---

### **Q24: What is MVP pattern?**
**A:** **Model-View-Presenter**: Similar to MVVM but Presenter actively updates View (no binding). View is passive.

---

### **Q25: What is VIPER?**
**A:** **View-Interactor-Presenter-Entity-Router**: 
- **V**iew: UI
- **I**nteractor: Business logic
- **P**resenter: Formats data for view
- **E**ntity: Data models
- **R**outer: Navigation

**Use:** Large, complex apps needing strict separation.

---

### **Q26: When would you use VIPER over MVVM?**
**A:** Large apps with:
- Complex business logic
- Strict testability requirements
- Multiple developers (clear boundaries)
- Complex navigation flows

**MVVM for:** Most apps, faster development, less boilerplate.

---

### **Q27: What is the Coordinator pattern?**
**A:** Separates navigation logic from ViewControllers. Coordinator handles screen flow, VCs focus on their own content.

**Example:**
```swift
protocol Coordinator {
    func start()
    func showDetail(user: User)
}

class AppCoordinator: Coordinator {
    let navigationController: UINavigationController
    
    func start() {
        let vc = HomeViewController()
        vc.coordinator = self
        navigationController.pushViewController(vc, animated: false)
    }
    
    func showDetail(user: User) {
        let vc = DetailViewController(user: user)
        navigationController.pushViewController(vc, animated: true)
    }
}
```

---

### **Q28: What is Clean Architecture?**
**A:** Layered architecture with dependency rule: outer layers depend on inner, never reverse.

**Layers:**
- **Entities** (innermost - business models)
- **Use Cases** (business logic)
- **Interface Adapters** (presenters, gateways)
- **Frameworks** (UI, database, network)

---

### **Q29: What is the Repository pattern?**
**A:** Abstracts data source (network, database, cache). Provides single interface, hiding whether data comes from API, CoreData, or cache.

**Example:**
```swift
protocol UserRepository {
    func getUsers() async throws -> [User]
}

class UserRepositoryImpl: UserRepository {
    let api: NetworkAPI
    let database: Database
    let cache: Cache
    
    func getUsers() async throws -> [User] {
        // Try cache first
        if let cached = cache.users {
            return cached
        }
        
        // Try database
        if let stored = database.users {
            cache.users = stored
            return stored
        }
        
        // Fetch from API
        let users = try await api.fetchUsers()
        database.save(users)
        cache.users = users
        return users
    }
}
```

---

### **Q30: What's the difference between MVC, MVP, and MVVM?**

| Pattern | View Updates | Testability | Complexity |
|---------|--------------|-------------|------------|
| **MVC** | VC updates View directly | Hard (UIKit in VC) | Simple |
| **MVVM** | View binds to ViewModel | Easy (no UIKit in VM) | Medium |
| **MVP** | Presenter updates View | Easy (View is interface) | Medium |
| **VIPER** | Presenter → View interface | Very easy (strict layers) | High |

**Flow comparison:**

**MVC:** View → ViewController → Model  
**MVVM:** View ↔ ViewModel → Model  
**MVP:** View ↔ Presenter → Model  
**VIPER:** View ↔ Presenter → Interactor → Entity

---

## 📊 Quick Reference: When to Use Each Pattern

### **Creational Patterns:**

**Singleton:**
```swift
// Use: Shared resources (1 per app)
URLSession.shared
FileManager.default
NotificationCenter.default
```

**Factory:**
```swift
// Use: Create objects based on input
ViewControllerFactory.create(type: .home)
```

**Builder:**
```swift
// Use: Complex object construction
URLRequest.Builder().method(.POST).headers(...).build()
```

**Dependency Injection:**
```swift
// Use: Testability, loose coupling
init(api: NetworkAPI, database: Database)
```

### **Behavioral Patterns:**

**Delegate:**
```swift
// Use: 1-to-1 communication, callbacks
UITableViewDelegate, UITextFieldDelegate
```

**Notification:**
```swift
// Use: 1-to-many broadcast
Keyboard notifications, app lifecycle
```

**Observer (KVO):**
```swift
// Use: Observe property changes
player.observe(\.status) { ... }
```

**Target-Action:**
```swift
// Use: UI event handling
button.addTarget(self, action: #selector(tap), for: .touchUpInside)
```

### **Architectural Patterns:**

**MVC:**
```swift
// Use: Simple apps, prototypes, Apple's default
UIViewController built-in pattern
```

**MVVM:**
```swift
// Use: Most production apps, SwiftUI default
Testable ViewModels, reactive binding
```

**VIPER:**
```swift
// Use: Large enterprise apps
Strict separation, maximum testability
```

**Coordinator:**
```swift
// Use: Complex navigation flows
Separate navigation from view logic
```

---

## 🎯 Bonus: Common Interview Questions

### **Q31: How do you make Singleton thread-safe?**
```swift
class ThreadSafeManager {
    static let shared: ThreadSafeManager = {
        let instance = ThreadSafeManager()
        // Setup
        return instance
    }()
    
    private init() { }  // Thread-safe in Swift (dispatch_once)
}
```
**A:** Swift's `static let` uses `dispatch_once` internally - automatically thread-safe.

---

### **Q32: What's the difference between Abstract Factory and Factory?**
**A:** **Factory** creates one type of object. **Abstract Factory** creates families of related objects.

---

### **Q33: What is the Adapter pattern?**
**A:** Converts one interface to another. Wraps incompatible class to work with your code.

**Example:**
```swift
// Third-party library uses different interface
class LegacyImageLoader {
    func loadImageFromURL(_ url: String, completion: (UIImage?) -> Void) { }
}

// Your app uses this protocol
protocol ImageLoader {
    func load(url: URL) async throws -> UIImage
}

// Adapter bridges them
class ImageLoaderAdapter: ImageLoader {
    let legacy = LegacyImageLoader()
    
    func load(url: URL) async throws -> UIImage {
        return try await withCheckedThrowingContinuation { continuation in
            legacy.loadImageFromURL(url.absoluteString) { image in
                if let image = image {
                    continuation.resume(returning: image)
                } else {
                    continuation.resume(throwing: ImageError.loadFailed)
                }
            }
        }
    }
}
```

---

### **Q34: What is the Decorator pattern?**
**A:** Adds behavior to objects dynamically without modifying their class. In Swift: extensions or wrapper classes.

---

### **Q35: What is Protocol-Oriented Programming?**
**A:** Swift's approach: start with protocols (interfaces), use protocol extensions for default implementations, compose behaviors.

**vs OOP:** Inheritance hierarchy → Protocol composition

---

## 🏢 Real-World Examples from FAANG

### **Meta/Facebook:**
- **ComponentKit**: MVVM-like with immutable components
- **DI**: Heavy use of dependency injection graphs
- **Coordinator**: Custom navigation coordinators

### **Snap:**
- **VIPER**: Large features use VIPER
- **Repository**: Data layer abstraction
- **Factory**: Extensive factory pattern for views

### **Apple:**
- **MVC**: Predominantly MVC in documentation
- **Delegate**: Heavily used throughout UIKit
- **Target-Action**: Standard for UI events

---

## 🎯 Interview Strategy

**Junior Level:**
- Know: Singleton, Delegate, MVC, basic Factory
- Explain: When and why to use each

**Mid Level:**
- Know: All creational, all behavioral, MVVM, MVP
- Compare: Trade-offs between patterns
- Implement: Write code examples

**Senior Level:**
- Know: All patterns including VIPER, Clean Architecture
- Design: Choose patterns for system design questions
- Critique: Identify anti-patterns, suggest improvements
- Combine: Use multiple patterns together effectively

---

## 📝 Common Interview Questions

**"Design the architecture for [feature]":**
1. Start with MVVM (safe default)
2. Explain why (testability, separation)
3. Add patterns as needed (Repository for data, Coordinator for navigation)
4. Justify choices

**"How would you refactor massive ViewController?":**
1. Extract ViewModels (business logic)
2. Create Coordinators (navigation)
3. Use Child VCs (UI components)
4. Implement Repository (data access)
5. Apply Dependency Injection (testing)

**"What design patterns have you used?":**
- Give specific examples from real projects
- Explain problems they solved
- Mention alternatives considered
- Quantify impact (reduced VC from 2000 to 500 lines)

---

## 🎯 Topics Covered

**Creational (10):**
- Singleton, Factory, Builder, Prototype, Abstract Factory
- Dependency Injection (constructor, property, method)
- Facade, Adapter

**Behavioral (10):**
- Delegate, Notification, Observer/KVO
- Target-Action, Responder Chain
- Strategy, Decorator

**Architectural (10):**
- MVC, MVVM, MVP, VIPER
- Clean Architecture, Repository
- Coordinator pattern

**Difficulty:** Medium-Hard  
**Time to Complete:** 3-4 hours  
**Critical For:** Senior iOS, architecture-focused roles  
**Real Usage:** You'll use 80% of these patterns in production code

---

*💡 **Interview Tip:** Don't just memorize - explain WHY you'd choose each pattern. Interviewers care more about your reasoning than textbook definitions!*

*📝 **Next:** [Set 8: Testing & TDD](/interviews/foundation-testing/) - Unit tests, UI tests, mocking strategies!*

