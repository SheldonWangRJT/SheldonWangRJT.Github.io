---
title: "Design an AI Chat App (ChatGPT-style)"
description: "System design: Build a ChatGPT-like AI chatbot for iOS with streaming responses, multimodal support (text/image/video), conversation management, and real-world API integration."
date: 2025-10-11
category: system-design
permalink: /interviews/ai-chatbot-system-design/
tags:
  - System Design
  - AI/ML
  - Streaming
  - Real-time
  - OpenAI API
difficulty: Hard
excerpt: "Design an AI chatbot like ChatGPT for iOS: streaming vs traditional sockets, handling multiple concurrent conversations, multimodal inputs (images/videos), and real-world API integration with OpenAI, Anthropic, and Google AI."
---

<style>
/* Improve text readability */
.page__content {
  background-color: rgba(255, 255, 255, 0.98);
  padding: 2em;
  border-radius: 8px;
  color: #333;
}

.page__content h2, 
.page__content h3, 
.page__content h4 {
  color: #2c3e50;
  margin-top: 1.5em;
}

.page__content code {
  background-color: #f4f4f4;
  color: #d63384;
  padding: 0.2em 0.4em;
  border-radius: 3px;
}

.page__content pre {
  background-color: #f8f8f8;
  border: 1px solid #ddd;
  border-radius: 4px;
  padding: 1em;
}

.page__content pre code {
  background-color: transparent;
  color: #333;
  padding: 0;
}

.page__content blockquote {
  background-color: #e8f4f8;
  border-left: 4px solid #0066cc;
  padding: 1em;
  margin: 1em 0;
  color: #2c3e50;
}

.page__content table {
  background-color: white;
  border: 1px solid #ddd;
}

.page__content th {
  background-color: #f0f0f0;
  color: #333 !important;
  font-weight: bold;
}

.page__content td {
  color: #555 !important;
  background-color: white;
}

.page__content tr {
  background-color: white;
}

.page__content tbody tr:nth-child(even) {
  background-color: #f9f9f9;
}
</style>

## 🎯 Problem Statement

Design an **AI Chat Application** for iOS similar to ChatGPT that supports:

- **Text streaming** responses (typewriter effect)
- **Multiple conversations** with context switching
- **Multimodal inputs** (text, images, videos)
- **AI-generated images** (DALL-E style)
- **Conversation history** and offline access
- **Real-time streaming** while handling interruptions

**Constraints:**
- OpenAI API rate limits (3,500 RPM for GPT-4)
- Streaming must feel instant (<200ms first token)
- Handle 10+ concurrent conversations
- Support images up to 20MB
- Work on slow 3G networks

---

## 📐 STEP 1: High-Level Architecture Diagram

**In the interview, start by drawing this:**

{% mermaid %}
flowchart TD;
    UI[ChatViewController] --> VM[ChatViewModel];
    VM --> CM[ConversationManager];
    
    CM --> SS[StreamingService];
    CM --> MS[MediaUploadService];
    CM --> DB[DatabaseManager];
    
    SS -->|HTTPS/SSE| PROXY[Backend Proxy];
    MS -->|Upload Images| PROXY;
    
    PROXY --> OPENAI[OpenAI GPT-4];
    PROXY --> CLAUDE[Anthropic Claude];
    PROXY --> GEMINI[Google Gemini];
{% endmermaid %}

**Architecture Layers:**
- **View Layer**: ChatViewController handles UI
- **ViewModel**: Manages state with @Published properties
- **Manager Layer**: ConversationManager coordinates services
- **Services**: Streaming (SSE), Media Upload, Database (CoreData)
- **Backend Proxy**: Rate limiting, API key management, error handling
- **AI Providers**: OpenAI, Anthropic, Google (pluggable)

**Key Components:**
- **ChatView**: UIKit/SwiftUI interface with message bubbles
- **ChatViewModel**: Manages UI state, streaming buffers
- **ConversationManager**: Handles multiple chats, context switching
- **StreamingService**: SSE/WebSocket connection management
- **MediaUploadService**: Compresses and uploads images/videos
- **Backend Proxy**: Rate limiting, authentication, cost control

