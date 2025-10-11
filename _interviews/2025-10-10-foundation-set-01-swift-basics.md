---
title: "Foundation Set 1: Swift Language Basics (30 Q&A)"
description: "Master Swift fundamentals with 30 essential questions covering optionals, value types, protocols, generics, and more. Perfect for junior to mid-level iOS interviews."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-swift-basics/
tags:
  - Swift
  - Fundamentals
  - Language Basics
difficulty: Easy-Medium
excerpt: "30 essential Swift questions covering optionals, value types vs reference types, protocols, closures, and more. Build a rock-solid foundation for iOS interviews."
---

## 📚 Swift Language Basics - 30 Questions

This set covers fundamental Swift concepts you **must** know for any iOS interview. These questions appear in 90%+ of iOS technical screens.

---

## 🔹 Optionals (Questions 1-5)

### **Q1: What are Optionals and why does Swift have them?**

**Answer:**

Optionals are Swift's way of representing **the absence of a value**. A variable of type `String?` can either hold a `String` value or `nil`.

**Why Swift has optionals:**
- **Type safety**: Compiler forces you to handle nil cases
- **Prevents crashes**: No more "unexpected nil" runtime errors
- **Explicit intent**: Code clearly shows when values might be missing

**Example:**
```swift
var name: String? = "Sheldon"  // Can be String or nil
var age: Int? = nil            // Currently nil

// Must unwrap before use
if let unwrappedName = name {
    print("Hello, \(unwrappedName)")
}
```

**Follow-up:** "What are the different ways to unwrap optionals?"
- Optional binding (`if let`, `guard let`)
- Force unwrapping (`!`) - use carefully!
- Optional chaining (`user?.name`)
- Nil-coalescing operator (`value ?? default`)
- Implicitly unwrapped optionals (`String!`)

---

### **Q2: What's the difference between `if let` and `guard let`?**

**Answer:**

Both safely unwrap optionals, but with different control flow:

**`if let`** - Creates a local scope:
```swift
func greet(_ name: String?) {
    if let unwrappedName = name {
        print("Hello, \(unwrappedName)")
        // unwrappedName only available in this scope
    }
    // unwrappedName NOT available here
}
```

**`guard let`** - Early exit pattern:
```swift
func greet(_ name: String?) {
    guard let unwrappedName = name else {
        print("No name provided")
        return  // Must exit scope
    }
    
    print("Hello, \(unwrappedName)")
    // unwrappedName available for rest of function
}
```

**When to use each:**
- **`guard let`**: When nil is an error condition (preferred for validation)
- **`if let`**: When nil is a valid alternative path

**Interview tip:** Explain that `guard` leads to cleaner code by avoiding pyramid of doom (nested ifs).

---

### **Q3: What is optional chaining?**

**Answer:**

Optional chaining lets you call properties, methods, and subscripts on optionals that might be `nil`. If any part is `nil`, the whole expression returns `nil`.

```swift
class Person {
    var residence: Residence?
}

class Residence {
    var address: Address?
}

class Address {
    var street: String = "Main St"
}

let person = Person()

// Optional chaining
let street = person.residence?.address?.street
// street is String? (nil if any part is nil)

// Without chaining (ugly):
var street: String?
if let residence = person.residence {
    if let address = residence.address {
        street = address.street
    }
}
```

**Key point:** The result is **always optional**, even if the final property isn't.

---

### **Q4: What's the nil-coalescing operator?**

**Answer:**

The `??` operator provides a default value when an optional is `nil`:

```swift
let defaultName = "Guest"
let username: String? = nil

// If username is nil, use defaultName
let displayName = username ?? defaultName  // "Guest"

// Equivalent to:
let displayName = username != nil ? username! : defaultName
```

**Chaining example:**
```swift
let a: String? = nil
let b: String? = nil
let c: String? = "C"

let result = a ?? b ?? c ?? "default"  // "C"
```

---

### **Q5: When would you use implicitly unwrapped optionals (`!`)?**

