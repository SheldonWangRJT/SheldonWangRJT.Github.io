---
title: "Foundation Set 6: Networking & APIs (25 Q&A)"
description: "Rapid-fire networking questions: URLSession, REST APIs, JSON parsing, error handling, authentication. Quick Q&A format perfect for interview drills."
date: 2025-10-10
category: foundation
permalink: /interviews/foundation-networking/
tags:
  - Networking
  - URLSession
  - REST API
  - JSON
  - Codable
difficulty: Medium
excerpt: "25 concise networking questions covering URLSession, Codable, REST APIs, error handling, and authentication. Bang-bang-bang Q&A format!"
---

## 🌐 Networking & APIs - 25 Quick Q&A

**Rapid-fire format** for quick review and quiz conversion!

---

## 🔹 URLSession Basics (Q1-8)

### **Q1: What is URLSession?**
**A:** Apple's API for making HTTP/HTTPS network requests and handling responses.

---

### **Q2: What are the main URLSession task types?**
**A:** 
- `dataTask` - downloads data to memory
- `downloadTask` - downloads to file
- `uploadTask` - uploads data

---

### **Q3: How do you make a simple GET request?**
```swift
let url = URL(string: "https://api.example.com/data")!
URLSession.shared.dataTask(with: url) { data, response, error in
    // Handle response
}.resume()
```
**A:** Use `URLSession.shared.dataTask(with:completionHandler:)` and call `.resume()`.

---

### **Q4: Why call .resume() on data task?**
**A:** Tasks are created in suspended state. `.resume()` starts execution.

---

### **Q5: What is URLRequest?**
**A:** Object that contains URL, HTTP method, headers, body, and request configuration.

---

### **Q6: How do you set HTTP method?**
```swift
var request = URLRequest(url: url)
request.httpMethod = "POST"
```
**A:** Set `httpMethod` property on URLRequest ("GET", "POST", "PUT", "DELETE").

---

### **Q7: How do you add headers?**
```swift
request.setValue("application/json", forHTTPHeaderField: "Content-Type")
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
```
**A:** Use `setValue(_:forHTTPHeaderField:)` on URLRequest.

---

### **Q8: What's the difference between shared and custom URLSession?**
**A:** `shared` is singleton with default config. Custom sessions allow configuration, delegates, and proper cleanup.

---

## 🔹 Codable & JSON (Q9-16)

### **Q9: What is Codable?**
**A:** Protocol combining `Encodable` and `Decodable` for easy JSON/data conversion.

---

### **Q10: How do you decode JSON?**
```swift
struct User: Codable {
    let id: Int
    let name: String
}

let user = try JSONDecoder().decode(User.self, from: data)
```
**A:** Use `JSONDecoder().decode(_:from:)` with Codable type.

---

### **Q11: How do you handle different JSON key names?**
```swift
struct User: Codable {
    let id: Int
    let userName: String
    
    enum CodingKeys: String, CodingKey {
        case id
        case userName = "user_name"  // Maps to user_name in JSON
    }
}
```
**A:** Use `CodingKeys` enum to map Swift properties to JSON keys.

---

### **Q12: How do you encode to JSON?**
```swift
let user = User(id: 1, name: "Alice")
let data = try JSONEncoder().encode(user)
```
**A:** Use `JSONEncoder().encode(_)` with Codable instance.

---

### **Q13: What if a JSON field might be missing?**
```swift
struct User: Codable {
    let id: Int
    let name: String
    let email: String?  // Optional handles missing field
}
```
**A:** Make property optional. Decoder sets to nil if missing.

---

### **Q14: How do you parse nested JSON?**
```swift
struct Response: Codable {
    let data: UserData
}

struct UserData: Codable {
    let id: Int
    let name: String
}
```
**A:** Create nested Codable structs matching JSON structure.

---

### **Q15: How do you handle date parsing?**
```swift
let decoder = JSONDecoder()
decoder.dateDecodingStrategy = .iso8601
```
**A:** Set `dateDecodingStrategy` on JSONDecoder (`.iso8601`, `.formatted()`, `.custom()`).

---

### **Q16: What if decoding fails?**
```swift
do {
    let user = try JSONDecoder().decode(User.self, from: data)
} catch {
    print("Decoding failed: \(error)")
}
```
**A:** Wrap in do-catch. Throws `DecodingError` with details.

---

## 🔹 Error Handling & Best Practices (Q17-25)

