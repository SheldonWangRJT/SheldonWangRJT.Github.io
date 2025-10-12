---
title: "Design an Image Caching System"
description: "Build an efficient, thread-safe image caching system for iOS with memory and disk caching, intelligent eviction, and download management."
date: 2025-10-10
category: system-design
permalink: /interviews/image-caching-system/
tags:
  - System Design
  - Caching
  - Performance
  - Memory Management
difficulty: Medium
excerpt: "Design an efficient image caching system that downloads and caches images, manages memory and disk cache, handles eviction intelligently, and provides thread-safe operations."
---

## 🎯 Problem Statement

Design an **image caching system** that:

- Downloads and caches images from URLs
- Manages both memory and disk cache
- Handles cache eviction intelligently
- Supports image transformations (resize, crop, blur)
- Thread-safe operations
- Minimal memory footprint
- Fast lookups

**Expected behavior:**
```swift
let imageCache = ImageCache.shared

// Load image (from cache or download)
imageCache.loadImage(url: imageURL, size: CGSize(width: 300, height: 300)) { image in
    cell.imageView.image = image
}

// Prefetch images
imageCache.prefetch(urls: upcomingImageURLs)

// Clear old cache
imageCache.clearCache(olderThan: 7.days)
```

---

## 🏗️ Architecture Design

### **High-Level Structure**

```swift
class ImageCache {
    // MARK: - Properties
    private let memoryCache: NSCache<NSString, UIImage>
    private let diskCache: DiskCacheManager
    private let downloadQueue: OperationQueue
    private let processingQueue: DispatchQueue
    
    // MARK: - Singleton
    static let shared = ImageCache()
    
    private init() {
        // Memory cache configuration
        memoryCache.countLimit = 100 // Max 100 images
        memoryCache.totalCostLimit = 150 * 1024 * 1024 // 150 MB
        memoryCache.delegate = self
        
        // Download queue configuration
        downloadQueue.maxConcurrentOperationCount = 4
        downloadQueue.qualityOfService = .userInitiated
        
        // Processing queue
        processingQueue = DispatchQueue(
            label: "com.app.image-processing",
            qos: .userInitiated,
            attributes: .concurrent
        )
        
        // Disk cache
        diskCache = DiskCacheManager(maxSize: 500 * 1024 * 1024) // 500 MB
    }
    
    // MARK: - Public API
    func loadImage(url: URL, 
                   size: CGSize? = nil,
                   completion: @escaping (UIImage?) -> Void) {
        let cacheKey = generateCacheKey(url: url, size: size)
        
        // 1. Check memory cache (fastest)
        if let cachedImage = memoryCache.object(forKey: cacheKey as NSString) {
            completion(cachedImage)
            return
        }
        
        // 2. Check disk cache (fast)
        diskCache.retrieveImage(forKey: cacheKey) { [weak self] diskImage in
            if let diskImage = diskImage {
                // Store in memory for next time
                self?.memoryCache.setObject(diskImage, forKey: cacheKey as NSString)
                completion(diskImage)
                return
            }
            
            // 3. Download (slow)
            self?.downloadImage(url: url, size: size, cacheKey: cacheKey, completion: completion)
        }
    }
}
```

---

## 🔑 Key Implementation Details

### **1. Cache Eviction Strategies**

**Three Common Approaches:**

| Strategy | How It Works | Best For |
|----------|-------------|----------|
| **LRU** | Evict least recently used | Most images accessed uniformly |
| **LFU** | Evict least frequently used | Some images accessed way more |
| **TTL** | Evict after time expires | Time-sensitive content |

**Recommended: LRU (NSCache does this automatically)**

**Why:**
- iOS photos/feed apps show recent content more
- NSCache handles memory warnings automatically
- Simple to implement

**Manual LRU for Disk Cache:**
```swift
class LRUDiskCache {
    private var accessTimes: [String: Date] = [:]
    private var lock = NSLock()
    
    func retrieveImage(forKey key: String, completion: @escaping (UIImage?) -> Void) {
        lock.lock()
        accessTimes[key] = Date() // Update access time
        lock.unlock()
        
        // Load from disk...
    }
    
    func evictLRU() {
        lock.lock()
        defer { lock.unlock() }
        
        // Sort by access time
        let sorted = accessTimes.sorted { $0.value < $1.value }
        
        // Remove oldest 20%
        let toRemove = Array(sorted.prefix(sorted.count / 5))
        toRemove.forEach { key, _ in
            deleteFromDisk(key: key)
            accessTimes.removeValue(forKey: key)
        }
    }
}
```

### **2. Image Downscaling (Critical for Memory)**

