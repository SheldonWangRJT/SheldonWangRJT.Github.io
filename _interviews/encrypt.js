// Run with: node _interviews/encrypt.js
const CryptoJS = require('crypto-js');
const fs = require('fs');

const password = 'iOSMaster2025!'; // CHANGE THIS to your desired password

const content = `
<div class="question-card">
  <h3>📱 Question 1: Design an Instagram-like Feed <span class="difficulty-badge difficulty-hard">Hard</span></h3>
  
  <h4>🎯 Problem Statement:</h4>
  <p>Design the architecture for an Instagram-like feed that can:</p>
  <ul>
    <li>Display images and videos efficiently</li>
    <li>Support infinite scrolling with pagination</li>
    <li>Handle offline mode and caching</li>
    <li>Optimize for battery life and data usage</li>
    <li>Scale to millions of users</li>
  </ul>
  
  <h4>🔑 Key Considerations:</h4>
  <ul>
    <li><strong>Memory Management:</strong> How to prevent OOM with images?</li>
    <li><strong>Prefetching:</strong> When and how much to prefetch?</li>
    <li><strong>Caching Strategy:</strong> Disk vs memory, eviction policies</li>
    <li><strong>Video Playback:</strong> Autoplay, preloading, battery impact</li>
    <li><strong>Network Optimization:</strong> Request batching, retries, CDN</li>
  </ul>
  
  <h4>✅ Expected Solution Components:</h4>
  <ol>
    <li><strong>Architecture:</strong> MVVM with Coordinator pattern</li>
    <li><strong>Data Layer:</strong> Repository pattern with caching</li>
    <li><strong>Image Loading:</strong> SDWebImage or custom solution with NSCache</li>
    <li><strong>Prefetching:</strong> UITableViewDataSourcePrefetching</li>
    <li><strong>Video:</strong> AVPlayer pool, reuse strategy</li>
    <li><strong>Pagination:</strong> Cursor-based or offset-based</li>
    <li><strong>Offline:</strong> Core Data or Realm for persistence</li>
  </ol>
  
  <h4>💡 Pro Tips:</h4>
  <ul>
    <li>Discuss trade-offs: memory vs network vs UX</li>
    <li>Mention <code>UICollectionView</code> vs <code>UITableView</code> choice</li>
    <li>Talk about cell reuse and performance</li>
    <li>Consider accessibility and VoiceOver</li>
  </ul>
</div>

<div class="question-card">
  <h3>🔄 Question 2: Design a Real-Time Chat System <span class="difficulty-badge difficulty-hard">Hard</span></h3>
  
  <h4>🎯 Problem Statement:</h4>
  <p>Design a WhatsApp-like messaging system for iOS:</p>
  <ul>
    <li>Real-time message delivery (WebSocket)</li>
    <li>Local message storage and sync</li>
    <li>Media sharing (images, videos, files)</li>
    <li>Typing indicators and read receipts</li>
    <li>Offline message queuing</li>
  </ul>
  
  <h4>🔑 Key Considerations:</h4>
  <ul>
    <li><strong>Networking:</strong> WebSocket vs long polling?</li>
    <li><strong>Database:</strong> Core Data vs Realm vs SQLite?</li>
    <li><strong>Sync Strategy:</strong> How to handle offline/online transitions?</li>
    <li><strong>Message Ordering:</strong> Timestamps, local vs server time</li>
    <li><strong>Encryption:</strong> E2E encryption approach</li>
  </ul>
  
  <h4>✅ Solution Architecture:</h4>
  <ol>
    <li><strong>Transport Layer:</strong> URLSession WebSocket with reconnection logic</li>
    <li><strong>Message Queue:</strong> Pending, sent, delivered, read states</li>
    <li><strong>Local Storage:</strong> Core Data with background contexts</li>
    <li><strong>Media Upload:</strong> Background URLSession with progress tracking</li>
    <li><strong>Push Notifications:</strong> APNs for background delivery</li>
  </ol>
</div>

<div class="question-card">
  <h3>🖼️ Question 3: Image Caching System <span class="difficulty-badge difficulty-medium">Medium</span></h3>
  
  <h4>🎯 Problem Statement:</h4>
  <p>Design an efficient image caching system that:</p>
  <ul>
    <li>Downloads and caches images from URLs</li>
    <li>Manages memory and disk cache</li>
    <li>Handles cache eviction intelligently</li>
    <li>Supports image transformations (resize, crop)</li>
    <li>Thread-safe operations</li>
  </ul>
  
  <h4>✅ Key Components:</h4>
  <pre><code>class ImageCache {
  private let memoryCache: NSCache&lt;NSString, UIImage&gt;
  private let diskCache: FileManager
  private let downloadQueue: OperationQueue
  
  func loadImage(url: URL, completion: @escaping (UIImage?) -> Void)
  func clearCache(olderThan: TimeInterval)
  func prefetch(urls: [URL])
}</code></pre>
  
  <h4>💡 Discussion Points:</h4>
  <ul>
    <li>Cache eviction: LRU vs LFU vs TTL</li>
    <li>Disk cache size limits and cleanup</li>
    <li>Image format optimization (WebP, HEIC)</li>
    <li>Concurrent downloads and request deduplication</li>
  </ul>
</div>

<div class="question-card">
  <h3>⚡ Question 4: App Launch Optimization <span class="difficulty-badge difficulty-hard">Hard</span></h3>
  
  <h4>🎯 Problem Statement:</h4>
  <p>Your app takes 3 seconds to launch. How do you reduce it to under 1 second?</p>
  
  <h4>🔍 Investigation Steps:</h4>
  <ol>
    <li><strong>Measure:</strong> Use Instruments (Time Profiler, System Trace)</li>
    <li><strong>Identify:</strong> What's happening during launch?
      <ul>
        <li>Pre-main time (dyld loading)</li>
        <li>Main thread initialization</li>
        <li>First view controller creation</li>
      </ul>
    </li>
  </ol>
  
  <h4>✅ Optimization Strategies:</h4>
  <ul>
    <li><strong>Reduce dyld time:</strong> Minimize dynamic frameworks, use static linking</li>
    <li><strong>Defer work:</strong> Move non-critical init to background or after first frame</li>
    <li><strong>Lazy loading:</strong> Initialize only what's needed for first screen</li>
    <li><strong>Async operations:</strong> Use GCD for parallel initialization</li>
    <li><strong>Asset optimization:</strong> Compress images, use asset catalogs</li>
  </ul>
</div>

<div class="question-card">
  <h3>🧵 Question 5: Main Thread Optimization <span class="difficulty-badge difficulty-medium">Medium</span></h3>
  
  <h4>🎯 Problem Statement:</h4>
  <p>Your app's scrolling is janky. Frame rate drops to 30 FPS. How do you fix it?</p>
  
  <h4>🔍 Debugging Approach:</h4>
  <ul>
    <li>Use Instruments (Core Animation, Time Profiler)</li>
    <li>Enable "Color Offscreen-Rendered" in simulator</li>
    <li>Check for main thread blocking operations</li>
    <li>Measure cell prepare time</li>
  </ul>
  
  <h4>✅ Common Solutions:</h4>
  <ol>
    <li><strong>Move to background:</strong> Image decoding, text sizing, layout calculations</li>
    <li><strong>Optimize layers:</strong> Reduce layer count, avoid offscreen rendering</li>
    <li><strong>Cell optimization:</strong> Reuse cells properly, pre-calculate heights</li>
    <li><strong>Rendering:</strong> Use <code>CALayer</code> directly for complex views</li>
    <li><strong>Image handling:</strong> Downscale images to display size</li>
  </ol>
</div>

<hr style="margin: 40px 0; border-color: rgba(255,255,255,0.1);">

<div style="text-align: center; padding: 30px; background: rgba(102, 126, 234, 0.1); border-radius: 15px;">
  <h3 style="color: #667eea; margin-top: 0;">🎓 More Questions Coming Soon!</h3>
  <p style="color: rgba(255,255,255,0.8);">This is a growing collection. Check back regularly for new questions on:</p>
  <ul style="color: rgba(255,255,255,0.7); text-align: left; max-width: 500px; margin: 20px auto;">
    <li>SwiftUI architecture patterns</li>
    <li>Combine framework design</li>
    <li>Core Data optimization at scale</li>
    <li>Push notification architecture</li>
    <li>Background task scheduling</li>
    <li>And more!</li>
  </ul>
  <p style="color: rgba(255,255,255,0.6); margin-top: 30px;">
    <strong>Have suggestions?</strong> <a href="mailto:sheldon.wang7@yahoo.com" style="color: #667eea;">Email me</a> with topics you'd like covered!
  </p>
</div>
`;

// Encrypt with password
const encrypted = CryptoJS.AES.encrypt(content, password).toString();

console.log('\n=== ENCRYPTION COMPLETE ===\n');
console.log('Password:', password);
console.log('\nEncrypted String (copy this to ios-interviews.html):\n');
console.log(encrypted);
console.log('\n=== END ===\n');

