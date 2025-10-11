---
title: "Foundation Set 3: SwiftUI Fundamentals (25 Q&A)"
description: "Master SwiftUI basics with 25 essential questions covering property wrappers, state management, declarative UI, and SwiftUI vs UIKit differences."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-swiftui-basics/
tags:
  - SwiftUI
  - Property Wrappers
  - State Management
  - Declarative UI
difficulty: Medium
excerpt: "25 SwiftUI questions covering @State, @Binding, @ObservedObject, declarative syntax, and the key differences from UIKit. Essential for modern iOS interviews."
---

## 🎨 SwiftUI Fundamentals - 25 Questions

SwiftUI is now a **must-know** for iOS interviews in 2025. These questions cover the declarative framework that's revolutionizing iOS development.

---

## 🔹 Property Wrappers & State Management (Questions 1-8)

### **Q1: What is @State and when should you use it?**

**Answer:**

`@State` is a property wrapper for **local view state** that SwiftUI owns and manages.

**Key characteristics:**
- ✅ Single source of truth for view's state
- ✅ SwiftUI automatically **invalidates and redraws** view when changed
- ✅ Should be **private** (local to view only)
- ✅ For **value types** (String, Int, Bool, struct)

**Example:**
```swift
struct CounterView: View {
    @State private var count = 0  // Local state
    
    var body: some View {
        VStack {
            Text("Count: \(count)")
            
            Button("Increment") {
                count += 1  // Triggers view update
            }
        }
    }
}
```

**When to use:**
- Temporary UI state (toggle, text input, selection)
- Simple values owned by the view
- State that doesn't need to be shared

**Interview tip:** Emphasize it's for **local, private** state only.

---

### **Q2: What's the difference between @State and @Binding?**

**Answer:**

| @State | @Binding |
|--------|----------|
| **Owns** the data | **References** data owned elsewhere |
| Source of truth | Two-way connection to source of truth |
| Private to view | Passed from parent |
| Creates new storage | Doesn't create storage |

**Example:**
```swift
struct ParentView: View {
    @State private var isOn = false  // Parent OWNS the state
    
    var body: some View {
        ToggleChildView(isOn: $isOn)  // Pass BINDING with $
    }
}

struct ToggleChildView: View {
    @Binding var isOn: Bool  // Child has BINDING to parent's state
    
    var body: some View {
        Toggle("Setting", isOn: $isOn)
        // Modifying this updates parent's @State
    }
}
```

**Key insight:** Use `$` to pass a binding to a @State property.

**When to use @Binding:**
- Child view needs to modify parent's state
- Two-way data flow
- Shared state between parent and child

---

### **Q3: What is @ObservedObject and how is it different from @State?**

**Answer:**

`@ObservedObject` is for **reference types (classes)** that conform to `ObservableObject` protocol.

**Comparison:**

| @State | @ObservedObject |
|--------|-----------------|
| **Value types** (struct, Int, String) | **Reference types** (class) |
| View **owns** it | View **observes** external object |
| Recreated on view recreate | **Persists** across view recreations |
| Simple data | Complex models with logic |

**Example:**
```swift
// Model: ObservableObject
class UserViewModel: ObservableObject {
    @Published var username = ""  // Triggers UI updates
    @Published var isLoggedIn = false
    
    func login() {
        // Business logic here
        isLoggedIn = true
    }
}

// View: Observes the model
struct LoginView: View {
    @ObservedObject var viewModel = UserViewModel()
    
    var body: some View {
        VStack {
            TextField("Username", text: $viewModel.username)
            
            Button("Login") {
                viewModel.login()  // Calling method on viewModel
            }
        }
    }
}
```

**Key points:**
- Must conform to `ObservableObject`
- Properties marked `@Published` trigger updates
- View rebuilds when **any** @Published property changes

---

### **Q4: What's the difference between @ObservedObject and @StateObject?**

**Answer:**

**Critical difference:** Lifecycle management!

