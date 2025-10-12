---
title: "Design a Short Video App (TikTok/Sora-style)"
description: "System design: Build a short-form video app like TikTok with AI generation (Sora), infinite scroll, video player optimization, upload/compression, and content delivery at scale."
date: 2025-10-11
category: system-design
permalink: /interviews/short-video-app-design/
tags:
  - System Design
  - Video
  - AVPlayer
  - CDN
  - AI Generation
difficulty: Hard
excerpt: "Design a TikTok-style short video app with AI video generation (OpenAI Sora), infinite scrolling feed, video player pooling, upload optimization, and content delivery that scales to millions of users."
---

## 🎯 Problem Statement

Design a **Short Video App** for iOS (TikTok/Instagram Reels/Sora-style) that supports:

- **Infinite scrolling** vertical video feed
- **Smooth video playback** with prefetching
- **AI-generated videos** (OpenAI Sora integration)
- **Video recording** with effects and filters
- **Upload and compression** optimization
- **Content discovery** and recommendations
- Scale to **100M+ users**

**Constraints:**
- Videos: 15-60 seconds, 1080p, 30-60fps
- Max file size: 50MB per video
- Must work on 3G networks (adaptive streaming)
- Battery efficient (limit background processing)
- Smooth 60fps scrolling

---

## 📐 STEP 1: High-Level Architecture Diagram

**In the interview, start by drawing this:**

{% mermaid %}
graph TB
    subgraph "iOS Client"
        UI[VideoFeedViewController<br/>- UICollectionView<br/>- Custom Cells]
        VM[VideoFeedViewModel<br/>- @Published feed<br/>- Pagination state]
        PM[PlayerManager<br/>- AVPlayer pool<br/>- Prefetch queue]
        UM[UploadManager<br/>- Compression<br/>- Queue]
        AI[AI VideoGenerator<br/>- Sora integration<br/>- Progress tracking]
        CM[CacheManager<br/>- NSCache videos<br/>- Disk storage]
        
        UI --> VM
        VM --> PM
        VM --> UM
        VM --> AI
        PM --> CM
    end
    
    subgraph "Backend Services"
        API[API Gateway<br/>- Auth<br/>- Rate limit]
        VIDEO[Video Service<br/>- Transcoding<br/>- Thumbnails]
        REC[Recommendation<br/>Engine<br/>- ML-based]
        SORA[Sora Service<br/>- Text-to-video<br/>- Queue management]
    end
    
    subgraph "Storage & CDN"
        S3[Object Storage<br/>- S3/CloudFront]
        CDN[Video CDN<br/>- HLS streams<br/>- Edge caching]
        DB[(Database<br/>- Video metadata<br/>- User data)]
    end
    
    VM -->|HTTPS| API
    UM -->|Upload| API
    AI -->|Generate| API
    API --> VIDEO
    API --> REC
    API --> SORA
    VIDEO --> S3
    S3 --> CDN
    PM -->|Stream| CDN
    VIDEO --> DB
    REC --> DB
{% endmermaid %}

**💬 What to say while drawing:**
> "I'll use MVVM with a specialized PlayerManager that pools AVPlayer instances for memory efficiency. The UploadManager handles compression before upload. For AI generation, we integrate with OpenAI Sora via a backend service. Videos are stored in S3 and delivered via CloudFront CDN with HLS adaptive streaming."

---

## 🎬 STEP 2: Video Player Architecture (Core Component)

**This is the MOST CRITICAL part of the interview!**

{% mermaid %}
graph LR
    subgraph "Player Pool System"
        POOL[AVPlayer Pool<br/>3-5 instances]
        VISIBLE[Visible Video<br/>Currently playing]
        NEXT[Next Video<br/>Preloaded]
        PREV[Previous Video<br/>Cached]
    end
    
    subgraph "Video States"
        LOADING[Loading<br/>Downloading]
        READY[Ready<br/>Can play]
        PLAYING[Playing<br/>Active]
        PAUSED[Paused<br/>Buffering]
        ENDED[Ended<br/>Loop/Next]
    end
    
    POOL --> VISIBLE
    POOL --> NEXT
    POOL --> PREV
    
    VISIBLE --> PLAYING
    NEXT --> READY
    PREV --> READY
{% endmermaid %}

