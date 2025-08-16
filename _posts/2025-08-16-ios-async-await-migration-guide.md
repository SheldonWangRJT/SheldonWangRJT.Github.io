---
title: "The Complete Guide to Migrating iOS Swift Code to Async/Await: Handling Legacy Sync Functions and Objective-C Interoperability"
date: 2025-08-16
permalink: /posts/2025/08/ios-async-await-migration-guide/
tags:
  - iOS
  - Swift
  - Async/Await
  - Concurrency
  - Objective-C
  - Migration
  - Performance
---

After 10+ years of iOS development, I've seen the evolution from NSOperationQueue to GCD, then to DispatchQueue, and now to Swift's structured concurrency with async/await. The migration to async/await isn't just about replacing completion handlers—it's a fundamental shift in how we think about concurrency, especially when dealing with legacy codebases that have deep Objective-C roots and synchronous APIs that assume main thread execution.

## 🎯 The Real Challenge: Beyond Simple Completion Handler Conversion

Most tutorials show you how to convert this:

```swift
// Before
func fetchData(completion: @escaping (Result<Data, Error>) -> Void) {
    URLSession.shared.dataTask(with: url) { data, response, error in
        // Handle result
        completion(.success(data))
    }.resume()
}

// After
func fetchData() async throws -> Data {
    let (data, _) = try await URLSession.shared.data(from: url)
    return data
}
```

But real-world migration involves:
- Legacy sync functions that **must** run on main thread
- Objective-C APIs with implicit threading assumptions
- Complex dependency chains with mixed sync/async patterns
- Performance-critical code paths that can't afford context switching overhead

## 🧠 Understanding the Threading Model Shift

### The Old World: Thread Pools and Manual Dispatch

```swift
// Legacy pattern - explicit thread management
class LegacyDataManager {
    private let serialQueue = DispatchQueue(label: "data.manager")
    private let mainQueue = DispatchQueue.main
    
    func processData(_ input: Data, completion: @escaping (ProcessedData) -> Void) {
        serialQueue.async {
            let processed = self.heavyProcessing(input) // Sync function
            self.mainQueue.async {
                self.updateUI(processed) // Must be on main thread
                completion(processed)
            }
        }
    }
    
    // This MUST run on main thread - legacy UIKit dependency
    private func updateUI(_ data: ProcessedData) {
        // Direct UIKit manipulation
        UIView.animate(withDuration: 0.3) {
            self.progressView.alpha = 1.0
        }
    }
}
```

### The New World: Structured Concurrency with Actor Isolation

```swift
// Modern pattern - actor isolation and async context
@MainActor
class ModernDataManager {
    private let processor = DataProcessor()
    
    func processData(_ input: Data) async -> ProcessedData {
        // Automatically switches to background for async work
        let processed = await processor.heavyProcessing(input)
        
        // Automatically back on main actor for UI updates
        updateUI(processed)
        return processed
    }
    
    // Guaranteed to run on main thread due to @MainActor
    private func updateUI(_ data: ProcessedData) {
        UIView.animate(withDuration: 0.3) {
            self.progressView.alpha = 1.0
        }
    }
}

actor DataProcessor {
    func heavyProcessing(_ input: Data) async -> ProcessedData {
        // Runs on actor's isolated queue
        return ProcessedData(input)
    }
}
```

## 🔧 Migration Strategy: The Four-Phase Approach

### Phase 1: Audit and Categorize Your Sync Functions

Not all synchronous functions are created equal. Create an inventory:

```swift
// Category 1: Pure computation (thread-safe, no side effects)
func calculateHash(_ data: Data) -> String {
    return data.sha256
}

// Category 2: Main thread dependent (UIKit, Core Animation)
func updateProgressBar(_ progress: Float) {
    progressView.setProgress(progress, animated: true)
}

// Category 3: Thread-unsafe but not main-dependent
func writeToCache(_ data: Data, key: String) {
    FileManager.default.createFile(atPath: cacheURL.path, contents: data)
}

// Category 4: Objective-C bridged with implicit threading
@objc func processImageWithCoreImage(_ image: UIImage) -> CIImage {
    return CIImage(image: image)!
}
```

