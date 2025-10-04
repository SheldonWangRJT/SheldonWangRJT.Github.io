---
title: 'iOS System Design: Building a Real-time Messaging System'
date: 2025-04-10
permalink: /posts/2025/04/blog-post-april-1/
tags:
  - iOS
  - System Design
  - Real-time
  - Messaging
  - WebSocket
  - Push Notifications
header:
  overlay_image: https://images.unsplash.com/photo-1577563908411-5077b6dc7624?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2070&q=80
  overlay_filter: 0.5
  caption: "Real-time messaging systems and modern communication architecture"
  show_overlay_excerpt: false
---

Building a real-time messaging system within an iOS app requires careful consideration of network connectivity, message delivery, offline support, and user experience. This guide explores the architecture and implementation of a robust messaging system that handles real-time communication, message persistence, and seamless user interactions.

## 1. **System Architecture Overview**

{% mermaid %}
flowchart TD;
    A[User Interface] --> B[Message Manager];
    B --> C[Network Layer];
    B --> D[Local Storage];
    
    C --> E[WebSocket Connection];
    C --> F[HTTP API];
    C --> G[Push Notifications];
    
    D --> H[Core Data];
    D --> I[Message Cache];
    
    E --> J[Message Queue];
    E --> K[Connection Manager];
    
    F --> L[Message Sync];
    F --> M[User Management];
    
    G --> N[Notification Service];
    G --> O[Background Processing];
    
    J --> P[Message Processing];
    K --> Q[Reconnection Logic];
    
    L --> R[Conflict Resolution];
    M --> S[Authentication];
{% endmermaid %}

## 2. **Core Messaging Infrastructure**