| @ObservedObject | @StateObject |
|-----------------|--------------|
| View **doesn't own** it | View **owns** it |
| Can be recreated when view rebuilds | **Persists** across view rebuilds |
| Passed from parent | Created by this view |
| Use for dependencies | Use for view's own model |

**Problem with @ObservedObject:**
```swift
struct ParentView: View {
    @State private var showChild = false
    
    var body: some View {
        if showChild {
            ChildView()  // Recreated every time showChild toggles
        }
    }
}

struct ChildView: View {
    @ObservedObject var viewModel = ViewModel()
    // ⚠️ PROBLEM: ViewModel recreated on every rebuild!
    // Lost state if parent toggles showChild
}
```

**Fixed with @StateObject:**
```swift
struct ChildView: View {
    @StateObject var viewModel = ViewModel()
    // ✅ CORRECT: ViewModel persists across view rebuilds
    // State is preserved
}
```

**Rule of thumb (iOS 14+):**
- Use `@StateObject` when **creating** the object
- Use `@ObservedObject` when object is **passed in**

---

### **Q5: What is @EnvironmentObject?**

**Answer:**

`@EnvironmentObject` is for sharing data **deep in the view hierarchy** without passing through every intermediary view.

**Without @EnvironmentObject (prop drilling):**
```swift
// Must pass through every level 😫
ContentView → SettingsView → ProfileView → DetailView
(userSettings)  (userSettings)  (userSettings)  (userSettings)
```

**With @EnvironmentObject:**
```swift
// Model
class UserSettings: ObservableObject {
    @Published var username = "Sheldon"
}

// Root view: Inject into environment
@main
struct MyApp: App {
    @StateObject var settings = UserSettings()
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(settings)  // Available to ALL child views
        }
    }
}

// Deep nested view: Access directly
struct DeepNestedView: View {
    @EnvironmentObject var settings: UserSettings
    
    var body: some View {
        Text("Hello, \(settings.username)")
    }
}
```

**When to use:**
- App-wide state (theme, user session, settings)
- Avoiding prop drilling
- State needed in many unrelated views

**⚠️ Warning:** App crashes if not injected! Always inject at a parent level.

---

### **Q6: Explain the @Published property wrapper**

**Answer:**

`@Published` marks properties in `ObservableObject` that should **trigger view updates** when changed.

**Example:**
```swift
class TodoListViewModel: ObservableObject {
    @Published var todos: [Todo] = []      // Triggers updates
    @Published var isLoading = false        // Triggers updates
    
    var privateCache: [String: Any] = [:]  // No @Published = no updates
    
    func addTodo(_ todo: Todo) {
        todos.append(todo)  // Automatically updates any listening views
    }
}
```

**Under the hood:**
```swift
// @Published creates a Publisher (Combine framework)
var todos: [Todo] = [] {
    willSet {
        objectWillChange.send()  // Notifies observers
    }
}
```

**Interview tip:** `@Published` is Combine-based. Each property is actually a `Publisher`.

---

### **Q7: What are the main SwiftUI property wrappers and their use cases?**

**Quick Reference:**

| Property Wrapper | Purpose | Ownership | Example Use |
|------------------|---------|-----------|-------------|
| `@State` | Local view state | View owns it | Toggle, counter, text input |
| `@Binding` | Two-way connection | References parent's @State | Child views modifying parent state |
| `@StateObject` | Reference type, view owns | View owns it | ViewModel created by view |
| `@ObservedObject` | Reference type, passed in | Parent owns it | ViewModel passed from parent |
| `@EnvironmentObject` | Shared across hierarchy | App owns it | User settings, theme, session |
| `@Environment` | System values | System owns it | Color scheme, size class |
| `@AppStorage` | UserDefaults wrapper | Persistent | User preferences |
| `@SceneStorage` | Scene restoration | Per-scene | Tab selection, scroll position |

