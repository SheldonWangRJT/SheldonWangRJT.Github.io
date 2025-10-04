---
title: 'iOS Advanced UI Components: Custom Views and Complex Interactions'
date: 2025-04-25
permalink: /posts/2025/04/blog-post-april-2/
tags:
  - iOS
  - UIKit
  - SwiftUI
  - Custom Views
  - UI Components
  - Interactions
excerpt: "Creating sophisticated iOS applications requires building custom UI components that go beyond standard UIKit and SwiftUI controls. This guide explores advanced UI development techniques, custom view creation, complex gesture handling, and performance optimization."
header:
  overlay_image: https://images.unsplash.com/photo-1551650975-87deedd944c3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1974&q=80
  overlay_filter: 0.5
  caption: "Advanced UI design and custom component development for iOS"
---

<!--more-->

## 1. **Custom Drawing and Graphics**

Creating sophisticated iOS applications requires building custom UI components that go beyond standard UIKit and SwiftUI controls. This guide explores advanced UI development techniques, custom view creation, complex gesture handling, and performance optimization for custom components.

## 1. **Custom Drawing and Graphics**

```swift
import UIKit
import CoreGraphics

// MARK: - Custom Progress Ring
class ProgressRingView: UIView {
    private var progress: CGFloat = 0.0
    private var lineWidth: CGFloat = 8.0
    private var progressColor: UIColor = .systemBlue
    private var trackColor: UIColor = .systemGray5
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = .clear
        isOpaque = false
    }
    
    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2 - lineWidth / 2
        
        // Draw track
        context.setStrokeColor(trackColor.cgColor)
        context.setLineWidth(lineWidth)
        context.setLineCap(.round)
        context.addArc(center: center, radius: radius, startAngle: 0, endAngle: 2 * .pi, clockwise: false)
        context.strokePath()
        
        // Draw progress
        context.setStrokeColor(progressColor.cgColor)
        context.addArc(center: center, radius: radius, startAngle: -.pi / 2, endAngle: -.pi / 2 + 2 * .pi * progress, clockwise: false)
        context.strokePath()
    }
    
    func setProgress(_ newProgress: CGFloat, animated: Bool = true) {
        let clampedProgress = max(0, min(1, newProgress))
        
        if animated {
            let animation = CABasicAnimation(keyPath: "progress")
            animation.fromValue = progress
            animation.toValue = clampedProgress
            animation.duration = 0.5
            animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
            
            layer.add(animation, forKey: "progressAnimation")
        }
        
        progress = clampedProgress
        setNeedsDisplay()
    }
    
    // MARK: - Custom Properties for Interface Builder
    @IBInspectable var progressValue: CGFloat {
        get { return progress }
        set { setProgress(newValue) }
    }
    
    @IBInspectable var ringWidth: CGFloat {
        get { return lineWidth }
        set { 
            lineWidth = newValue
            setNeedsDisplay()
        }
    }
    
    @IBInspectable var ringProgressColor: UIColor {
        get { return progressColor }
        set { 
            progressColor = newValue
            setNeedsDisplay()
        }
    }
    
    @IBInspectable var ringTrackColor: UIColor {
        get { return trackColor }
        set { 
            trackColor = newValue
            setNeedsDisplay()
        }
    }
}

// MARK: - Custom Gradient Button
class GradientButton: UIButton {
    private let gradientLayer = CAGradientLayer()
    private var gradientColors: [UIColor] = [.systemBlue, .systemPurple]
    private var gradientDirection: GradientDirection = .horizontal
    
    enum GradientDirection {
        case horizontal, vertical, diagonal
    }
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupGradient()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupGradient()
    }
    
    private func setupGradient() {
        gradientLayer.cornerRadius = 8
        layer.insertSublayer(gradientLayer, at: 0)
        updateGradient()
    }
    
    override func layoutSubviews() {
        super.layoutSubviews()
        gradientLayer.frame = bounds
    }
    
    private func updateGradient() {
        gradientLayer.colors = gradientColors.map { $0.cgColor }
        
        switch gradientDirection {
        case .horizontal:
            gradientLayer.startPoint = CGPoint(x: 0, y: 0.5)
            gradientLayer.endPoint = CGPoint(x: 1, y: 0.5)
        case .vertical:
            gradientLayer.startPoint = CGPoint(x: 0.5, y: 0)
            gradientLayer.endPoint = CGPoint(x: 0.5, y: 1)
        case .diagonal:
            gradientLayer.startPoint = CGPoint(x: 0, y: 0)
            gradientLayer.endPoint = CGPoint(x: 1, y: 1)
        }
    }
    
    func setGradientColors(_ colors: [UIColor], direction: GradientDirection = .horizontal) {
        gradientColors = colors
        gradientDirection = direction
        updateGradient()
    }
    
    // MARK: - Touch Handling
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesBegan(touches, with: event)
        animateTouchDown()
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesEnded(touches, with: event)
        animateTouchUp()
    }
    
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent?) {
        super.touchesCancelled(touches, with: event)
        animateTouchUp()
    }
    
    private func animateTouchDown() {
        UIView.animate(withDuration: 0.1) {
            self.transform = CGAffineTransform(scaleX: 0.95, y: 0.95)
            self.alpha = 0.8
        }
    }
    
    private func animateTouchUp() {
        UIView.animate(withDuration: 0.1) {
            self.transform = .identity
            self.alpha = 1.0
        }
    }
}

// MARK: - Custom Waveform View
class WaveformView: UIView {
    private var waveformData: [CGFloat] = []
    private var barColor: UIColor = .systemBlue
    private var barSpacing: CGFloat = 2.0
    private var barWidth: CGFloat = 3.0
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = .clear
        isOpaque = false
    }
    
    func setWaveformData(_ data: [CGFloat]) {
        waveformData = data
        setNeedsDisplay()
    }
    
    override func draw(_ rect: CGRect) {
        guard let context = UIGraphicsGetCurrentContext() else { return }
        
        let totalWidth = CGFloat(waveformData.count) * (barWidth + barSpacing) - barSpacing
        let startX = (rect.width - totalWidth) / 2
        
        context.setFillColor(barColor.cgColor)
        
        for (index, amplitude) in waveformData.enumerated() {
            let x = startX + CGFloat(index) * (barWidth + barSpacing)
            let height = rect.height * amplitude
            let y = (rect.height - height) / 2
            
            let barRect = CGRect(x: x, y: y, width: barWidth, height: height)
            context.fill(barRect)
        }
    }
    
    func animateWaveform() {
        let animation = CABasicAnimation(keyPath: "transform.scale.y")
        animation.fromValue = 0.1
        animation.toValue = 1.0
        animation.duration = 0.5
        animation.timingFunction = CAMediaTimingFunction(name: .easeOut)
        
        layer.add(animation, forKey: "waveformAnimation")
    }
}
```

