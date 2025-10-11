---
title: "Design a Real-Time Chat System for iOS"
description: "System design: Build a WhatsApp-like messaging system with real-time delivery, offline sync, media sharing, and end-to-end encryption."
date: 2025-10-10
category: system-design
permalink: /interviews/realtime-chat-system/
tags:
  - System Design
  - WebSocket
  - Networking
  - Database
difficulty: Hard
excerpt: "Design a WhatsApp-like messaging system with real-time message delivery, local storage, media sharing, typing indicators, and offline message queuing."
---

## 🎯 Problem Statement

Design a **WhatsApp-like messaging system** for iOS that supports:

- Real-time message delivery (WebSocket)
- Local message storage and sync
- Media sharing (images, videos, files)
- Typing indicators and read receipts
- Offline message queuing
- End-to-end encryption

**Scale:** 100M+ active users, billions of messages daily

---

## 🔑 Key Architecture Decisions

### **1. Transport Layer: WebSocket vs Long Polling?**

**Choice: WebSocket (URLSession WebSocket API)**

**Why:**
- ✅ Bidirectional real-time communication
- ✅ Lower latency than polling
- ✅ More battery efficient than polling
- ✅ Native iOS 13+ support

**Implementation:**
```swift
class ChatWebSocketManager {
    private var webSocketTask: URLSessionWebSocketTask?
    private let url = URL(string: "wss://api.chat.com/ws")!
    
    func connect() {
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        receiveMessage()
    }
    
    func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleMessage(message)
                self?.receiveMessage() // Continue listening
            case .failure(let error):
                self?.handleError(error)
                self?.reconnect()
            }
        }
    }
    
    func sendMessage(_ message: ChatMessage) {
        let jsonData = try! JSONEncoder().encode(message)
        let wsMessage = URLSessionWebSocketTask.Message.data(jsonData)
        webSocketTask?.send(wsMessage) { error in
            if let error = error {
                // Queue for retry
                self.queueOfflineMessage(message)
            }
        }
    }
}
```

### **2. Database: Core Data vs Realm vs SQLite?**

**Choice: Core Data**

**Comparison:**

| Feature | Core Data | Realm | SQLite |
|---------|-----------|-------|--------|
| **Apple Native** | ✅ | ❌ | Partial |
| **Background Sync** | ✅ | ✅ | Manual |
| **Query Speed** | Good | Excellent | Excellent |
| **Learning Curve** | Steep | Easy | Medium |
| **File Size** | Medium | Large | Small |

**Why Core Data:**
- Native iOS integration
- iCloud sync potential
- NSPersistentContainer with background contexts
- Better for large datasets (1M+ messages)

**Implementation:**
```swift
class MessageStore {
    let container: NSPersistentContainer
    
    init() {
        container = NSPersistentContainer(name: "ChatModel")
        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data failed: \(error)")
            }
        }
        
        // Enable automatic merging
        container.viewContext.automaticallyMergesChangesFromParent = true
    }
    
    func saveMessage(_ message: ChatMessage) {
        let context = container.newBackgroundContext()
        context.perform {
            let entity = MessageEntity(context: context)
            entity.id = message.id
            entity.text = message.text
            entity.timestamp = message.timestamp
            entity.status = message.status.rawValue
            
            try? context.save()
        }
    }
    
    func fetchMessages(conversationID: String, limit: Int = 50) -> [ChatMessage] {
        let request: NSFetchRequest<MessageEntity> = MessageEntity.fetchRequest()
        request.predicate = NSPredicate(format: "conversationID == %@", conversationID)
        request.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: false)]
        request.fetchLimit = limit
        
        let results = try? container.viewContext.fetch(request)
        return results?.map { ChatMessage(from: $0) } ?? []
    }
}
```

### **3. Message States & Sync**

**Message Lifecycle:**
```
1. Pending (local) → 2. Sent (server received) → 3. Delivered (recipient device) → 4. Read
```

**State Management:**
```swift
enum MessageStatus: String {
    case pending    // Queued locally
    case sent       // Server acknowledged
    case delivered  // Recipient received
    case read       // Recipient opened
    case failed     // Send failed
}

class MessageSyncManager {
    func handleIncomingMessage(_ message: ChatMessage) {
        // 1. Save to local DB
        messageStore.saveMessage(message)
        
        // 2. Update UI
        NotificationCenter.default.post(
            name: .newMessageReceived,
            object: message
        )
        
        // 3. Send delivery receipt
        sendDeliveryReceipt(messageID: message.id)
    }
    
    func sendMessage(_ message: ChatMessage) {
        // 1. Save locally with pending status
        var pendingMessage = message
        pendingMessage.status = .pending
        messageStore.saveMessage(pendingMessage)
        
        // 2. Update UI optimistically
        notifyUI(pendingMessage)
        
        // 3. Send via WebSocket
        webSocket.sendMessage(pendingMessage) { [weak self] result in
            switch result {
            case .success:
                pendingMessage.status = .sent
                self?.messageStore.updateMessageStatus(pendingMessage)
            case .failure:
                pendingMessage.status = .failed
                self?.messageStore.updateMessageStatus(pendingMessage)
                self?.queueForRetry(pendingMessage)
            }
        }
    }
}
```

