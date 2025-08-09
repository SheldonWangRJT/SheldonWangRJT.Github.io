---
title: 'iOS Advanced Animation Techniques: Custom Transitions and Interactive Animations'
date: 2025-02-25
permalink: /posts/2025/02/blog-post-february-2/
tags:
  - iOS
  - Animation
  - SwiftUI
  - UIKit
  - Custom Transitions
---

Creating engaging iOS applications requires sophisticated animation techniques that go beyond basic transitions. This guide explores advanced animation patterns, custom transitions, interactive animations, and performance optimization techniques that elevate user experience to the next level.

## 1. **Custom View Controller Transitions**

```swift
import UIKit

// MARK: - Custom Transition Protocol
protocol CustomTransitionDelegate: AnyObject {
    func transitionDidComplete()
}

// MARK: - Custom Transition Animator
class CustomTransitionAnimator: NSObject, UIViewControllerAnimatedTransitioning {
    let isPresenting: Bool
    weak var delegate: CustomTransitionDelegate?
    
    init(isPresenting: Bool, delegate: CustomTransitionDelegate? = nil) {
        self.isPresenting = isPresenting
        self.delegate = delegate
        super.init()
    }
    
    func transitionDuration(using transitionContext: UIViewControllerContextTransitioning?) -> TimeInterval {
        return 0.6
    }
    
    func animateTransition(using transitionContext: UIViewControllerContextTransitioning) {
        guard let fromView = transitionContext.view(forKey: .from),
              let toView = transitionContext.view(forKey: .to) else {
            transitionContext.completeTransition(false)
            return
        }
        
        let containerView = transitionContext.containerView
        
        if isPresenting {
            // Presenting animation
            containerView.addSubview(toView)
            
            // Initial state
            toView.transform = CGAffineTransform(scaleX: 0.1, y: 0.1)
            toView.alpha = 0
            
            // Animate to final state
            UIView.animate(withDuration: transitionDuration(using: transitionContext),
                          delay: 0,
                          usingSpringWithDamping: 0.8,
                          initialSpringVelocity: 0.2,
                          options: .curveEaseInOut) {
                toView.transform = .identity
                toView.alpha = 1
            } completion: { _ in
                transitionContext.completeTransition(!transitionContext.transitionWasCancelled)
                self.delegate?.transitionDidComplete()
            }
        } else {
            // Dismissing animation
            containerView.insertSubview(toView, belowSubview: fromView)
            
            // Animate from current state to dismissed state
            UIView.animate(withDuration: transitionDuration(using: transitionContext),
                          delay: 0,
                          usingSpringWithDamping: 0.8,
                          initialSpringVelocity: 0.2,
                          options: .curveEaseInOut) {
                fromView.transform = CGAffineTransform(scaleX: 0.1, y: 0.1)
                fromView.alpha = 0
            } completion: { _ in
                transitionContext.completeTransition(!transitionContext.transitionWasCancelled)
                self.delegate?.transitionDidComplete()
            }
        }
    }
}

// MARK: - Interactive Transition Controller
class InteractiveTransitionController: UIPercentDrivenInteractiveTransition {
    private var shouldCompleteTransition = false
    private weak var viewController: UIViewController?
    
    func attach(to viewController: UIViewController) {
        self.viewController = viewController
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        viewController.view.addGestureRecognizer(panGesture)
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        guard let view = gesture.view else { return }
        
        let translation = gesture.translation(in: view)
        let progress = translation.y / view.bounds.height
        
        switch gesture.state {
        case .began:
            viewController?.dismiss(animated: true)
        case .changed:
            update(progress)
            shouldCompleteTransition = progress > 0.5
        case .ended, .cancelled:
            if shouldCompleteTransition {
                finish()
            } else {
                cancel()
            }
        default:
            break
        }
    }
}

// MARK: - Custom Transition Manager
class CustomTransitionManager: NSObject, UIViewControllerTransitioningDelegate {
    private let interactiveController = InteractiveTransitionController()
    
    func animationController(forPresented presented: UIViewController, presenting: UIViewController, source: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        return CustomTransitionAnimator(isPresenting: true)
    }
    
    func animationController(forDismissed dismissed: UIViewController) -> UIViewControllerAnimatedTransitioning? {
        return CustomTransitionAnimator(isPresenting: false)
    }
    
    func interactionControllerForDismissal(using animator: UIViewControllerAnimatedTransitioning) -> UIViewControllerInteractiveTransitioning? {
        return interactiveController
    }
    
    func attachInteractiveController(to viewController: UIViewController) {
        interactiveController.attach(to: viewController)
    }
}

// MARK: - Example View Controllers
class SourceViewController: UIViewController {
    private let transitionManager = CustomTransitionManager()
    
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemBlue
        setupUI()
    }
    
    private func setupUI() {
        let presentButton = UIButton(type: .system)
        presentButton.setTitle("Present Custom Transition", for: .normal)
        presentButton.addTarget(self, action: #selector(presentViewController), for: .touchUpInside)
        presentButton.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(presentButton)
        NSLayoutConstraint.activate([
            presentButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            presentButton.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    @objc private func presentViewController() {
        let destinationVC = DestinationViewController()
        destinationVC.transitioningDelegate = transitionManager
        destinationVC.modalPresentationStyle = .fullScreen
        transitionManager.attachInteractiveController(to: destinationVC)
        present(destinationVC, animated: true)
    }
}

class DestinationViewController: UIViewController {
    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .systemGreen
        setupUI()
    }
    
    private func setupUI() {
        let dismissButton = UIButton(type: .system)
        dismissButton.setTitle("Dismiss", for: .normal)
        dismissButton.addTarget(self, action: #selector(dismissViewController), for: .touchUpInside)
        dismissButton.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(dismissButton)
        NSLayoutConstraint.activate([
            dismissButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            dismissButton.centerYAnchor.constraint(equalTo: view.centerYAnchor)
        ])
    }
    
    @objc private func dismissViewController() {
        dismiss(animated: true)
    }
}
```