## 2. **Advanced Gesture Handling**

```swift
// MARK: - Custom Pan Gesture with Velocity
class VelocityPanGestureRecognizer: UIPanGestureRecognizer {
    private var initialTouchPoint: CGPoint = .zero
    private var lastTouchPoint: CGPoint = .zero
    private var velocityThreshold: CGFloat = 500.0
    
    var velocityDirection: VelocityDirection = .none
    
    enum VelocityDirection {
        case up, down, left, right, none
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesBegan(touches, with: event)
        
        guard let touch = touches.first else { return }
        initialTouchPoint = touch.location(in: view)
        lastTouchPoint = initialTouchPoint
    }
    
    override func touchesMoved(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesMoved(touches, with: event)
        
        guard let touch = touches.first else { return }
        lastTouchPoint = touch.location(in: view)
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        
        let velocity = self.velocity(in: view)
        let velocityMagnitude = sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
        
        if velocityMagnitude > velocityThreshold {
            if abs(velocity.x) > abs(velocity.y) {
                velocityDirection = velocity.x > 0 ? .right : .left
            } else {
                velocityDirection = velocity.y > 0 ? .down : .up
            }
        } else {
            velocityDirection = .none
        }
    }
}

// MARK: - Custom Long Press with Haptic Feedback
class HapticLongPressGestureRecognizer: UILongPressGestureRecognizer {
    private var hapticFeedback: UIImpactFeedbackGenerator?
    private var feedbackTimer: Timer?
    
    override init(target: Any?, action: Selector?) {
        super.init(target: target, action: action)
        setupHapticFeedback()
    }
    
    private func setupHapticFeedback() {
        hapticFeedback = UIImpactFeedbackGenerator(style: .medium)
        hapticFeedback?.prepare()
    }
    
    override func touchesBegan(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesBegan(touches, with: event)
        
        if state == .began {
            hapticFeedback?.impactOccurred()
            startFeedbackTimer()
        }
    }
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        stopFeedbackTimer()
    }
    
    override func touchesCancelled(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesCancelled(touches, with: event)
        stopFeedbackTimer()
    }
    
    private func startFeedbackTimer() {
        feedbackTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in
            self?.hapticFeedback?.impactOccurred()
        }
    }
    
    private func stopFeedbackTimer() {
        feedbackTimer?.invalidate()
        feedbackTimer = nil
    }
}

// MARK: - Custom Rotation Gesture with Snap
class SnapRotationGestureRecognizer: UIRotationGestureRecognizer {
    private var snapAngles: [CGFloat] = [0, .pi/2, .pi, 3*.pi/2]
    private var snapThreshold: CGFloat = .pi/6
    
    var snappedAngle: CGFloat = 0
    
    override func touchesEnded(_ touches: Set<UITouch>, with event: UIEvent) {
        super.touchesEnded(touches, with: event)
        
        let currentRotation = rotation
        var closestAngle = snapAngles[0]
        var minDifference = abs(currentRotation - closestAngle)
        
        for angle in snapAngles {
            let difference = abs(currentRotation - angle)
            if difference < minDifference {
                minDifference = difference
                closestAngle = angle
            }
        }
        
        if minDifference < snapThreshold {
            snappedAngle = closestAngle
            
            // Animate to snapped position
            UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5, options: .curveEaseOut) {
                self.view?.transform = CGAffineTransform(rotationAngle: closestAngle)
            }
        }
    }
}
```