### Phase 2: Create Async Wrappers with Proper Actor Isolation

```swift
// For Category 1: Pure computation - can run anywhere
extension DataProcessor {
    func calculateHashAsync(_ data: Data) async -> String {
        // For CPU-intensive work, explicitly move to background
        return await withCheckedContinuation { continuation in
            Task.detached(priority: .userInitiated) {
                let hash = self.calculateHash(data)
                continuation.resume(returning: hash)
            }
        }
    }
}

// For Category 2: Main thread dependent - use @MainActor
@MainActor
extension ProgressManager {
    func updateProgressAsync(_ progress: Float) async {
        updateProgressBar(progress)
    }
}

// For Category 3: Thread-unsafe - use dedicated actor
actor CacheManager {
    func writeAsync(_ data: Data, key: String) async throws {
        try await withCheckedThrowingContinuation { continuation in
            do {
                writeToCache(data, key: key)
                continuation.resume()
            } catch {
                continuation.resume(throwing: error)
            }
        }
    }
}
```

### Phase 3: Handle Objective-C Interoperability

The biggest challenge is Objective-C code that makes implicit threading assumptions:

```swift
// Objective-C header (legacy)
@interface ImageProcessor : NSObject
- (UIImage *)processImage:(UIImage *)input; // Sync, thread assumptions unclear
- (void)processImageAsync:(UIImage *)input completion:(void(^)(UIImage *))completion;
@end

// Swift wrapper with explicit threading guarantees
@MainActor
class SafeImageProcessor {
    private let objcProcessor = ImageProcessor()
    
    // Option 1: Preserve sync behavior with explicit actor
    func processImageSync(_ input: UIImage) async -> UIImage {
        // Ensure we're on main thread for UIImage handling
        precondition(Thread.isMainThread)
        return objcProcessor.processImage(input)
    }
    
    // Option 2: Wrap existing async Objective-C
    func processImageAsync(_ input: UIImage) async -> UIImage {
        return await withCheckedContinuation { continuation in
            objcProcessor.processImageAsync(input) { result in
                continuation.resume(returning: result)
            }
        }
    }
    
    // Option 3: Safe background processing with proper isolation
    func processImageSafely(_ input: UIImage) async -> UIImage {
        // Extract data on main thread
        let imageData = input.pngData()!
        
        // Process on background
        let processedData = await Task.detached {
            // Create image from data (thread-safe)
            let backgroundImage = UIImage(data: imageData)!
            return self.objcProcessor.processImage(backgroundImage)
        }.value
        
        // Return to main for final UIImage creation
        return processedData
    }
}
```

### Phase 4: Performance Optimization and Context Switching

The hidden cost of async/await is context switching. Here's how to minimize it:

```swift
// ❌ Bad: Excessive context switching
@MainActor
class IneffientProcessor {
    func processMultipleItems(_ items: [Data]) async -> [ProcessedData] {
        var results: [ProcessedData] = []
        
        for item in items {
            // Context switch for each item!
            let processed = await backgroundProcess(item)
            results.append(processed)
        }
        return results
    }
}

// ✅ Good: Batch processing with minimal switching
@MainActor
class EfficientProcessor {
    func processMultipleItems(_ items: [Data]) async -> [ProcessedData] {
        // Single context switch to background
        return await withTaskGroup(of: ProcessedData.self) { group in
            for item in items {
                group.addTask {
                    await self.backgroundProcess(item)
                }
            }
            
            var results: [ProcessedData] = []
            for await result in group {
                results.append(result)
            }
            return results
        }
    }
    
    private func backgroundProcess(_ data: Data) async -> ProcessedData {
        // All heavy lifting happens here without switching
        return ProcessedData(data)
    }
}
```

## 🚨 Common Pitfalls and How to Avoid Them

### 1. The MainActor Trap