## 2. **Advanced SwiftUI Animations**

```swift
import SwiftUI

// MARK: - Custom Animation Modifier
struct ShakeAnimation: ViewModifier {
    @State private var isShaking = false
    
    func body(content: Content) -> some View {
        content
            .offset(x: isShaking ? -5 : 0)
            .animation(
                Animation.easeInOut(duration: 0.1)
                    .repeatCount(5, autoreverses: true),
                value: isShaking
            )
            .onTapGesture {
                isShaking.toggle()
            }
    }
}

// MARK: - Morphing Shape Animation
struct MorphingShape: View {
    @State private var morphing = false
    
    var body: some View {
        ZStack {
            Circle()
                .fill(Color.blue)
                .frame(width: 100, height: 100)
                .scaleEffect(morphing ? 1.5 : 1.0)
                .animation(
                    Animation.easeInOut(duration: 2.0)
                        .repeatForever(autoreverses: true),
                    value: morphing
                )
            
            RoundedRectangle(cornerRadius: morphing ? 50 : 0)
                .fill(Color.red)
                .frame(width: 100, height: 100)
                .scaleEffect(morphing ? 0.5 : 1.0)
                .animation(
                    Animation.easeInOut(duration: 2.0)
                        .repeatForever(autoreverses: true)
                        .delay(1.0),
                    value: morphing
                )
        }
        .onAppear {
            morphing = true
        }
    }
}

// MARK: - Interactive Particle System
struct ParticleSystem: View {
    @State private var particles: [Particle] = []
    @State private var timer: Timer?
    
    var body: some View {
        ZStack {
            ForEach(particles) { particle in
                Circle()
                    .fill(particle.color)
                    .frame(width: particle.size, height: particle.size)
                    .position(particle.position)
                    .opacity(particle.opacity)
            }
        }
        .onAppear {
            startParticleSystem()
        }
        .onDisappear {
            timer?.invalidate()
        }
    }
    
    private func startParticleSystem() {
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            addParticle()
            updateParticles()
        }
    }
    
    private func addParticle() {
        let particle = Particle()
        particles.append(particle)
        
        // Remove old particles
        if particles.count > 50 {
            particles.removeFirst()
        }
    }
    
    private func updateParticles() {
        for i in particles.indices {
            particles[i].update()
        }
    }
}

struct Particle: Identifiable {
    let id = UUID()
    var position: CGPoint
    var velocity: CGPoint
    var color: Color
    var size: CGFloat
    var opacity: Double
    var life: Double
    
    init() {
        position = CGPoint(x: 200, y: 400)
        velocity = CGPoint(x: Double.random(in: -5...5), y: Double.random(in: -10...(-5)))
        color = [.red, .blue, .green, .yellow, .purple].randomElement()!
        size = CGFloat.random(in: 5...15)
        opacity = 1.0
        life = 1.0
    }
    
    mutating func update() {
        position.x += velocity.x
        position.y += velocity.y
        velocity.y += 0.5 // Gravity
        life -= 0.02
        opacity = life
    }
}

// MARK: - Custom Transition in SwiftUI
struct CustomTransition: ViewModifier {
    let isActive: Bool
    
    func body(content: Content) -> some View {
        content
            .scaleEffect(isActive ? 1.0 : 0.5)
            .opacity(isActive ? 1.0 : 0.0)
            .rotationEffect(.degrees(isActive ? 0 : 180))
            .animation(
                Animation.spring(response: 0.6, dampingFraction: 0.8, blendDuration: 0),
                value: isActive
            )
    }
}

// MARK: - Advanced Animation View
struct AdvancedAnimationView: View {
    @State private var isAnimating = false
    @State private var dragOffset = CGSize.zero
    @State private var rotation: Double = 0
    
    var body: some View {
        VStack(spacing: 30) {
            // Morphing Shape
            MorphingShape()
                .frame(height: 200)
            
            // Interactive Card
            RoundedRectangle(cornerRadius: 20)
                .fill(LinearGradient(
                    colors: [.blue, .purple],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ))
                .frame(width: 200, height: 150)
                .scaleEffect(isAnimating ? 1.1 : 1.0)
                .rotation3DEffect(
                    .degrees(rotation),
                    axis: (x: 0, y: 1, z: 0)
                )
                .offset(dragOffset)
                .gesture(
                    DragGesture()
                        .onChanged { value in
                            dragOffset = value.translation
                            rotation = Double(value.translation.x / 10)
                        }
                        .onEnded { _ in
                            withAnimation(.spring()) {
                                dragOffset = .zero
                                rotation = 0
                            }
                        }
                )
                .onTapGesture {
                    withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                        isAnimating.toggle()
                    }
                }
            
            // Particle System
            ParticleSystem()
                .frame(height: 200)
            
            // Animated Button
            Button("Animate") {
                withAnimation(.spring(response: 0.6, dampingFraction: 0.8)) {
                    isAnimating.toggle()
                }
            }
            .buttonStyle(AnimatedButtonStyle())
        }
        .padding()
    }
}

// MARK: - Custom Button Style
struct AnimatedButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
```