## 3. **Complex Interactive Views**

```swift
// MARK: - Draggable Card View
class DraggableCardView: UIView {
    private var initialCenter: CGPoint = .zero
    private var panGesture: UIPanGestureRecognizer!
    private var rotationAngle: CGFloat = 0
    
    var onSwipeLeft: (() -> Void)?
    var onSwipeRight: (() -> Void)?
    var onSwipeUp: (() -> Void)?
    var onSwipeDown: (() -> Void)?
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = .white
        layer.cornerRadius = 12
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 8
        
        panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        addGestureRecognizer(panGesture)
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: superview)
        let velocity = gesture.velocity(in: superview)
        
        switch gesture.state {
        case .began:
            initialCenter = center
            
        case .changed:
            center = CGPoint(x: initialCenter.x + translation.x, y: initialCenter.y + translation.y)
            
            // Calculate rotation based on horizontal translation
            let rotation = translation.x / 200 * .pi / 6
            transform = CGAffineTransform(rotationAngle: rotation)
            
            // Update shadow based on distance from center
            let distance = sqrt(translation.x * translation.x + translation.y * translation.y)
            layer.shadowOpacity = Float(min(0.3, distance / 200))
            
        case .ended, .cancelled:
            let velocityMagnitude = sqrt(velocity.x * velocity.x + velocity.y * velocity.y)
            let translationMagnitude = sqrt(translation.x * translation.x + translation.y * translation.y)
            
            if velocityMagnitude > 500 || translationMagnitude > 100 {
                // Determine swipe direction
                if abs(velocity.x) > abs(velocity.y) {
                    if velocity.x > 0 {
                        swipeRight()
                    } else {
                        swipeLeft()
                    }
                } else {
                    if velocity.y > 0 {
                        swipeDown()
                    } else {
                        swipeUp()
                    }
                }
            } else {
                // Return to original position
                UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.7, initialSpringVelocity: 0.5, options: .curveEaseOut) {
                    self.center = self.initialCenter
                    self.transform = .identity
                    self.layer.shadowOpacity = 0.1
                }
            }
            
        default:
            break
        }
    }
    
    private func swipeLeft() {
        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseOut) {
            self.center.x = -self.bounds.width
            self.alpha = 0
        } completion: { _ in
            self.onSwipeLeft?()
        }
    }
    
    private func swipeRight() {
        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseOut) {
            self.center.x = self.superview?.bounds.width ?? 0 + self.bounds.width
            self.alpha = 0
        } completion: { _ in
            self.onSwipeRight?()
        }
    }
    
    private func swipeUp() {
        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseOut) {
            self.center.y = -self.bounds.height
            self.alpha = 0
        } completion: { _ in
            self.onSwipeUp?()
        }
    }
    
    private func swipeDown() {
        UIView.animate(withDuration: 0.3, delay: 0, options: .curveEaseOut) {
            self.center.y = self.superview?.bounds.height ?? 0 + self.bounds.height
            self.alpha = 0
        } completion: { _ in
            self.onSwipeDown?()
        }
    }
}

// MARK: - Expandable Collection View Cell
class ExpandableCollectionViewCell: UICollectionViewCell {
    private var isExpanded = false
    private var originalFrame: CGRect = .zero
    private var expandedFrame: CGRect = .zero
    
    private let contentView = UIView()
    private let titleLabel = UILabel()
    private let detailLabel = UILabel()
    private let expandButton = UIButton()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        backgroundColor = .white
        layer.cornerRadius = 8
        layer.shadowColor = UIColor.black.cgColor
        layer.shadowOffset = CGSize(width: 0, height: 2)
        layer.shadowOpacity = 0.1
        layer.shadowRadius = 4
        
        setupSubviews()
        setupConstraints()
        setupGestures()
    }
    
    private func setupSubviews() {
        titleLabel.font = .systemFont(ofSize: 16, weight: .semibold)
        titleLabel.textColor = .label
        
        detailLabel.font = .systemFont(ofSize: 14)
        detailLabel.textColor = .secondaryLabel
        detailLabel.numberOfLines = 0
        detailLabel.isHidden = true
        
        expandButton.setImage(UIImage(systemName: "chevron.down"), for: .normal)
        expandButton.tintColor = .systemBlue
        
        contentView.addSubview(titleLabel)
        contentView.addSubview(detailLabel)
        contentView.addSubview(expandButton)
        addSubview(contentView)
    }
    
    private func setupConstraints() {
        contentView.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        detailLabel.translatesAutoresizingMaskIntoConstraints = false
        expandButton.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            contentView.topAnchor.constraint(equalTo: topAnchor),
            contentView.leadingAnchor.constraint(equalTo: leadingAnchor),
            contentView.trailingAnchor.constraint(equalTo: trailingAnchor),
            contentView.bottomAnchor.constraint(equalTo: bottomAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12),
            titleLabel.trailingAnchor.constraint(equalTo: expandButton.leadingAnchor, constant: -8),
            
            detailLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            detailLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor, constant: 12),
            detailLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12),
            detailLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor, constant: -12),
            
            expandButton.topAnchor.constraint(equalTo: contentView.topAnchor, constant: 12),
            expandButton.trailingAnchor.constraint(equalTo: contentView.trailingAnchor, constant: -12),
            expandButton.widthAnchor.constraint(equalToConstant: 24),
            expandButton.heightAnchor.constraint(equalToConstant: 24)
        ])
    }
    
    private func setupGestures() {
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap))
        addGestureRecognizer(tapGesture)
        
        expandButton.addTarget(self, action: #selector(handleExpand), for: .touchUpInside)
    }
    
    @objc private func handleTap() {
        toggleExpansion()
    }
    
    @objc private func handleExpand() {
        toggleExpansion()
    }
    
    private func toggleExpansion() {
        isExpanded.toggle()
        
        UIView.animate(withDuration: 0.3, delay: 0, usingSpringWithDamping: 0.8, initialSpringVelocity: 0.5, options: .curveEaseInOut) {
            self.detailLabel.isHidden = !self.isExpanded
            self.expandButton.transform = self.isExpanded ? CGAffineTransform(rotationAngle: .pi) : .identity
        }
        
        // Notify collection view of size change
        if let collectionView = superview as? UICollectionView {
            collectionView.performBatchUpdates(nil)
        }
    }
    
    func configure(title: String, detail: String) {
        titleLabel.text = title
        detailLabel.text = detail
    }
}
```