```swift
extension UIImage {
    func downscaled(to targetSize: CGSize) -> UIImage {
        let format = UIGraphicsImageRendererFormat()
        format.scale = 1 // Force 1x scale to save memory
        format.opaque = true // Faster rendering if no alpha
        
        let renderer = UIGraphicsImageRenderer(size: targetSize, format: format)
        
        return renderer.image { context in
            self.draw(in: CGRect(origin: .zero, size: targetSize))
        }
    }
}

// Usage in cache:
private func downloadImage(url: URL, size: CGSize?, cacheKey: String, completion: @escaping (UIImage?) -> Void) {
    let operation = ImageDownloadOperation(url: url, size: size) { [weak self] image in
        guard let image = image else {
            completion(nil)
            return
        }
        
        var finalImage = image
        
        // Downscale if size provided
        if let targetSize = size {
            finalImage = image.downscaled(to: targetSize)
        }
        
        // Cache
        self?.memoryCache.setObject(finalImage, forKey: cacheKey as NSString)
        self?.diskCache.store(finalImage, forKey: cacheKey)
        
        completion(finalImage)
    }
    
    downloadQueue.addOperation(operation)
}
```

### **3. Request Deduplication**

**Problem:** Multiple cells request same image simultaneously

**Solution A: Callback-based (Traditional)**

```swift
class ImageCache {
    private var inFlightRequests: [String: [(UIImage?) -> Void]] = [:]
    private var requestsLock = NSLock()
    
    func loadImage(url: URL, size: CGSize?, completion: @escaping (UIImage?) -> Void) {
        let cacheKey = generateCacheKey(url: url, size: size)
        
        // ... memory/disk cache checks ...
        
        // Check if already downloading
        requestsLock.lock()
        if inFlightRequests[cacheKey] != nil {
            // Add to waiting list
            inFlightRequests[cacheKey]?.append(completion)
            requestsLock.unlock()
            return
        }
        
        // Start new request
        inFlightRequests[cacheKey] = [completion]
        requestsLock.unlock()
        
        // Download
        downloadImage(url: url, size: size) { [weak self] image in
            self?.requestsLock.lock()
            let callbacks = self?.inFlightRequests[cacheKey] ?? []
            self?.inFlightRequests.removeValue(forKey: cacheKey)
            self?.requestsLock.unlock()
            
            // Notify all waiting callbacks
            callbacks.forEach { $0(image) }
        }
    }
}
```

**Why the lock?**
> The lock protects the `inFlightRequests` dictionary from concurrent access. Without it, multiple threads could corrupt the dictionary causing crashes.

---

**Solution B: Modern Async/Await with Actor** ✅ RECOMMENDED for 2025

```swift
actor ImageCache {
    // Actor provides automatic thread-safety - no locks needed!
    private var memoryCache: [String: UIImage] = [:]
    private var inFlightTasks: [String: Task<UIImage?, Never>] = [:]
    
    func loadImage(url: URL, size: CGSize? = nil) async -> UIImage? {
        let cacheKey = generateCacheKey(url: url, size: size)
        
        // 1. Check memory cache
        if let cached = memoryCache[cacheKey] {
            return cached
        }
        
        // 2. Check if already downloading
        if let existingTask = inFlightTasks[cacheKey] {
            // Multiple callers await the SAME task - no duplicate downloads!
            return await existingTask.value
        }
        
        // 3. Start new download task
        let downloadTask = Task<UIImage?, Never> {
            // Download from network
            guard let data = try? await URLSession.shared.data(from: url).0,
                  var image = UIImage(data: data) else {
                return nil
            }
            
            // Resize if needed
            if let targetSize = size {
                image = await resize(image, to: targetSize)
            }
            
            // Cache it
            await cacheImage(image, forKey: cacheKey)
            
            // Clean up in-flight tracking
            await removeTask(forKey: cacheKey)
            
            return image
        }
        
        // Track the task
        inFlightTasks[cacheKey] = downloadTask
        
        // Await result
        return await downloadTask.value
    }
    
    private func cacheImage(_ image: UIImage, forKey key: String) {
        memoryCache[key] = image
        
        // Also save to disk
        Task.detached {
            await self.saveToDisk(image, key: key)
        }
    }
    
    private func removeTask(forKey key: String) {
        inFlightTasks.removeValue(forKey: key)
    }
    
    private func resize(_ image: UIImage, to size: CGSize) async -> UIImage {
        // Resize on background
        await Task.detached(priority: .userInitiated) {
            // UIGraphics resize code
            return resizedImage
        }.value
    }
    
    private func saveToDisk(_ image: UIImage, key: String) async {
        // Disk caching implementation
    }
    
    private func generateCacheKey(url: URL, size: CGSize?) -> String {
        if let size = size {
            return "\(url.absoluteString)-\(Int(size.width))x\(Int(size.height))"
        }
        return url.absoluteString
    }
}
```

**How it works:**

```swift
// Cell 1 requests image
let image1 = await imageCache.loadImage(url: url)  // Creates Task, starts download

// Cell 2 requests SAME image (while downloading)
let image2 = await imageCache.loadImage(url: url)  // Gets SAME Task, waits

// Cell 3 requests SAME image
let image3 = await imageCache.loadImage(url: url)  // Gets SAME Task, waits

// All 3 await the single download!
// Only ONE network request made
```