### **Q17: What are common HTTP status codes?**
**A:**
- 200 - Success
- 201 - Created
- 400 - Bad Request
- 401 - Unauthorized
- 404 - Not Found
- 500 - Server Error

---

### **Q18: How do you check HTTP status code?**
```swift
if let httpResponse = response as? HTTPURLResponse {
    if httpResponse.statusCode == 200 {
        // Success
    }
}
```
**A:** Cast URLResponse to HTTPURLResponse and check `statusCode`.

---

### **Q19: What's the completion handler signature?**
```swift
(Data?, URLResponse?, Error?) -> Void
```
**A:** Receives optional data, response, and error. Check error first, then response, then data.

---

### **Q20: How do you make requests with async/await?**
```swift
let (data, response) = try await URLSession.shared.data(from: url)
```
**A:** Use `data(from:)` or `data(for:)` with await - no completion handler needed.

---

### **Q21: How do you cancel a request?**
```swift
let task = URLSession.shared.dataTask(with: url) { _, _, _ in }
task.resume()
// Later:
task.cancel()
```
**A:** Store task reference and call `.cancel()` when needed.

---

### **Q22: What is URLSessionConfiguration?**
**A:** Object configuring timeout, cache policy, HTTP headers, cookies, and session behavior.

---

### **Q23: How do you add authentication token?**
```swift
request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
```
**A:** Add Authorization header with token.

---

### **Q24: What's the difference between GET and POST?**
**A:** GET retrieves data (parameters in URL). POST sends data in body (create/update).

---

### **Q25: How do you upload data?**
```swift
var request = URLRequest(url: url)
request.httpMethod = "POST"
request.httpBody = jsonData

URLSession.shared.uploadTask(with: request, from: jsonData) { _, _, _ in
}.resume()
```
**A:** Use `uploadTask(with:from:)` or set `httpBody` on POST request.

---

## 📊 REST API Cheat Sheet

| Method | Purpose | Body? | Idempotent? |
|--------|---------|-------|-------------|
| **GET** | Retrieve data | No | Yes |
| **POST** | Create resource | Yes | No |
| **PUT** | Update (replace) | Yes | Yes |
| **PATCH** | Partial update | Yes | No |
| **DELETE** | Remove resource | No | Yes |

---

## 🎯 Common Networking Patterns

### **Pattern 1: Basic GET with Codable**
```swift
func fetchUsers() async throws -> [User] {
    let url = URL(string: "https://api.example.com/users")!
    let (data, _) = try await URLSession.shared.data(from: url)
    return try JSONDecoder().decode([User].self, from: data)
}
```

### **Pattern 2: POST with JSON body**
```swift
func createUser(_ user: User) async throws {
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    request.httpBody = try JSONEncoder().encode(user)
    
    let (_, _) = try await URLSession.shared.data(for: request)
}
```

### **Pattern 3: Error handling**
```swift
enum NetworkError: Error {
    case invalidURL
    case noData
    case decodingError
    case serverError(Int)
}

func fetch() async throws -> Data {
    guard let url = URL(string: urlString) else {
        throw NetworkError.invalidURL
    }
    
    let (data, response) = try await URLSession.shared.data(from: url)
    
    guard let httpResponse = response as? HTTPURLResponse else {
        throw NetworkError.noData
    }
    
    guard (200...299).contains(httpResponse.statusCode) else {
        throw NetworkError.serverError(httpResponse.statusCode)
    }
    
    return data
}
```

---

## 🎮 Quiz Conversion Examples

**Question 1:**
```
What method starts a URLSession task?
A) .start()
B) .resume() ✓
C) .begin()
D) .execute()
```

**Question 2:**
```
Which HTTP method is idempotent?
A) POST
B) PATCH
C) PUT ✓
D) All of above
```

**Question 3:**
```
How do you handle missing JSON fields?
A) Use force unwrap
B) Make property optional ✓
C) Use default value
D) Skip decoding
```

---

## 🎯 Topics Covered

- URLSession fundamentals (8 questions)
- Codable & JSON parsing (8 questions)
- Error handling & best practices (9 questions)
- Common patterns & REST APIs

**Difficulty:** Medium  
**Time to Complete:** 1-2 hours  
**Format:** Rapid-fire Q&A  
**Perfect For:** API integration interviews, backend communication roles

---

*💡 **Mock Interview Tip:** Time yourself - answer each question in under 30 seconds!*

*📝 **Next:** [Set 7: Data Persistence](/interviews/foundation-data-persistence/) - Core Data, UserDefaults, FileManager!*

