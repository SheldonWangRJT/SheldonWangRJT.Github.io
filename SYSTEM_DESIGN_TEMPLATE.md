# 📐 System Design Interview Template

## 🎯 How to Approach System Design Questions

In **real iOS system design interviews**, you **MUST draw diagrams first**. This template shows the exact order.

---

## 📋 Interview Structure (30-45 minutes)

### **1. Clarify Requirements (5 min)**
- Ask about scale (users, data volume)
- Confirm functional requirements
- Identify non-functional requirements (performance, offline, etc.)

### **2. Draw Architecture Diagram (10 min)** ⭐ MOST IMPORTANT
- Start with high-level components
- Show dependencies with arrows
- Explain each component while drawing

### **3. Draw User Flow Diagram (5 min)**
- Show happy path first
- Add edge cases (offline, errors)
- Explain user experience

### **4. Deep Dive on Components (15 min)**
- Discuss implementation details
- Show code snippets
- Explain trade-offs

### **5. Discuss Scale & Optimization (5 min)**
- Caching strategies
- Performance considerations
- Memory management

---

## 📐 Template Structure

```markdown
## 🎯 Problem Statement
- Clear description
- Requirements list
- Constraints (scale, network, etc.)

---

## 📐 STEP 1: High-Level Architecture Diagram

**In the interview, start by drawing this on the whiteboard:**

```
[Draw ASCII diagram showing:]
- Client Layer (ViewController, ViewModel)
- Data Layer (Repository pattern)
- Service Layer (Network, Cache, Database)
- Backend/API
- External services (CDN, etc.)
```

**Key Dependencies:**
- Component A → Component B (relationship)
- Component C coordinates D, E, F

**💬 What to say while drawing:**
> "Explain your architecture choices as you draw. Mention patterns like MVVM, Repository, etc."

---

## 👤 STEP 2: User Flow Diagram

**Draw this to show interaction flow:**

```
[Draw flowchart showing:]
- User action
- System response
- Decision points
- Happy path vs error cases
- Offline handling
```

**💬 What to say while drawing:**
> "Walk through the user journey. Explain what happens at each step."

---

## 🔄 STEP 3: Detailed Component Interactions

**Sequence diagram for key operations:**

```
[Draw sequence diagram showing:]
- Time-based interactions
- Method calls between components
- Data flow
- Async operations
```

---

## 🔑 Key Considerations

### **1. [Topic Name]**
**Problem:** Describe the challenge

**Solutions:**
- Option 1: pros/cons
- Option 2: pros/cons
- Chosen approach: why

### **2. [Another Topic]**
...

---

## 💡 Implementation Details

[Code examples here]

---

## 🚀 Scale & Optimization

**How to handle millions of users:**
- Caching strategy
- Memory optimization
- Network efficiency
- Battery considerations

---

## 🎯 Follow-up Questions to Expect

1. How would you handle...?
2. What if the requirement changes to...?
3. How do you optimize for...?

---

## 📊 Trade-offs Discussion

| Approach A | Approach B |
|-----------|------------|
| Pros | Pros |
| Cons | Cons |
| When to use | When to use |
```

---

## 🎨 Diagram Types You Need to Know

### **1. Architecture Diagram (Component Dependencies)**
```
┌──────────────┐
│ Component A  │
└──────┬───────┘
       │ depends on
       ▼
┌──────────────┐
│ Component B  │
└──────────────┘
```

**Shows:** What components exist and how they relate

**Use:** Start of every system design interview

**Draw:** Top to bottom (UI → Business Logic → Data)

---

### **2. User Flow Diagram (Interaction Flow)**
```
START
  │
  ▼
┌─────────┐
│ Action  │
└────┬────┘
     │
     ▼
┌─────────┐     ┌─────────┐
│ Check?  │────▶│ Path A  │
└────┬────┘     └─────────┘
     │ No
     ▼
┌─────────┐
│ Path B  │
└─────────┘
```

**Shows:** User journey through the system

**Use:** After architecture, before deep dive

**Draw:** Left to right OR top to bottom

---

### **3. Sequence Diagram (Time-based Interactions)**
```
User    UI    ViewModel    Repository    Network
 │       │        │             │            │
 │ tap   │        │             │            │
 │──────▶│        │             │            │
 │       │ action │             │            │
 │       │───────▶│             │            │
 │       │        │ fetchData() │            │
 │       │        │────────────▶│            │
 │       │        │             │ GET /api   │
 │       │        │             │───────────▶│
```

**Shows:** Method calls over time

**Use:** Deep dive on specific operations

**Draw:** Time flows down, components are columns

---

## 💬 What to Say During Interview

### **Starting:**
> "Let me start by drawing the high-level architecture. I'll use an MVVM pattern with a Repository layer for data management..."

### **While Drawing:**
> "The ViewController observes the ViewModel... The Repository coordinates between network, cache, and database... For images, we'll use a CDN..."

### **Explaining Trade-offs:**
> "We have two options here: approach A is simpler but uses more memory. Approach B is more complex but scales better. I'd choose B because..."

### **Handling Questions:**
> "That's a great question. Let me add that to the diagram..." [Draw new component]

---

## 🎯 Common System Design Questions

### **Social Media Feed**
- Diagrams: Architecture, User Flow, Pagination Sequence
- Focus: Caching, Prefetching, Memory management

### **Real-time Chat**
- Diagrams: Architecture, Message Flow, WebSocket Connection
- Focus: Offline sync, Message ordering, Push notifications

### **Image/Video Player**
- Diagrams: Architecture, Playback Flow, Caching Strategy
- Focus: Memory, Battery, Network bandwidth

### **Maps/Navigation**
- Diagrams: Architecture, Route Calculation, Location Updates
- Focus: Battery, Accuracy, Offline tiles

### **Search**
- Diagrams: Architecture, Query Flow, Result Ranking
- Focus: Performance, Debouncing, Caching

---

## ✅ Checklist for Each System Design

Before you finish, make sure you've covered:

**Diagrams:**
- [ ] High-level architecture showing all components
- [ ] User flow showing happy path and edge cases
- [ ] Sequence diagram for main operation
- [ ] Explained relationships with arrows

**Discussion:**
- [ ] Memory management strategy
- [ ] Caching approach (memory + disk)
- [ ] Network optimization
- [ ] Offline support
- [ ] Error handling
- [ ] Scale considerations

**Code:**
- [ ] Data models
- [ ] Key protocols/interfaces
- [ ] Critical algorithms
- [ ] Thread safety considerations

**Trade-offs:**
- [ ] Explained why you chose specific approaches
- [ ] Mentioned alternatives and their trade-offs
- [ ] Discussed scaling implications

---

## 🎓 Study Tips

1. **Practice drawing** - Get a whiteboard and draw 5-10 times
2. **Time yourself** - 10 min for architecture, 5 min for user flow
3. **Talk while drawing** - Explain your thinking process
4. **Start simple** - Add complexity only when asked
5. **Use standard patterns** - MVVM, Repository, etc.

---

## 🔗 Related Resources

- [Instagram Feed Design](/interviews/instagram-feed-design/) - Complete example
- [Real-Time Chat System](/interviews/realtime-chat-system/) - WebSocket example
- [Image Caching System](/interviews/image-caching-system/) - Focused component design

---

**Remember: Interviews care more about your thought process and communication than perfect solutions. Draw, explain, iterate!** 🚀

