---
title: "Foundation Set 4: Memory Management & ARC (20 Q&A)"
description: "Master iOS memory management with 20 essential questions on ARC, retain cycles, weak/unowned references, and Swift 6 ownership model."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-memory-management/
tags:
  - Memory Management
  - ARC
  - Retain Cycles
  - Swift 6
difficulty: Medium-Hard
excerpt: "20 critical memory management questions covering ARC, weak/unowned, retain cycles, memory leaks, and Swift 6's new ownership model. Essential for senior iOS roles."
---

## 💾 Memory Management & ARC - 20 Questions

Memory management is **critical** for iOS interviews, especially senior positions. These questions cover the latest Swift 6 features and classic ARC concepts.

---

## 🔹 ARC Fundamentals (Questions 1-5)

### **Q1: What is ARC (Automatic Reference Counting) and how does it work?**

**Answer:**

ARC is Swift's **automatic memory management** system that tracks and manages app memory by counting references to objects.

**How it works:**

1. **Strong reference created** → Reference count +1
2. **Reference removed** → Reference count -1
3. **Count reaches 0** → Object deallocated

**Example:**
```swift
class User {
    var name: String
    init(name: String) {
        self.name = name
        print("\(name) initialized")
    }
    deinit {
        print("\(name) deallocated")
    }
}

var user1: User? = User(name: "Alice")  // RC = 1
var user2 = user1                        // RC = 2
user1 = nil                              // RC = 1
user2 = nil                              // RC = 0 → deinit called
```

**Key points:**
- ✅ Works for **reference types** (classes) only
- ✅ Value types (struct, enum) don't need ARC
- ✅ **Compile-time** feature - no runtime garbage collector
- ✅ More predictable than GC (no pause times)

**Interview insight:** ARC is deterministic - objects deallocate immediately when RC hits 0, unlike garbage collection which runs periodically.

---

### **Q2: What's the difference between strong, weak, and unowned references?**

**Answer:**

| Reference Type | Keeps Object Alive? | Becomes nil? | When to Use |
|----------------|--------------------|--------------| ------------|
| **strong** | ✅ Yes (default) | No | Default for most properties |
| **weak** | ❌ No | ✅ Yes (becomes nil) | Delegates, parent references, optional relationships |
| **unowned** | ❌ No | ❌ No (crashes if accessed) | Non-optional relationships where lifetime is guaranteed |

**Code examples:**
```swift
class Post {
    var title: String
    weak var author: User?  // weak - Post doesn't own User
    
    init(title: String) { self.title = title }
    deinit { print("Post deallocated") }
}

class User {
    var name: String
    unowned let account: Account  // unowned - User MUST have Account
    
    init(name: String, account: Account) {
        self.name = name
        self.account = account
    }
    deinit { print("User deallocated") }
}

class Account {
    var id: String
    init(id: String) { self.id = id }
    deinit { print("Account deallocated") }
}

// Usage
var account: Account? = Account(id: "123")
var user: User? = User(name: "Alice", account: account!)
// user holds UNOWNED reference to account
// If account deallocates first, accessing user.account crashes!

user = nil  // User deallocated
account = nil  // Account deallocated
```

**When to use each:**

**strong:**
```swift
class ViewController {
    let viewModel: ViewModel  // ViewController owns ViewModel
}
```

**weak:**
```swift
protocol TableViewDelegate: AnyObject { }

class TableView {
    weak var delegate: TableViewDelegate?  // Delegate pattern
}
```

**unowned:**
```swift
class Customer {
    let creditCard: CreditCard  // Every Customer has CreditCard
}

class CreditCard {
    unowned let customer: Customer  // Card can't exist without Customer
}
```

**Interview tip:** Use `weak` when reference can become nil, `unowned` when you GUARANTEE it won't.

---

### **Q3: What is a retain cycle and how do you prevent it?**

**Answer:**

A **retain cycle** occurs when two objects hold **strong references** to each other, preventing both from being deallocated.

**Classic retain cycle:**
```swift
class Person {
    var name: String
    var apartment: Apartment?  // Strong reference
    
    init(name: String) { self.name = name }
    deinit { print("\(name) deallocated") }
}

class Apartment {
    var unit: String
    var tenant: Person?  // Strong reference
    
    init(unit: String) { self.unit = unit }
    deinit { print("Apartment \(unit) deallocated") }
}

var john: Person? = Person(name: "John")
var unit4A: Apartment? = Apartment(unit: "4A")

john!.apartment = unit4A  // Person → Apartment (strong)
unit4A!.tenant = john     // Apartment → Person (strong)

john = nil
unit4A = nil
// ❌ MEMORY LEAK! Neither deallocates
// Person RC = 1 (held by Apartment)
// Apartment RC = 1 (held by Person)
```

