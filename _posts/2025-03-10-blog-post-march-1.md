---
title: 'iOS System Design: Building a Complex Photo Editing System'
date: 2025-03-10
permalink: /posts/2025/03/blog-post-march-1/
tags:
  - iOS
  - System Design
  - Photo Editing
  - Core Image
  - Metal
  - Performance
---

Designing a complex photo editing system within an iOS app requires careful consideration of performance, memory management, and user experience. This guide explores the architecture and implementation of a professional-grade photo editing system that handles multiple filters, real-time previews, and efficient memory usage.

## 1. **System Architecture Overview**

{% mermaid %}
flowchart TD;
    A[Photo Input] --> B[Image Processing Pipeline];
    B --> C[Filter Chain];
    C --> D[Real-time Preview];
    C --> E[Final Processing];
    
    B --> F[Memory Management];
    B --> G[Performance Monitor];
    
    C --> H[Core Image Filters];
    C --> I[Custom Metal Shaders];
    C --> J[GPU Processing];
    
    D --> K[Thumbnail Generation];
    D --> L[Preview Rendering];
    
    E --> M[High Quality Export];
    E --> N[Save to Library];
    
    F --> O[Image Cache];
    F --> P[Memory Pool];
    
    G --> Q[FPS Monitoring];
    G --> R[Memory Usage];
{% endmermaid %}

## 2. **Core Image Processing Pipeline**

```swift
import CoreImage
import Metal
import UIKit

// MARK: - Image Processing Pipeline
class ImageProcessingPipeline {
    private let context: CIContext
    private let metalDevice: MTLDevice
    private let commandQueue: MTLCommandQueue
    private let imageCache: ImageCache
    private let filterChain: FilterChain
    
    init() throws {
        guard let device = MTLCreateSystemDefaultDevice() else {
            throw ImageProcessingError.metalDeviceNotFound
        }
        
        self.metalDevice = device
        self.commandQueue = device.makeCommandQueue()!
        self.context = CIContext(mtlDevice: device)
        self.imageCache = ImageCache()
        self.filterChain = FilterChain()
    }
    
    func processImage(_ image: UIImage, filters: [ImageFilter]) async throws -> UIImage {
        // Create processing task
        let task = ProcessingTask(
            originalImage: image,
            filters: filters,
            targetSize: calculateTargetSize(for: image)
        )
        
        // Check cache first
        if let cachedResult = imageCache.get(for: task.cacheKey) {
            return cachedResult
        }
        
        // Process image
        let processedImage = try await performProcessing(task)
        
        // Cache result
        imageCache.set(processedImage, for: task.cacheKey)
        
        return processedImage
    }
    
    private func performProcessing(_ task: ProcessingTask) async throws -> UIImage {
        var currentImage = task.originalImage
        
        for filter in task.filters {
            currentImage = try await applyFilter(filter, to: currentImage)
        }
        
        return currentImage
    }
    
    private func applyFilter(_ filter: ImageFilter, to image: UIImage) async throws -> UIImage {
        switch filter.type {
        case .coreImage:
            return try applyCoreImageFilter(filter, to: image)
        case .metal:
            return try applyMetalFilter(filter, to: image)
        case .custom:
            return try applyCustomFilter(filter, to: image)
        }
    }
}

// MARK: - Filter Chain Management
class FilterChain {
    private var filters: [ImageFilter] = []
    private let queue = DispatchQueue(label: "com.app.filterchain", attributes: .concurrent)
    
    func addFilter(_ filter: ImageFilter) {
        queue.async(flags: .barrier) {
            self.filters.append(filter)
        }
    }
    
    func removeFilter(at index: Int) {
        queue.async(flags: .barrier) {
            guard index < self.filters.count else { return }
            self.filters.remove(at: index)
        }
    }
    
    func reorderFilters(from sourceIndex: Int, to destinationIndex: Int) {
        queue.async(flags: .barrier) {
            guard sourceIndex < self.filters.count,
                  destinationIndex < self.filters.count else { return }
            
            let filter = self.filters.remove(at: sourceIndex)
            self.filters.insert(filter, at: destinationIndex)
        }
    }
    
    func getFilters() -> [ImageFilter] {
        return queue.sync { filters }
    }
}

// MARK: - Image Filter System
struct ImageFilter: Identifiable, Codable {
    let id = UUID()
    let name: String
    let type: FilterType
    let parameters: [String: Any]
    let intensity: Float
    
    enum FilterType: String, Codable {
        case coreImage, metal, custom
    }
}

// MARK: - Processing Task
struct ProcessingTask {
    let originalImage: UIImage
    let filters: [ImageFilter]
    let targetSize: CGSize
    
    var cacheKey: String {
        let filterString = filters.map { "\($0.name)-\($0.intensity)" }.joined(separator: "-")
        return "\(originalImage.hashValue)-\(filterString)-\(targetSize.width)x\(targetSize.height)"
    }
}
```