```swift
import Foundation
import Network
import CoreData

// MARK: - Message Types
enum MessageType: String, Codable {
    case text
    case image
    case video
    case audio
    case file
    case location
    case system
}

enum MessageStatus: String, Codable {
    case sending
    case sent
    case delivered
    case read
    case failed
}

// MARK: - Message Model
struct Message: Codable, Identifiable {
    let id: UUID
    let conversationId: UUID
    let senderId: UUID
    let content: String
    let type: MessageType
    let timestamp: Date
    let status: MessageStatus
    let metadata: [String: String]?
    let replyTo: UUID?
    
    // Computed properties
    var isFromCurrentUser: Bool {
        return senderId == UserManager.shared.currentUser?.id
    }
    
    var displayTime: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: timestamp)
    }
}

// MARK: - Conversation Model
struct Conversation: Codable, Identifiable {
    let id: UUID
    let name: String?
    let participants: [UUID]
    let lastMessage: Message?
    let unreadCount: Int
    let createdAt: Date
    let updatedAt: Date
    let isGroup: Bool
    
    var displayName: String {
        if let name = name, !name.isEmpty {
            return name
        }
        
        if isGroup {
            return "Group Chat"
        } else {
            // Return other participant's name
            let otherParticipants = participants.filter { $0 != UserManager.shared.currentUser?.id }
            return UserManager.shared.getUserName(for: otherParticipants.first) ?? "Unknown"
        }
    }
}

// MARK: - Message Manager
class MessageManager: ObservableObject {
    @Published var conversations: [Conversation] = []
    @Published var currentConversation: Conversation?
    @Published var messages: [Message] = []
    @Published var connectionStatus: ConnectionStatus = .disconnected
    
    private let networkManager: NetworkManager
    private let storageManager: StorageManager
    private let notificationManager: NotificationManager
    private let messageQueue: MessageQueue
    
    init() {
        self.networkManager = NetworkManager()
        self.storageManager = StorageManager()
        self.notificationManager = NotificationManager()
        self.messageQueue = MessageQueue()
        
        setupObservers()
        loadConversations()
    }
    
    // MARK: - Message Operations
    func sendMessage(_ content: String, to conversationId: UUID, type: MessageType = .text, replyTo: UUID? = nil) {
        let message = Message(
            id: UUID(),
            conversationId: conversationId,
            senderId: UserManager.shared.currentUser?.id ?? UUID(),
            content: content,
            type: type,
            timestamp: Date(),
            status: .sending,
            metadata: nil,
            replyTo: replyTo
        )
        
        // Add to local messages immediately
        messages.append(message)
        
        // Queue for sending
        messageQueue.enqueue(message)
        
        // Save to local storage
        storageManager.saveMessage(message)
        
        // Update conversation
        updateConversationLastMessage(conversationId: conversationId, message: message)
    }
    
    func markMessageAsRead(_ messageId: UUID) {
        guard let index = messages.firstIndex(where: { $0.id == messageId }) else { return }
        
        var updatedMessage = messages[index]
        updatedMessage.status = .read
        messages[index] = updatedMessage
        
        // Update in storage
        storageManager.updateMessageStatus(messageId: messageId, status: .read)
        
        // Send read receipt
        networkManager.sendReadReceipt(messageId: messageId)
    }
    
    // MARK: - Conversation Management
    func createConversation(with participants: [UUID], name: String? = nil) -> UUID {
        let conversationId = UUID()
        let conversation = Conversation(
            id: conversationId,
            name: name,
            participants: participants,
            lastMessage: nil,
            unreadCount: 0,
            createdAt: Date(),
            updatedAt: Date(),
            isGroup: participants.count > 2
        )
        
        conversations.append(conversation)
        storageManager.saveConversation(conversation)
        
        return conversationId
    }
    
    func loadMessages(for conversationId: UUID) {
        // Load from local storage first
        let localMessages = storageManager.getMessages(for: conversationId)
        messages = localMessages
        
        // Sync with server
        Task {
            await syncMessages(for: conversationId)
        }
    }
    
    private func syncMessages(for conversationId: UUID) async {
        do {
            let serverMessages = try await networkManager.fetchMessages(for: conversationId)
            
            // Merge with local messages
            let mergedMessages = mergeMessages(local: messages, server: serverMessages)
            
            await MainActor.run {
                self.messages = mergedMessages
            }
            
            // Save merged messages
            storageManager.saveMessages(mergedMessages)
        } catch {
            print("Failed to sync messages: \(error)")
        }
    }
    
    private func mergeMessages(local: [Message], server: [Message]) -> [Message] {
        var merged = local
        
        for serverMessage in server {
            if !merged.contains(where: { $0.id == serverMessage.id }) {
                merged.append(serverMessage)
            }
        }
        
        return merged.sorted { $0.timestamp < $1.timestamp }
    }
    
    private func updateConversationLastMessage(conversationId: UUID, message: Message) {
        guard let index = conversations.firstIndex(where: { $0.id == conversationId }) else { return }
        
        var updatedConversation = conversations[index]
        updatedConversation.lastMessage = message
        updatedConversation.updatedAt = Date()
        
        conversations[index] = updatedConversation
        storageManager.updateConversation(updatedConversation)
    }
    
    private func setupObservers() {
        // Observe network status changes
        networkManager.connectionStatusPublisher
            .receive(on: DispatchQueue.main)
            .assign(to: &$connectionStatus)
        
        // Observe incoming messages
        networkManager.messagePublisher
            .receive(on: DispatchQueue.main)
            .sink { [weak self] message in
                self?.handleIncomingMessage(message)
            }
            .store(in: &cancellables)
    }
    
    private func handleIncomingMessage(_ message: Message) {
        // Add to messages if in current conversation
        if message.conversationId == currentConversation?.id {
            messages.append(message)
        }
        
        // Update conversation
        updateConversationLastMessage(conversationId: message.conversationId, message: message)
        
        // Show notification if app is in background
        if UIApplication.shared.applicationState != .active {
            notificationManager.showMessageNotification(message)
        }
        
        // Save to storage
        storageManager.saveMessage(message)
    }
    
    private func loadConversations() {
        conversations = storageManager.getConversations()
    }
}

// MARK: - Connection Status
enum ConnectionStatus {
    case connected
    case connecting
    case disconnected
    case reconnecting
}
```

