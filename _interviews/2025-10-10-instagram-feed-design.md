---
title: "Design an Instagram-like Feed"
description: "System design question: Build a scalable, performant feed architecture for iOS with infinite scrolling, caching, and offline support."
date: 2025-10-10
category: system-design
permalink: /interviews/instagram-feed-design/
tags:
  - System Design
  - Architecture
  - Performance
  - Caching
difficulty: Hard
excerpt: "Design the architecture for an Instagram-like feed that displays images/videos efficiently, supports infinite scrolling, handles offline mode, and scales to millions of users."
---

## 🎯 Problem Statement

Design the architecture for an **Instagram-like feed** for iOS that can:

- Display images and videos efficiently
- Support infinite scrolling with pagination
- Handle offline mode and caching
- Optimize for battery life and data usage
- Scale to millions of users

**Constraints:**
- Feed has millions of posts
- Images range from 500KB to 5MB
- Videos up to 60 seconds, 1080p
- Users scroll through 50+ posts per session
- Must work on slow 3G networks

---

## 📐 STEP 1: High-Level Architecture Diagram

**In the interview, start by drawing this on the whiteboard:**

```
┌────────────────────────────────────────────────────────────┐
│                    iOS CLIENT LAYER                         │
│                                                              │
│  ┌──────────────┐         ┌──────────────┐                 │
│  │ FeedView     │────────▶│ FeedViewModel│                 │
│  │ Controller   │◀────────│              │                 │
│  │              │         │  @Published  │                 │
│  │  - UITable/  │         │  properties  │                 │
│  │    Collection│         └──────┬───────┘                 │
│  │  - Cells     │                │                          │
│  │  - Prefetch  │                │                          │
│  └──────────────┘                │                          │
│                                   │                          │
│                          ┌────────▼─────────┐               │
│                          │ FeedRepository   │               │
│                          │ (Single Source   │               │
│                          │  of Truth)       │               │
│                          └─────────┬────────┘               │
│                                    │                         │
│          ┌─────────────────────────┼──────────────────┐     │
│          │                         │                  │     │
│   ┌──────▼──────┐         ┌────────▼───────┐  ┌──────▼────┐│
│   │ Network     │         │ Cache          │  │ Database  ││
│   │ Service     │         │ Manager        │  │ Manager   ││
│   │             │         │                │  │           ││
│   │ - API calls │         │ - Memory cache │  │ - CoreData││
│   │ - URLSession│         │ - Disk cache   │  │ - Offline ││
│   └─────────────┘         └────────────────┘  └───────────┘│
│                                                              │
└────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS
                              ▼
                    ┌──────────────────┐
                    │   BACKEND API    │
                    │                  │
                    │  GET /feed       │
                    │  GET /post/:id   │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │   CDN (Images)   │
                    │   - CloudFront   │
                    │   - Imgix        │
                    └──────────────────┘
```

**Key Dependencies:**
- ViewController depends on ViewModel (observer pattern)
- ViewModel depends on Repository (clean architecture)
- Repository coordinates Network, Cache, Database
- All image/video URLs point to CDN

**💬 What to say while drawing:**
> "I'll start with a layered architecture. At the top, we have the View layer handling UI. The ViewModel manages state and business logic. The Repository acts as a single source of truth, coordinating between network, cache, and database. For images, we'll use a CDN to reduce latency and server load."

---

## 👤 STEP 2: User Flow Diagram

**Draw this to show interaction flow:**

```
USER OPENS APP
      │
      ▼
┌─────────────────┐
│ 1. Load Feed    │
│    Screen       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────┐
│ 2. Check        │────────▶│ YES: Show    │
│    Cache?       │         │    Cached    │
│                 │         │    Posts     │
└────────┬────────┘         └──────────────┘
         │ NO
         ▼
┌─────────────────┐
│ 3. Show         │
│    Loading      │
│    Indicator    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 4. Fetch 20     │
│    Posts from   │
│    API          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────┐
│ 5. Parse JSON   │────────▶│ 6. Store in  │
│    Response     │         │    Cache     │
└────────┬────────┘         └──────────────┘
         │
         ▼
┌─────────────────┐
│ 7. Display      │
│    Posts        │
│    (Text only)  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐         ┌──────────────┐
│ 8. Download     │────────▶│ 9. Show      │
│    Images       │         │    Images    │
│    Async        │         │    as loaded │
└────────┬────────┘         └──────────────┘
         │
         │ USER SCROLLS DOWN
         ▼
┌─────────────────┐
│ 10. Reached     │
│     80% of list │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 11. Prefetch    │
│     next 20     │
│     posts       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ 12. Repeat      │
│     steps 4-9   │
└─────────────────┘

OFFLINE MODE:
┌─────────────────┐
│ No network?     │────────▶│ Show cached │
│                 │         │ posts with  │
│                 │         │ banner      │
└─────────────────┘         └─────────────┘
```