### **4. Offline Message Queue**

```swift
class OfflineMessageQueue {
    private var pendingMessages: [ChatMessage] = []
    private var isProcessing = false
    
    func enqueue(_ message: ChatMessage) {
        pendingMessages.append(message)
        messageStore.saveMessage(message) // Persist locally
    }
    
    func processQueue() {
        guard !isProcessing, Reachability.isConnected else { return }
        
        isProcessing = true
        
        for message in pendingMessages {
            webSocket.sendMessage(message) { [weak self] result in
                if case .success = result {
                    self?.pendingMessages.removeAll { $0.id == message.id }
                }
            }
        }
        
        isProcessing = false
    }
}
```

### **5. Typing Indicators**

```swift
class TypingIndicatorManager {
    private var typingTimer: Timer?
    
    func userStartedTyping() {
        // Debounce: only send after 500ms of continuous typing
        typingTimer?.invalidate()
        typingTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: false) { [weak self] _ in
            self?.sendTypingIndicator(isTyping: true)
        }
    }
    
    func userStoppedTyping() {
        typingTimer?.invalidate()
        sendTypingIndicator(isTyping: false)
    }
    
    private func sendTypingIndicator(isTyping: Bool) {
        let indicator = TypingIndicator(
            conversationID: currentConversation.id,
            userID: currentUser.id,
            isTyping: isTyping
        )
        webSocket.send(indicator)
    }
}
```

---

## 💡 What Interviewers Look For

### **1. Offline-First Thinking**

❌ **Wrong:** "We fetch messages from server on open"

✅ **Right:** "We load from local DB immediately for instant UX, then sync from server in background and merge changes"

### **2. Message Ordering**

**Problem:** How to order messages when clocks are out of sync?

**Solution:** Use server timestamps + sequence numbers

```swift
struct ChatMessage {
    let id: UUID
    let serverTimestamp: TimeInterval  // Source of truth
    let localTimestamp: TimeInterval   // Fallback only
    let sequenceNumber: Int            // Ordering within same timestamp
}
```

### **3. Media Upload Strategy**

```swift
class MediaUploadManager {
    func uploadMedia(_ media: MediaItem, for message: ChatMessage) {
        // 1. Create thumbnail immediately
        let thumbnail = media.generateThumbnail()
        message.thumbnailURL = thumbnail
        messageStore.saveMessage(message)
        
        // 2. Upload in background
        let task = urlSession.uploadTask(with: request, fromFile: media.fileURL) { data, response, error in
            if let error = error {
                // Retry with exponential backoff
                self.retryUpload(media, attempt: 1)
            } else {
                // Update message with full URL
                message.mediaURL = parseURL(from: data)
                self.messageStore.updateMessage(message)
            }
        }
        
        // 3. Track progress
        progressTracker[message.id] = task
        task.resume()
    }
}
```

---

## 🚀 Advanced Considerations

### **End-to-End Encryption**

```swift
// Simplified E2E encryption flow
class E2EEncryptionManager {
    func encryptMessage(_ plaintext: String, recipientPublicKey: Data) -> Data {
        // 1. Generate symmetric key for this message
        let symmetricKey = SymmetricKey(size: .bits256)
        
        // 2. Encrypt message with symmetric key
        let sealedBox = try! AES.GCM.seal(plaintext.data(using: .utf8)!, using: symmetricKey)
        
        // 3. Encrypt symmetric key with recipient's public key
        let encryptedKey = try! RSA.encrypt(symmetricKey, publicKey: recipientPublicKey)
        
        // 4. Bundle together
        return encryptedKey + sealedBox.combined!
    }
}
```

### **Push Notifications**

```swift
// Handle background message delivery
func application(_ application: UIApplication, 
                 didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                 fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
    
    guard let messageData = userInfo["message"] as? [String: Any] else {
        completionHandler(.noData)
        return
    }
    
    // Save message to local DB
    let message = ChatMessage(from: messageData)
    messageStore.saveMessage(message)
    
    completionHandler(.newData)
}
```

---

## 🎯 Summary

**Key Architecture:**
- **Transport:** URLSession WebSocket with reconnection
- **Storage:** Core Data with background contexts
- **Sync:** Offline-first with queue for pending messages
- **Media:** Background URLSession with progress tracking
- **Ordering:** Server timestamps + sequence numbers
- **Encryption:** E2E using AES-GCM + RSA

**What Made This Answer Strong:**
- Offline-first approach
- Detailed state management
- Concrete code examples
- Trade-off discussions
- Scalability considerations

---

*💡 **Interview Tip:** Draw the architecture diagram first, then walk through a message send flow from user tap to recipient display. This shows you understand the full system!*