## 3. **Network Layer Implementation**

{% mermaid %}
sequenceDiagram;
    participant App as iOS App;
    participant WS as WebSocket;
    participant API as HTTP API;
    participant Push as Push Service;
    participant Server as Message Server;
    
    App->>WS: Connect WebSocket;
    WS->>Server: Establish Connection;
    Server-->>WS: Connection Confirmed;
    WS-->>App: Connected;
    
    App->>API: Send Message;
    API->>Server: Store Message;
    Server->>Push: Send Push Notification;
    Push-->>App: Show Notification;
    
    Server->>WS: Broadcast Message;
    WS-->>App: Receive Message;
    
    Note over App,Server: Real-time Communication;
    App->>WS: Typing Indicator;
    WS->>Server: Broadcast Typing;
    Server->>WS: Typing Status;
    WS-->>App: Show Typing;
{% endmermaid %}

```swift
// MARK: - Network Manager
class NetworkManager: ObservableObject {
    @Published var connectionStatus: ConnectionStatus = .disconnected
    
    private var webSocket: URLSessionWebSocketTask?
    private var reconnectTimer: Timer?
    private var heartbeatTimer: Timer?
    private let session: URLSession
    private let baseURL: URL
    
    // Publishers for real-time updates
    let messagePublisher = PassthroughSubject<Message, Never>()
    let typingPublisher = PassthroughSubject<TypingEvent, Never>()
    let connectionStatusPublisher = PassthroughSubject<ConnectionStatus, Never>()
    
    init() {
        self.session = URLSession.shared
        self.baseURL = URL(string: "https://api.messaging.com")!
        
        setupWebSocket()
    }
    
    // MARK: - WebSocket Management
    private func setupWebSocket() {
        guard let url = URL(string: "wss://api.messaging.com/ws") else { return }
        
        let request = URLRequest(url: url)
        webSocket = session.webSocketTask(with: request)
        
        webSocket?.resume()
        startReceiving()
        startHeartbeat()
        
        connectionStatus = .connecting
    }
    
    private func startReceiving() {
        webSocket?.receive { [weak self] result in
            switch result {
            case .success(let message):
                self?.handleWebSocketMessage(message)
                self?.startReceiving() // Continue receiving
            case .failure(let error):
                print("WebSocket receive error: \(error)")
                self?.handleConnectionFailure()
            }
        }
    }
    
    private func handleWebSocketMessage(_ message: URLSessionWebSocketTask.Message) {
        switch message {
        case .string(let text):
            handleTextMessage(text)
        case .data(let data):
            handleDataMessage(data)
        @unknown default:
            break
        }
    }
    
    private func handleTextMessage(_ text: String) {
        guard let data = text.data(using: .utf8),
              let message = try? JSONDecoder().decode(WebSocketMessage.self, from: data) else {
            return
        }
        
        switch message.type {
        case .message:
            if let messageData = message.data as? Message {
                messagePublisher.send(messageData)
            }
        case .typing:
            if let typingData = message.data as? TypingEvent {
                typingPublisher.send(typingData)
            }
        case .connection:
            connectionStatus = .connected
            connectionStatusPublisher.send(.connected)
        }
    }
    
    private func handleDataMessage(_ data: Data) {
        // Handle binary messages (e.g., file uploads)
    }
    
    // MARK: - Message Sending
    func sendMessage(_ message: Message) async throws {
        // Send via WebSocket for real-time delivery
        let webSocketMessage = WebSocketMessage(type: .message, data: message)
        let jsonData = try JSONEncoder().encode(webSocketMessage)
        let text = String(data: jsonData, encoding: .utf8) ?? ""
        
        webSocket?.send(.string(text)) { [weak self] error in
            if let error = error {
                print("Failed to send message: \(error)")
                // Fallback to HTTP API
                Task {
                    try await self?.sendMessageViaHTTP(message)
                }
            }
        }
    }
    
    private func sendMessageViaHTTP(_ message: Message) async throws {
        let url = baseURL.appendingPathComponent("messages")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try JSONEncoder().encode(message)
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NetworkError.sendFailed
        }
    }
    
    // MARK: - HTTP API Methods
    func fetchMessages(for conversationId: UUID) async throws -> [Message] {
        let url = baseURL.appendingPathComponent("conversations/\(conversationId)/messages")
        var request = URLRequest(url: url)
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        let (data, response) = try await session.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NetworkError.fetchFailed
        }
        
        return try JSONDecoder().decode([Message].self, from: data)
    }
    
    func sendReadReceipt(messageId: UUID) {
        let url = baseURL.appendingPathComponent("messages/\(messageId)/read")
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("Bearer \(getAuthToken())", forHTTPHeaderField: "Authorization")
        
        Task {
            do {
                let (_, response) = try await session.data(for: request)
                print("Read receipt sent: \(response)")
            } catch {
                print("Failed to send read receipt: \(error)")
            }
        }
    }
    
    // MARK: - Connection Management
    private func startHeartbeat() {
        heartbeatTimer = Timer.scheduledTimer(withTimeInterval: 30, repeats: true) { [weak self] _ in
            self?.sendHeartbeat()
        }
    }
    
    private func sendHeartbeat() {
        let heartbeat = WebSocketMessage(type: .heartbeat, data: nil)
        if let jsonData = try? JSONEncoder().encode(heartbeat),
           let text = String(data: jsonData, encoding: .utf8) {
            webSocket?.send(.string(text)) { error in
                if error != nil {
                    self.handleConnectionFailure()
                }
            }
        }
    }
    
    private func handleConnectionFailure() {
        connectionStatus = .disconnected
        connectionStatusPublisher.send(.disconnected)
        
        // Attempt reconnection
        scheduleReconnection()
    }
    
    private func scheduleReconnection() {
        connectionStatus = .reconnecting
        connectionStatusPublisher.send(.reconnecting)
        
        reconnectTimer?.invalidate()
        reconnectTimer = Timer.scheduledTimer(withTimeInterval: 5, repeats: false) { [weak self] _ in
            self?.setupWebSocket()
        }
    }
    
    private func getAuthToken() -> String {
        // Get authentication token from keychain or user defaults
        return UserDefaults.standard.string(forKey: "authToken") ?? ""
    }
}

// MARK: - WebSocket Message Types
struct WebSocketMessage: Codable {
    let type: WebSocketMessageType
    let data: Codable?
}

enum WebSocketMessageType: String, Codable {
    case message
    case typing
    case connection
    case heartbeat
}

struct TypingEvent: Codable {
    let conversationId: UUID
    let userId: UUID
    let isTyping: Bool
}

enum NetworkError: Error {
    case sendFailed
    case fetchFailed
    case connectionFailed
}
```