### **Implementation: AVPlayer Pooling**

```swift
class VideoPlayerManager {
    // Pool of reusable AVPlayer instances
    private let playerPool: [AVPlayer]
    private var playerItems: [IndexPath: AVPlayerItem] = [:]
    
    // Currently active players
    private var visiblePlayer: AVPlayer?
    private var currentIndexPath: IndexPath?
    
    // Prefetch queue
    private let prefetchQueue = DispatchQueue(label: "video.prefetch", qos: .userInitiated)
    private var prefetchedItems: [IndexPath: AVPlayerItem] = [:]
    
    init(poolSize: Int = 3) {
        // Create pool of players
        self.playerPool = (0..<poolSize).map { _ in
            let player = AVPlayer()
            player.automaticallyWaitsToMinimizeStalling = true
            player.actionAtItemEnd = .none
            return player
        }
    }
    
    // Get player for visible cell
    func player(for indexPath: IndexPath, url: URL) -> AVPlayer {
        // Reuse existing player if possible
        if let existingPlayer = visiblePlayer,
           currentIndexPath == indexPath {
            return existingPlayer
        }
        
        // Get player from pool
        let player = getAvailablePlayer()
        
        // Create or reuse player item
        let item: AVPlayerItem
        if let prefetched = prefetchedItems[indexPath] {
            item = prefetched
            prefetchedItems.removeValue(forKey: indexPath)
        } else {
            item = createPlayerItem(url: url)
        }
        
        // Replace current item
        player.replaceCurrentItem(with: item)
        
        // Setup looping
        setupLooping(for: player, item: item)
        
        // Update state
        visiblePlayer = player
        currentIndexPath = indexPath
        playerItems[indexPath] = item
        
        return player
    }
    
    // Prefetch videos ahead
    func prefetchVideos(around indexPath: IndexPath, urls: [IndexPath: URL]) {
        prefetchQueue.async { [weak self] in
            guard let self = self else { return }
            
            // Prefetch next 2 and previous 1
            let indicesToPrefetch = [
                IndexPath(row: indexPath.row + 1, section: indexPath.section),
                IndexPath(row: indexPath.row + 2, section: indexPath.section),
                IndexPath(row: indexPath.row - 1, section: indexPath.section)
            ]
            
            for index in indicesToPrefetch {
                guard let url = urls[index],
                      self.prefetchedItems[index] == nil else {
                    continue
                }
                
                let item = self.createPlayerItem(url: url)
                
                // Preload first few seconds
                let timeRange = CMTimeRange(
                    start: .zero,
                    duration: CMTime(seconds: 3, preferredTimescale: 600)
                )
                item.preferredForwardBufferDuration = 3.0
                
                self.prefetchedItems[index] = item
            }
        }
    }
    
    // Cancel prefetch when scrolling away
    func cancelPrefetch(for indexPath: IndexPath) {
        prefetchedItems.removeValue(forKey: indexPath)
    }
    
    // Pause all players except current
    func pauseAllExcept(_ player: AVPlayer?) {
        playerPool.forEach { p in
            if p !== player {
                p.pause()
            }
        }
    }
    
    private func getAvailablePlayer() -> AVPlayer {
        // Return first paused player, or first in pool
        return playerPool.first { $0.rate == 0 } ?? playerPool[0]
    }
    
    private func createPlayerItem(url: URL) -> AVPlayerItem {
        let asset = AVAsset(url: url)
        
        // Only load required properties
        let keys = ["playable", "duration"]
        
        return AVPlayerItem(
            asset: asset,
            automaticallyLoadedAssetKeys: keys
        )
    }
    
    private func setupLooping(for player: AVPlayer, item: AVPlayerItem) {
        NotificationCenter.default.addObserver(
            forName: .AVPlayerItemDidPlayToEndTime,
            object: item,
            queue: .main
        ) { _ in
            player.seek(to: .zero)
            player.play()
        }
    }
    
    // Clean up when done
    func cleanup() {
        playerPool.forEach { $0.pause() }
        playerItems.removeAll()
        prefetchedItems.removeAll()
    }
}
```