## 3. **Performance-Optimized Animations**

```swift
import UIKit
import QuartzCore

// MARK: - Animation Performance Monitor
class AnimationPerformanceMonitor {
    static let shared = AnimationPerformanceMonitor()
    
    private var displayLink: CADisplayLink?
    private var frameCount = 0
    private var lastFrameTime: CFTimeInterval = 0
    
    func startMonitoring() {
        displayLink = CADisplayLink(target: self, selector: #selector(displayLinkFired))
        displayLink?.add(to: .main, forMode: .common)
    }
    
    func stopMonitoring() {
        displayLink?.invalidate()
        displayLink = nil
    }
    
    @objc private func displayLinkFired() {
        frameCount += 1
        let currentTime = CACurrentMediaTime()
        
        if currentTime - lastFrameTime >= 1.0 {
            let fps = Double(frameCount) / (currentTime - lastFrameTime)
            print("Animation FPS: \(fps)")
            
            if fps < 55 {
                print("⚠️ Low animation performance detected")
            }
            
            frameCount = 0
            lastFrameTime = currentTime
        }
    }
}

// MARK: - Optimized Layer Animations
class OptimizedAnimationView: UIView {
    private let animatedLayer = CALayer()
    
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupLayer()
    }
    
    required init?(coder: NSCoder) {
        super.init(coder: coder)
        setupLayer()
    }
    
    private func setupLayer() {
        animatedLayer.backgroundColor = UIColor.blue.cgColor
        animatedLayer.cornerRadius = 25
        animatedLayer.frame = CGRect(x: 0, y: 0, width: 50, height: 50)
        
        // Optimize for animations
        animatedLayer.shouldRasterize = true
        animatedLayer.rasterizationScale = UIScreen.main.scale
        
        layer.addSublayer(animatedLayer)
    }
    
    func performOptimizedAnimation() {
        // Use CABasicAnimation for better performance
        let animation = CABasicAnimation(keyPath: "transform.scale")
        animation.fromValue = 1.0
        animation.toValue = 2.0
        animation.duration = 1.0
        animation.autoreverses = true
        animation.repeatCount = Float.infinity
        animation.timingFunction = CAMediaTimingFunction(name: .easeInEaseOut)
        
        animatedLayer.add(animation, forKey: "scaleAnimation")
    }
    
    func performComplexAnimation() {
        // Group multiple animations for better performance
        let scaleAnimation = CABasicAnimation(keyPath: "transform.scale")
        scaleAnimation.fromValue = 1.0
        scaleAnimation.toValue = 1.5
        
        let rotationAnimation = CABasicAnimation(keyPath: "transform.rotation.z")
        rotationAnimation.fromValue = 0
        rotationAnimation.toValue = Double.pi * 2
        
        let opacityAnimation = CABasicAnimation(keyPath: "opacity")
        opacityAnimation.fromValue = 1.0
        opacityAnimation.toValue = 0.5
        
        let group = CAAnimationGroup()
        group.animations = [scaleAnimation, rotationAnimation, opacityAnimation]
        group.duration = 2.0
        group.autoreverses = true
        group.repeatCount = Float.infinity
        
        animatedLayer.add(group, forKey: "complexAnimation")
    }
}

// MARK: - Custom Easing Functions
class CustomEasing {
    static func elasticEasing(t: Double) -> Double {
        let c4 = (2 * Double.pi) / 3
        return t == 0 ? 0 : t == 1 ? 1 : pow(2, -10 * t) * sin((t * 10 - 0.75) * c4) + 1
    }
    
    static func bounceEasing(t: Double) -> Double {
        if t < 1 / 2.75 {
            return 7.5625 * t * t
        } else if t < 2 / 2.75 {
            let t2 = t - 1.5 / 2.75
            return 7.5625 * t2 * t2 + 0.75
        } else if t < 2.5 / 2.75 {
            let t2 = t - 2.25 / 2.75
            return 7.5625 * t2 * t2 + 0.9375
        } else {
            let t2 = t - 2.625 / 2.75
            return 7.5625 * t2 * t2 + 0.984375
        }
    }
}

// MARK: - Custom Animation with Easing
extension UIView {
    func animateWithCustomEasing(duration: TimeInterval, easing: @escaping (Double) -> Double, animations: @escaping () -> Void, completion: ((Bool) -> Void)? = nil) {
        let animation = CABasicAnimation(keyPath: "transform")
        animation.duration = duration
        animation.timingFunction = CAMediaTimingFunction(controlPoints: 0.25, 0.1, 0.25, 1.0)
        
        CATransaction.begin()
        CATransaction.setAnimationDuration(duration)
        CATransaction.setCompletionBlock {
            completion?(true)
        }
        
        animations()
        
        CATransaction.commit()
    }
}
```