## 4. **Storage and Caching System**

```swift
// MARK: - Storage Manager
class StorageManager {
    private let coreDataStack: CoreDataStack
    private let messageCache: NSCache<NSString, Message>
    
    init() {
        self.coreDataStack = CoreDataStack.shared
        self.messageCache = NSCache<NSString, Message>()
        self.messageCache.countLimit = 1000
    }
    
    // MARK: - Message Storage
    func saveMessage(_ message: Message) {
        // Save to Core Data
        coreDataStack.context.perform {
            let messageEntity = MessageEntity(context: self.coreDataStack.context)
            messageEntity.id = message.id
            messageEntity.conversationId = message.conversationId
            messageEntity.senderId = message.senderId
            messageEntity.content = message.content
            messageEntity.type = message.type.rawValue
            messageEntity.timestamp = message.timestamp
            messageEntity.status = message.status.rawValue
            messageEntity.metadata = message.metadata
            messageEntity.replyTo = message.replyTo
            
            try? self.coreDataStack.context.save()
        }
        
        // Cache message
        messageCache.setObject(message, forKey: message.id.uuidString as NSString)
    }
    
    func getMessages(for conversationId: UUID) -> [Message] {
        let fetchRequest: NSFetchRequest<MessageEntity> = MessageEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "conversationId == %@", conversationId as CVarArg)
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]
        
        do {
            let entities = try coreDataStack.context.fetch(fetchRequest)
            return entities.compactMap { entity in
                guard let id = entity.id,
                      let conversationId = entity.conversationId,
                      let senderId = entity.senderId,
                      let content = entity.content,
                      let typeString = entity.type,
                      let type = MessageType(rawValue: typeString),
                      let timestamp = entity.timestamp,
                      let statusString = entity.status,
                      let status = MessageStatus(rawValue: statusString) else {
                    return nil
                }
                
                return Message(
                    id: id,
                    conversationId: conversationId,
                    senderId: senderId,
                    content: content,
                    type: type,
                    timestamp: timestamp,
                    status: status,
                    metadata: entity.metadata,
                    replyTo: entity.replyTo
                )
            }
        } catch {
            print("Failed to fetch messages: \(error)")
            return []
        }
    }
    
    func updateMessageStatus(messageId: UUID, status: MessageStatus) {
        let fetchRequest: NSFetchRequest<MessageEntity> = MessageEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", messageId as CVarArg)
        
        do {
            if let entity = try coreDataStack.context.fetch(fetchRequest).first {
                entity.status = status.rawValue
                try coreDataStack.context.save()
            }
        } catch {
            print("Failed to update message status: \(error)")
        }
    }
    
    // MARK: - Conversation Storage
    func saveConversation(_ conversation: Conversation) {
        coreDataStack.context.perform {
            let conversationEntity = ConversationEntity(context: self.coreDataStack.context)
            conversationEntity.id = conversation.id
            conversationEntity.name = conversation.name
            conversationEntity.participants = conversation.participants
            conversationEntity.unreadCount = Int32(conversation.unreadCount)
            conversationEntity.createdAt = conversation.createdAt
            conversationEntity.updatedAt = conversation.updatedAt
            conversationEntity.isGroup = conversation.isGroup
            
            try? self.coreDataStack.context.save()
        }
    }
    
    func getConversations() -> [Conversation] {
        let fetchRequest: NSFetchRequest<ConversationEntity> = ConversationEntity.fetchRequest()
        fetchRequest.sortDescriptors = [NSSortDescriptor(key: "updatedAt", ascending: false)]
        
        do {
            let entities = try coreDataStack.context.fetch(fetchRequest)
            return entities.compactMap { entity in
                guard let id = entity.id,
                      let participants = entity.participants,
                      let createdAt = entity.createdAt,
                      let updatedAt = entity.updatedAt else {
                    return nil
                }
                
                return Conversation(
                    id: id,
                    name: entity.name,
                    participants: participants,
                    lastMessage: nil, // Would need to fetch separately
                    unreadCount: Int(entity.unreadCount),
                    createdAt: createdAt,
                    updatedAt: updatedAt,
                    isGroup: entity.isGroup
                )
            }
        } catch {
            print("Failed to fetch conversations: \(error)")
            return []
        }
    }
    
    func updateConversation(_ conversation: Conversation) {
        let fetchRequest: NSFetchRequest<ConversationEntity> = ConversationEntity.fetchRequest()
        fetchRequest.predicate = NSPredicate(format: "id == %@", conversation.id as CVarArg)
        
        do {
            if let entity = try coreDataStack.context.fetch(fetchRequest).first {
                entity.name = conversation.name
                entity.participants = conversation.participants
                entity.unreadCount = Int32(conversation.unreadCount)
                entity.updatedAt = conversation.updatedAt
                try coreDataStack.context.save()
            }
        } catch {
            print("Failed to update conversation: \(error)")
        }
    }
}

// MARK: - Message Queue
class MessageQueue {
    private var queue: [Message] = []
    private let queue = DispatchQueue(label: "com.app.messagequeue", attributes: .concurrent)
    private let networkManager: NetworkManager
    
    init(networkManager: NetworkManager) {
        self.networkManager = networkManager
    }
    
    func enqueue(_ message: Message) {
        queue.async(flags: .barrier) {
            self.queue.append(message)
            self.processQueue()
        }
    }
    
    private func processQueue() {
        guard !queue.isEmpty else { return }
        
        let message = queue.removeFirst()
        
        Task {
            do {
                try await networkManager.sendMessage(message)
                // Update message status to sent
            } catch {
                // Re-queue message for retry
                queue.async(flags: .barrier) {
                    self.queue.insert(message, at: 0)
                }
            }
        }
    }
}
```