```swift
// ❌ This looks innocent but has a hidden problem
@MainActor
class DataManager {
    func loadData() async throws -> Data {
        // This network call now happens on main thread!
        let data = try await URLSession.shared.data(from: url).0
        return data
    }
}

// ✅ Proper solution: Explicit actor boundaries
@MainActor
class DataManager {
    private let networkManager = NetworkManager()
    
    func loadData() async throws -> Data {
        // Network call happens on background, UI updates on main
        let data = try await networkManager.fetchData()
        updateLoadingIndicator(false)
        return data
    }
    
    private func updateLoadingIndicator(_ loading: Bool) {
        loadingView.isHidden = !loading
    }
}

actor NetworkManager {
    func fetchData() async throws -> Data {
        // Properly isolated network call
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}
```

### 2. The @MainActor Forcing Anti-Pattern and assumeIsolated Tech Debt

One of the most tempting "quick fixes" during migration is forcing `@MainActor` everywhere or using `MainActor.assumeIsolated`. While these might seem like shortcuts, they create significant tech debt and uncertainty.

```swift
// ❌ The "Force Everything to MainActor" Anti-Pattern
@MainActor
class DataProcessor {
    func processLargeDataset(_ data: [Data]) async -> [ProcessedData] {
        // This entire CPU-intensive operation now blocks the main thread!
        return data.map { item in
            // Heavy computation on main thread = UI freezes
            return performComplexTransformation(item)
        }
    }
    
    func networkOperation() async throws -> Data {
        // Network call on main thread = potential ANR
        let (data, _) = try await URLSession.shared.data(from: url)
        return data
    }
}

// ❌ The assumeIsolated "Quick Fix" 
class LegacyUIManager {
    // Legacy sync function that assumes main thread
    func updateUIElements(_ data: DisplayData) {
        label.text = data.title
        imageView.image = data.image
    }
    
    // Dangerous migration attempt
    func migrateToAsync(_ data: DisplayData) async {
        // This is a code smell and creates uncertainty!
        MainActor.assumeIsolated {
            updateUIElements(data)
        }
        // What if we're NOT on the main actor? Runtime crash!
    }
}

// ✅ Proper isolation with explicit boundaries
@MainActor
class UIManager {
    // UI updates guaranteed on main actor
    func updateDisplay(_ data: DisplayData) {
        label.text = data.title
        imageView.image = data.image
    }
}

actor DataProcessor {
    // Heavy computation isolated to background
    func processLargeDataset(_ data: [Data]) async -> [ProcessedData] {
        return await withTaskGroup(of: ProcessedData.self) { group in
            for item in data {
                group.addTask {
                    return self.performComplexTransformation(item)
                }
            }
            
            var results: [ProcessedData] = []
            for await result in group {
                results.append(result)
            }
            return results
        }
    }
    
    private func performComplexTransformation(_ data: Data) -> ProcessedData {
        // CPU-intensive work isolated from main thread
        return ProcessedData(data)
    }
}

// Bridge between actors with explicit async boundaries
@MainActor
class CoordinatedManager {
    private let dataProcessor = DataProcessor()
    private let uiManager = UIManager()
    
    func processAndDisplay(_ data: [Data]) async {
        // Background processing
        let processed = await dataProcessor.processLargeDataset(data)
        
        // Main thread UI updates
        for item in processed {
            uiManager.updateDisplay(item.displayData)
        }
    }
}
```

#### The Hidden Costs of assumeIsolated

`MainActor.assumeIsolated` creates several problems:

1. **Runtime Uncertainty**: No compile-time guarantee of thread safety
2. **Hidden Crashes**: Will crash if assumption is wrong
3. **Testing Complexity**: Different behavior in test vs production
4. **Code Smell**: Usually indicates architectural problems

