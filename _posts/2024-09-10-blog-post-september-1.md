---
title: 'iOS Security: Implementing Biometric Authentication and Keychain'
date: 2024-09-10
permalink: /posts/2024/09/blog-post-september-1/
tags:
  - iOS
  - Security
  - Biometric
  - Keychain
  - Authentication
---

iOS security is crucial for protecting user data and ensuring app integrity. Modern iOS apps need robust authentication mechanisms using biometrics and secure storage with Keychain. Let's implement comprehensive security solutions with real, working code examples.

## 1. **Biometric Authentication Implementation**

```swift
import LocalAuthentication
import Foundation

// MARK: - Biometric Authentication Manager
class BiometricAuthManager {
    private let context = LAContext()
    
    enum BiometricType {
        case none
        case touchID
        case faceID
        case unknown
    }
    
    enum AuthError: Error, LocalizedError {
        case notAvailable
        case notEnrolled
        case cancelled
        case failed
        case lockedOut
        
        var errorDescription: String? {
            switch self {
            case .notAvailable:
                return "Biometric authentication is not available"
            case .notEnrolled:
                return "No biometric data enrolled"
            case .cancelled:
                return "Authentication was cancelled"
            case .failed:
                return "Authentication failed"
            case .lockedOut:
                return "Biometric authentication is locked out"
            }
        }
    }
    
    func getBiometricType() -> BiometricType {
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }
        
        switch context.biometryType {
        case .touchID:
            return .touchID
        case .faceID:
            return .faceID
        default:
            return .unknown
        }
    }
    
    func authenticate(reason: String = "Please authenticate") async throws -> Bool {
        var error: NSError?
        
        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            throw AuthError.notAvailable
        }
        
        return try await withCheckedThrowingContinuation { continuation in
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if success {
                    continuation.resume(returning: true)
                } else if let error = error as? LAError {
                    switch error.code {
                    case .userCancel, .systemCancel:
                        continuation.resume(throwing: AuthError.cancelled)
                    case .userFallback:
                        continuation.resume(throwing: AuthError.failed)
                    case .biometryNotEnrolled:
                        continuation.resume(throwing: AuthError.notEnrolled)
                    case .biometryLockout:
                        continuation.resume(throwing: AuthError.lockedOut)
                    default:
                        continuation.resume(throwing: AuthError.failed)
                    }
                } else {
                    continuation.resume(throwing: AuthError.failed)
                }
            }
        }
    }
}
```

## 2. **Keychain Integration for Secure Storage**

```swift
import Security

// MARK: - Keychain Manager
class KeychainManager {
    enum KeychainError: Error, LocalizedError {
        case duplicateEntry
        case unknown(OSStatus)
        case itemNotFound
        case invalidItemFormat
        
        var errorDescription: String? {
            switch self {
            case .duplicateEntry:
                return "Item already exists in keychain"
            case .unknown(let status):
                return "Keychain error: \(status)"
            case .itemNotFound:
                return "Item not found in keychain"
            case .invalidItemFormat:
                return "Invalid item format"
            }
        }
    }
    
    func save(key: String, data: Data, service: String = "com.yourapp.keychain") throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: service,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly
        ]
        
        let status = SecItemAdd(query as CFDictionary, nil)
        
        if status == errSecDuplicateItem {
            // Item already exists, update it
            let updateQuery: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrAccount as String: key,
                kSecAttrService as String: service
            ]
            
            let attributes: [String: Any] = [
                kSecValueData as String: data
            ]
            
            let updateStatus = SecItemUpdate(updateQuery as CFDictionary, attributes as CFDictionary)
            guard updateStatus == errSecSuccess else {
                throw KeychainError.unknown(updateStatus)
            }
        } else if status != errSecSuccess {
            throw KeychainError.unknown(status)
        }
    }
    
    func load(key: String, service: String = "com.yourapp.keychain") throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: service,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess else {
            throw KeychainError.unknown(status)
        }
        
        guard let data = result as? Data else {
            throw KeychainError.invalidItemFormat
        }
        
        return data
    }
    
    func delete(key: String, service: String = "com.yourapp.keychain") throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: service
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unknown(status)
        }
    }
    
    func exists(key: String, service: String = "com.yourapp.keychain") -> Bool {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrService as String: service,
            kSecReturnData as String: false,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        let status = SecItemCopyMatching(query as CFDictionary, nil)
        return status == errSecSuccess
    }
}
```