**💬 What to say while drawing:**
> "I'll use MVVM with a conversation manager to handle multiple chats. The streaming service manages real-time connections. A backend proxy protects API keys and handles rate limiting. For multimodal, we have a separate upload service that processes media before sending."

---

## 👤 STEP 2: User Flow Diagram

**Draw the main interaction flows:**

{% mermaid %}
flowchart TD;
    START[User Sends Message] --> CHECK{Message Type?};
    
    CHECK -->|Text Only| FLOW_A[Text Streaming Flow];
    CHECK -->|Has Image/Video| FLOW_B[Multimodal Flow];
    
    FLOW_B --> UPLOAD1[Show Upload Progress];
    UPLOAD1 --> COMPRESS[Compress Media];
    COMPRESS --> UPLOAD2[Upload to Backend];
    UPLOAD2 --> GET_URL[Get Media URL];
    GET_URL --> FLOW_A;
    
    FLOW_A --> OPEN_SSE[Open SSE Connection];
    OPEN_SSE --> SEND_REQ[Send Request with Context];
    SEND_REQ --> TYPING[Show Typing Indicator];
    TYPING --> RECEIVE[Receive SSE Chunks];
    RECEIVE --> APPEND[Append with Animation];
    APPEND --> MORE{More Chunks?};
    MORE -->|Yes| RECEIVE;
    MORE -->|No DONE| SAVE[Save to Database];
    SAVE --> CLOSE[Close SSE];
{% endmermaid %}

**Edge Case: User Switches Chat While Streaming**

{% mermaid %}
flowchart TD;
    STREAMING[Streaming Message 50%] --> SWITCH{User Switches Chat?};
    SWITCH -->|Yes| CANCEL[Cancel SSE Connection];
    CANCEL --> SAVE_PARTIAL[Save Partial Response];
    SAVE_PARTIAL --> LOAD_NEW[Load New Chat Context];
    LOAD_NEW --> READY[Ready for New Message];
    
    SWITCH -->|No| CONTINUE[Continue Streaming];
    CONTINUE --> STREAMING;
{% endmermaid %}

**💬 What to say while drawing:**
> "For text-only messages, we open an SSE connection and stream chunks. For images, we compress first, upload to backend, get a URL, then include it in the API request. If user switches conversations mid-stream, we cancel the connection, save partial response, and load new context. This prevents mixing responses from different chats."

---

## 🔄 STEP 3: Streaming Architecture - SSE vs WebSocket

**Critical decision: How to handle real-time streaming?**

### **Option 1: Server-Sent Events (SSE)** ✅ RECOMMENDED

{% mermaid %}
sequenceDiagram;
    participant App as iOS App;
    participant Proxy as Backend Proxy;
    participant OpenAI as OpenAI API;
    
    App->>Proxy: GET /stream?message=...<br/>Accept: text/event-stream;
    Proxy->>OpenAI: POST /chat/completions<br/>stream: true;
    
    loop Streaming chunks;
        OpenAI-->>Proxy: data: {"choices":[{"delta":{"content":"Hello"}}]};
        Proxy-->>App: Forward chunk;
        
        OpenAI-->>Proxy: data: {"choices":[{"delta":{"content":" world"}}]};
        Proxy-->>App: Forward chunk;
    end;
    
    OpenAI-->>Proxy: data: [DONE];
    Proxy-->>App: data: [DONE];
    
    Note over App,Proxy: Connection closes;
{% endmermaid %}

**Implementation:**
```swift
class StreamingService {
    private var eventSource: EventSource?
    
    func streamMessage(
        message: String,
        conversationId: String,
        onChunk: @escaping (String) -> Void,
        onComplete: @escaping () -> Void,
        onError: @escaping (Error) -> Void
    ) {
        let url = URL(string: "\(baseURL)/stream")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body: [String: Any] = [
            "message": message,
            "conversation_id": conversationId
        ]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        // Using EventSource library for SSE
        eventSource = EventSource(request: request)
        
        eventSource?.onMessage { event in
            if event.data == "[DONE]" {
                onComplete()
                return
            }
            
            if let data = event.data?.data(using: .utf8),
               let json = try? JSONDecoder().decode(StreamChunk.self, from: data) {
                onChunk(json.choices.first?.delta.content ?? "")
            }
        }
        
        eventSource?.onError { error in
            onError(error)
        }
        
        eventSource?.connect()
    }
    
    func cancelStream() {
        eventSource?.disconnect()
        eventSource = nil
    }
}

struct StreamChunk: Codable {
    struct Choice: Codable {
        struct Delta: Codable {
            let content: String?
        }
        let delta: Delta
    }
    let choices: [Choice]
}
```