**Key Optimizations:**
- ✅ **Player Pooling**: Reuse 3-5 AVPlayer instances (creating/destroying is expensive)
- ✅ **Prefetching**: Preload next 2 videos (3-second buffer)
- ✅ **Lazy Loading**: Only load "playable" and "duration" properties
- ✅ **Looping**: Automatic video loop for TikTok-style UX
- ✅ **Memory Management**: Release players not in view

---

## 👤 STEP 3: User Flow Diagram

{% mermaid %}
stateDiagram-v2
    [*] --> AppLaunch
    
    AppLaunch --> LoadFeed: User opens app
    
    LoadFeed --> CheckCache: Fetch videos
    CheckCache --> ShowCached: Has cache
    CheckCache --> ShowLoading: No cache
    
    ShowCached --> FetchFresh: Background refresh
    ShowLoading --> FetchAPI: GET /feed
    FetchAPI --> DisplayVideos
    FetchFresh --> DisplayVideos
    
    DisplayVideos --> PlayVideo: Auto-play first
    
    PlayVideo --> BufferingState: Network slow
    BufferingState --> PlayVideo: Buffer ready
    
    PlayVideo --> UserScrolls: Swipe up/down
    
    UserScrolls --> PauseCurrentScroll
    PauseCurrentScroll --> LoadNextVideo
    LoadNextVideo --> PlayVideo
    
    UserScrolls --> PaginationCheck: Near end?
    PaginationCheck --> FetchMore: Load page 2
    FetchMore --> DisplayVideos
    
    PlayVideo --> UserRecord: Tap record button
    UserRecord --> RecordingFlow
    
    PlayVideo --> UserGenerateAI: Tap AI generate
    UserGenerateAI --> AIGenerationFlow
    
    RecordingFlow --> UploadFlow
    AIGenerationFlow --> AIWaitingFlow
    AIWaitingFlow --> DisplayVideos
    UploadFlow --> DisplayVideos
    
    state RecordingFlow {
        [*] --> ShowCamera
        ShowCamera --> Recording: Tap record
        Recording --> Preview: Tap stop
        Preview --> ApplyEffects
        ApplyEffects --> [*]
    }
    
    state UploadFlow {
        [*] --> Compress
        Compress --> Upload
        Upload --> Transcoding
        Transcoding --> [*]: Published
    }
    
    state AIGenerationFlow {
        [*] --> ShowPrompt
        ShowPrompt --> SubmitToSora
        SubmitToSora --> QueueJob
        QueueJob --> [*]
    }
