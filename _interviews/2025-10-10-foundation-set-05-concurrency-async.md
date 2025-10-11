---
title: "Foundation Set 5: Concurrency & Async/Await (30 Q&A)"
description: "Rapid-fire concurrency questions: GCD, DispatchQueues, async/await, actors, and thread safety. Short questions, short answers - perfect for quick review."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-concurrency/
tags:
  - Concurrency
  - GCD
  - Async/Await
  - Actors
  - Thread Safety
difficulty: Medium-Hard
excerpt: "30 rapid-fire concurrency questions covering GCD, async/await, actors, and thread safety. Short Q&A format perfect for interview prep and quizzes."
---

## ⚡ Concurrency & Async/Await - 30 Quick Q&A

Rapid-fire format: **Short questions, short answers**. Perfect for mock interviews and quiz systems.

---

## 🔹 GCD & DispatchQueues (Q1-10)

### **Q1: What is GCD?**
**A:** Grand Central Dispatch - Apple's low-level API for managing concurrent code execution using queues and tasks.

---

### **Q2: What's the difference between serial and concurrent queues?**
**A:** Serial executes tasks one at a time in order. Concurrent executes multiple tasks simultaneously.

---

### **Q3: What's the main queue?**
**A:** A serial queue where all UI updates must happen. Access via `DispatchQueue.main`.

---

### **Q4: How do you dispatch to background?**
```swift
DispatchQueue.global().async {
    // Background work
}
```
**A:** Use `DispatchQueue.global().async { }` for background thread execution.

---

### **Q5: What are QoS (Quality of Service) levels?**
**A:** Priority levels for tasks:
- `.userInteractive` - highest (UI)
- `.userInitiated` - high (user-triggered)
- `.utility` - low (downloads)
- `.background` - lowest (maintenance)

---

### **Q6: How do you update UI from background thread?**
```swift
DispatchQueue.main.async {
    self.label.text = "Updated"
}
```
**A:** Always dispatch UI updates to main queue using `DispatchQueue.main.async { }`.

---

### **Q7: What's the difference between sync and async?**
**A:** `sync` blocks current thread until task completes. `async` returns immediately, task runs in background.

---

### **Q8: When would you use DispatchQueue.sync?**
**A:** Rarely - only when you need to wait for result before continuing. Can cause deadlocks if misused.

---

### **Q9: What is a race condition?**
**A:** When multiple threads access shared data simultaneously, causing unpredictable results.

---

### **Q10: How do you create a custom queue?**
```swift
let queue = DispatchQueue(label: "com.app.myqueue")
```
**A:** Use `DispatchQueue(label:)` with unique identifier.

---

## 🔹 Async/Await (Q11-20)

### **Q11: What is async/await?**
**A:** Swift's modern concurrency feature that makes asynchronous code look and behave like synchronous code.

---

### **Q12: How do you mark a function as async?**
```swift
func fetchData() async -> Data {
    // async work
}
```
**A:** Add `async` keyword before return type.

---

### **Q13: How do you call an async function?**
```swift
let data = await fetchData()
```
**A:** Use `await` keyword when calling. Can only call from async context.

---

### **Q14: What does `await` do?**
**A:** Suspends execution without blocking thread until async operation completes.

---

### **Q15: Can you use await in a regular function?**
**A:** No - only in functions marked `async` or in `Task { }` blocks.

---

### **Q16: What is Task in Swift?**
```swift
Task {
    let result = await fetchData()
}
```
**A:** Creates a new asynchronous task. Entry point for calling async code from sync context.

---

### **Q17: What's the difference between Task and Task.detached?**
**A:** `Task` inherits priority and context. `Task.detached` runs independently without inheriting anything.

---

### **Q18: How do you make multiple async calls in parallel?**
```swift
async let a = fetch1()
async let b = fetch2()
let results = await [a, b]
```
**A:** Use `async let` or `TaskGroup` for parallel execution.

---

### **Q19: What is TaskGroup?**
**A:** API for running multiple async tasks in parallel and collecting their results.

---

### **Q20: How do you cancel a Task?**
```swift
let task = Task { await longOperation() }
task.cancel()
```
**A:** Call `.cancel()` on Task. Check `Task.isCancelled` inside to respond.