**Pros:**
- ✅ Simpler than WebSocket (HTTP-based)
- ✅ Automatic reconnection
- ✅ Unidirectional (perfect for AI responses)
- ✅ Works with existing HTTP infrastructure

**Cons:**
- ❌ One-way communication only
- ❌ No built-in iOS support (need library)

### **Option 2: WebSocket**

{% mermaid %}
sequenceDiagram;
    participant App as iOS App;
    participant Backend;
    participant OpenAI as OpenAI API;
    
    App->>Backend: WS Connect;
    Backend-->>App: Connected;
    
    App->>Backend: Send message JSON;
    Backend->>OpenAI: POST /chat/completions;
    
    loop Streaming chunks;
        OpenAI-->>Backend: chunk: Hello;
        Backend-->>App: Forward chunk;
        
        OpenAI-->>Backend: chunk: world;
        Backend-->>App: Forward chunk;
    end;
    
    OpenAI-->>Backend: done;
    Backend-->>App: Stream complete;
    
    Note over App,Backend: WS stays open for next message;
{% endmermaid %}

**Implementation:**
```swift
class WebSocketService {
    private var webSocket: URLSessionWebSocketTask?
    
    func connect() {
        let session = URLSession(configuration: .default)
        webSocket = session.webSocketTask(with: URL(string: "\(wsURL)/chat")!)
        webSocket?.resume()
        receiveMessage()
    }
    
    func sendMessage(_ text: String, conversationId: String) {
        let message: [String: Any] = [
            "type": "message",
            "text": text,
            "conversation_id": conversationId
        ]
        
        if let data = try? JSONSerialization.data(withJSONObject: message),
           let string = String(data: data, encoding: .utf8) {
            webSocket?.send(.string(string)) { error in
                if let error = error {
                    print("Send error: \(error)")
                }
            }
        }
    }
    
    private func receiveMessage() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleMessage(text)
                case .data(let data):
                    // Handle binary data
                    break
                @unknown default:
                    break
                }
                
                // Continue receiving
                self?.receiveMessage()
                
            case .failure(let error):
                print("Receive error: \(error)")
            }
        }
    }
    
    private func handleMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let json = try? JSONDecoder().decode(WSMessage.self, from: data) else {
            return
        }
        
        switch json.type {
        case "chunk":
            onChunkReceived?(json.content ?? "")
        case "done":
            onStreamComplete?()
        case "error":
            onError?(NSError(domain: "WS", code: -1, userInfo: [NSLocalizedDescriptionKey: json.content ?? ""]))
        default:
            break
        }
    }
    
    var onChunkReceived: ((String) -> Void)?
    var onStreamComplete: (() -> Void)?
    var onError: ((Error) -> Void)?
}

struct WSMessage: Codable {
    let type: String
    let content: String?
}
```

**Pros:**
- ✅ Bi-directional communication
- ✅ Native iOS support (URLSessionWebSocketTask)
- ✅ Persistent connection (better for multiple messages)
- ✅ Can send interruptions/cancellations

**Cons:**
- ❌ More complex to implement
- ❌ Requires backend WebSocket support
- ❌ Connection management overhead

### **📊 SSE vs WebSocket Comparison**

| Feature | SSE | WebSocket |
|---------|-----|-----------|
| **Complexity** | Simple (HTTP) | Complex (custom protocol) |
| **iOS Support** | Library needed | Native URLSession |
| **Direction** | Server→Client only | Bi-directional |
| **Reconnection** | Automatic | Manual |
| **Use Case** | Streaming responses | Real-time chat, interruptions |
| **OpenAI API** | Directly supported | Need proxy conversion |
| **Best For** | ChatGPT-style apps | Collaborative editing |

**💡 Recommendation:** Use **SSE** for ChatGPT-style apps. It's simpler, matches OpenAI's API, and handles 99% of use cases. Only use WebSocket if you need:
- User to interrupt AI mid-response
- AI to ask follow-up questions
- Real-time collaboration features