```

**💬 What to say while drawing:**
> "When user opens app, we check cache first for instant display, then fetch fresh data. Videos auto-play as user scrolls. When nearing the end of the feed, we trigger pagination. For recording, we show camera, let user record, apply effects, compress, and upload. For AI generation with Sora, we submit a prompt, queue the job, and notify user when ready."

---

## 🎨 STEP 4: AI Video Generation (OpenAI Sora Integration)

**Sora is OpenAI's text-to-video model (launched Dec 2024)**

{% mermaid %}
sequenceDiagram
    participant User
    participant App
    participant Backend
    participant Sora
    participant CDN
    
    User->>App: Enter prompt<br/>"Sunset over ocean"
    App->>Backend: POST /generate/video<br/>{ prompt, duration, style }
    
    Backend->>Sora: Submit generation job
    Sora-->>Backend: job_id, estimated_time
    Backend-->>App: { job_id, status: "queued" }
    
    App->>User: Show "Generating...<br/>ETA: 2 minutes"
    
    loop Poll Status
        App->>Backend: GET /generate/status/{job_id}
        Backend->>Sora: Check status
        Sora-->>Backend: status: "processing", progress: 45%
        Backend-->>App: { status, progress }
        App->>User: Update progress bar
    end
    
    Sora->>Sora: Generate video<br/>(GPU intensive)
    
    Sora->>Backend: Video ready!<br/>temp_url
    Backend->>CDN: Upload to CDN
    CDN-->>Backend: permanent_url
    
    Backend->>App: Push notification<br/>"Video ready!"
    App->>User: Show preview
    
    User->>App: Publish or regenerate
    
    alt User publishes
        App->>Backend: POST /videos/publish
        Backend->>App: video_id
        App->>User: Added to feed
    else User regenerates
        App->>Backend: POST /generate/video<br/>{ refined_prompt }
    end
{% endmermaid %}

### **Implementation: Sora Integration**

```swift
class SoraVideoGenerator {
    private let baseURL = "https://api.openai.com/v1"
    
    struct GenerationRequest: Codable {
        let prompt: String
        let duration: Int  // seconds: 5, 10, or 15
        let style: String?  // "cinematic", "animation", "realistic"
        let aspectRatio: String  // "16:9", "9:16", "1:1"
    }
    
    struct GenerationResponse: Codable {
        let jobId: String
        let status: String  // "queued", "processing", "completed", "failed"
        let progress: Int?  // 0-100
        let videoURL: String?
        let estimatedTime: Int?  // seconds
        
        enum CodingKeys: String, CodingKey {
            case jobId = "job_id"
            case status
            case progress
            case videoURL = "video_url"
            case estimatedTime = "estimated_time"
        }
    }
    
    func generateVideo(
        prompt: String,
        duration: Int = 5,
        style: String? = nil,
        onProgress: @escaping (Int) -> Void,
        onComplete: @escaping (String) -> Void,
        onError: @escaping (Error) -> Void
    ) async throws {
        // Step 1: Submit generation request
        let request = GenerationRequest(
            prompt: prompt,
            duration: duration,
            style: style,
            aspectRatio: "9:16"  // Vertical for TikTok-style
        )
        
        let jobId = try await submitGeneration(request)
        
        // Step 2: Poll for status
        while true {
            try await Task.sleep(nanoseconds: 5_000_000_000)  // 5 seconds
            
            let status = try await checkStatus(jobId)
            
            switch status.status {
            case "processing":
                onProgress(status.progress ?? 0)
                
            case "completed":
                guard let videoURL = status.videoURL else {
                    throw SoraError.missingVideoURL
                }
                onComplete(videoURL)
                return
                
            case "failed":
                throw SoraError.generationFailed
                
            default:
                break
            }
        }
    }
    
    private func submitGeneration(_ request: GenerationRequest) async throws -> String {
        var urlRequest = URLRequest(url: URL(string: "\(baseURL)/video/generations")!)
        urlRequest.httpMethod = "POST"
        urlRequest.setValue("application/json", forHTTPHeaderField: "Content-Type")
        urlRequest.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        urlRequest.httpBody = try JSONEncoder().encode(request)
        
        let (data, response) = try await URLSession.shared.data(for: urlRequest)
        
        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw SoraError.requestFailed
        }
        
        let result = try JSONDecoder().decode(GenerationResponse.self, from: data)
        return result.jobId
    }
    
    private func checkStatus(_ jobId: String) async throws -> GenerationResponse {
        let url = URL(string: "\(baseURL)/video/generations/\(jobId)")!
        var request = URLRequest(url: url)
        request.setValue("Bearer \(apiKey)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode(GenerationResponse.self, from: data)
    }
}