**Code example showing relationships:**
```swift
// App level
@main
struct MyApp: App {
    @StateObject var appState = AppState()  // App owns it
    
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)  // Share with all views
        }
    }
}

// Parent View
struct ParentView: View {
    @State private var text = ""  // Parent owns local state
    @EnvironmentObject var appState: AppState  // From app
    
    var body: some View {
        ChildView(text: $text)  // Pass binding
    }
}

// Child View
struct ChildView: View {
    @Binding var text: String  // Binding to parent's state
    @StateObject var viewModel = ViewModel()  // Child owns viewModel
    @Environment(\.colorScheme) var colorScheme  // System value
    
    var body: some View {
        TextField("Enter text", text: $text)
    }
}
```

---

### **Q8: What is @AppStorage and when would you use it?**

**Answer:**

`@AppStorage` is a property wrapper that reads/writes to **UserDefaults** and triggers view updates.

**Example:**
```swift
struct SettingsView: View {
    @AppStorage("isDarkMode") private var isDarkMode = false
    @AppStorage("username") private var username = "Guest"
    @AppStorage("fontSize") private var fontSize = 14.0
    
    var body: some View {
        Form {
            Toggle("Dark Mode", isOn: $isDarkMode)
            // Automatically saves to UserDefaults!
            
            TextField("Username", text: $username)
            
            Slider(value: $fontSize, in: 10...24)
        }
    }
}
```

**Benefits:**
- ✅ No manual UserDefaults code
- ✅ Automatic view updates when value changes
- ✅ Type-safe
- ✅ Sync across all views using same key

**vs Manual UserDefaults:**
```swift
// Old way (UIKit)
var isDarkMode: Bool {
    get { UserDefaults.standard.bool(forKey: "isDarkMode") }
    set { UserDefaults.standard.set(newValue, forKey: "isDarkMode") }
}

// SwiftUI way
@AppStorage("isDarkMode") var isDarkMode = false
```

---

## 🔹 Declarative UI & View Modifiers (Questions 9-15)

### **Q9: What is declarative UI and how is it different from imperative?**

**Answer:**

**Imperative (UIKit):** You tell the system **HOW** to do something, step by step.

```swift
// UIKit - Imperative
let label = UILabel()
label.text = "Hello"
label.textColor = .blue
label.font = .systemFont(ofSize: 20)
view.addSubview(label)

// If data changes:
label.text = newValue  // Must manually update
```

**Declarative (SwiftUI):** You tell the system **WHAT** you want, it figures out how.

```swift
// SwiftUI - Declarative
Text(userName)  // Describes WHAT you want
    .foregroundColor(.blue)
    .font(.system(size: 20))

// If userName changes: SwiftUI automatically updates!
```

**Key differences:**

| Imperative (UIKit) | Declarative (SwiftUI) |
|-------------------|----------------------|
| "Do this, then this, then this" | "This is what I want" |
| Manual state management | Automatic state binding |
| More code | Less code |
| More control | Less control |

**Interview insight:** SwiftUI's declarative nature eliminates entire classes of bugs related to state synchronization.

---

### **Q10: How does SwiftUI update views when data changes?**

**Answer:**

SwiftUI uses a **reactive** system:

1. You mark data as observable (@State, @Published, etc.)
2. SwiftUI **watches** that data
3. When data changes, SwiftUI **invalidates** the view
4. View's `body` is **recomputed**
5. SwiftUI **diffs** old vs new view tree
6. Only **changed parts** are redrawn

**Example:**
```swift
struct ProductView: View {
    @State private var quantity = 1
    
    var body: some View {  // Recomputed when quantity changes
        VStack {
            Text("Quantity: \(quantity)")  // This updates
            
            Stepper("", value: $quantity)  // This changes quantity
        }
    }
}
```

**Performance:** SwiftUI is **very efficient** - only changed views redraw, not the entire hierarchy.

**Interview tip:** Mention SwiftUI's diffing algorithm is similar to React's Virtual DOM.

---

### **Q11: What are view modifiers and how do they work?**

**Answer:**