---

## 🎨 STEP 4: Handling Multiple Concurrent Conversations

**Problem:** User has 5 conversations open, switches between them rapidly. How do you prevent:
- Response mixing (conversation A getting conversation B's answer)
- Memory leaks from abandoned streams
- Race conditions

**Solution: Conversation Queue Manager**

```swift
class ConversationManager {
    // Current active conversation
    @Published private(set) var activeConversationId: String?
    
    // Streaming state per conversation
    private var streamingStates: [String: StreamingState] = [:]
    
    // Queue for pending requests
    private let requestQueue = DispatchQueue(label: "com.app.conversation", qos: .userInitiated)
    
    struct StreamingState {
        var eventSource: EventSource?
        var partialMessage: String = ""
        var isActive: Bool = false
    }
    
    func sendMessage(
        _ text: String,
        in conversationId: String,
        onChunk: @escaping (String) -> Void,
        onComplete: @escaping (String) -> Void
    ) {
        requestQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Cancel any existing stream for this conversation
            self.cancelStream(for: conversationId)
            
            // Create new streaming state
            var state = StreamingState()
            state.isActive = true
            self.streamingStates[conversationId] = state
            
            // Start streaming
            let eventSource = self.streamingService.streamMessage(
                message: text,
                conversationId: conversationId,
                onChunk: { [weak self] chunk in
                    guard let self = self else { return }
                    
                    // Only process if this conversation is still active
                    guard var state = self.streamingStates[conversationId],
                          state.isActive else {
                        return
                    }
                    
                    // Append chunk
                    state.partialMessage += chunk
                    self.streamingStates[conversationId] = state
                    
                    // Update UI
                    DispatchQueue.main.async {
                        onChunk(chunk)
                    }
                },
                onComplete: { [weak self] in
                    guard let self = self else { return }
                    
                    if let state = self.streamingStates[conversationId] {
                        // Save complete message
                        self.saveMessage(state.partialMessage, in: conversationId)
                        
                        DispatchQueue.main.async {
                            onComplete(state.partialMessage)
                        }
                    }
                    
                    // Clean up
                    self.streamingStates[conversationId] = nil
                },
                onError: { [weak self] error in
                    // Handle error, clean up
                    self?.streamingStates[conversationId] = nil
                }
            )
            
            // Store event source
            self.streamingStates[conversationId]?.eventSource = eventSource
        }
    }
    
    func switchToConversation(_ conversationId: String) {
        requestQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Cancel stream for previous conversation
            if let previousId = self.activeConversationId,
               previousId != conversationId {
                self.cancelStream(for: previousId, savingPartial: true)
            }
            
            // Set new active conversation
            self.activeConversationId = conversationId
        }
    }
    
    private func cancelStream(for conversationId: String, savingPartial: Bool = false) {
        guard var state = streamingStates[conversationId] else { return }
        
        // Close SSE connection
        state.eventSource?.disconnect()
        state.isActive = false
        
        // Optionally save partial response
        if savingPartial && !state.partialMessage.isEmpty {
            saveMessage(state.partialMessage + " [interrupted]", in: conversationId)
        }
        
        // Clean up
        streamingStates[conversationId] = nil
    }
    
    private func saveMessage(_ text: String, in conversationId: String) {
        // Save to CoreData/Realm
    }
}
```

**Key techniques:**
- ✅ **Conversation-scoped state**: Each conversation has its own StreamingState
- ✅ **Active flag**: Only process chunks if conversation is still active
- ✅ **Queue serialization**: All operations on serial queue prevent race conditions
- ✅ **Graceful cancellation**: Save partial responses when user switches away
- ✅ **Memory cleanup**: Nil out references when done

---

## 📸 STEP 5: Multimodal Support (Images/Videos)

**Challenge:** User uploads 10MB image. How do you handle it efficiently?

### **Image Upload Flow:**

```swift
class MediaUploadService {
    func uploadImage(
        _ image: UIImage,
        quality: CompressionQuality = .medium,
        onProgress: @escaping (Double) -> Void,
        onComplete: @escaping (String) -> Void  // Returns URL
    ) async throws {
        // 1. Compress image
        let compressedData = try await compressImage(image, quality: quality)
        
        // 2. Generate presigned URL
        let presignedURL = try await getPresignedUploadURL()
        
        // 3. Upload to S3/Cloud Storage
        try await uploadData(compressedData, to: presignedURL, onProgress: onProgress)
        
        // 4. Return permanent URL
        let mediaURL = try await confirmUpload(presignedURL)
        onComplete(mediaURL)
    }
    
    private func compressImage(_ image: UIImage, quality: CompressionQuality) async throws -> Data {
        return try await withCheckedThrowingContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                // Resize to max dimension
                let maxDimension: CGFloat = quality == .high ? 2048 : 1024
                let resized = image.resized(maxDimension: maxDimension)
                
                // Convert to WebP or HEIC (smaller than JPEG)
                guard let data = resized.heicData(compressionQuality: quality.value) else {
                    continuation.resume(throwing: MediaError.compressionFailed)
                    return
                }
                
                continuation.resume(returning: data)
            }
        }
    }
    
    private func uploadData(_ data: Data, to url: URL, onProgress: @escaping (Double) -> Void) async throws {
        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("image/heic", forHTTPHeaderField: "Content-Type")
        
        // Use upload task with progress tracking
        let (_, response) = try await URLSession.shared.upload(for: request, from: data, delegate: ProgressDelegate(onProgress))
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw MediaError.uploadFailed
        }
    }
}

enum CompressionQuality {
    case low, medium, high
    
    var value: CGFloat {
        switch self {
        case .low: return 0.3
        case .medium: return 0.6
        case .high: return 0.8
        }
    }
}
```

### **Sending Multimodal Request to OpenAI:**

```swift
// OpenAI Vision API Request
struct MultimodalRequest: Codable {
    let model = "gpt-4-vision-preview"
    let messages: [Message]
    let maxTokens: Int = 4096
    let stream: Bool = true
    
    enum CodingKeys: String, CodingKey {
        case model, messages
        case maxTokens = "max_tokens"
        case stream
    }
}

struct Message: Codable {
    let role: String
    let content: [Content]
}

enum Content: Codable {
    case text(String)
    case imageURL(String)
    
    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .text(let text):
            try container.encode(["type": "text", "text": text])
        case .imageURL(let url):
            try container.encode([
                "type": "image_url",
                "image_url": ["url": url]
            ])
        }
    }
}

// Usage
let request = MultimodalRequest(
    messages: [
        Message(role: "user", content: [
            .text("What's in this image?"),
            .imageURL("https://cdn.example.com/image.jpg")
        ])
    ]
)
```

---

## 🚀 STEP 6: Real-World APIs & Integration

### **Option 1: OpenAI API** (Most Popular)

```swift
struct OpenAIConfig {
    static let baseURL = "https://api.openai.com/v1"
    static let models = [
        "gpt-4-turbo": (inputCost: 0.01, outputCost: 0.03),  // per 1K tokens
        "gpt-4": (inputCost: 0.03, outputCost: 0.06),
        "gpt-3.5-turbo": (inputCost: 0.0005, outputCost: 0.0015)
    ]
    
    // Rate Limits (as of Oct 2025)
    static let rateLimit = 3500  // requests per minute (GPT-4)
    static let tokenLimit = 150_000  // tokens per minute
}

class OpenAIService {
    func chat(
        messages: [Message],
        model: String = "gpt-4-turbo",
        stream: Bool = true
    ) async throws -> AsyncThrowingStream<String, Error> {
        var request = URLRequest(url: URL(string: "\(OpenAIConfig.baseURL)/chat/completions")!)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let body: [String: Any] = [
            "model": model,
            "messages": messages.map { $0.toDictionary() },
            "stream": stream,
            "max_tokens": 4096
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        return AsyncThrowingStream { continuation in
            let eventSource = EventSource(request: request)
            
            eventSource.onMessage { event in
                if event.data == "[DONE]" {
                    continuation.finish()
                    return
                }
                
                // Parse and yield chunk
                if let chunk = self.parseChunk(event.data) {
                    continuation.yield(chunk)
                }
            }
            
            eventSource.onError { error in
                continuation.finish(throwing: error)
            }
            
            eventSource.connect()
        }
    }
}
```

**Pros:**
- Most comprehensive API
- Best model quality
- Vision, DALL-E, TTS all in one

**Cons:**
- Expensive ($0.03/1K tokens for GPT-4)
- Rate limits can be restrictive
- No guaranteed uptime SLA

### **Option 2: Anthropic Claude API**

```swift
struct ClaudeConfig {
    static let baseURL = "https://api.anthropic.com/v1"
    static let models = [
        "claude-3-opus": (cost: 0.015),  // per 1K tokens
        "claude-3-sonnet": (cost: 0.003),
        "claude-3-haiku": (cost: 0.00025)
    ]
}
```

**Pros:**
- Longer context window (200K tokens!)
- Often more factual than GPT
- Better at following instructions

**Cons:**
- No image generation
- Smaller ecosystem
- Fewer integrations

### **Option 3: Google Gemini API**

```swift
struct GeminiConfig {
    static let baseURL = "https://generativelanguage.googleapis.com/v1"
    static let models = [
        "gemini-1.5-pro": (cost: 0.0035),  // Multimodal included!
    ]
}
```

**Pros:**
- Free tier (60 requests/minute)
- Native multimodal (text, images, video, audio)
- Extremely long context (1M tokens)

**Cons:**
- New API, less stable
- Limited to Google Cloud
- Censorship more aggressive

---

## 🔑 Key Implementation Patterns

### **1. Token Counting (Cost Management)**

```swift
class TokenCounter {
    // Approximate token count (1 token ≈ 4 chars)
    func estimateTokens(_ text: String) -> Int {
        return text.count / 4
    }
    
    // More accurate using tiktoken
    func countTokens(_ text: String, model: String = "gpt-4") -> Int {
        // Use tiktoken library
        let encoder = Tiktoken.encoder(for: model)
        return encoder.encode(text).count
    }
    
    func estimateCost(inputTokens: Int, outputTokens: Int, model: String) -> Decimal {
        guard let pricing = OpenAIConfig.models[model] else { return 0 }
        
        let inputCost = Decimal(inputTokens) / 1000 * Decimal(pricing.inputCost)
        let outputCost = Decimal(outputTokens) / 1000 * Decimal(pricing.outputCost)
        
        return inputCost + outputCost
    }
}
```

### **2. Context Window Management**

```swift
class ContextManager {
    let maxTokens = 8000  // For GPT-4-turbo
    let reservedForResponse = 2000
    
    func trimMessages(_ messages: [Message]) -> [Message] {
        var trimmed: [Message] = []
        var totalTokens = 0
        
        // Always keep system message
        if let systemMsg = messages.first(where: { $0.role == "system" }) {
            trimmed.append(systemMsg)
            totalTokens += tokenCounter.countTokens(systemMsg.text)
        }
        
        // Add messages from most recent, working backwards
        for message in messages.reversed() where message.role != "system" {
            let tokens = tokenCounter.countTokens(message.text)
            
            if totalTokens + tokens > maxTokens - reservedForResponse {
                break  // Stop adding messages
            }
            
            trimmed.insert(message, at: 0)  // Add to beginning
            totalTokens += tokens
        }
        
        return trimmed
    }
}
```

### **3. Error Handling & Retry Logic**

```swift
class AIService {
    func chat(messages: [Message]) async throws -> String {
        var retryCount = 0
        let maxRetries = 3
        
        while retryCount < maxRetries {
            do {
                return try await performChat(messages)
            } catch let error as AIError {
                switch error {
                case .rateLimitExceeded:
                    // Exponential backoff
                    let delay = pow(2.0, Double(retryCount))
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    retryCount += 1
                    
                case .modelOverloaded:
                    // Try with different model
                    return try await performChat(messages, model: "gpt-3.5-turbo")
                    
                case .contextLengthExceeded:
                    // Trim context and retry
                    let trimmed = contextManager.trimMessages(messages)
                    return try await performChat(trimmed)
                    
                default:
                    throw error
                }
            }
        }
        
        throw AIError.maxRetriesExceeded
    }
}

enum AIError: Error {
    case rateLimitExceeded
    case modelOverloaded
    case contextLengthExceeded
    case maxRetriesExceeded
    case invalidAPIKey
    case networkError
}
```

---

## 📊 Performance Optimization

### **1. Streaming Buffer Management**

```swift
class StreamingTextView: UIView {
    private let label = UILabel()
    private var displayBuffer = ""
    private var incomingBuffer = ""
    private var displayTimer: Timer?
    
    func appendChunk(_ text: String) {
        incomingBuffer += text
        
        // Start display timer if not running
        if displayTimer == nil {
            displayTimer = Timer.scheduledTimer(withTimeInterval: 0.05, repeats: true) { [weak self] _ in
                self?.flushBuffer()
            }
        }
    }
    
    private func flushBuffer() {
        guard !incomingBuffer.isEmpty else {
            return
        }
        
        // Take chunk from buffer
        let chunkSize = 5  // characters per frame
        let endIndex = incomingBuffer.index(
            incomingBuffer.startIndex,
            offsetBy: min(chunkSize, incomingBuffer.count)
        )
        
        let chunk = String(incomingBuffer[..<endIndex])
        incomingBuffer.removeSubrange(..<endIndex)
        
        displayBuffer += chunk
        label.text = displayBuffer
        
        // Stop timer if buffer empty
        if incomingBuffer.isEmpty {
            displayTimer?.invalidate()
            displayTimer = nil
        }
    }
}
```

### **2. Memory Management for Long Conversations**

```swift
class ConversationStorage {
    func saveConversation(_ messages: [Message], id: String) {
        // Only keep last 50 messages in memory
        let recent = Array(messages.suffix(50))
        
        // Save older messages to disk
        if messages.count > 50 {
            let archived = Array(messages.prefix(messages.count - 50))
            diskStorage.archive(archived, for: id)
        }
        
        memoryCache.store(recent, for: id)
    }
    
    func loadConversation(id: String) -> [Message] {
        // Load recent from memory
        let recent = memoryCache.load(id) ?? []
        
        // Load archived from disk if needed
        let archived = diskStorage.loadArchived(for: id)
        
        return archived + recent
    }
}
```

---

## 🎯 Interview Discussion Points

**Q: Why SSE over WebSocket?**
> "SSE is simpler for one-way streaming. OpenAI's API natively supports SSE. WebSocket adds complexity without benefit for this use case. We'd only use WebSocket if we needed bidirectional communication, like letting users interrupt mid-response."

**Q: How do you handle rate limits?**
> "Implement exponential backoff, queue requests, and show user-friendly errors. For production, use a backend proxy that tracks rate limits across all users and queues requests intelligently. Consider caching common responses."

**Q: What if user sends message while previous is streaming?**
> "Queue the new request. Cancel current stream, save partial response, then start new stream. Alternatively, show 'AI is responding...' and disable input until complete."

**Q: How do you prevent response mixing?**
> "Each conversation has unique ID. StreamingService checks ID before processing chunks. If user switches conversations, we cancel the EventSource, nil out references, and start fresh for new conversation."

**Q: Cost optimization strategies?**
> "Use GPT-3.5 for simple queries, GPT-4 for complex. Cache responses. Trim context aggressively. Show token count before sending. Offer monthly limits. Use cheaper models (Claude Haiku, Gemini) for non-critical features."

---

## 🚀 Scaling Considerations

**For 1M Users:**
- Backend proxy with rate limiting and caching
- Conversation history in distributed database (Cassandra, DynamoDB)
- Media uploads to S3/CloudFront
- Redis for active conversation state
- Message queue (SQS, RabbitMQ) for request buffering

**Cost Estimates:**
- GPT-4: $0.03 input + $0.06 output per 1K tokens
- Average conversation: ~5K tokens = $0.45
- 1M conversations/day = $450K/day 😱
- **Solution:** Use cheaper models, caching, context trimming

---

## 🎓 Resources

- [OpenAI API Docs](https://platform.openai.com/docs/api-reference/chat)
- [Anthropic Claude API](https://docs.anthropic.com/claude/reference/getting-started-with-the-api)
- [Google Gemini API](https://ai.google.dev/docs)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

**Remember: In system design interviews, start with diagrams, explain trade-offs, and show you understand real-world constraints like cost and rate limits!** 🚀