## 5. **Push Notification Integration**

```swift
// MARK: - Notification Manager
class NotificationManager: NSObject, UNUserNotificationCenterDelegate {
    static let shared = NotificationManager()
    
    override init() {
        super.init()
        UNUserNotificationCenter.current().delegate = self
    }
    
    func requestPermission() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
            if granted {
                DispatchQueue.main.async {
                    UIApplication.shared.registerForRemoteNotifications()
                }
            }
        }
    }
    
    func showMessageNotification(_ message: Message) {
        let content = UNMutableNotificationContent()
        content.title = getSenderName(for: message.senderId)
        content.body = message.content
        content.sound = .default
        
        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(identifier: message.id.uuidString, content: content, trigger: trigger)
        
        UNUserNotificationCenter.current().add(request)
    }
    
    private func getSenderName(for userId: UUID) -> String {
        // Get sender name from user manager
        return UserManager.shared.getUserName(for: userId) ?? "Unknown"
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound])
    }
    
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        // Handle notification tap
        if let messageId = UUID(uuidString: response.notification.request.identifier) {
            // Navigate to conversation
            NotificationCenter.default.post(name: .openConversation, object: messageId)
        }
        
        completionHandler()
    }
}

// MARK: - App Delegate Integration
extension AppDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        
        // Send token to server
        Task {
            try await registerDeviceToken(tokenString)
        }
    }
    
    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }
    
    private func registerDeviceToken(_ token: String) async throws {
        let url = URL(string: "https://api.messaging.com/device-token")!
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["deviceToken": token, "platform": "ios"]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (_, response) = try await URLSession.shared.data(for: request)
        
        guard let httpResponse = response as? HTTPURLResponse,
              httpResponse.statusCode == 200 else {
            throw NetworkError.sendFailed
        }
    }
}
```