**💬 What to say while drawing:**
> "When the user opens the app, we first check the cache. If we have data, show it immediately for perceived performance. Then fetch fresh data in the background. As users scroll, we prefetch the next page at 80% scroll position. For offline mode, we gracefully degrade by showing cached content with a banner notification."

---

## 🔄 STEP 3: Detailed Component Interactions

**Sequence diagram for loading a post:**

```
User          ViewController   ViewModel   Repository   NetworkService   CacheManager
 │                 │              │            │               │               │
 │ Scroll          │              │            │               │               │
 │────────────────▶│              │            │               │               │
 │                 │ loadMore()   │            │               │               │
 │                 │─────────────▶│            │               │               │
 │                 │              │fetchPosts()│               │               │
 │                 │              │───────────▶│               │               │
 │                 │              │            │ check cache   │               │
 │                 │              │            │──────────────────────────────▶│
 │                 │              │            │◀──────────────────────────────│
 │                 │              │            │ MISS          │               │
 │                 │              │            │               │               │
 │                 │              │            │ GET /feed     │               │
 │                 │              │            │──────────────▶│               │
 │                 │              │            │               │               │
 │                 │              │            │  JSON array   │               │
 │                 │              │            │◀──────────────│               │
 │                 │              │            │               │               │
 │                 │              │            │ store cache   │               │
 │                 │              │            │──────────────────────────────▶│
 │                 │              │            │               │               │
 │                 │              │  [Post]    │               │               │
 │                 │              │◀───────────│               │               │
 │                 │  posts array │            │               │               │
 │                 │◀─────────────│            │               │               │
 │  Display posts  │              │            │               │               │
 │◀────────────────│              │            │               │               │
```

---

## 🔑 Key Considerations

### **1. Memory Management**
**Problem:** Loading hundreds of high-res images will cause OOM crashes.

**Solutions:**
- Use `NSCache` for memory cache (auto-evicts when low memory)
- Downscale images to display size before caching
- Implement cell reuse properly
- Release off-screen images aggressively

### **2. Prefetching Strategy**
**Question:** When and how much should you prefetch?

**Approach:**
- Use `UITableViewDataSourcePrefetching` / `UICollectionViewDataSourcePrefetching`
- Prefetch 5-10 items ahead of visible area
- Cancel prefetch requests when scrolling direction changes
- Prioritize visible items over prefetch items

### **3. Caching Strategy**
**Two-tier caching:**

| Cache Type | Size | Eviction Policy | Use Case |
|------------|------|-----------------|----------|
| **Memory** | 100-200 MB | LRU (Least Recently Used) | Fast access |
| **Disk** | 500 MB - 1 GB | TTL + LRU | Offline support |

### **4. Video Playback**
**Challenges:**
- Battery drain from autoplay
- Network bandwidth
- Memory from multiple players

**Solutions:**
- AVPlayer pool (reuse 3-5 instances)
- Pause off-screen videos immediately
- Preload only visible +1 video
- Use HLS for adaptive streaming

### **5. Network Optimization**
- Batch API requests (fetch 20-30 posts at once)
- Use CDN URLs for media
- Implement retry logic with exponential backoff
- Support resume for failed downloads

---

## ✅ Proposed Architecture

### **High-Level Components**