## 4. **SwiftUI Custom Components**

```swift
import SwiftUI

// MARK: - Custom Slider with Haptic Feedback
struct HapticSlider: View {
    @Binding var value: Double
    let range: ClosedRange<Double>
    let step: Double
    
    @State private var isDragging = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Track
                Rectangle()
                    .fill(Color.gray.opacity(0.3))
                    .frame(height: 4)
                    .cornerRadius(2)
                
                // Progress
                Rectangle()
                    .fill(Color.blue)
                    .frame(width: progressWidth(in: geometry), height: 4)
                    .cornerRadius(2)
                
                // Thumb
                Circle()
                    .fill(Color.white)
                    .frame(width: 24, height: 24)
                    .shadow(color: .black.opacity(0.2), radius: 4, x: 0, y: 2)
                    .offset(x: thumbOffset(in: geometry))
                    .gesture(
                        DragGesture()
                            .onChanged { gesture in
                                updateValue(gesture: gesture, in: geometry)
                                isDragging = true
                            }
                            .onEnded { _ in
                                isDragging = false
                                UIImpactFeedbackGenerator(style: .light).impactOccurred()
                            }
                    )
            }
        }
        .frame(height: 24)
    }
    
    private func progressWidth(in geometry: GeometryProxy) -> CGFloat {
        let progress = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return geometry.size.width * CGFloat(progress)
    }
    
    private func thumbOffset(in geometry: GeometryProxy) -> CGFloat {
        let progress = (value - range.lowerBound) / (range.upperBound - range.lowerBound)
        return geometry.size.width * CGFloat(progress) - 12
    }
    
    private func updateValue(gesture: DragGesture.Value, in geometry: GeometryProxy) {
        let location = gesture.location.x
        let progress = max(0, min(1, location / geometry.size.width))
        let newValue = range.lowerBound + (range.upperBound - range.lowerBound) * Double(progress)
        
        // Snap to step
        let steppedValue = round(newValue / step) * step
        value = max(range.lowerBound, min(range.upperBound, steppedValue))
    }
}

// MARK: - Custom Tab Bar
struct CustomTabBar: View {
    @Binding var selectedTab: Int
    let tabs: [TabItem]
    
    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<tabs.count, id: \.self) { index in
                TabButton(
                    item: tabs[index],
                    isSelected: selectedTab == index
                ) {
                    withAnimation(.spring(response: 0.3, dampingFraction: 0.7)) {
                        selectedTab = index
                    }
                }
            }
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

struct TabItem {
    let title: String
    let icon: String
    let selectedIcon: String
}

struct TabButton: View {
    let item: TabItem
    let isSelected: Bool
    let action: () -> Void
    
    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: isSelected ? item.selectedIcon : item.icon)
                    .font(.system(size: 24))
                    .foregroundColor(isSelected ? .blue : .gray)
                
                Text(item.title)
                    .font(.caption)
                    .foregroundColor(isSelected ? .blue : .gray)
            }
            .frame(maxWidth: .infinity)
        }
        .scaleEffect(isSelected ? 1.1 : 1.0)
        .animation(.spring(response: 0.3, dampingFraction: 0.7), value: isSelected)
    }
}

// MARK: - Custom Pull to Refresh
struct CustomPullToRefresh: View {
    let action: () async -> Void
    @State private var isRefreshing = false
    @State private var refreshOffset: CGFloat = 0
    
    var body: some View {
        GeometryReader { geometry in
            ScrollView {
                VStack {
                    if isRefreshing {
                        ProgressView()
                            .scaleEffect(1.2)
                            .padding()
                    } else {
                        Image(systemName: "arrow.down")
                            .font(.title2)
                            .foregroundColor(.gray)
                            .rotationEffect(.degrees(refreshOffset > 50 ? 180 : 0))
                            .animation(.easeInOut(duration: 0.2), value: refreshOffset)
                            .padding()
                    }
                }
                .frame(maxWidth: .infinity)
                .offset(y: -refreshOffset)
            }
            .refreshable {
                isRefreshing = true
                await action()
                isRefreshing = false
            }
        }
    }
}

// MARK: - Custom Floating Action Button
struct FloatingActionButton: View {
    let icon: String
    let action: () -> Void
    @State private var isPressed = false
    
    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundColor(.white)
                .frame(width: 56, height: 56)
                .background(
                    Circle()
                        .fill(
                            LinearGradient(
                                colors: [.blue, .purple],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            )
                        )
                )
                .shadow(color: .black.opacity(0.3), radius: 8, x: 0, y: 4)
        }
        .scaleEffect(isPressed ? 0.9 : 1.0)
        .animation(.easeInOut(duration: 0.1), value: isPressed)
        .onLongPressGesture(minimumDuration: 0, maximumDistance: .infinity, pressing: { pressing in
            isPressed = pressing
        }, perform: {})
    }
}

// MARK: - Custom Card View with Parallax
struct ParallaxCardView: View {
    let image: String
    let title: String
    let subtitle: String
    
    @State private var offset: CGSize = .zero
    @State private var isPressed = false
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Background Image
                Image(image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: geometry.size.width, height: geometry.size.height)
                    .clipped()
                    .scaleEffect(1.1)
                    .offset(x: offset.width * 0.1, y: offset.height * 0.1)
                
                // Gradient Overlay
                LinearGradient(
                    colors: [.clear, .black.opacity(0.7)],
                    startPoint: .top,
                    endPoint: .bottom
                )
                
                // Content
                VStack(alignment: .leading, spacing: 8) {
                    Spacer()
                    
                    Text(title)
                        .font(.title2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                    
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.white.opacity(0.8))
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
            }
            .background(Color.white)
            .cornerRadius(16)
            .shadow(color: .black.opacity(0.2), radius: 8, x: 0, y: 4)
            .offset(offset)
            .scaleEffect(isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.2), value: isPressed)
            .gesture(
                DragGesture()
                    .onChanged { gesture in
                        offset = gesture.translation
                        isPressed = true
                    }
                    .onEnded { _ in
                        withAnimation(.spring(response: 0.5, dampingFraction: 0.8)) {
                            offset = .zero
                            isPressed = false
                        }
                    }
            )
        }
        .aspectRatio(16/9, contentMode: .fit)
    }
}
```