enum SoraError: Error {
    case requestFailed
    case generationFailed
    case missingVideoURL
}
```

**Sora API Details:**
- **Cost**: ~$0.20 per second of video (5s = $1, 15s = $3)
- **Generation Time**: 1-3 minutes per video
- **Resolution**: Up to 1080p
- **Aspect Ratios**: 16:9, 9:16, 1:1
- **Max Duration**: 60 seconds (currently)

**UI/UX Considerations:**
- Show realistic ETA (1-3 minutes)
- Allow user to leave app (background processing)
- Send push notification when ready
- Offer preview before publishing
- Option to regenerate with refined prompt

---

## 📹 STEP 5: Video Upload & Compression

**Challenge:** Raw iPhone video is 20-50MB. How to upload efficiently?

{% mermaid %}
graph TD
    A[User finishes recording] --> B{Check video size}
    B -->|< 10MB| C[Upload directly]
    B -->|10-50MB| D[Compress video]
    B -->|> 50MB| E[Reject/Trim]
    
    D --> F[Compress to H.264<br/>1080p, 30fps]
    F --> G[Generate thumbnail]
    G --> H[Get presigned URL]
    H --> I[Upload to S3]
    I --> J[Backend transcoding]
    J --> K[Multiple qualities:<br/>360p, 720p, 1080p]
    K --> L[HLS manifest]
    L --> M[Published!]
    
    C --> H
{% endmermaid %}

### **Implementation: Video Compression**

```swift
class VideoCompressionService {
    func compressVideo(
        inputURL: URL,
        targetSize: VideoQuality = .high,
        onProgress: @escaping (Double) -> Void
    ) async throws -> URL {
        let asset = AVAsset(url: inputURL)
        
        // Configure export session
        guard let exportSession = AVAssetExportSession(
            asset: asset,
            presetName: targetSize.preset
        ) else {
            throw CompressionError.cannotCreateSession
        }
        
        // Output URL
        let outputURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension("mp4")
        
        exportSession.outputURL = outputURL
        exportSession.outputFileType = .mp4
        exportSession.shouldOptimizeForNetworkUse = true  // Important!
        
        // Set bitrate and quality
        exportSession.videoComposition = await createVideoComposition(
            for: asset,
            quality: targetSize
        )
        
        // Export with progress
        await withTaskCancellationHandler {
            exportSession.cancelExport()
        } operation: {
            // Monitor progress
            Task {
                while exportSession.status == .waiting || exportSession.status == .exporting {
                    onProgress(Double(exportSession.progress))
                    try await Task.sleep(nanoseconds: 100_000_000)  // 0.1s
                }
            }
            
            // Perform export
            await exportSession.export()
        }
        
        // Check result
        switch exportSession.status {
        case .completed:
            return outputURL
        case .failed:
            throw exportSession.error ?? CompressionError.exportFailed
        case .cancelled:
            throw CompressionError.cancelled
        default:
            throw CompressionError.unknown
        }
    }
    
    private func createVideoComposition(
        for asset: AVAsset,
        quality: VideoQuality
    ) async -> AVMutableVideoComposition {
        let composition = AVMutableVideoComposition(asset: asset) { request in
            // Apply compression settings
        }
        
        composition.renderSize = quality.resolution
        composition.frameDuration = CMTime(value: 1, timescale: 30)  // 30fps
        
        return composition
    }
}

enum VideoQuality {
    case low, medium, high
    
    var preset: String {
        switch self {
        case .low: return AVAssetExportPreset960x540
        case .medium: return AVAssetExportPreset1280x720
        case .high: return AVAssetExportPreset1920x1080
        }
    }
    
    var resolution: CGSize {
        switch self {
        case .low: return CGSize(width: 540, height: 960)
        case .medium: return CGSize(width: 720, height: 1280)
        case .high: return CGSize(width: 1080, height: 1920)
        }
    }
    
    var bitrate: Int {
        switch self {
        case .low: return 1_500_000      // 1.5 Mbps
        case .medium: return 3_000_000   // 3 Mbps
        case .high: return 6_000_000     // 6 Mbps
        }
    }
}