View modifiers **transform** a view, creating a new modified view. They're **chainable** and **order matters**.

**Example:**
```swift
Text("Hello")
    .font(.title)           // Returns modified Text
    .foregroundColor(.blue)  // Modifies the result of font()
    .padding()               // Modifies the result of foregroundColor()
    .background(Color.gray)  // Modifies the padded view
```

**Order matters:**
```swift
// Different results!
Text("Hello")
    .padding()      // Pad text first
    .background(.blue)  // Then add blue background (includes padding)

Text("Hello")
    .background(.blue)  // Blue background around text
    .padding()      // Then add padding (white space outside blue)
```

**Custom modifier:**
```swift
struct PrimaryButtonStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .font(.headline)
            .foregroundColor(.white)
            .padding()
            .background(Color.blue)
            .cornerRadius(10)
    }
}

// Usage
extension View {
    func primaryButtonStyle() -> some View {
        modifier(PrimaryButtonStyle())
    }
}

Button("Save") { }
    .primaryButtonStyle()
```

---

### **Q12: What is the difference between @ObservedObject and @StateObject?**

**Answer:**

**Critical for SwiftUI interviews!**

**Problem @StateObject solves:**
```swift
struct ParentView: View {
    @State private var showDetail = false
    
    var body: some View {
        if showDetail {
            DetailView()  // Recreated every time showDetail toggles!
        }
    }
}

struct DetailView: View {
    @ObservedObject var viewModel = ViewModel()
    // ⚠️ BUG: ViewModel RECREATED on every parent rebuild
    // User loses any state they entered!
}
```

**Fix:**
```swift
struct DetailView: View {
    @StateObject var viewModel = ViewModel()
    // ✅ CORRECT: ViewModel created ONCE, persists across rebuilds
}
```

**Rules:**
- **@StateObject**: When **you create** the object in this view
- **@ObservedObject**: When object is **passed from parent**

**Example:**
```swift
struct ParentView: View {
    @StateObject var sharedViewModel = SharedViewModel()
    
    var body: some View {
        ChildView(viewModel: sharedViewModel)  // Passing it down
    }
}

struct ChildView: View {
    @ObservedObject var viewModel: SharedViewModel  // Receiving from parent
    
    var body: some View {
        Text(viewModel.data)
    }
}
```

**Interview tip:** Introduced in iOS 14. Before that, @ObservedObject was misused and caused bugs!

---

### **Q13: Explain @EnvironmentObject and when to use it**

**Answer:**

`@EnvironmentObject` solves **prop drilling** - passing data through many view layers.

**Problem (without @EnvironmentObject):**
```swift
// Must pass through EVERY level 😫
RootView(user: user)
  → TabView(user: user)
    → SettingsView(user: user)
      → ProfileView(user: user)
        → EditView(user: user)  // Finally uses it!
```

**Solution:**
```swift
// 1. Create ObservableObject
class UserSession: ObservableObject {
    @Published var user: User?
    @Published var isAuthenticated = false
}

// 2. Inject at root level
@main
struct MyApp: App {
    @StateObject var session = UserSession()
    
    var body: some Scene {
        WindowGroup {
            RootView()
                .environmentObject(session)  // Available to ALL children
        }
    }
}

// 3. Access anywhere in hierarchy
struct DeepNestedView: View {
    @EnvironmentObject var session: UserSession
    // No need to pass through intermediary views!
    
    var body: some View {
        Text("Welcome, \(session.user?.name ?? "Guest")")
    }
}
```

**When to use:**
- App-wide state (user session, theme, settings)
- Deep view hierarchies
- Many views need same data

**⚠️ Crash if not injected!** Always inject before accessing.

---

### **Q14: What is @Environment and give examples?**

**Answer:**

`@Environment` accesses **system-provided values** like color scheme, size class, etc.