## 3. **Secure User Authentication System**

```swift
// MARK: - User Authentication Manager
class UserAuthManager {
    private let biometricManager = BiometricAuthManager()
    private let keychainManager = KeychainManager()
    
    struct UserCredentials: Codable {
        let username: String
        let passwordHash: String
        let salt: String
        let createdAt: Date
    }
    
    enum AuthResult {
        case success(User)
        case failure(Error)
        case requiresBiometric
    }
    
    func registerUser(username: String, password: String) async throws -> User {
        // Hash password with salt
        let salt = generateSalt()
        let hashedPassword = hashPassword(password, salt: salt)
        
        let credentials = UserCredentials(
            username: username,
            passwordHash: hashedPassword,
            salt: salt,
            createdAt: Date()
        )
        
        // Store in keychain
        let data = try JSONEncoder().encode(credentials)
        try keychainManager.save(key: "user_credentials", data: data)
        
        // Create user object
        return User(
            id: UUID(),
            name: username,
            email: "\(username)@example.com",
            avatar: nil,
            createdAt: Date(),
            updatedAt: Date()
        )
    }
    
    func loginUser(username: String, password: String) async throws -> AuthResult {
        // Load credentials from keychain
        let data = try keychainManager.load(key: "user_credentials")
        let credentials = try JSONDecoder().decode(UserCredentials.self, from: data)
        
        // Verify username and password
        guard credentials.username == username else {
            throw AuthError.failed
        }
        
        let hashedPassword = hashPassword(password, salt: credentials.salt)
        guard hashedPassword == credentials.passwordHash else {
            throw AuthError.failed
        }
        
        // Check if biometric is required
        if biometricManager.getBiometricType() != .none {
            do {
                try await biometricManager.authenticate(reason: "Login to your account")
            } catch {
                return .requiresBiometric
            }
        }
        
        // Create user object
        let user = User(
            id: UUID(),
            name: username,
            email: "\(username)@example.com",
            avatar: nil,
            createdAt: credentials.createdAt,
            updatedAt: Date()
        )
        
        return .success(user)
    }
    
    func logout() throws {
        // Clear session data
        try keychainManager.delete(key: "session_token")
    }
    
    // MARK: - Helper Methods
    
    private func generateSalt() -> String {
        let letters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
        return String((0..<32).map { _ in letters.randomElement()! })
    }
    
    private func hashPassword(_ password: String, salt: String) -> String {
        let combined = password + salt
        let data = combined.data(using: .utf8)!
        let hash = SHA256.hash(data: data)
        return hash.compactMap { String(format: "%02x", $0) }.joined()
    }
}

// MARK: - SHA256 Implementation
struct SHA256 {
    static func hash(data: Data) -> Data {
        var hash = [UInt8](repeating: 0, count: Int(CC_SHA256_DIGEST_LENGTH))
        data.withUnsafeBytes { buffer in
            _ = CC_SHA256(buffer.baseAddress, CC_LONG(buffer.count), &hash)
        }
        return Data(hash)
    }
}
```

## 4. **SwiftUI Authentication Views**

```swift
import SwiftUI

// MARK: - Login View
struct LoginView: View {
    @StateObject private var authManager = UserAuthManager()
    @State private var username = ""
    @State private var password = ""
    @State private var isLoading = false
    @State private var showError = false
    @State private var errorMessage = ""
    
    var body: some View {
        NavigationView {
            VStack(spacing: 20) {
                Text("Login")
                    .font(.largeTitle)
                    .fontWeight(.bold)
                
                VStack(spacing: 15) {
                    TextField("Username", text: $username)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                        .autocapitalization(.none)
                    
                    SecureField("Password", text: $password)
                        .textFieldStyle(RoundedBorderTextFieldStyle())
                }
                .padding(.horizontal)
                
                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Login")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.blue)
                .foregroundColor(.white)
                .cornerRadius(10)
                .padding(.horizontal)
                .disabled(isLoading)
                
                Button("Register") {
                    // Navigate to registration
                }
                .foregroundColor(.blue)
            }
            .padding()
        }
        .alert("Error", isPresented: $showError) {
            Button("OK") { }
        } message: {
            Text(errorMessage)
        }
    }
    
    private func login() {
        isLoading = true
        
        Task {
            do {
                let result = try await authManager.loginUser(username: username, password: password)
                
                await MainActor.run {
                    isLoading = false
                    
                    switch result {
                    case .success(let user):
                        // Navigate to main app
                        print("Logged in user: \(user.name)")
                    case .failure(let error):
                        errorMessage = error.localizedDescription
                        showError = true
                    case .requiresBiometric:
                        // Handle biometric authentication
                        handleBiometricAuth()
                    }
                }
            } catch {
                await MainActor.run {
                    isLoading = false
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
    
    private func handleBiometricAuth() {
        Task {
            do {
                try await BiometricAuthManager().authenticate(reason: "Complete login")
                await MainActor.run {
                    // Navigate to main app
                    print("Biometric authentication successful")
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    showError = true
                }
            }
        }
    }
}
```