## 3. **Real-time Preview System**

{% mermaid %}
sequenceDiagram;
    participant UI as UI Layer;
    participant Preview as Preview Manager;
    participant Pipeline as Processing Pipeline;
    participant Cache as Image Cache;
    participant GPU as GPU Processing;
    
    UI->>Preview: User Adjusts Filter;
    Preview->>Cache: Check Preview Cache;
    Cache-->>Preview: Cache Hit/Miss;
    
    alt Cache Hit;
        Preview-->>UI: Update Preview;
    else Cache Miss;
        Preview->>Pipeline: Process Preview;
        Pipeline->>GPU: Apply Filters;
        GPU-->>Pipeline: Processed Image;
        Pipeline->>Cache: Cache Result;
        Pipeline-->>Preview: Preview Image;
        Preview-->>UI: Update Preview;
    end;
    
    Note over UI,GPU: Background Processing;
    Preview->>Pipeline: Process Full Quality;
    Pipeline->>GPU: High Quality Processing;
    GPU-->>Pipeline: Final Image;
    Pipeline-->>UI: Update Final Result;
{% endmermaid %}

```swift
// MARK: - Real-time Preview Manager
class PreviewManager: ObservableObject {
    @Published var previewImage: UIImage?
    @Published var isProcessing = false
    
    private let pipeline: ImageProcessingPipeline
    private let previewCache: ImageCache
    private let processingQueue = DispatchQueue(label: "com.app.preview", qos: .userInteractive)
    private var currentTask: Task<Void, Never>?
    
    init(pipeline: ImageProcessingPipeline) {
        self.pipeline = pipeline
        self.previewCache = ImageCache()
    }
    
    func updatePreview(originalImage: UIImage, filters: [ImageFilter]) {
        // Cancel previous task
        currentTask?.cancel()
        
        // Create new preview task
        currentTask = Task {
            await generatePreview(originalImage: originalImage, filters: filters)
        }
    }
    
    @MainActor
    private func generatePreview(originalImage: UIImage, filters: [ImageFilter]) async {
        isProcessing = true
        
        do {
            // Generate low-resolution preview
            let previewSize = calculatePreviewSize(for: originalImage)
            let previewFilters = filters.map { filter in
                // Reduce filter intensity for preview
                var previewFilter = filter
                previewFilter.intensity *= 0.5
                return previewFilter
            }
            
            let previewImage = try await pipeline.processImage(
                originalImage,
                filters: previewFilters,
                targetSize: previewSize
            )
            
            if !Task.isCancelled {
                self.previewImage = previewImage
            }
        } catch {
            print("Preview generation failed: \(error)")
        }
        
        isProcessing = false
    }
    
    private func calculatePreviewSize(for image: UIImage) -> CGSize {
        let maxPreviewSize: CGFloat = 300
        let aspectRatio = image.size.width / image.size.height
        
        if image.size.width > image.size.height {
            return CGSize(width: maxPreviewSize, height: maxPreviewSize / aspectRatio)
        } else {
            return CGSize(width: maxPreviewSize * aspectRatio, height: maxPreviewSize)
        }
    }
}

// MARK: - Filter Parameter Management
class FilterParameterManager: ObservableObject {
    @Published var currentFilters: [ImageFilter] = []
    
    func addFilter(_ filter: ImageFilter) {
        currentFilters.append(filter)
    }
    
    func updateFilterParameter(filterId: UUID, parameter: String, value: Any) {
        guard let index = currentFilters.firstIndex(where: { $0.id == filterId }) else { return }
        
        var updatedFilter = currentFilters[index]
        updatedFilter.parameters[parameter] = value
        currentFilters[index] = updatedFilter
    }
    
    func updateFilterIntensity(filterId: UUID, intensity: Float) {
        guard let index = currentFilters.firstIndex(where: { $0.id == filterId }) else { return }
        
        var updatedFilter = currentFilters[index]
        updatedFilter.intensity = intensity
        currentFilters[index] = updatedFilter
    }
}
```