---

## 🔹 Actors & Thread Safety (Q21-30)

### **Q21: What is an actor?**
**A:** A reference type that protects its mutable state from data races by serializing access automatically.

---

### **Q22: How do you define an actor?**
```swift
actor Counter {
    var value = 0
    func increment() { value += 1 }
}
```
**A:** Use `actor` keyword instead of `class`. Properties are automatically protected.

---

### **Q23: How do you access actor properties?**
```swift
let counter = Counter()
await counter.increment()  // Must use await
```
**A:** Must use `await` when calling actor methods or accessing properties from outside.

---

### **Q24: Why use actors?**
**A:** Prevents data races at compile time. No need for manual locks or queues.

---

### **Q25: What is @MainActor?**
**A:** Marks code that must run on main thread. Used for UI updates.

---

### **Q26: How do you use @MainActor?**
```swift
@MainActor
class ViewModel: ObservableObject {
    @Published var data: [Item] = []
}
```
**A:** Annotate class or function with `@MainActor` to guarantee main thread execution.

---

### **Q27: What's the difference between actor and class?**
**A:** Actors provide automatic thread-safety. Classes require manual synchronization (locks, queues).

---

### **Q28: Can actors have synchronous methods?**
**A:** Yes, but they're still protected. Called with `await` from outside the actor.

---

### **Q29: What is Sendable protocol?**
**A:** Marks types safe to pass across concurrency boundaries. Value types and actors conform automatically.

---

### **Q30: What's a data race?**
**A:** When two threads access same memory simultaneously and at least one modifies it, causing corruption.

---

## 🎯 Bonus: Common Pitfalls

### **Q31: Main thread blocking - bad or good?**
**A:** Bad! Never block main thread. Causes UI freezes and ANR (App Not Responding).

---

### **Q32: Can you call sync on main from main?**
```swift
// On main thread:
DispatchQueue.main.sync { } // DEADLOCK!
```
**A:** Never! Causes deadlock. Main waits for main to finish.

---

### **Q33: How do you avoid retain cycles with async?**
```swift
Task { [weak self] in
    await self?.doWork()
}
```
**A:** Use capture lists `[weak self]` in Task closures.

---

### **Q34: What is structured concurrency?**
**A:** Parent tasks automatically manage and cancel child tasks. Prevents task leaks.

---

### **Q35: How do you handle errors in async?**
```swift
do {
    let data = try await fetchData()
} catch {
    print(error)
}
```
**A:** Use `try await` with do-catch, just like synchronous error handling.

---

## 📊 Quick Reference Table

| Concept | Key Point | Usage |
|---------|-----------|-------|
| **DispatchQueue.main** | UI thread | `DispatchQueue.main.async { }` |
| **DispatchQueue.global()** | Background | `DispatchQueue.global().async { }` |
| **async/await** | Modern concurrency | `await fetchData()` |
| **Task** | Run async from sync | `Task { await work() }` |
| **Actor** | Thread-safe state | `actor MyActor { }` |
| **@MainActor** | Main thread only | `@MainActor class ViewModel` |
| **Sendable** | Safe to share | `struct Data: Sendable` |

---

## 🎮 Quiz-Ready Format

**These questions are perfect for:**
- ✅ Multiple choice conversion
- ✅ Flash cards
- ✅ Mock interview drills
- ✅ Rapid review sessions
- ✅ Automated quiz systems

**Example quiz format:**
```
Q: What does DispatchQueue.main represent?
A) Background queue
B) Serial queue for UI updates ✓
C) Concurrent queue
D) Custom queue
```

---

## 🎯 Topics Covered

- GCD & DispatchQueues (10 questions)
- Async/Await (10 questions)  
- Actors & Thread Safety (10 questions)
- Bonus pitfalls (5 questions)

**Difficulty:** Medium-Hard  
**Time to Complete:** 1-2 hours  
**Best Format:** Flash cards or rapid-fire review  
**2025 Relevance:** async/await & actors are now standard interview topics

---

*💡 **Study Tip:** Cover answers, read questions, see how many you can answer in 60 seconds each!*

*📝 **Next:** [Set 6: Networking & APIs](/interviews/foundation-networking/) - Same rapid-fire format!*