enum CompressionError: Error {
    case cannotCreateSession
    case exportFailed
    case cancelled
    case unknown
}
```

**Compression Stats:**
- **Original**: 40MB, 4K, 60fps
- **After Compression**: 8MB, 1080p, 30fps
- **Reduction**: 80%
- **Time**: 5-10 seconds on iPhone 14+

---

## 🚀 STEP 6: Infinite Scroll & Pagination

```swift
class VideoFeedViewController: UIViewController {
    private let collectionView: UICollectionView
    private let viewModel: VideoFeedViewModel
    private let playerManager: VideoPlayerManager
    
    private var currentlyPlayingIndexPath: IndexPath?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        setupCollectionView()
        setupPagination()
        loadInitialVideos()
    }
    
    private func setupCollectionView() {
        // Vertical scrolling, one video at a time
        let layout = UICollectionViewFlowLayout()
        layout.scrollDirection = .vertical
        layout.minimumLineSpacing = 0
        layout.itemSize = view.bounds.size  // Full screen
        
        collectionView.isPagingEnabled = true  // Snap to videos
        collectionView.showsVerticalScrollIndicator = false
        collectionView.prefetchDataSource = self
    }
    
    private func setupPagination() {
        collectionView.publisher(for: \.contentOffset)
            .debounce(for: .milliseconds(100), scheduler: RunLoop.main)
            .sink { [weak self] offset in
                self?.handleScroll(offset)
            }
            .store(in: &cancellables)
    }
    
    private func handleScroll(_ offset: CGPoint) {
        let height = collectionView.bounds.height
        let currentIndex = Int(offset.y / height)
        
        // Check if near end (trigger pagination)
        if currentIndex >= viewModel.videos.count - 3 {
            viewModel.loadMore()
        }
        
        // Determine visible cell
        let indexPath = IndexPath(item: currentIndex, section: 0)
        
        if indexPath != currentlyPlayingIndexPath {
            playVideo(at: indexPath)
        }
    }
    
    private func playVideo(at indexPath: IndexPath) {
        // Pause previous
        if let previous = currentlyPlayingIndexPath,
           let cell = collectionView.cellForItem(at: previous) as? VideoCell {
            cell.pause()
        }
        
        // Play current
        guard let cell = collectionView.cellForItem(at: indexPath) as? VideoCell,
              indexPath.row < viewModel.videos.count else {
            return
        }
        
        let video = viewModel.videos[indexPath.row]
        let player = playerManager.player(for: indexPath, url: video.url)
        
        cell.configure(with: player, video: video)
        cell.play()
        
        // Prefetch next videos
        playerManager.prefetchVideos(
            around: indexPath,
            urls: viewModel.videosURLs
        )
        
        currentlyPlayingIndexPath = indexPath
    }
}

// MARK: - UICollectionViewDataSourcePrefetching
extension VideoFeedViewController: UICollectionViewDataSourcePrefetching {
    func collectionView(
        _ collectionView: UICollectionView,
        prefetchItemsAt indexPaths: [IndexPath]
    ) {
        // Prefetch video data (not video files - those are handled by PlayerManager)
        viewModel.prefetchData(at: indexPaths)
    }
    
    func collectionView(
        _ collectionView: UICollectionView,
        cancelPrefetchingForItemsAt indexPaths: [IndexPath]
    ) {
        // Cancel prefetch if user scrolled away
        indexPaths.forEach { indexPath in
            playerManager.cancelPrefetch(for: indexPath)
        }
    }
}
```

**Key Techniques:**
- ✅ **isPagingEnabled**: Snaps to each video
- ✅ **Prefetching protocol**: Prefetch next 2-3 videos
- ✅ **Pagination trigger**: Load more at video N-3
- ✅ **Player pooling**: Reuse players efficiently
- ✅ **Memory management**: Release off-screen resources

---

## 📊 Performance Optimization

### **1. Memory Management**

```swift
class MemoryManager {
    func optimizeMemory() {
        // Clear cache when memory warning
        NotificationCenter.default.addObserver(
            forName: UIApplication.didReceiveMemoryWarningNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.clearCaches()
        }
    }
    