## 4. **Memory Management System**

```swift
// MARK: - Intelligent Image Cache
class ImageCache {
    private let cache = NSCache<NSString, CachedImage>()
    private let fileManager = FileManager.default
    private let cacheDirectory: URL
    private let memoryLimit: Int = 100 * 1024 * 1024 // 100MB
    private let diskLimit: Int = 500 * 1024 * 1024 // 500MB
    
    init() {
        let cachesDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        cacheDirectory = cachesDirectory.appendingPathComponent("ImageCache")
        
        try? fileManager.createDirectory(at: cacheDirectory, withIntermediateDirectories: true)
        
        cache.totalCostLimit = memoryLimit
        cache.countLimit = 50
        
        setupMemoryWarningObserver()
    }
    
    func get(for key: String) -> UIImage? {
        // Check memory cache first
        if let cachedImage = cache.object(forKey: key as NSString) {
            return cachedImage.image
        }
        
        // Check disk cache
        return loadFromDisk(key: key)
    }
    
    func set(_ image: UIImage, for key: String) {
        let cachedImage = CachedImage(image: image, timestamp: Date())
        
        // Store in memory cache
        cache.setObject(cachedImage, forKey: key as NSString, cost: calculateImageCost(image))
        
        // Store in disk cache
        saveToDisk(image: image, key: key)
        
        // Clean up if needed
        cleanupIfNeeded()
    }
    
    private func calculateImageCost(_ image: UIImage) -> Int {
        guard let cgImage = image.cgImage else { return 0 }
        return cgImage.width * cgImage.height * 4 // 4 bytes per pixel (RGBA)
    }
    
    private func saveToDisk(image: UIImage, key: String) {
        let fileURL = cacheDirectory.appendingPathComponent(key)
        
        DispatchQueue.global(qos: .utility).async {
            if let data = image.jpegData(compressionQuality: 0.8) {
                try? data.write(to: fileURL)
            }
        }
    }
    
    private func loadFromDisk(key: String) -> UIImage? {
        let fileURL = cacheDirectory.appendingPathComponent(key)
        
        guard let data = try? Data(contentsOf: fileURL),
              let image = UIImage(data: data) else { return nil }
        
        // Add back to memory cache
        let cachedImage = CachedImage(image: image, timestamp: Date())
        cache.setObject(cachedImage, forKey: key as NSString, cost: calculateImageCost(image))
        
        return image
    }
    
    private func cleanupIfNeeded() {
        // Check disk usage
        let diskUsage = calculateDiskUsage()
        if diskUsage > diskLimit {
            cleanupOldFiles()
        }
    }
    
    private func calculateDiskUsage() -> Int {
        guard let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.fileSizeKey]) else {
            return 0
        }
        
        var totalSize = 0
        for case let fileURL as URL in enumerator {
            if let fileSize = try? fileURL.resourceValues(forKeys: [.fileSizeKey]).fileSize {
                totalSize += fileSize
            }
        }
        
        return totalSize
    }
    
    private func cleanupOldFiles() {
        guard let enumerator = fileManager.enumerator(at: cacheDirectory, includingPropertiesForKeys: [.creationDateKey, .fileSizeKey]) else {
            return
        }
        
        var files: [(URL, Date, Int)] = []
        
        for case let fileURL as URL in enumerator {
            if let resourceValues = try? fileURL.resourceValues(forKeys: [.creationDateKey, .fileSizeKey]),
               let creationDate = resourceValues.creationDate,
               let fileSize = resourceValues.fileSize {
                files.append((fileURL, creationDate, fileSize))
            }
        }
        
        // Sort by creation date (oldest first)
        files.sort { $0.1 < $1.1 }
        
        // Remove oldest files until under limit
        var currentUsage = calculateDiskUsage()
        for (fileURL, _, fileSize) in files {
            if currentUsage <= diskLimit { break }
            
            try? fileManager.removeItem(at: fileURL)
            currentUsage -= fileSize
        }
    }
    
    private func setupMemoryWarningObserver() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleMemoryWarning),
            name: UIApplication.didReceiveMemoryWarningNotification,
            object: nil
        )
    }
    
    @objc private func handleMemoryWarning() {
        cache.removeAllObjects()
    }
}

// MARK: - Cached Image
class CachedImage {
    let image: UIImage
    let timestamp: Date
    
    init(image: UIImage, timestamp: Date) {
        self.image = image
        self.timestamp = timestamp
    }
}
```