**Benefits:**
- ✅ **No manual locks** - Actor handles thread-safety
- ✅ **Cleaner code** - No callback arrays
- ✅ **Type-safe** - Compiler prevents data races
- ✅ **Modern Swift** - Shows you know Swift 6 concurrency
- ✅ **Single download** - Multiple callers share same Task

**Interview tip:** Mention both approaches:
> "Traditionally we'd use callbacks with NSLock for thread-safety. With Swift's modern concurrency, an Actor is cleaner - it automatically serializes access to inFlightTasks, preventing race conditions without manual locks."

### **4. Image Format Optimization**

**Format Comparison:**

| Format | Size | Quality | Decode Speed | Best For |
|--------|------|---------|--------------|----------|
| **JPEG** | Medium | Good | Fast | Photos |
| **PNG** | Large | Perfect | Medium | Graphics, transparency |
| **HEIC** | Small | Excellent | Slow | iOS-only photos |
| **WebP** | Smallest | Excellent | Medium | Web images |

**Implementation:**
```swift
func compressImage(_ image: UIImage, quality: CGFloat = 0.8) -> Data? {
    // HEIC compression (iOS 11+)
    if #available(iOS 11.0, *),
       let heicData = image.heicData(compressionQuality: quality),
       heicData.count < image.jpegData(compressionQuality: quality)?.count ?? Int.max {
        return heicData
    }
    
    // Fall back to JPEG
    return image.jpegData(compressionQuality: quality)
}
```

---

## 🧵 Thread Safety

### **Critical Sections to Protect:**

```swift
class ThreadSafeImageCache {
    private let cache = NSCache<NSString, UIImage>()
    private let lock = NSLock()
    private let concurrentQueue = DispatchQueue(
        label: "com.app.imagecache",
        attributes: .concurrent
    )
    
    func setImage(_ image: UIImage, forKey key: String) {
        // NSCache is thread-safe, but wrap for consistency
        concurrentQueue.async(flags: .barrier) { [weak self] in
            self?.cache.setObject(image, forKey: key as NSString)
        }
    }
    
    func image(forKey key: String) -> UIImage? {
        var result: UIImage?
        concurrentQueue.sync {
            result = cache.object(forKey: key as NSString)
        }
        return result
    }
}
```

---

## 💡 Performance Optimizations

### **1. Progressive Image Loading**

```swift
// Show blurred placeholder, then full resolution
func loadImageProgressively(url: URL, completion: @escaping (UIImage, Bool) -> Void) {
    // 1. Load tiny thumbnail first (instant)
    let thumbnailURL = url.thumbnailVersion()
    loadImage(url: thumbnailURL, size: CGSize(width: 50, height: 50)) { thumbnail in
        if let blur = thumbnail?.applyBlur() {
            completion(blur, false) // Not final
        }
    }
    
    // 2. Load full resolution
    loadImage(url: url) { fullImage in
        if let full = fullImage {
            completion(full, true) // Final
        }
    }
}
```

### **2. Memory Warnings**

```swift
override init() {
    super.init()
    
    NotificationCenter.default.addObserver(
        self,
        selector: #selector(handleMemoryWarning),
        name: UIApplication.didReceiveMemoryWarningNotification,
        object: nil
    )
}

@objc private func handleMemoryWarning() {
    // Aggressively clear memory cache
    memoryCache.removeAllObjects()
    
    // Cancel low-priority downloads
    downloadQueue.operations
        .filter { $0.queuePriority == .low }
        .forEach { $0.cancel() }
}
```

---

## 🎯 Interview Discussion Points

### **Trade-offs:**

**Large Memory Cache:**
- ✅ Pro: Faster access, smoother scrolling
- ❌ Con: More crashes, less memory for other features
- **Sweet spot:** 100-200 MB on modern devices

**Aggressive Prefetching:**
- ✅ Pro: Images ready before user scrolls
- ❌ Con: Wasted bandwidth, battery drain
- **Sweet spot:** Prefetch 5-10 items ahead

**Disk Cache Size:**
- ✅ Pro: Better offline experience
- ❌ Con: Takes user's storage
- **Sweet spot:** 300-500 MB, clear after 7-30 days

### **Metrics to Track:**

```swift
struct ImageCacheMetrics {
    var memoryHitRate: Double    // % of requests served from memory
    var diskHitRate: Double      // % served from disk
    var downloadRate: Double     // % that needed download
    var averageLoadTime: TimeInterval
    var cacheSize: (memory: Int, disk: Int)
}
```

---

## 🚀 Bonus: Integration with SDWebImage

**If interviewer asks "Would you build this from scratch?"**

**Answer:** "For production, I'd likely use **SDWebImage** or **Kingfisher** because:
- Battle-tested by millions of apps
- Handles edge cases we haven't discussed
- Active maintenance and bug fixes
- Free development time for business features

**However,** understanding how to build one is valuable for:
- Custom requirements (e.g., special encryption)
- Performance tuning when needed
- Debugging third-party library issues
- Technical interviews 😊"

---

*💡 **Pro Tip:** When discussing caching, always mention memory warnings, thread safety, and eviction policies. These show you've dealt with real-world issues at scale!*