**Common environment values:**
```swift
struct AdaptiveView: View {
    @Environment(\.colorScheme) var colorScheme  // Light/Dark mode
    @Environment(\.horizontalSizeClass) var sizeClass  // Compact/Regular
    @Environment(\.accessibilityEnabled) var a11yEnabled
    @Environment(\.locale) var locale
    @Environment(\.dismiss) var dismiss  // Dismiss action
    
    var body: some View {
        VStack {
            if colorScheme == .dark {
                Text("Dark mode active")
            }
            
            Button("Close") {
                dismiss()  // Dismiss this view
            }
        }
    }
}
```

**Custom environment values:**
```swift
// 1. Define key
private struct ThemeKey: EnvironmentKey {
    static let defaultValue = Theme.default
}

// 2. Extend EnvironmentValues
extension EnvironmentValues {
    var theme: Theme {
        get { self[ThemeKey.self] }
        set { self[ThemeKey.self] = newValue }
    }
}

// 3. Inject
ContentView()
    .environment(\.theme, customTheme)

// 4. Access
struct SomeView: View {
    @Environment(\.theme) var theme
}
```

---

### **Q15: What is @Binding and when do you use it?**

**Answer:**

`@Binding` creates a **two-way connection** between a child view and parent's state.

**Use case: Reusable components**
```swift
struct CustomTextField: View {
    @Binding var text: String  // Two-way binding
    let placeholder: String
    
    var body: some View {
        TextField(placeholder, text: $text)
            .textFieldStyle(.roundedBorder)
            .padding()
            .background(Color.gray.opacity(0.1))
    }
}

// Parent
struct LoginView: View {
    @State private var email = ""
    @State private var password = ""
    
    var body: some View {
        VStack {
            CustomTextField(text: $email, placeholder: "Email")
            // $ creates Binding from @State
            
            CustomTextField(text: $password, placeholder: "Password")
        }
    }
}
```

**Key point:** Child can **read AND write** to parent's state.

**Creating bindings manually:**
```swift
let constantBinding = Binding.constant("Fixed value")
// Useful for previews or read-only scenarios

let customBinding = Binding(
    get: { self.value },
    set: { self.value = $0 }
)
// Full control over get/set behavior
```

---

*[Questions 16-25 continue with View Lifecycle, Navigation, Lists, Performance, etc.]*

---

## 🔹 Quick Answer Cheat Sheet (Q16-25)

**Q16: SwiftUI view lifecycle** - No traditional lifecycle, body recomputes when state changes

**Q17: .onAppear vs .task** - .task supports async/await and auto-cancels

**Q18: List vs ForEach** - List is scrollable container, ForEach generates views

**Q19: Navigation in SwiftUI** - NavigationStack (iOS 16+) vs NavigationView (deprecated)

**Q20: @ViewBuilder** - Function builder for conditional views

**Q21: GeometryReader** - Gets parent's size/coordinates

**Q22: PreferenceKey** - Child-to-parent communication

**Q23: Custom View modifiers** - ViewModifier protocol for reusable styling

**Q24: SwiftUI performance** - Minimize body computation, use explicit IDs

**Q25: Previews** - Multiple previews, PreviewProvider, device variations

---

## 🎯 Topics Covered

1-8: Property Wrappers (@State, @Binding, @ObservedObject, @StateObject, @EnvironmentObject, @Published, @Environment, @AppStorage)  
9-15: Declarative UI concepts, view modifiers, data flow  
16-20: View lifecycle, navigation, lists  
21-25: Advanced topics (GeometryReader, PreferenceKey, performance)

**Difficulty:** Medium  
**Time to Complete:** 3-4 hours  
**Prerequisites:** Swift basics, understand value vs reference types  
**Best For:** iOS roles requiring SwiftUI knowledge (increasingly common in 2025)

---

*💡 **2025 Trend:** SwiftUI questions are now in 70%+ of iOS interviews. Companies want developers comfortable with both UIKit AND SwiftUI!*

*📝 **Next:** Continue with [Set 4: Memory Management](/interviews/foundation-memory-management/) or [Set 5: Concurrency](/interviews/foundation-concurrency/)*