## 5. **Performance Optimization**

```swift
// MARK: - Reusable View Pool
class ViewPool<T: UIView> {
    private var pool: [T] = []
    private let maxPoolSize: Int
    private let createView: () -> T
    
    init(maxPoolSize: Int = 10, createView: @escaping () -> T) {
        self.maxPoolSize = maxPoolSize
        self.createView = createView
    }
    
    func dequeueView() -> T {
        if let view = pool.popLast() {
            return view
        } else {
            return createView()
        }
    }
    
    func recycleView(_ view: T) {
        guard pool.count < maxPoolSize else { return }
        
        // Reset view state
        view.removeFromSuperview()
        view.alpha = 1.0
        view.transform = .identity
        
        pool.append(view)
    }
}

// MARK: - Optimized Collection View Cell
class OptimizedCollectionViewCell: UICollectionViewCell {
    private static let imageCache = NSCache<NSString, UIImage>()
    private var imageLoadTask: URLSessionDataTask?
    
    private let imageView = UIImageView()
    private let titleLabel = UILabel()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupView()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupView()
    }
    
    private func setupView() {
        imageView.contentMode = .scaleAspectFill
        imageView.clipsToBounds = true
        imageView.layer.cornerRadius = 8
        
        titleLabel.font = .systemFont(ofSize: 14, weight: .medium)
        titleLabel.textColor = .label
        titleLabel.numberOfLines = 2
        
        contentView.addSubview(imageView)
        contentView.addSubview(titleLabel)
        
        imageView.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            imageView.topAnchor.constraint(equalTo: contentView.topAnchor),
            imageView.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            imageView.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            imageView.heightAnchor.constraint(equalTo: imageView.widthAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: imageView.bottomAnchor, constant: 8),
            titleLabel.leadingAnchor.constraint(equalTo: contentView.leadingAnchor),
            titleLabel.trailingAnchor.constraint(equalTo: contentView.trailingAnchor),
            titleLabel.bottomAnchor.constraint(equalTo: contentView.bottomAnchor)
        ])
    }
    
    func configure(with imageURL: URL, title: String) {
        titleLabel.text = title
        
        // Cancel previous image load task
        imageLoadTask?.cancel()
        
        // Check cache first
        let cacheKey = imageURL.absoluteString as NSString
        if let cachedImage = Self.imageCache.object(forKey: cacheKey) {
            imageView.image = cachedImage
            return
        }
        
        // Load image
        imageLoadTask = URLSession.shared.dataTask(with: imageURL) { [weak self] data, response, error in
            guard let self = self,
                  let data = data,
                  let image = UIImage(data: data) else { return }
            
            // Cache image
            Self.imageCache.setObject(image, forKey: cacheKey)
            
            DispatchQueue.main.async {
                self.imageView.image = image
            }
        }
        
        imageLoadTask?.resume()
    }
    
    override func prepareForReuse() {
        super.prepareForReuse()
        
        imageLoadTask?.cancel()
        imageView.image = nil
        titleLabel.text = nil
    }
}

// MARK: - Lazy Loading View Controller
class LazyLoadingViewController: UIViewController {
    private var loadedViews: [Int: UIView] = [loadedViews: UIView]()
    private var viewPool: ViewPool<UIView>!
    
    override func viewDidLoad() {
        super.viewDidLoad()
        
        viewPool = ViewPool(maxPoolSize: 20) {
            let view = UIView()
            view.backgroundColor = .systemBackground
            view.layer.cornerRadius = 8
            view.layer.shadowColor = UIColor.black.cgColor
            view.layer.shadowOffset = CGSize(width: 0, height: 2)
            view.layer.shadowOpacity = 0.1
            view.layer.shadowRadius = 4
            return view
        }
    }
    
    func loadViewIfNeeded(at index: Int) -> UIView {
        if let existingView = loadedViews[index] {
            return existingView
        }
        
        let newView = viewPool.dequeueView()
        loadedViews[index] = newView
        
        // Configure view based on index
        configureView(newView, for: index)
        
        return newView
    }
    
    func unloadView(at index: Int) {
        guard let view = loadedViews[index] else { return }
        
        viewPool.recycleView(view)
        loadedViews.removeValue(forKey: index)
    }
    
    private func configureView(_ view: UIView, for index: Int) {
        // Configure view based on data at index
        // This would typically involve setting up subviews, labels, etc.
    }
}
```

## **Summary**

Advanced iOS UI development requires:

1. **Custom Drawing**: Implement custom drawing with Core Graphics for unique visual effects
2. **Gesture Handling**: Create sophisticated gesture recognizers with haptic feedback
3. **Interactive Components**: Build complex interactive views with smooth animations
4. **SwiftUI Integration**: Combine UIKit and SwiftUI for modern, declarative interfaces
5. **Performance Optimization**: Use view pooling and lazy loading for smooth scrolling
6. **User Experience**: Implement haptic feedback and smooth animations for better UX

By mastering these techniques, you can create sophisticated, performant UI components that provide exceptional user experiences and set your iOS applications apart from the competition. 