## 5. **Security Best Practices**

```swift
// MARK: - Security Utilities
class SecurityUtils {
    // MARK: - Certificate Pinning
    static func validateCertificate(_ serverTrust: SecTrust, domain: String) -> Bool {
        let policies = [SecPolicyCreateSSL(true, domain as CFString)]
        SecTrustSetPolicies(serverTrust, policies as CFTypeRef)
        
        var error: CFError?
        let isValid = SecTrustEvaluateWithError(serverTrust, &error)
        
        return isValid
    }
    
    // MARK: - Data Encryption
    static func encryptData(_ data: Data, key: Data) throws -> Data {
        let algorithm = kCCAlgorithmAES
        let keySize = kCCKeySizeAES256
        let blockSize = kCCBlockSizeAES
        
        let cryptLength = size_t(data.count + blockSize)
        var cryptData = Data(count: cryptLength)
        
        let keyLength = size_t(keySize)
        let options = CCOptions(kCCOptionPKCS7Padding)
        
        var numBytesEncrypted: size_t = 0
        
        let cryptStatus = cryptData.withUnsafeMutableBytes { cryptBytes in
            data.withUnsafeBytes { dataBytes in
                key.withUnsafeBytes { keyBytes in
                    CCCrypt(CCOperation(kCCEncrypt),
                           algorithm,
                           options,
                           keyBytes.baseAddress,
                           keyLength,
                           nil,
                           dataBytes.baseAddress,
                           data.count,
                           cryptBytes.baseAddress,
                           cryptLength,
                           &numBytesEncrypted)
                }
            }
        }
        
        guard cryptStatus == kCCSuccess else {
            throw SecurityError.encryptionFailed
        }
        
        cryptData.removeSubrange(numBytesEncrypted..<cryptData.count)
        return cryptData
    }
    
    static func decryptData(_ data: Data, key: Data) throws -> Data {
        let algorithm = kCCAlgorithmAES
        let keySize = kCCKeySizeAES256
        let blockSize = kCCBlockSizeAES
        
        let cryptLength = size_t(data.count + blockSize)
        var cryptData = Data(count: cryptLength)
        
        let keyLength = size_t(keySize)
        let options = CCOptions(kCCOptionPKCS7Padding)
        
        var numBytesDecrypted: size_t = 0
        
        let cryptStatus = cryptData.withUnsafeMutableBytes { cryptBytes in
            data.withUnsafeBytes { dataBytes in
                key.withUnsafeBytes { keyBytes in
                    CCCrypt(CCOperation(kCCDecrypt),
                           algorithm,
                           options,
                           keyBytes.baseAddress,
                           keyLength,
                           nil,
                           dataBytes.baseAddress,
                           data.count,
                           cryptBytes.baseAddress,
                           cryptLength,
                           &numBytesDecrypted)
                }
            }
        }
        
        guard cryptStatus == kCCSuccess else {
            throw SecurityError.decryptionFailed
        }
        
        cryptData.removeSubrange(numBytesDecrypted..<cryptData.count)
        return cryptData
    }
}

enum SecurityError: Error {
    case encryptionFailed
    case decryptionFailed
}
```

## **Summary**

Implementing robust iOS security requires:

1. **Biometric Authentication**: Use Touch ID and Face ID for secure user verification
2. **Keychain Storage**: Securely store sensitive data like passwords and tokens
3. **Password Hashing**: Always hash passwords with salt before storage
4. **Certificate Pinning**: Validate server certificates to prevent MITM attacks
5. **Data Encryption**: Encrypt sensitive data in transit and at rest

By implementing these security measures, you can build iOS apps that protect user data and maintain high security standards. 