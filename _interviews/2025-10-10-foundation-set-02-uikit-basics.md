---
title: "Foundation Set 2: UIKit Fundamentals (25 Q&A)"
description: "Essential UIKit questions covering view lifecycle, Auto Layout, UITableView, UICollectionView, and view controllers. Must-know for iOS interviews."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-uikit-basics/
tags:
  - UIKit
  - View Lifecycle
  - Auto Layout
  - TableView
difficulty: Easy-Medium
excerpt: "25 essential UIKit questions covering view controller lifecycle, Auto Layout constraints, UITableView optimization, delegation patterns, and more."
---

## 📱 UIKit Fundamentals - 25 Questions

Master the UIKit framework that powers most iOS apps. These questions appear in **every** iOS interview.

---

## 🔹 View Controller Lifecycle (Questions 1-5)

### **Q1: Explain the view controller lifecycle methods in order**

**Answer:**

```swift
class MyViewController: UIViewController {
    
    // 1. INIT - View controller created
    init() {
        super.init(nibName: nil, bundle: nil)
        print("1. init()")
    }
    
    // 2. LOAD VIEW - View is loaded into memory
    override func loadView() {
        super.loadView()
        print("2. loadView()")
        // Override only if creating view programmatically
    }
    
    // 3. VIEW DID LOAD - View loaded, outlets connected
    override func viewDidLoad() {
        super.viewDidLoad()
        print("3. viewDidLoad()")
        // ONE TIME setup: add subviews, configure UI
    }
    
    // 4. VIEW WILL APPEAR - About to be shown
    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        print("4. viewWillAppear")
        // RECURRING: refresh data, start animations
    }
    
    // 5. VIEW DID APPEAR - Now visible
    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        print("5. viewDidAppear")
        // Start heavy operations, track analytics
    }
    
    // 6. VIEW WILL DISAPPEAR - About to be hidden
    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        print("6. viewWillDisappear")
        // Save state, pause operations
    }
    
    // 7. VIEW DID DISAPPEAR - Hidden
    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        print("7. viewDidDisappear")
        // Stop timers, release resources
    }
    
    // 8. DEINIT - View controller deallocated
    deinit {
        print("8. deinit")
        // Clean up observers, cancel operations
    }
}
```

**Critical Interview Points:**

**viewDidLoad:**
- Called only **ONCE** - do one-time setup here
- View hierarchy exists, but not yet displayed
- Outlets are connected

**viewWillAppear:**
- Called **EVERY TIME** VC appears
- View bounds might not be final yet
- Good for refreshing data

**viewDidAppear:**
- View is on screen
- Start animations, analytics tracking

---

### **Q2: When would you override `loadView()`?**

**Answer:**

Override `loadView()` **only** when creating your entire view hierarchy programmatically (no Storyboard/XIB).

**Example:**
```swift
override func loadView() {
    // DON'T call super.loadView()
    
    // Create root view
    let customView = CustomView(frame: UIScreen.main.bounds)
    customView.backgroundColor = .white
    
    // Set as view controller's view
    self.view = customView
}
```

**⚠️ Common Mistakes:**
```swift
// ❌ WRONG
override func loadView() {
    super.loadView()  // Don't call super!
    self.view.backgroundColor = .red
}

// ✅ CORRECT - use viewDidLoad instead
override func viewDidLoad() {
    super.viewDidLoad()
    view.backgroundColor = .red
}
```

**Interview insight:** Most developers never override `loadView()` - it's only for special cases.

---

### **Q3: What's the difference between `viewWillAppear` and `viewDidLoad`?**

**Answer:**

| `viewDidLoad()` | `viewWillAppear(_:)` |
|-----------------|----------------------|
| Called **once** | Called **every time** VC appears |
| View in memory but not visible | About to become visible |
| Use for one-time setup | Use for recurring updates |
| Outlets connected | View bounds might change |

**Example use cases:**

```swift
override func viewDidLoad() {
    super.viewDidLoad()
    
    // ONE-TIME setup
    setupTableView()
    addSubviews()
    setupConstraints()
    registerCells()
}

override func viewWillAppear(_ animated: Bool) {
    super.viewWillAppear(animated)
    
    // RECURRING updates
    refreshData()
    updateNavigationBar()
    startLocationUpdates()
    deselectTableViewRows()
}
```

**Real-world scenario:** User navigates ProfileVC → SettingsVC → Back to ProfileVC

- `viewDidLoad`: Called when first creating ProfileVC
- `viewWillAppear`: Called again when returning from SettingsVC (profile picture might have changed!)

---

*[Questions 4-25 continue with Auto Layout, UITableView, Delegation, etc.]*

---

## 🔹 Quick Answer Cheat Sheet

**Q4: Auto Layout priority** - 1000 (required), 750 (high), 250 (low)

**Q5: Constraint conflicts** - Ambiguous layout vs unsatisfiable constraints

**Q6: UITableView reuse** - `dequeueReusableCell` creates pool, prevents memory issues

**Q7: Delegation pattern** - One-to-one communication, weak delegate to prevent retain cycles

**Q8: UITableView vs UICollectionView** - Table for lists, Collection for grids/custom layouts

**Q9: Cell height calculation** - Self-sizing cells, manual calculation, estimated heights

**Q10: UIScrollView** - ContentSize vs frame, contentOffset, delegate methods

---

## 🎯 Topics Covered

1-5: View Controller Lifecycle  
6-10: Auto Layout & Constraints  
11-15: UITableView & UICollectionView  
16-20: Delegation & Protocols  
21-25: Navigation & Transitions  

**Difficulty:** Easy to Medium  
**Time to Complete:** 2-3 hours  
**Best For:** Mid-level iOS roles

---

*💡 **Interview Tip:** Draw the view lifecycle diagram if given a whiteboard. Visual explanations show deep understanding!*

*📝 **Next:** Continue with [Set 3: SwiftUI Basics](/interviews/foundation-swiftui-basics/) or [Set 4: Memory Management](/interviews/foundation-memory-management/)*