## 5. **Performance Monitoring and Optimization**

```swift
// MARK: - Performance Monitor
class PhotoEditingPerformanceMonitor {
    static let shared = PhotoEditingPerformanceMonitor()
    
    private var processingTimes: [String: TimeInterval] = [:]
    private var memoryUsage: [String: Int] = [:]
    private let queue = DispatchQueue(label: "com.app.performance", attributes: .concurrent)
    
    func startMonitoring(filterName: String) -> String {
        let monitoringId = UUID().uuidString
        let startTime = CFAbsoluteTimeGetCurrent()
        
        queue.async(flags: .barrier) {
            self.processingTimes[monitoringId] = startTime
        }
        
        return monitoringId
    }
    
    func endMonitoring(id: String, filterName: String) {
        let endTime = CFAbsoluteTimeGetCurrent()
        
        queue.async(flags: .barrier) {
            if let startTime = self.processingTimes[id] {
                let duration = endTime - startTime
                print("Filter '\(filterName)' took \(duration) seconds")
                
                // Track average processing time
                self.updateAverageProcessingTime(filterName: filterName, duration: duration)
                
                self.processingTimes.removeValue(forKey: id)
            }
        }
    }
    
    private func updateAverageProcessingTime(filterName: String, duration: TimeInterval) {
        // Implementation for tracking average processing times
    }
    
    func monitorMemoryUsage() -> Int {
        var info = mach_task_basic_info()
        var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size)/4
        
        let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
            $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
                task_info(mach_task_self_,
                         task_flavor_t(MACH_TASK_BASIC_INFO),
                         $0,
                         &count)
            }
        }
        
        if kerr == KERN_SUCCESS {
            return Int(info.resident_size)
        }
        
        return 0
    }
}

// MARK: - Filter Optimization
class FilterOptimizer {
    static func optimizeFilterChain(_ filters: [ImageFilter]) -> [ImageFilter] {
        var optimizedFilters = filters
        
        // Combine similar filters
        optimizedFilters = combineSimilarFilters(optimizedFilters)
        
        // Reorder filters for better performance
        optimizedFilters = reorderFiltersForPerformance(optimizedFilters)
        
        return optimizedFilters
    }
    
    private static func combineSimilarFilters(_ filters: [ImageFilter]) -> [ImageFilter] {
        // Implementation for combining similar filters
        return filters
    }
    
    private static func reorderFiltersForPerformance(_ filters: [ImageFilter]) -> [ImageFilter] {
        // Implementation for reordering filters
        return filters
    }
}
```

## 6. **SwiftUI Integration**