## 4. **Interactive Gesture-Based Animations**

```swift
import UIKit

// MARK: - Interactive Animation Controller
class InteractiveAnimationController: UIViewController {
    private let animatedView = UIView()
    private var animator: UIViewPropertyAnimator?
    private var progress: CGFloat = 0
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupAnimatedView()
        setupGestures()
    }
    
    private func setupAnimatedView() {
        animatedView.backgroundColor = .systemBlue
        animatedView.layer.cornerRadius = 25
        animatedView.translatesAutoresizingMaskIntoConstraints = false
        
        view.addSubview(animatedView)
        NSLayoutConstraint.activate([
            animatedView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            animatedView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            animatedView.widthAnchor.constraint(equalToConstant: 100),
            animatedView.heightAnchor.constraint(equalToConstant: 100)
        ])
    }
    
    private func setupGestures() {
        let panGesture = UIPanGestureRecognizer(target: self, action: #selector(handlePan(_:)))
        animatedView.addGestureRecognizer(panGesture)
        
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(handleTap(_:)))
        animatedView.addGestureRecognizer(tapGesture)
    }
    
    @objc private func handlePan(_ gesture: UIPanGestureRecognizer) {
        let translation = gesture.translation(in: view)
        let progress = translation.y / view.bounds.height
        
        switch gesture.state {
        case .began:
            startAnimation()
        case .changed:
            updateAnimation(progress: progress)
        case .ended, .cancelled:
            finishAnimation(shouldComplete: progress > 0.5)
        default:
            break
        }
    }
    
    @objc private func handleTap(_ gesture: UITapGestureRecognizer) {
        performSpringAnimation()
    }
    
    private func startAnimation() {
        animator = UIViewPropertyAnimator(duration: 1.0, curve: .easeInOut) {
            self.animatedView.transform = CGAffineTransform(scaleX: 2.0, y: 2.0)
            self.animatedView.backgroundColor = .systemRed
        }
    }
    
    private func updateAnimation(progress: CGFloat) {
        animator?.fractionComplete = progress
    }
    
    private func finishAnimation(shouldComplete: Bool) {
        if shouldComplete {
            animator?.continueAnimation(withTimingParameters: nil, durationFactor: 0)
        } else {
            animator?.isReversed = true
            animator?.continueAnimation(withTimingParameters: nil, durationFactor: 0)
        }
    }
    
    private func performSpringAnimation() {
        UIView.animate(withDuration: 0.6,
                      delay: 0,
                      usingSpringWithDamping: 0.5,
                      initialSpringVelocity: 0.5,
                      options: .allowUserInteraction) {
            self.animatedView.transform = CGAffineTransform(rotationAngle: .pi)
            self.animatedView.backgroundColor = [.systemBlue, .systemGreen, .systemPurple, .systemOrange].randomElement()!
        }
    }
}
```

## **Summary**

Advanced iOS animation techniques include:

1. **Custom Transitions**: Implement custom view controller transitions with interactive gestures
2. **SwiftUI Animations**: Create complex animations using SwiftUI's declarative syntax
3. **Performance Optimization**: Monitor and optimize animation performance
4. **Interactive Animations**: Build gesture-driven animations that respond to user input
5. **Custom Easing**: Implement custom easing functions for unique animation curves
6. **Particle Systems**: Create dynamic particle effects for engaging user experiences

By mastering these techniques, you can create iOS applications with smooth, engaging animations that enhance user experience and set your app apart from the competition. 