```swift
// ❌ Technical debt accumulation
class ProblemManager {
    func handleUserAction() {
        // Assumption 1: We're on main thread
        MainActor.assumeIsolated {
            updateUI()
        }
        
        Task {
            let data = await fetchData()
            // Assumption 2: Still safe to assume main thread?
            MainActor.assumeIsolated {
                processData(data) // This might crash!
            }
        }
    }
}

// ✅ Explicit actor coordination
@MainActor
class SolutionManager {
    func handleUserAction() async {
        // Guaranteed main thread execution
        updateUI()
        
        // Explicit background work
        let data = await BackgroundProcessor.shared.fetchData()
        
        // Back to main thread automatically
        processDataOnMain(data)
    }
    
    private func processDataOnMain(_ data: Data) {
        // Compile-time guarantee of main thread execution
    }
}

actor BackgroundProcessor {
    static let shared = BackgroundProcessor()
    
    func fetchData() async -> Data {
        // Guaranteed background execution
        let (data, _) = try! await URLSession.shared.data(from: url)
        return data
    }
}
```

#### Refactoring Away from assumeIsolated

When you encounter `assumeIsolated` in your codebase, use this refactoring strategy:

```swift
// Step 1: Identify the problematic pattern
class LegacyManager {
    func problematicFunction() async {
        let data = await fetchSomeData()
        
        // Red flag: assumeIsolated usage
        MainActor.assumeIsolated {
            self.updateSomeUI(data)
        }
    }
}

// Step 2: Extract main-thread work to @MainActor function
class LegacyManager {
    func problematicFunction() async {
        let data = await fetchSomeData()
        await updateUIFromData(data)
    }
    
    @MainActor
    private func updateUIFromData(_ data: Data) {
        updateSomeUI(data)
    }
}

// Step 3: Consider if the entire coordination should be @MainActor
@MainActor
class RefactoredManager {
    private let dataFetcher = DataFetcher()
    
    func betterFunction() async {
        let data = await dataFetcher.fetchSomeData()
        updateSomeUI(data) // Natural main actor execution
    }
}

actor DataFetcher {
    func fetchSomeData() async -> Data {
        // Isolated background work
        return Data()
    }
}
```

### 3. Objective-C Callback Hell

```swift
// ❌ Naive Objective-C wrapping
func migrateObjCCallback() async -> Result {
    return await withCheckedContinuation { continuation in
        objcManager.performOperation { success, error in
            // What if this callback isn't called? Continuation hangs forever!
            if success {
                continuation.resume(returning: .success)
            } else {
                continuation.resume(throwing: error ?? UnknownError())
            }
        }
    }
}

// ✅ Defensive Objective-C wrapping
func migrateObjCCallbackSafely() async throws -> Result {
    return try await withThrowingTaskGroup(of: Result.self) { group in
        // Add the main operation
        group.addTask {
            try await withCheckedThrowingContinuation { continuation in
                self.objcManager.performOperation { success, error in
                    if success {
                        continuation.resume(returning: .success)
                    } else {
                        continuation.resume(throwing: error ?? UnknownError())
                    }
                }
            }
        }
        
        // Add timeout task
        group.addTask {
            try await Task.sleep(nanoseconds: 30_000_000_000) // 30 seconds
            throw TimeoutError()
        }
        
        // Return first result, cancel others
        let result = try await group.next()!
        group.cancelAll()
        return result
    }
}
```

### 3. Memory Management in Async Contexts

```swift
// ❌ Potential retain cycles in async code
class DataProcessor {
    func processInBackground() async {
        await withTaskGroup(of: Void.self) { group in
            group.addTask {
                // Strong reference to self captured!
                await self.heavyComputation()
            }
        }
    }
}

// ✅ Proper memory management
class DataProcessor {
    func processInBackground() async {
        await withTaskGroup(of: Void.self) { [weak self] group in
            guard let self = self else { return }
            
            group.addTask { [weak self] in
                await self?.heavyComputation()
            }
        }
    }
}
```

## 📊 Performance Monitoring and Debugging

### Instrument Your Migration