## 6. **SwiftUI Integration**

```swift
import SwiftUI

// MARK: - Messaging View
struct MessagingView: View {
    @StateObject private var messageManager = MessageManager()
    @State private var messageText = ""
    @State private var showingImagePicker = false
    @FocusState private var isTextFieldFocused: Bool
    
    let conversation: Conversation
    
    var body: some View {
        VStack {
            // Messages List
            ScrollViewReader { proxy in
                ScrollView {
                    LazyVStack(spacing: 8) {
                        ForEach(messageManager.messages) { message in
                            MessageBubbleView(message: message)
                                .id(message.id)
                        }
                    }
                    .padding(.horizontal)
                }
                .onChange(of: messageManager.messages.count) { _ in
                    if let lastMessage = messageManager.messages.last {
                        withAnimation(.easeInOut(duration: 0.3)) {
                            proxy.scrollTo(lastMessage.id, anchor: .bottom)
                        }
                    }
                }
            }
            
            // Message Input
            MessageInputView(
                text: $messageText,
                isFocused: $isTextFieldFocused,
                onSend: sendMessage,
                onAttachment: { showingImagePicker = true }
            )
        }
        .navigationTitle(conversation.displayName)
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            messageManager.currentConversation = conversation
            messageManager.loadMessages(for: conversation.id)
        }
        .sheet(isPresented: $showingImagePicker) {
            ImagePicker { image in
                sendImage(image)
            }
        }
    }
    
    private func sendMessage() {
        guard !messageText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return }
        
        messageManager.sendMessage(messageText, to: conversation.id)
        messageText = ""
    }
    
    private func sendImage(_ image: UIImage) {
        // Handle image sending
        // This would involve uploading the image and sending a message with the image URL
    }
}

// MARK: - Message Bubble View
struct MessageBubbleView: View {
    let message: Message
    
    var body: some View {
        HStack {
            if message.isFromCurrentUser {
                Spacer()
                messageContent
            } else {
                messageContent
                Spacer()
            }
        }
    }
    
    private var messageContent: some View {
        VStack(alignment: message.isFromCurrentUser ? .trailing : .leading, spacing: 4) {
            Text(message.content)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(message.isFromCurrentUser ? Color.blue : Color.gray.opacity(0.2))
                .foregroundColor(message.isFromCurrentUser ? .white : .primary)
                .cornerRadius(16)
            
            Text(message.displayTime)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .onTapGesture {
            // Handle message tap (e.g., show options)
        }
    }
}

// MARK: - Message Input View
struct MessageInputView: View {
    @Binding var text: String
    @Binding var isFocused: Bool
    let onSend: () -> Void
    let onAttachment: () -> Void
    
    var body: some View {
        HStack(spacing: 8) {
            Button(action: onAttachment) {
                Image(systemName: "paperclip")
                    .foregroundColor(.blue)
            }
            
            TextField("Message", text: $text, axis: .vertical)
                .textFieldStyle(.roundedBorder)
                .focused($isFocused)
                .lineLimit(1...4)
            
            Button(action: onSend) {
                Image(systemName: "arrow.up.circle.fill")
                    .foregroundColor(.blue)
                    .font(.title2)
            }
            .disabled(text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
        }
        .padding(.horizontal)
        .padding(.vertical, 8)
        .background(Color(.systemBackground))
        .overlay(
            Rectangle()
                .frame(height: 0.5)
                .foregroundColor(Color(.separator)),
            alignment: .top
        )
    }
}

// MARK: - Conversations List View
struct ConversationsListView: View {
    @StateObject private var messageManager = MessageManager()
    
    var body: some View {
        NavigationView {
            List(messageManager.conversations) { conversation in
                NavigationLink(destination: MessagingView(conversation: conversation)) {
                    ConversationRowView(conversation: conversation)
                }
            }
            .navigationTitle("Messages")
            .refreshable {
                // Refresh conversations
            }
        }
    }
}

// MARK: - Conversation Row View
struct ConversationRowView: View {
    let conversation: Conversation
    
    var body: some View {
        HStack {
            Circle()
                .fill(Color.gray.opacity(0.3))
                .frame(width: 50, height: 50)
                .overlay(
                    Text(conversation.displayName.prefix(1).uppercased())
                        .font(.title2)
                        .fontWeight(.medium)
                )
            
            VStack(alignment: .leading, spacing: 4) {
                Text(conversation.displayName)
                    .font(.headline)
                
                if let lastMessage = conversation.lastMessage {
                    Text(lastMessage.content)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                        .lineLimit(1)
                }
            }
            
            Spacer()
            
            VStack(alignment: .trailing, spacing: 4) {
                Text(conversation.updatedAt, style: .relative)
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                if conversation.unreadCount > 0 {
                    Text("\(conversation.unreadCount)")
                        .font(.caption)
                        .foregroundColor(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.blue)
                        .clipShape(Circle())
                }
            }
        }
        .padding(.vertical, 4)
    }
}
```

## **Summary**

A robust real-time messaging system in iOS requires:

1. **Real-time Communication**: WebSocket connections for instant message delivery
2. **Offline Support**: Local storage and message queuing for offline scenarios
3. **Push Notifications**: Background message delivery and user engagement
4. **Data Synchronization**: Conflict resolution and message ordering
5. **Performance Optimization**: Efficient caching and pagination
6. **User Experience**: Smooth animations and responsive interface

This architecture provides a foundation for building professional-grade messaging applications that can compete with established platforms while maintaining excellent performance and user experience. 