**Solution: Break the cycle with weak**
```swift
class Apartment {
    var unit: String
    weak var tenant: Person?  // ✅ weak breaks the cycle
    
    init(unit: String) { self.unit = unit }
    deinit { print("Apartment \(unit) deallocated") }
}

// Now:
john = nil  // Person RC = 0 → deallocates
// Apartment's weak reference to Person becomes nil automatically
unit4A = nil  // Apartment RC = 0 → deallocates
// ✅ Both deallocate properly!
```

**Common retain cycle scenarios:**
1. **Closures capturing self**
2. **Delegate patterns**
3. **Parent-child relationships**
4. **Timer/notification observers**

---

### **Q4: How do closures cause retain cycles?**

**Answer:**

Closures **capture and store** references to variables they use. If a closure captures `self` strongly, it creates a retain cycle.

**Problem:**
```swift
class ViewController: UIViewController {
    var name = "HomeVC"
    var onComplete: (() -> Void)?
    
    func setupClosure() {
        onComplete = {
            print(self.name)  // ❌ Captures self STRONGLY
            // ViewController → closure (strong)
            // closure → ViewController (strong)
            // RETAIN CYCLE!
        }
    }
    
    deinit {
        print("\(name) deallocated")  // Never called!
    }
}
```

**Solution 1: [weak self]**
```swift
func setupClosure() {
    onComplete = { [weak self] in
        guard let self = self else { return }
        print(self.name)  // ✅ Captures self WEAKLY
    }
}
// Closure holds weak reference
// If ViewController deallocates, self becomes nil
```

**Solution 2: [unowned self]**
```swift
func setupClosure() {
    onComplete = { [unowned self] in
        print(self.name)  // ✅ Captures self as UNOWNED
    }
}
// Use when self CANNOT be nil when closure executes
// Crashes if self is deallocated - use carefully!
```

**When to use each:**

**[weak self]:** (Most common)
- Completion handlers
- Async operations
- Callbacks where object might be deallocated

**[unowned self]:**
- Closure's lifetime tied to self
- Self CANNOT be nil when closure runs
- Lazy properties

**Real example:**
```swift
class ImageDownloader {
    func downloadImage(url: URL, completion: @escaping (UIImage?) -> Void) {
        URLSession.shared.dataTask(with: url) { [weak self] data, _, error in
            guard let self = self else { return }
            // Process image...
            completion(image)
        }.resume()
    }
}
```

---

### **Q5: What's the difference between [weak self] and [unowned self]?**

**Answer:**

| [weak self] | [unowned self] |
|-------------|----------------|
| self becomes **Optional** | self stays **non-optional** |
| Becomes **nil** when deallocated | **Crashes** if accessed after deallocation |
| Requires `guard let` or `if let` | Use directly like normal self |
| **Safer** | **Faster** (no optional overhead) |

**Code comparison:**
```swift
class DataManager {
    var data: [String] = []
    
    // WEAK - Safe, self might be nil
    func fetchDataWeak() {
        APIClient.fetch { [weak self] result in
            guard let self = self else { 
                print("DataManager deallocated")
                return 
            }
            self.data = result  // self is non-optional here
        }
    }
    
    // UNOWNED - Faster, but crashes if self is nil
    func fetchDataUnowned() {
        APIClient.fetch { [unowned self] result in
            self.data = result  // No guard needed, but crashes if deallocated!
        }
    }
}
```

**When to use unowned:**
```swift
class HTMLElement {
    let name: String
    let text: String?
    
    // Lazy closure will ONLY be called while HTMLElement exists
    lazy var asHTML: () -> String = { [unowned self] in
        if let text = self.text {
            return "<\(self.name)>\(text)</\(self.name)>"
        } else {
            return "<\(self.name) />"
        }
    }
    
    init(name: String, text: String? = nil) {
        self.name = name
        self.text = text
    }
}
```

**Rule of thumb:**
- **Default to [weak self]** - it's safer
- **Use [unowned self]** only when closure's lifetime is tied to object's lifetime

**Interview tip:** Most engineers use `[weak self]` 95% of the time to avoid crashes.

---

## 🔹 Swift 6 Ownership Model (Questions 6-10)

### **Q6: What is Swift 6's ownership model and how does it improve memory safety?**

**Answer:**

Swift 6 introduces an **ownership model** that lets the compiler understand when values can be **uniquely referenced**, enabling new optimizations and safety guarantees.

**Key features:**