    private func clearCaches() {
        // Clear video cache (keep only visible ±2)
        playerManager.clearCache(except: visibleRange)
        
        // Clear image cache
        imageCache.removeAllObjects()
        
        // Clear thumbnail cache (oldest first)
        thumbnailCache.evictOldest(count: thumbnailCache.count / 2)
        
        // Force garbage collection
        autoreleasepool { }
    }
}
```

### **2. Battery Optimization**

```swift
class BatteryOptimizer {
    func optimizeForBattery() {
        // Reduce quality on low battery
        if UIDevice.current.batteryLevel < 0.2 {
            videoQuality = .medium
            disableAutoPlay = true
            reducePrefetchCount()
        }
        
        // Pause when app backgrounded
        NotificationCenter.default.addObserver(
            forName: UIApplication.didEnterBackgroundNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            self?.playerManager.pauseAll()
        }
    }
}
```

### **3. Network Optimization**

```swift
class NetworkOptimizer {
    func selectQuality(for networkType: NetworkType) -> VideoQuality {
        switch networkType {
        case .cellular3G:
            return .low      // 540p
        case .cellular4G:
            return .medium   // 720p
        case .cellular5G, .wifi:
            return .high     // 1080p
        }
    }
    
    func enableAdaptiveStreaming() -> Bool {
        // Use HLS for adaptive bitrate
        return true
    }
}
```

---

## 🔑 Key Interview Points

### **Q: Why use AVPlayer pooling?**
> "Creating/destroying AVPlayer is expensive (100-200ms). Pooling reuses 3-5 instances, reducing lag when scrolling. We only create once, then swap AVPlayerItems as needed."

### **Q: How do you handle memory with videos?**
> "Three strategies: 1) Pool AVPlayers (don't create new ones), 2) Prefetch only next 2 videos, 3) Clear cache on memory warning. Videos are streamed from CDN, not stored locally except cache."

### **Q: What's the difference between AVPlayer and AVPlayerViewController?**
> "AVPlayerViewController is full-screen player with built-in controls. For TikTok-style feed, we use AVPlayer directly with custom UI for more control over playback, transitions, and gestures."

### **Q: How do you handle slow networks?**
> "Use HLS (HTTP Live Streaming) for adaptive bitrate. CDN serves different qualities (360p, 720p, 1080p). AVPlayer automatically picks quality based on bandwidth. Show buffering indicator when `isPlaybackLikelyToKeepUp` is false."

### **Q: Sora generation takes 2 minutes. How to handle UX?**
> "Show realistic progress bar with ETA. Let user leave the screen (background task). Send push notification when ready. Offer 'save for later' option. Consider showing preview of similar videos while waiting."

### **Q: How do you optimize battery life?**
> "1) Reduce video quality on low battery, 2) Pause when app backgrounded, 3) Limit prefetch count, 4) Use hardware decoding (H.264 instead of H.265 on older devices), 5) Reduce refresh rate to 30fps on low power mode."

---

## 🌐 Backend Architecture (Brief)

{% mermaid %}
graph TB
    subgraph "Frontend"
        APP[iOS App]
    end
    
    subgraph "API Layer"
        GATEWAY[API Gateway<br/>Kong/AWS]
        AUTH[Auth Service]
        RATE[Rate Limiter]
    end
    
    subgraph "Services"
        VIDEO[Video Service<br/>Upload/Metadata]
        TRANSCODE[Transcoding<br/>FFmpeg/AWS Elemental]
        REC[Recommendation<br/>ML Model]
        SORA[Sora Proxy<br/>OpenAI Integration]
        SOCIAL[Social Service<br/>Likes/Comments]
    end
    
    subgraph "Data"
        POSTGRES[(PostgreSQL<br/>Metadata)]
        REDIS[(Redis<br/>Cache)]
        ES[(Elasticsearch<br/>Search)]
    end
    
    subgraph "Storage"
        S3[S3<br/>Raw Videos]
        CDN[CloudFront<br/>HLS Delivery]
    end
    
    subgraph "ML"
        MLMODEL[Recommendation<br/>Model]
        FEATURES[Feature Store]
    end
    
    APP --> GATEWAY
    GATEWAY --> AUTH
    GATEWAY --> RATE
    RATE --> VIDEO
    RATE --> REC
    RATE --> SORA
    RATE --> SOCIAL
    
    VIDEO --> TRANSCODE
    VIDEO --> POSTGRES
    VIDEO --> S3
    TRANSCODE --> CDN
    
    REC --> MLMODEL
    REC --> FEATURES
    REC --> REDIS
    
    SORA --> REDIS
{% endmermaid %}

---

## 🎯 Scaling to 100M Users

| Metric | Scale |
|--------|-------|
| **DAU** | 100M users |
| **Videos/day** | 10M uploads |
| **Storage** | 500 PB (petabytes) |
| **Bandwidth** | 50 Tbps peak |
| **CDN Cost** | $5M/month |
| **AI Generation** | 100K Sora requests/day |

**Infrastructure:**
- **CDN**: CloudFront + Akamai multi-CDN
- **Storage**: S3 with Glacier for old videos
- **Transcoding**: AWS Elemental MediaConvert
- **Database**: Sharded PostgreSQL + Redis
- **Recommendation**: TensorFlow Serving on GPUs
- **Sora**: Queue system with rate limiting

---

## 📱 iOS-Specific Considerations

### **1. Background Tasks**
```swift
// Download videos for offline viewing
func scheduleBackgroundDownload() {
    let request = BGAppRefreshTaskRequest(identifier: "com.app.download")
    request.earliestBeginDate = Date(timeIntervalSinceNow: 60 * 15)  // 15 min
    
    try? BGTaskScheduler.shared.submit(request)
}
```

### **2. Picture-in-Picture**
```swift
// Enable PiP for iOS
func enablePiP() {
    let pipController = AVPictureInPictureController(playerLayer: playerLayer)
    pipController?.delegate = self
    try? AVAudioSession.sharedInstance().setCategory(.playback)
}
```

### **3. Accessibility**
```swift
// Add captions support
func enableCaptions() {
    let captionGroup = AVMediaSelectionGroup(
        options: /* ... */,
        defaultOption: /* ... */
    )
    player.currentItem?.select(captionGroup, option: /* ... */)
}
```

---

## 🎓 Real-World APIs

### **OpenAI Sora API** (Text-to-Video)
```swift
POST https://api.openai.com/v1/video/generations
Authorization: Bearer sk-...

{
  "prompt": "A sunset over the ocean with waves",
  "duration": 5,
  "aspect_ratio": "9:16"
}
```

### **AWS Elemental MediaConvert** (Transcoding)
```swift
POST https://mediaconvert.region.amazonaws.com/2017-08-29/jobs

{
  "Settings": {
    "Inputs": [{"FileInput": "s3://bucket/input.mp4"}],
    "OutputGroups": [{
      "OutputGroupSettings": {
        "Type": "HLS_GROUP_SETTINGS",
        "HlsGroupSettings": {
          "SegmentLength": 10,
          "MinSegmentLength": 2
        }
      }
    }]
  }
}
```

### **CloudFront CDN** (Content Delivery)
- **Edge Locations**: 400+ worldwide
- **Cache**: TTL 24 hours for videos
- **Cost**: $0.085/GB (first 10TB)

---

**Remember: Focus on AVPlayer pooling, prefetching strategy, and memory management. These are the most critical parts for a smooth TikTok-like experience!** 🎬