```swift
// Custom instrumentation for async migration
actor PerformanceMonitor {
    private var metrics: [String: TimeInterval] = [:]
    
    func measure<T>(_ operation: String, _ work: () async throws -> T) async rethrows -> T {
        let start = CFAbsoluteTimeGetCurrent()
        defer {
            let duration = CFAbsoluteTimeGetCurrent() - start
            Task.detached { [weak self] in
                await self?.recordMetric(operation, duration: duration)
            }
        }
        return try await work()
    }
    
    private func recordMetric(_ operation: String, duration: TimeInterval) {
        metrics[operation] = duration
        
        // Log slow operations
        if duration > 0.1 {
            print("⚠️ Slow async operation: \(operation) took \(duration)s")
        }
    }
}

// Usage
let monitor = PerformanceMonitor()

func migratedFunction() async throws -> Data {
    return try await monitor.measure("data_processing") {
        try await heavyDataProcessing()
    }
}
```

### Debugging Async/Await Issues

```swift
// Custom debugging utilities
extension Task where Success == Never, Failure == Never {
    static func debugSleep(_ duration: TimeInterval, operation: String) async {
        print("🕐 Starting \(operation)")
        try? await Task.sleep(nanoseconds: UInt64(duration * 1_000_000_000))
        print("✅ Completed \(operation)")
    }
}

// Thread debugging
func debugCurrentThread(_ context: String) {
    if Thread.isMainThread {
        print("🔵 \(context): Main Thread")
    } else {
        print("🟠 \(context): Background Thread (\(Thread.current))")
    }
}
```

## 🧪 A/B Testing Strategy: The Hidden Migration Challenge

One of the most overlooked challenges in async/await migration is maintaining A/B testing capabilities. Traditional A/B testing requires code paths to be easily swappable, but async/await fundamentally changes function signatures and call patterns, making this extremely difficult.

### The A/B Testing Dilemma

```swift
// The problem: These can't be easily A/B tested
class FeatureManager {
    // Old sync version
    func processUserDataSync(_ data: UserData) -> ProcessedResult {
        return heavyProcessing(data)
    }
    
    // New async version - completely different signature!
    func processUserDataAsync(_ data: UserData) async -> ProcessedResult {
        return await heavyProcessingAsync(data)
    }
    
    // How do you A/B test between these without code duplication?
}
```

### Strategy 1: Protocol-Based Abstraction Layer

Create a unified interface that can handle both sync and async implementations:

```swift
// Unified protocol that works for both sync and async
protocol DataProcessorProtocol {
    func processUserData(_ data: UserData) async -> ProcessedResult
}

// Sync implementation wrapped in async
class SyncDataProcessor: DataProcessorProtocol {
    func processUserData(_ data: UserData) async -> ProcessedResult {
        // Wrap sync call in async context
        return await Task.detached {
            return self.processUserDataSync(data)
        }.value
    }
    
    private func processUserDataSync(_ data: UserData) -> ProcessedResult {
        // Original sync implementation
        return heavyProcessing(data)
    }
}

// Native async implementation
class AsyncDataProcessor: DataProcessorProtocol {
    func processUserData(_ data: UserData) async -> ProcessedResult {
        return await heavyProcessingAsync(data)
    }
}

// A/B testing controller
@MainActor
class FeatureManager {
    private var processor: DataProcessorProtocol
    
    init() {
        // A/B test flag determines implementation
        if ExperimentManager.shared.isAsyncProcessingEnabled {
            self.processor = AsyncDataProcessor()
        } else {
            self.processor = SyncDataProcessor()
        }
    }
    
    func processUserData(_ data: UserData) async -> ProcessedResult {
        // Single call site, different implementations
        return await processor.processUserData(data)
    }
}
```

### Strategy 2: Feature Flag with Async Wrapper Pattern

Use feature flags with careful async wrapping to minimize code divergence:

```swift
class UnifiedDataManager {
    private let experimentManager = ExperimentManager.shared
    
    func processData(_ input: DataInput) async throws -> DataOutput {
        if experimentManager.useAsyncProcessing {
            return try await processDataAsync(input)
        } else {
            return try await processDataSyncWrapped(input)
        }
    }
    
    // New async implementation
    private func processDataAsync(_ input: DataInput) async throws -> DataOutput {
        // Native async processing
        let step1 = await performAsyncStep1(input)
        let step2 = await performAsyncStep2(step1)
        return try await performAsyncStep3(step2)
    }
    
    // Legacy sync wrapped in async
    private func processDataSyncWrapped(_ input: DataInput) async throws -> DataOutput {
        return try await withCheckedThrowingContinuation { continuation in
            // Execute on background queue to avoid blocking
            DispatchQueue.global(qos: .userInitiated).async {
                do {
                    let result = self.processDataSync(input)
                    continuation.resume(returning: result)
                } catch {
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    // Original sync implementation (unchanged)
    private func processDataSync(_ input: DataInput) throws -> DataOutput {
        let step1 = performSyncStep1(input)
        let step2 = performSyncStep2(step1)
        return try performSyncStep3(step2)
    }
}
```

### Strategy 3: Gradual Migration with Compatibility Bridges

Implement both versions side-by-side with careful compatibility bridges:

```swift
// Migration-friendly architecture
class DataService {
    private let useAsync: Bool
    
    init(useAsync: Bool = ExperimentConfig.asyncDataProcessing) {
        self.useAsync = useAsync
    }
    
    // Public async interface (always async for consistency)
    func fetchAndProcessData() async throws -> ProcessedData {
        if useAsync {
            return try await fetchAndProcessDataAsync()
        } else {
            return try await fetchAndProcessDataLegacy()
        }
    }
    
    // Native async implementation
    private func fetchAndProcessDataAsync() async throws -> ProcessedData {
        async let networkData = NetworkManager.shared.fetchData()
        async let cacheData = CacheManager.shared.getCachedData()
        
        let (network, cache) = try await (networkData, cacheData)
        return await DataProcessor.shared.merge(network: network, cache: cache)
    }
    
    // Legacy sync implementation wrapped
    private func fetchAndProcessDataLegacy() async throws -> ProcessedData {
        return try await Task.detached {
            // Original sync chain
            let networkData = try self.fetchDataSync()
            let cacheData = self.getCachedDataSync()
            return self.mergeDataSync(network: networkData, cache: cacheData)
        }.value
    }
}
```

### Strategy 4: Metrics-Driven Migration with A/B Testing

Implement comprehensive metrics to compare performance and reliability:

```swift
// Metrics collection for A/B testing
actor MigrationMetrics {
    private var syncMetrics: [String: TimeInterval] = [:]
    private var asyncMetrics: [String: TimeInterval] = [:]
    private var errorCounts: [String: Int] = [:]
    
    func recordSync(operation: String, duration: TimeInterval, success: Bool) {
        syncMetrics[operation] = duration
        if !success {
            errorCounts["sync_\(operation)"] = (errorCounts["sync_\(operation)"] ?? 0) + 1
        }
    }
    
    func recordAsync(operation: String, duration: TimeInterval, success: Bool) {
        asyncMetrics[operation] = duration
        if !success {
            errorCounts["async_\(operation)"] = (errorCounts["async_\(operation)"] ?? 0) + 1
        }
    }
    
    func generateReport() -> MigrationReport {
        return MigrationReport(
            syncPerformance: syncMetrics,
            asyncPerformance: asyncMetrics,
            errorRates: errorCounts
        )
    }
}

// Instrumented service for A/B testing
class InstrumentedDataService {
    private let metrics = MigrationMetrics()
    private let useAsync: Bool
    
    init() {
        self.useAsync = ExperimentManager.shared.asyncMigrationEnabled
    }
    
    func processData(_ input: Data) async -> ProcessedData {
        let startTime = CFAbsoluteTimeGetCurrent()
        var success = true
        
        defer {
            let duration = CFAbsoluteTimeGetCurrent() - startTime
            Task.detached { [weak self] in
                if self?.useAsync == true {
                    await self?.metrics.recordAsync(operation: "processData", 
                                                   duration: duration, 
                                                   success: success)
                } else {
                    await self?.metrics.recordSync(operation: "processData", 
                                                  duration: duration, 
                                                  success: success)
                }
            }
        }
        
        do {
            if useAsync {
                return try await processDataAsync(input)
            } else {
                return try await processDataSyncWrapper(input)
            }
        } catch {
            success = false
            // Fallback or error handling
            return ProcessedData.empty
        }
    }
}
```