**1. Move-only types**
```swift
// Swift 6
struct FileHandle: ~Copyable {  // Can't be copied, only moved
    private let fd: Int32
    
    init(path: String) throws {
        fd = open(path, O_RDONLY)
    }
    
    consuming func close() {  // Consumes self (move semantics)
        Darwin.close(fd)
    }
    
    deinit {
        if fd >= 0 { Darwin.close(fd) }
    }
}

var file = try FileHandle(path: "/tmp/data")
// var file2 = file  // ❌ ERROR: Can't copy!
let file2 = consume file  // ✅ Moves ownership to file2
// file is now invalid
```

**2. Stricter lifetime checks**
```swift
// Compiler prevents use-after-free
func dangerousCode() {
    let data = SensitiveData()
    DispatchQueue.global().async {
        print(data.value)  // ❌ Compiler error!
        // data might be deallocated before async executes
    }
}
```

**3. Optimized reference counting**
```swift
// Swift 6 can eliminate retain/release when it knows object isn't shared
func processUser(_ user: borrowing User) {  // Borrow, don't copy
    print(user.name)
    // No retain/release needed!
}
```

**Benefits:**
- ✅ **Prevents entire classes of bugs** at compile time
- ✅ **Performance improvements** (fewer retain/release)
- ✅ **Clearer ownership semantics** in code
- ✅ **Better interop** with C++ and Rust

**Interview insight:** Swift 6's ownership model brings Rust-like memory safety without a separate borrow checker.

---

### **Q7: What are move-only types in Swift 6?**

**Answer:**

**Move-only types** can transfer ownership but **cannot be copied**. Marked with `~Copyable`.

**Use cases:**
```swift
// 1. File handles (can't duplicate OS resource)
struct FileDescriptor: ~Copyable {
    private let fd: Int32
    
    consuming func close() { /* ... */ }
}

// 2. Unique ownership (like Rust's Box)
struct UniqueBuffer<T>: ~Copyable {
    private let pointer: UnsafeMutablePointer<T>
    private let count: Int
    
    consuming func release() {
        pointer.deallocate()
    }
}

// 3. Lock guards
struct MutexGuard<T>: ~Copyable {
    private let mutex: Mutex<T>
    
    consuming func unlock() -> T {
        return mutex.unlock()
    }
}
```

**How moves work:**
```swift
var buffer = UniqueBuffer(count: 100)
let buffer2 = consume buffer  // Explicit move
// buffer is now INVALID - compiler prevents access

func processBuffer(_ b: consuming UniqueBuffer) {
    // Takes ownership of buffer
}

processBuffer(buffer2)
// buffer2 now invalid too
```

**Benefits:**
- ✅ Compiler-enforced resource management
- ✅ No accidental copies of expensive resources
- ✅ Clear ownership transfer

---

### **Q8: Explain `borrowing` and `consuming` parameters in Swift 6**

**Answer:**

Swift 6 adds **explicit ownership annotations** for function parameters.

**Borrowing (default for most types):**
```swift
// Function BORROWS the value (doesn't own it)
func printUser(_ user: borrowing User) {
    print(user.name)
    // user is still valid in caller after this
}

let user = User(name: "Alice")
printUser(user)
// user still valid here ✅
```

**Consuming (takes ownership):**
```swift
// Function CONSUMES the value (takes ownership)
func processUser(_ user: consuming User) {
    // Do something with user
    // Caller can't use user after this
}

var user = User(name: "Bob")
processUser(user)
// user is now INVALID ❌
```

**Real-world example:**
```swift
struct LargeDataset: ~Copyable {
    private var data: [Double]
    
    // Borrow for read-only operations
    func analyze() -> borrowing Statistics {
        // Don't copy anything, just compute
    }
    
    // Consume for transformations
    func transform(by fn: (Double) -> Double) -> consuming Self {
        data = data.map(fn)
        return self  // Move transformed dataset
    }
}

var dataset = LargeDataset(data: hugeArray)
dataset.analyze()  // Borrows, dataset still valid
dataset = dataset.transform { $0 * 2 }  // Consumes and returns new one
```

**Interview tip:** Similar to Rust's borrow checker but less strict and more Swift-friendly.

---

### **Q9: How do you detect memory leaks in iOS apps?**

**Answer:**

**Multiple techniques:**

**1. Instruments - Leaks Tool**
```
Xcode → Product → Profile (⌘I) → Leaks
```
- Shows leaked objects in real-time
- Call stack of allocation
- Retain cycle visualization

**2. Instruments - Allocations Tool**
```
Product → Profile → Allocations
```
- Track memory growth over time
- Mark generation before/after action
- See what objects persist

**3. Debug Memory Graph (Best for retain cycles)**
```
Debug → Debug Memory Graph (⌥⌘M while running)
```
- Visual representation of object relationships
- Purple (!) marks potential retain cycles
- Click object to see references

**4. Malloc Stack Logging**
```swift
// Enable in scheme:
// Edit Scheme → Diagnostics → Malloc Stack Logging
```