```swift
┌─────────────────────────────────────────┐
│         ViewController Layer            │
│   (FeedViewController + Cells)          │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│          ViewModel Layer                │
│   (FeedViewModel + State Management)    │
└────────────────┬────────────────────────┘
                 │
┌────────────────▼────────────────────────┐
│       Repository Pattern                │
│  (FeedRepository - Single Source)       │
└─────┬────────────────────────┬──────────┘
      │                        │
┌─────▼──────┐        ┌────────▼─────────┐
│  Network   │        │  Local Storage   │
│  Service   │        │  (Core Data)     │
└─────┬──────┘        └────────┬─────────┘
      │                        │
┌─────▼────────────────────────▼─────────┐
│          Cache Manager                  │
│   (Memory + Disk Image Cache)           │
└─────────────────────────────────────────┘
```

### **Detailed Architecture**

#### **1. ViewModel (MVVM Pattern)**

```swift
class FeedViewModel {
    // Observable state
    @Published var posts: [FeedPost] = []
    @Published var isLoading = false
    @Published var error: Error?
    
    private let repository: FeedRepository
    private var cancellables = Set<AnyCancellable>()
    private var currentPage = 0
    private var hasMorePages = true
    
    func loadInitialFeed() {
        currentPage = 0
        repository.fetchFeed(page: 0)
            .sink(
                receiveCompletion: { [weak self] completion in
                    self?.isLoading = false
                    if case .failure(let error) = completion {
                        self?.error = error
                    }
                },
                receiveValue: { [weak self] posts in
                    self?.posts = posts
                    self?.hasMorePages = !posts.isEmpty
                }
            )
            .store(in: &cancellables)
    }
    
    func loadMore() {
        guard !isLoading && hasMorePages else { return }
        
        currentPage += 1
        repository.fetchFeed(page: currentPage)
            .sink { [weak self] posts in
                self?.posts.append(contentsOf: posts)
                self?.hasMorePages = !posts.isEmpty
            }
            .store(in: &cancellables)
    }
}
```

#### **2. Repository Pattern**

```swift
class FeedRepository {
    private let networkService: NetworkService
    private let localStorage: LocalStorage
    private let imageCache: ImageCacheManager
    
    func fetchFeed(page: Int) -> AnyPublisher<[FeedPost], Error> {
        // Try local first if offline
        if !Reachability.isConnected {
            return localStorage.fetchCachedFeed()
        }
        
        // Fetch from network
        return networkService.getFeed(page: page)
            .handleEvents(receiveOutput: { [weak self] posts in
                // Cache to local storage
                self?.localStorage.save(posts)
            })
            .eraseToAnyPublisher()
    }
}
```

#### **3. Image Cache Manager**

```swift
class ImageCacheManager {
    private let memoryCache = NSCache<NSString, UIImage>()
    private let diskCache: DiskCache
    private let downloadQueue: OperationQueue
    
    init() {
        // Configure memory cache
        memoryCache.countLimit = 100
        memoryCache.totalCostLimit = 200 * 1024 * 1024 // 200 MB
        
        // Configure download queue
        downloadQueue.maxConcurrentOperationCount = 4
    }
    
    func loadImage(url: URL, size: CGSize, completion: @escaping (UIImage?) -> Void) {
        let cacheKey = url.absoluteString as NSString
        
        // Check memory cache
        if let cachedImage = memoryCache.object(forKey: cacheKey) {
            completion(cachedImage)
            return
        }
        
        // Check disk cache
        diskCache.image(forKey: cacheKey as String) { [weak self] diskImage in
            if let diskImage = diskImage {
                self?.memoryCache.setObject(diskImage, forKey: cacheKey)
                completion(diskImage)
                return
            }
            
            // Download
            self?.downloadImage(url: url, size: size, cacheKey: cacheKey, completion: completion)
        }
    }
    
    private func downloadImage(url: URL, size: CGSize, cacheKey: NSString, completion: @escaping (UIImage?) -> Void) {
        downloadQueue.addOperation {
            guard let data = try? Data(contentsOf: url),
                  var image = UIImage(data: data) else {
                completion(nil)
                return
            }
            
            // Downscale to display size
            image = image.downscaled(to: size)
            
            // Cache both memory and disk
            self.memoryCache.setObject(image, forKey: cacheKey)
            self.diskCache.store(image, forKey: cacheKey as String)
            
            DispatchQueue.main.async {
                completion(image)
            }
        }
    }
}
```