### Strategy 5: Shadow Testing Pattern

Run both implementations in parallel and compare results:

```swift
class ShadowTestingService {
    private let primaryProcessor: DataProcessor
    private let shadowProcessor: AsyncDataProcessor
    
    func processWithShadowTesting(_ data: InputData) async -> ProcessedData {
        // Always use primary for actual result
        let primaryResult = await primaryProcessor.process(data)
        
        // Run shadow test in background (don't block primary flow)
        Task.detached { [weak self] in
            await self?.runShadowTest(data: data, expectedResult: primaryResult)
        }
        
        return primaryResult
    }
    
    private func runShadowTest(data: InputData, expectedResult: ProcessedData) async {
        do {
            let shadowResult = await shadowProcessor.process(data)
            let comparison = ResultComparator.compare(expected: expectedResult, 
                                                    actual: shadowResult)
            
            await MetricsLogger.shared.logShadowTest(
                operation: "processData",
                match: comparison.isMatch,
                performance: comparison.performanceDelta
            )
        } catch {
            await MetricsLogger.shared.logShadowTestError(error: error)
        }
    }
}
```

### Strategy 6: Configuration-Driven Migration

Use configuration to control migration rollout:

```swift
// Configuration-driven approach
struct MigrationConfig {
    let asyncProcessingPercentage: Double
    let enableShadowTesting: Bool
    let fallbackToSyncOnError: Bool
    
    static func fromRemoteConfig() -> MigrationConfig {
        return MigrationConfig(
            asyncProcessingPercentage: RemoteConfig.shared.getDouble("async_processing_percentage", defaultValue: 0.0),
            enableShadowTesting: RemoteConfig.shared.getBool("enable_shadow_testing", defaultValue: false),
            fallbackToSyncOnError: RemoteConfig.shared.getBool("fallback_to_sync", defaultValue: true)
        )
    }
}

class ConfigurableDataService {
    private let config: MigrationConfig
    
    init(config: MigrationConfig = MigrationConfig.fromRemoteConfig()) {
        self.config = config
    }
    
    func processData(_ input: Data) async throws -> ProcessedData {
        let shouldUseAsync = Double.random(in: 0...1) < config.asyncProcessingPercentage
        
        do {
            if shouldUseAsync {
                return try await processDataAsync(input)
            } else {
                return try await processDataSync(input)
            }
        } catch {
            // Graceful fallback based on config
            if config.fallbackToSyncOnError && shouldUseAsync {
                return try await processDataSync(input)
            } else {
                throw error
            }
        }
    }
}
```

### Best Practices for A/B Testing During Migration

1. **Start with Shadow Testing**: Run new async code in background without affecting production
2. **Use Gradual Rollout**: Increase async percentage slowly (1% → 5% → 25% → 50% → 100%)
3. **Monitor Key Metrics**: Performance, error rates, memory usage, battery impact
4. **Have Quick Rollback**: Be able to switch back to sync implementation instantly
5. **Test Edge Cases**: Network failures, low memory, background app states
6. **Measure User Experience**: App launch time, responsiveness, ANRs

```swift
// Quick rollback mechanism
class SafeMigrationManager {
    private static let emergencyRollbackKey = "emergency_async_rollback"
    
    static var shouldUseAsync: Bool {
        // Emergency rollback check
        if UserDefaults.standard.bool(forKey: emergencyRollbackKey) {
            return false
        }
        
        // Normal A/B testing logic
        return ExperimentManager.shared.isInAsyncGroup
    }
    
    static func emergencyRollback() {
        UserDefaults.standard.set(true, forKey: emergencyRollbackKey)
        // Notify all services to refresh their configuration
        NotificationCenter.default.post(name: .migrationRollback, object: nil)
    }
}
```