**Answer:**

Use `Type!` when a variable **will be nil initially but will always have a value** before it's used.

**Common scenarios:**

**1. IBOutlets:**
```swift
@IBOutlet weak var tableView: UITableView!
// nil during init, set by storyboard before viewDidLoad
```

**2. Two-phase initialization:**
```swift
class ViewController: UIViewController {
    var viewModel: ViewModel!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        viewModel = ViewModel()  // Set here, used later
    }
}
```

**⚠️ Warnings:**
- Still crashes if accessed when nil
- Use sparingly - prefer regular optionals when possible
- Only use when you **guarantee** it will be set before access

---

## 🔹 Value Types vs Reference Types (Questions 6-10)

### **Q6: What's the difference between value types and reference types in Swift?**

**Answer:**

| Value Types | Reference Types |
|-------------|-----------------|
| **Copied** when assigned | **Referenced** when assigned |
| Each instance has **unique copy** of data | Multiple variables **share same instance** |
| Examples: `struct`, `enum`, `tuple` | Examples: `class`, `closure` |
| Lives on **stack** (usually) | Lives on **heap** |
| **No inheritance** (struct/enum) | **Supports inheritance** (class) |

**Example:**
```swift
// Value type (struct)
struct Point {
    var x: Int
    var y: Int
}

var point1 = Point(x: 0, y: 0)
var point2 = point1  // COPY created
point2.x = 10

print(point1.x)  // 0 (unchanged)
print(point2.x)  // 10 (modified copy)

// Reference type (class)
class Person {
    var name: String
    init(name: String) { self.name = name }
}

var person1 = Person(name: "Alice")
var person2 = person1  // SAME INSTANCE
person2.name = "Bob"

print(person1.name)  // "Bob" (changed!)
print(person2.name)  // "Bob" (same instance)
```

**Interview insight:** Swift prefers value types for thread safety and simplicity.

---

### **Q7: When should you use a struct vs a class?**

**Answer:**

**Use struct when:**
- ✅ Modeling simple data (Point, Size, User profile)
- ✅ Value semantics make sense (copying is expected)
- ✅ Thread safety is important
- ✅ No need for inheritance

**Use class when:**
- ✅ Need reference semantics (shared state)
- ✅ Need inheritance
- ✅ Need deinitializers (`deinit`)
- ✅ Identity matters (two instances with same data should be different)

**Apple's guidance:** "Use struct by default, class when you need reference semantics."

**Real examples:**

```swift
// STRUCT: Simple data model
struct User {
    let id: String
    var name: String
    var email: String
}

// CLASS: Needs shared state
class NetworkManager {
    static let shared = NetworkManager()  // Singleton
    private var session: URLSession
    // Multiple parts of app need SAME instance
}

// CLASS: Needs inheritance
class ViewController: UIViewController {
    // Must inherit from UIViewController
}
```

---

### **Q8: What is Copy-on-Write (COW) and why is it important?**

**Answer:**

Copy-on-Write is an optimization where Swift **delays copying** value types until they're actually modified.

**Example:**
```swift
var array1 = [1, 2, 3, 4, 5]  // 1000 elements
var array2 = array1            // No copy yet! Just references same storage

// Still no copy - just reading
print(array2[0])

// NOW it copies (because modifying)
array2.append(6)
```

**Why it matters:**
- ✅ **Performance**: Avoids unnecessary copying
- ✅ **Memory efficient**: Shares storage until mutation
- ✅ **Seamless**: You still get value semantics

**Which types use COW:**
- `Array`, `Dictionary`, `Set`, `String`
- NOT custom structs (unless you implement it)

**Interview insight:** This is why Swift collections are both value types AND performant!

---

### **Q9: Can value types have reference type properties?**

**Answer:**

**Yes!** A struct can contain class properties:

```swift
class ImageCache {
    var images: [URL: UIImage] = [:]
}

struct ViewModel {
    var title: String           // Value type
    let cache: ImageCache       // Reference type!
}

var vm1 = ViewModel(title: "A", cache: ImageCache())
var vm2 = vm1  // Copies struct, but cache is SHARED

vm2.cache.images[someURL] = image
// vm1 and vm2 share the SAME ImageCache instance!
```

**Key point:** The struct itself is copied, but the class property is still a reference.

---

### **Q10: What is `mutating` keyword and when do you use it?**

**Answer:**

In a struct, methods that modify properties must be marked `mutating`:

```swift
struct Counter {
    var count = 0
    
    // Modifies self - needs mutating
    mutating func increment() {
        count += 1
    }
    
    // Doesn't modify self - no mutating needed
    func getCurrentCount() -> Int {
        return count
    }
}

var counter = Counter()
counter.increment()  // Works

let constantCounter = Counter()
// constantCounter.increment()  // ERROR: can't mutate let constant
```

**Why this matters:**
- Value types passed to functions are **immutable by default**
- `mutating` tells Swift this method will change `self`
- Can't call mutating methods on `let` constants

**Class comparison:** Classes don't need `mutating` because they're references.

---

## 🔹 Protocols & Extensions (Questions 11-15)

### **Q11: What is Protocol-Oriented Programming?**

**Answer:**

Protocol-Oriented Programming (POP) is Swift's approach to building abstractions using **protocols** rather than inheritance.

**Key principles:**
- Start with protocols (interfaces), not base classes
- Use protocol extensions to provide default implementations
- Compose behaviors through multiple protocol conformance

**Example:**
```swift
// Define capabilities as protocols
protocol Flyable {
    func fly()
}

protocol Swimmable {
    func swim()
}

// Provide default implementations
extension Flyable {
    func fly() {
        print("Flying through the air!")
    }
}

extension Swimmable {
    func swim() {
        print("Swimming in water!")
    }
}

// Compose behaviors
struct Duck: Flyable, Swimmable {
    // Gets both fly() and swim() for free!
}

struct Airplane: Flyable {
    // Only flies
}
```

**vs Class Inheritance:**
```swift
// Old way: inheritance hierarchy
class Animal { }
class FlyingAnimal: Animal { }
class SwimmingAnimal: Animal { }
// Duck can't inherit from both! 😱
```

**Interview tip:** Mention that POP is a key Swift philosophy emphasized by Apple.

---

### **Q12: What's the difference between a protocol and a class?**

**Answer:**

| Protocol | Class |
|----------|-------|
| **Contract** (defines what, not how) | **Implementation** (defines how) |
| Can't store properties (unless computed) | Can store properties |
| Can't have initializers with bodies | Can have full initializers |
| Multiple conformance allowed | Single inheritance only |
| Value and reference types can conform | Only reference types |

**Example:**
```swift
// Protocol: contract
protocol Drawable {
    func draw()  // WHAT to do
}

// Class: implementation
class Circle: Drawable {
    var radius: Double
    
    func draw() {  // HOW to do it
        // Drawing code here
    }
}

// Struct can also conform
struct Square: Drawable {
    func draw() {
        // Different implementation
    }
}
```

---

*[Questions 13-30 continue with Closures, Memory Management, Generics, Error Handling, etc.]*

---

## 🎯 Quick Reference

**Topics Covered in this Set:**
1-5: Optionals  
6-10: Value vs Reference Types  
11-15: Protocols & POP  
16-20: Closures & Capture Lists  
21-25: Memory Management (ARC, weak, unowned)  
26-30: Generics & Type Constraints  

**Difficulty:** Easy to Medium  
**Time to Complete:** 2-3 hours of study  
**Best For:** iOS Junior to Mid-level positions

---

*💡 **Study Tip:** Don't just memorize answers - understand the "why" behind each concept. Interviewers can tell the difference!*

*📝 **Next:** Move on to [Set 2: UIKit Fundamentals](/interviews/foundation-uikit-basics/) once you've mastered these!*