#### **4. Prefetching**

```swift
extension FeedViewController: UITableViewDataSourcePrefetching {
    func tableView(_ tableView: UITableView, prefetchRowsAt indexPaths: [IndexPath]) {
        for indexPath in indexPaths {
            let post = viewModel.posts[indexPath.row]
            
            // Prefetch image
            imageCache.loadImage(url: post.imageURL, size: cellSize) { _ in }
            
            // Trigger load more if near end
            if indexPath.row >= viewModel.posts.count - 5 {
                viewModel.loadMore()
            }
        }
    }
    
    func tableView(_ tableView: UITableView, cancelPrefetchingForRowsAt indexPaths: [IndexPath]) {
        // Cancel prefetch operations for off-screen rows
        for indexPath in indexPaths {
            let post = viewModel.posts[indexPath.row]
            imageCache.cancelLoad(url: post.imageURL)
        }
    }
}
```

---

## 💡 What Interviewers Want to Hear

### **Trade-offs Discussion:**

**Memory vs Network:**
- Large memory cache = faster but more crashes
- Small memory cache = slower but safer
- **Balance:** 100-200 MB memory, rest on disk

**Prefetching vs Bandwidth:**
- Aggressive prefetching = smooth UX, wastes data
- No prefetching = janky scrolling
- **Balance:** Prefetch 5-10 ahead, cancel on direction change

**UITableView vs UICollectionView:**
- TableView: Simpler, better for vertical lists
- CollectionView: More flexible, better for grids
- **Instagram uses:** UICollectionView (for flexibility)

### **Performance Optimizations:**

1. **Image Decoding on Background Thread:**
```swift
DispatchQueue.global(qos: .userInitiated).async {
    let decodedImage = image.decodedImage()
    DispatchQueue.main.async {
        cell.imageView.image = decodedImage
    }
}
```

2. **Cell Height Caching:**
```swift
var heightCache: [IndexPath: CGFloat] = [:]

func tableView(_ tableView: UITableView, estimatedHeightForRowAt indexPath: IndexPath) -> CGFloat {
    return heightCache[indexPath] ?? 300
}
```

3. **Lazy Loading:**
```swift
// Only load images when cell becomes visible
func tableView(_ tableView: UITableView, willDisplay cell: UITableViewCell, forRowAt indexPath: IndexPath) {
    guard let feedCell = cell as? FeedCell else { return }
    feedCell.loadImage()
}
```

---

## 🚀 Advanced Topics

### **Offline Support**

```swift
class OfflineFeedManager {
    func syncWhenOnline() {
        NotificationCenter.default.publisher(for: .reachabilityChanged)
            .filter { $0.userInfo?["isReachable"] as? Bool == true }
            .sink { [weak self] _ in
                self?.syncPendingActions()
                self?.refreshFeed()
            }
            .store(in: &cancellables)
    }
}
```

### **Video Optimization**

```swift
class VideoPlayerPool {
    private var players: [AVPlayer] = []
    private let maxPlayers = 3
    
    func getPlayer() -> AVPlayer {
        if players.count < maxPlayers {
            let player = AVPlayer()
            players.append(player)
            return player
        }
        
        // Reuse least recently used player
        return players.removeFirst()
    }
    
    func pauseAllPlayers() {
        players.forEach { $0.pause() }
    }
}
```

---

## 🎯 Summary Checklist

When answering this question, make sure to cover:

- [ ] **Architecture pattern** (MVVM, Repository)
- [ ] **Memory management** (NSCache, downscaling)
- [ ] **Caching strategy** (2-tier: memory + disk)
- [ ] **Prefetching** (UITableViewDataSourcePrefetching)
- [ ] **Pagination** (cursor-based or offset)
- [ ] **Offline support** (Core Data persistence)
- [ ] **Video handling** (AVPlayer pool, autoplay strategy)
- [ ] **Performance** (background decoding, cell reuse)
- [ ] **Network** (batching, retry logic, CDN)
- [ ] **Trade-offs** (discuss pros/cons of each choice)

---

*💡 **Pro Tip:** Start with high-level architecture, then drill down into specific components based on interviewer's focus. Always discuss trade-offs and explain your reasoning!*