### The Migration Testing Timeline

```
Week 1-2: Shadow testing (0% traffic to async, 100% validation)
Week 3-4: 5% async traffic with extensive monitoring
Week 5-6: 25% async traffic, validate performance metrics
Week 7-8: 50% async traffic, test error handling
Week 9-10: 75% async traffic, prepare for full rollout
Week 11+: 100% async traffic, remove legacy code
```

This approach allows you to migrate safely while maintaining the ability to A/B test and quickly rollback if issues arise.

## 🎯 Migration Checklist

### Before Migration
- [ ] Audit all sync functions and categorize by threading requirements
- [ ] Identify Objective-C dependencies and their threading assumptions
- [ ] Establish performance baselines for critical paths
- [ ] Set up async/await debugging and monitoring

### During Migration
- [ ] Start with leaf functions (no dependencies)
- [ ] Migrate in small, testable chunks
- [ ] Add proper actor isolation annotations
- [ ] **Avoid** forcing `@MainActor` on everything
- [ ] **Avoid** using `MainActor.assumeIsolated` as a quick fix
- [ ] Test on all supported iOS versions
- [ ] Monitor performance regressions

### After Migration
- [ ] Remove old completion-based APIs
- [ ] Update documentation and code comments
- [ ] Train team on new async patterns
- [ ] Establish async/await coding standards

## 🚀 Advanced Patterns for Complex Migrations

### Pattern 1: Gradual Migration with Compatibility Layer

```swift
// Compatibility layer for gradual migration
class HybridNetworkManager {
    // New async interface
    func fetchData() async throws -> Data {
        return try await withCheckedThrowingContinuation { continuation in
            fetchDataLegacy { result in
                switch result {
                case .success(let data):
                    continuation.resume(returning: data)
                case .failure(let error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }
    
    // Legacy interface - gradually deprecated
    func fetchDataLegacy(completion: @escaping (Result<Data, Error>) -> Void) {
        // Existing implementation
    }
    
    // Bridge for calling async from sync code
    func fetchDataSync() throws -> Data {
        let semaphore = DispatchSemaphore(value: 0)
        var result: Result<Data, Error>?
        
        Task {
            do {
                let data = try await fetchData()
                result = .success(data)
            } catch {
                result = .failure(error)
            }
            semaphore.signal()
        }
        
        semaphore.wait()
        return try result!.get()
    }
}
```

### Pattern 2: Actor-Based State Management

```swift
// Migrating complex state management to actors
@globalActor
actor DatabaseActor {
    static let shared = DatabaseActor()
    
    private var cache: [String: Any] = [:]
    private var pendingOperations: Set<String> = []
    
    func getValue<T>(_ key: String, type: T.Type) async -> T? {
        if pendingOperations.contains(key) {
            // Wait for pending operation
            try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
            return await getValue(key, type: type)
        }
        
        return cache[key] as? T
    }
    
    func setValue<T>(_ value: T, forKey key: String) async {
        pendingOperations.insert(key)
        
        // Simulate async storage
        await Task.detached {
            // Actual database write
            try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        }.value
        
        cache[key] = value
        pendingOperations.remove(key)
    }
}
```

## 🎉 Conclusion

Migrating to async/await is more than a syntax change—it's an architectural evolution. The key is understanding that async/await isn't just about making asynchronous code look synchronous; it's about creating clear actor boundaries, minimizing context switching, and maintaining performance while improving code clarity.

The migration journey requires patience, careful planning, and thorough testing. But the end result is code that's more maintainable, less prone to threading bugs, and better positioned for future iOS versions.

Remember: **Don't migrate everything at once**. Start with new features, gradually convert completion-based APIs, and always measure performance impact. Your future self (and your team) will thank you.

---

*Have you successfully migrated a large iOS codebase to async/await? I'd love to hear about your experiences and challenges - email me your thoughts! 🚀*