**5. Deinit logging**
```swift
class MyViewController: UIViewController {
    deinit {
        print("✅ MyViewController deallocated")
    }
}
// If you never see this log, you have a leak!
```

**6. Code review checklist:**
```swift
// Check for:
[ ] Closures capturing self strongly
[ ] Delegates marked as weak
[ ] Timer/NotificationCenter observers removed
[ ] URLSessionDataTask properly canceled
[ ] Circular references in models
```

**7. Automated testing:**
```swift
func testViewControllerDoesNotLeak() {
    weak var weakVC: MyViewController?
    
    autoreleasepool {
        let vc = MyViewController()
        weakVC = vc
        // Use vc...
    }
    
    XCTAssertNil(weakVC, "ViewController leaked!")
}
```

---

### **Q10: What are common causes of memory leaks and how to fix them?**

**Answer:**

**1. Closures capturing self**
```swift
// ❌ BAD
class DataManager {
    func loadData() {
        API.fetch { response in
            self.data = response  // Leak!
        }
    }
}

// ✅ FIXED
func loadData() {
    API.fetch { [weak self] response in
        self?.data = response
    }
}
```

**2. Strong delegate references**
```swift
// ❌ BAD
protocol MyDelegate {}
class MyView {
    var delegate: MyDelegate?  // Should be weak!
}

// ✅ FIXED
protocol MyDelegate: AnyObject {}  // Must be class-only
class MyView {
    weak var delegate: MyDelegate?
}
```

**3. Timer retain cycles**
```swift
// ❌ BAD
class ViewController {
    var timer: Timer?
    
    func startTimer() {
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { _ in
            self.update()  // Timer holds strong ref to closure, closure holds strong ref to self
        }
    }
}

// ✅ FIXED
func startTimer() {
    timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { [weak self] _ in
        self?.update()
    }
}

deinit {
    timer?.invalidate()  // Must invalidate!
}
```

**4. NotificationCenter observers**
```swift
// ❌ FORGOT TO REMOVE
class MyVC: UIViewController {
    override func viewDidLoad() {
        NotificationCenter.default.addObserver(
            self, 
            selector: #selector(handleNotif), 
            name: .myNotification, 
            object: nil
        )
    }
    // Forgot to remove observer! Leak!
}

// ✅ FIXED
deinit {
    NotificationCenter.default.removeObserver(self)
}

// ✅ OR use block-based API with weak self
notificationToken = NotificationCenter.default.addObserver(
    forName: .myNotification,
    object: nil,
    queue: .main
) { [weak self] notification in
    self?.handleNotif(notification)
}
```

**5. URLSession data tasks**
```swift
// ❌ Not canceling tasks
class ImageLoader {
    var task: URLSessionDataTask?
    
    func loadImage(url: URL) {
        task = URLSession.shared.dataTask(with: url) { [weak self] data, _, _ in
            self?.image = UIImage(data: data!)
        }
        task?.resume()
    }
}

// ✅ FIXED
deinit {
    task?.cancel()  // Cancel ongoing task
}
```

---

## 🔹 Quick Answer Cheat Sheet (Q11-20)

**Q11: Value types vs ARC** - Structs/enums don't use ARC, copied not referenced

**Q12: Strong reference default** - All references strong unless marked weak/unowned

**Q13: Instruments Leaks tool** - Profile app, track leaked objects

**Q14: Memory warnings** - Handle `didReceiveMemoryWarning`, clear caches

**Q15: Autoreleasepool** - Manage temporary objects in loops

**Q16: Copy-on-write** - Swift arrays copy only when modified

**Q17: Implicit retain cycles** - Lazy properties, computed properties can cause them

**Q18: Weak vs unowned performance** - Weak is slower (optional overhead)

**Q19: Memory footprint** - Value types on stack, reference types on heap

**Q20: Swift 6 improvements** - Ownership model, move semantics, better safety

---

## 🎯 Topics Covered

1-5: ARC Fundamentals (strong, weak, unowned, retain cycles)  
6-10: Swift 6 Ownership Model (move-only, borrowing, consuming)  
11-15: Memory leak detection and prevention  
16-20: Advanced topics (autoreleasepool, COW, performance)

**Difficulty:** Medium-Hard  
**Time to Complete:** 2-3 hours  
**Critical For:** Senior iOS, Memory optimization roles  
**2025 Importance:** Swift 6 ownership questions increasingly common!

---

*💡 **Interview Tip:** Be ready to draw memory diagrams showing object relationships and reference counts. Visual explanations impress interviewers!*

*📝 **Next:** Continue with [Set 5: Concurrency](/interviews/foundation-concurrency/) to master async/await and actors!*