```swift
import SwiftUI

// MARK: - Photo Editor View
struct PhotoEditorView: View {
    @StateObject private var parameterManager = FilterParameterManager()
    @StateObject private var previewManager: PreviewManager
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    
    init(pipeline: ImageProcessingPipeline) {
        self._previewManager = StateObject(wrappedValue: PreviewManager(pipeline: pipeline))
    }
    
    var body: some View {
        NavigationView {
            VStack {
                // Image Preview
                if let previewImage = previewManager.previewImage {
                    Image(uiImage: previewImage)
                        .resizable()
                        .aspectRatio(contentMode: .fit)
                        .frame(maxHeight: 400)
                        .overlay(
                            Group {
                                if previewManager.isProcessing {
                                    ProgressView()
                                        .progressViewStyle(CircularProgressViewStyle())
                                        .scaleEffect(1.5)
                                        .background(Color.black.opacity(0.3))
                                        .cornerRadius(10)
                                }
                            }
                        )
                } else {
                    Button("Select Image") {
                        showingImagePicker = true
                    }
                    .font(.title2)
                    .padding()
                }
                
                // Filter Controls
                FilterControlsView(
                    parameterManager: parameterManager,
                    onFilterChanged: { filters in
                        if let image = selectedImage {
                            previewManager.updatePreview(originalImage: image, filters: filters)
                        }
                    }
                )
                
                Spacer()
            }
            .navigationTitle("Photo Editor")
            .sheet(isPresented: $showingImagePicker) {
                ImagePicker(selectedImage: $selectedImage)
            }
            .onChange(of: selectedImage) { newImage in
                if let image = newImage {
                    previewManager.updatePreview(originalImage: image, filters: parameterManager.currentFilters)
                }
            }
        }
    }
}

// MARK: - Filter Controls View
struct FilterControlsView: View {
    @ObservedObject var parameterManager: FilterParameterManager
    let onFilterChanged: ([ImageFilter]) -> Void
    
    var body: some View {
        VStack {
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 15) {
                    ForEach(parameterManager.currentFilters) { filter in
                        FilterControlCard(filter: filter) { updatedFilter in
                            // Update filter
                            if let index = parameterManager.currentFilters.firstIndex(where: { $0.id == filter.id }) {
                                parameterManager.currentFilters[index] = updatedFilter
                                onFilterChanged(parameterManager.currentFilters)
                            }
                        }
                    }
                }
                .padding(.horizontal)
            }
            
            // Add Filter Button
            Button("Add Filter") {
                // Show filter picker
            }
            .padding()
        }
    }
}

// MARK: - Filter Control Card
struct FilterControlCard: View {
    let filter: ImageFilter
    let onUpdate: (ImageFilter) -> Void
    
    @State private var intensity: Float
    
    init(filter: ImageFilter, onUpdate: @escaping (ImageFilter) -> Void) {
        self.filter = filter
        self.onUpdate = onUpdate
        self._intensity = State(initialValue: filter.intensity)
    }
    
    var body: some View {
        VStack {
            Text(filter.name)
                .font(.caption)
                .fontWeight(.medium)
            
            Slider(value: $intensity, in: 0...1) { _ in
                var updatedFilter = filter
                updatedFilter.intensity = intensity
                onUpdate(updatedFilter)
            }
            .frame(width: 100)
        }
        .padding()
        .background(Color.gray.opacity(0.1))
        .cornerRadius(10)
    }
}
```

## **Summary**

A well-designed photo editing system in iOS requires:

1. **Efficient Processing Pipeline**: Multi-threaded image processing with GPU acceleration
2. **Real-time Preview System**: Fast preview generation with intelligent caching
3. **Memory Management**: Smart caching strategies to handle large images
4. **Performance Monitoring**: Continuous monitoring and optimization
5. **Modular Architecture**: Separable components for maintainability
6. **User Experience**: Responsive UI with smooth interactions

This architecture provides a foundation for building professional-grade photo editing capabilities within iOS applications while maintaining performance and user experience. 