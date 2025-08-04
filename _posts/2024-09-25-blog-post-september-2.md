---
title: 'iOS Machine Learning: Core ML and Vision Framework Integration'
date: 2024-09-25
permalink: /posts/2024/09/blog-post-september-2/
tags:
  - iOS
  - Machine Learning
  - Core ML
  - Vision
  - AI
---

Machine learning has become an integral part of modern iOS applications. Core ML and Vision frameworks provide powerful tools for integrating AI capabilities into your apps. Let's explore practical implementations with real, working code examples.

## 1. **Core ML Model Integration**

```swift
import CoreML
import Vision
import UIKit

// MARK: - Core ML Manager
class CoreMLManager {
    private var model: MLModel?
    private var visionModel: VNCoreMLModel?
    
    enum ModelType {
        case imageClassification
        case objectDetection
        case textRecognition
        case faceDetection
    }
    
    init(modelType: ModelType) {
        setupModel(for: modelType)
    }
    
    private func setupModel(for type: ModelType) {
        switch type {
        case .imageClassification:
            setupImageClassificationModel()
        case .objectDetection:
            setupObjectDetectionModel()
        case .textRecognition:
            setupTextRecognitionModel()
        case .faceDetection:
            setupFaceDetectionModel()
        }
    }
    
    private func setupImageClassificationModel() {
        // Load a pre-trained image classification model
        guard let modelURL = Bundle.main.url(forResource: "ImageClassifier", withExtension: "mlmodelc"),
              let loadedModel = try? MLModel(contentsOf: modelURL) else {
            print("Failed to load image classification model")
            return
        }
        
        self.model = loadedModel
        
        do {
            self.visionModel = try VNCoreMLModel(for: loadedModel)
        } catch {
            print("Failed to create Vision model: \(error)")
        }
    }
    
    private func setupObjectDetectionModel() {
        // Setup object detection model
        guard let modelURL = Bundle.main.url(forResource: "ObjectDetector", withExtension: "mlmodelc"),
              let loadedModel = try? MLModel(contentsOf: modelURL) else {
            print("Failed to load object detection model")
            return
        }
        
        self.model = loadedModel
        
        do {
            self.visionModel = try VNCoreMLModel(for: loadedModel)
        } catch {
            print("Failed to create Vision model: \(error)")
        }
    }
    
    private func setupTextRecognitionModel() {
        // Text recognition uses built-in Vision framework
        // No additional model setup needed
    }
    
    private func setupFaceDetectionModel() {
        // Face detection uses built-in Vision framework
        // No additional model setup needed
    }
}

// MARK: - Image Classification
class ImageClassifier {
    private let coreMLManager: CoreMLManager
    
    init() {
        self.coreMLManager = CoreMLManager(modelType: .imageClassification)
    }
    
    func classifyImage(_ image: UIImage, completion: @escaping ([VNClassificationObservation]?) -> Void) {
        guard let cgImage = image.cgImage,
              let visionModel = coreMLManager.visionModel else {
            completion(nil)
            return
        }
        
        let request = VNCoreMLRequest(model: visionModel) { request, error in
            if let error = error {
                print("Classification error: \(error)")
                completion(nil)
                return
            }
            
            guard let results = request.results as? [VNClassificationObservation] else {
                completion(nil)
                return
            }
            
            completion(results)
        }
        
        request.imageCropAndScaleOption = .centerCrop
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                print("Failed to perform classification: \(error)")
                DispatchQueue.main.async {
                    completion(nil)
                }
            }
        }
    }
}

// MARK: - Object Detection
class ObjectDetector {
    private let coreMLManager: CoreMLManager
    
    init() {
        self.coreMLManager = CoreMLManager(modelType: .objectDetection)
    }
    
    func detectObjects(in image: UIImage, completion: @escaping ([VNRecognizedObjectObservation]?) -> Void) {
        guard let cgImage = image.cgImage,
              let visionModel = coreMLManager.visionModel else {
            completion(nil)
            return
        }
        
        let request = VNCoreMLRequest(model: visionModel) { request, error in
            if let error = error {
                print("Object detection error: \(error)")
                completion(nil)
                return
            }
            
            guard let results = request.results as? [VNRecognizedObjectObservation] else {
                completion(nil)
                return
            }
            
            completion(results)
        }
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                print("Failed to perform object detection: \(error)")
                DispatchQueue.main.async {
                    completion(nil)
                }
            }
        }
    }
}
```

## 2. **Text Recognition with Vision Framework**

```swift
// MARK: - Text Recognition
class TextRecognizer {
    func recognizeText(in image: UIImage, completion: @escaping ([VNRecognizedTextObservation]?) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(nil)
            return
        }
        
        let request = VNRecognizeTextRequest { request, error in
            if let error = error {
                print("Text recognition error: \(error)")
                completion(nil)
                return
            }
            
            guard let results = request.results as? [VNRecognizedTextObservation] else {
                completion(nil)
                return
            }
            
            completion(results)
        }
        
        // Configure recognition level
        request.recognitionLevel = .accurate
        request.usesLanguageCorrection = true
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                print("Failed to perform text recognition: \(error)")
                DispatchQueue.main.async {
                    completion(nil)
                }
            }
        }
    }
    
    func extractText(from observations: [VNRecognizedTextObservation]) -> [String] {
        return observations.compactMap { observation in
            observation.topCandidates(1).first?.string
        }
    }
}

// MARK: - Face Detection
class FaceDetector {
    func detectFaces(in image: UIImage, completion: @escaping ([VNFaceObservation]?) -> Void) {
        guard let cgImage = image.cgImage else {
            completion(nil)
            return
        }
        
        let request = VNDetectFaceLandmarksRequest { request, error in
            if let error = error {
                print("Face detection error: \(error)")
                completion(nil)
                return
            }
            
            guard let results = request.results as? [VNFaceObservation] else {
                completion(nil)
                return
            }
            
            completion(results)
        }
        
        let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
        
        DispatchQueue.global(qos: .userInitiated).async {
            do {
                try handler.perform([request])
            } catch {
                print("Failed to perform face detection: \(error)")
                DispatchQueue.main.async {
                    completion(nil)
                }
            }
        }
    }
    
    func getFaceAttributes(from observation: VNFaceObservation) -> FaceAttributes {
        var attributes = FaceAttributes()
        
        if let landmarks = observation.landmarks {
            attributes.hasLeftEye = landmarks.leftEye != nil
            attributes.hasRightEye = landmarks.rightEye != nil
            attributes.hasNose = landmarks.nose != nil
            attributes.hasMouth = landmarks.outerLips != nil
        }
        
        return attributes
    }
}

struct FaceAttributes {
    var hasLeftEye: Bool = false
    var hasRightEye: Bool = false
    var hasNose: Bool = false
    var hasMouth: Bool = false
}
```

## 3. **Custom ML Model Training and Integration**

```swift
// MARK: - Custom Model Training
class CustomModelTrainer {
    private var trainingData: [MLDataTable] = []
    
    func addTrainingData(features: [String: MLFeatureValue], label: String) {
        var featureDict = features
        featureDict["label"] = MLFeatureValue(string: label)
        
        if let dataTable = try? MLDataTable(dictionary: featureDict) {
            trainingData.append(dataTable)
        }
    }
    
    func trainModel(completion: @escaping (MLModel?) -> Void) {
        guard !trainingData.isEmpty else {
            completion(nil)
            return
        }
        
        // Combine all training data
        let combinedData = trainingData.reduce(MLDataTable(), +)
        
        // Configure model parameters
        let parameters = MLBoostedTreeRegressor.ModelParameters(
            maxDepth: 10,
            maxIterations: 100,
            minLossReduction: 0.0,
            minDataPoints: 10,
            maxMemoryInMB: 512
        )
        
        // Train the model
        do {
            let model = try MLBoostedTreeRegressor(
                trainingData: combinedData,
                targetColumn: "label",
                parameters: parameters
            )
            
            completion(model.model)
        } catch {
            print("Training failed: \(error)")
            completion(nil)
        }
    }
}

// MARK: - Model Prediction
class CustomModelPredictor {
    private var model: MLModel?
    
    func loadModel(from url: URL) {
        do {
            model = try MLModel(contentsOf: url)
        } catch {
            print("Failed to load model: \(error)")
        }
    }
    
    func predict(features: [String: MLFeatureValue]) -> MLFeatureValue? {
        guard let model = model else { return nil }
        
        do {
            let prediction = try model.prediction(from: MLFeatureProvider(features: features))
            return prediction.featureValue(for: "prediction")
        } catch {
            print("Prediction failed: \(error)")
            return nil
        }
    }
}

// MARK: - Feature Provider
class MLFeatureProvider: NSObject, MLFeatureProvider {
    private let features: [String: MLFeatureValue]
    
    init(features: [String: MLFeatureValue]) {
        self.features = features
        super.init()
    }
    
    var featureNames: Set<String> {
        return Set(features.keys)
    }
    
    func featureValue(for featureName: String) -> MLFeatureValue? {
        return features[featureName]
    }
}
```

## 4. **SwiftUI Integration for ML Features**

```swift
import SwiftUI

// MARK: - ML Camera View
struct MLCameraView: View {
    @StateObject private var cameraManager = CameraManager()
    @StateObject private var imageClassifier = ImageClassifier()
    @StateObject private var objectDetector = ObjectDetector()
    @StateObject private var textRecognizer = TextRecognizer()
    @StateObject private var faceDetector = FaceDetector()
    
    @State private var classificationResults: [VNClassificationObservation] = []
    @State private var detectedObjects: [VNRecognizedObjectObservation] = []
    @State private var recognizedText: [String] = []
    @State private var detectedFaces: [VNFaceObservation] = []
    @State private var selectedMode: MLMode = .classification
    
    enum MLMode: String, CaseIterable {
        case classification = "Classification"
        case objectDetection = "Object Detection"
        case textRecognition = "Text Recognition"
        case faceDetection = "Face Detection"
    }
    
    var body: some View {
        VStack {
            // Camera preview
            CameraPreviewView(session: cameraManager.session)
                .frame(height: 300)
                .overlay(
                    // Overlay for detection results
                    DetectionOverlayView(
                        mode: selectedMode,
                        classificationResults: classificationResults,
                        detectedObjects: detectedObjects,
                        detectedFaces: detectedFaces
                    )
                )
            
            // Mode selector
            Picker("Mode", selection: $selectedMode) {
                ForEach(MLMode.allCases, id: \.self) { mode in
                    Text(mode.rawValue).tag(mode)
                }
            }
            .pickerStyle(SegmentedPickerStyle())
            .padding()
            
            // Results view
            ResultsView(
                mode: selectedMode,
                classificationResults: classificationResults,
                detectedObjects: detectedObjects,
                recognizedText: recognizedText,
                detectedFaces: detectedFaces
            )
            
            // Capture button
            Button("Capture") {
                captureAndAnalyze()
            }
            .padding()
            .background(Color.blue)
            .foregroundColor(.white)
            .cornerRadius(10)
        }
        .onAppear {
            cameraManager.startSession()
        }
        .onDisappear {
            cameraManager.stopSession()
        }
    }
    
    private func captureAndAnalyze() {
        cameraManager.capturePhoto { image in
            guard let image = image else { return }
            
            switch selectedMode {
            case .classification:
                imageClassifier.classifyImage(image) { results in
                    DispatchQueue.main.async {
                        self.classificationResults = results ?? []
                    }
                }
            case .objectDetection:
                objectDetector.detectObjects(in: image) { results in
                    DispatchQueue.main.async {
                        self.detectedObjects = results ?? []
                    }
                }
            case .textRecognition:
                textRecognizer.recognizeText(in: image) { results in
                    DispatchQueue.main.async {
                        if let observations = results {
                            self.recognizedText = self.textRecognizer.extractText(from: observations)
                        }
                    }
                }
            case .faceDetection:
                faceDetector.detectFaces(in: image) { results in
                    DispatchQueue.main.async {
                        self.detectedFaces = results ?? []
                    }
                }
            }
        }
    }
}

// MARK: - Camera Manager
class CameraManager: NSObject, ObservableObject {
    @Published var session = AVCaptureSession()
    private let photoOutput = AVCapturePhotoOutput()
    private var completionHandler: ((UIImage?) -> Void)?
    
    override init() {
        super.init()
        setupCamera()
    }
    
    private func setupCamera() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device) else {
            return
        }
        
        session.addInput(input)
        session.addOutput(photoOutput)
    }
    
    func startSession() {
        DispatchQueue.global(qos: .userInitiated).async {
            self.session.startRunning()
        }
    }
    
    func stopSession() {
        session.stopRunning()
    }
    
    func capturePhoto(completion: @escaping (UIImage?) -> Void) {
        completionHandler = completion
        
        let settings = AVCapturePhotoSettings()
        photoOutput.capturePhoto(with: settings, delegate: self)
    }
}

extension CameraManager: AVCapturePhotoCaptureDelegate {
    func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
        guard let imageData = photo.fileDataRepresentation(),
              let image = UIImage(data: imageData) else {
            completionHandler?(nil)
            return
        }
        
        completionHandler?(image)
    }
}

// MARK: - Supporting Views
struct CameraPreviewView: UIViewRepresentable {
    let session: AVCaptureSession
    
    func makeUIView(context: Context) -> UIView {
        let view = UIView()
        let previewLayer = AVCaptureVideoPreviewLayer(session: session)
        previewLayer.frame = view.bounds
        previewLayer.videoGravity = .resizeAspectFill
        view.layer.addSublayer(previewLayer)
        return view
    }
    
    func updateUIView(_ uiView: UIView, context: Context) {
        if let previewLayer = uiView.layer.sublayers?.first as? AVCaptureVideoPreviewLayer {
            previewLayer.frame = uiView.bounds
        }
    }
}

struct DetectionOverlayView: View {
    let mode: MLCameraView.MLMode
    let classificationResults: [VNClassificationObservation]
    let detectedObjects: [VNRecognizedObjectObservation]
    let detectedFaces: [VNFaceObservation]
    
    var body: some View {
        GeometryReader { geometry in
            ZStack {
                // Draw bounding boxes for detected objects
                ForEach(detectedObjects.indices, id: \.self) { index in
                    let observation = detectedObjects[index]
                    let rect = observation.boundingBox
                    
                    Rectangle()
                        .stroke(Color.red, lineWidth: 2)
                        .frame(
                            width: rect.width * geometry.size.width,
                            height: rect.height * geometry.size.height
                        )
                        .position(
                            x: rect.midX * geometry.size.width,
                            y: (1 - rect.midY) * geometry.size.height
                        )
                }
                
                // Draw face detection boxes
                ForEach(detectedFaces.indices, id: \.self) { index in
                    let observation = detectedFaces[index]
                    let rect = observation.boundingBox
                    
                    Rectangle()
                        .stroke(Color.green, lineWidth: 2)
                        .frame(
                            width: rect.width * geometry.size.width,
                            height: rect.height * geometry.size.height
                        )
                        .position(
                            x: rect.midX * geometry.size.width,
                            y: (1 - rect.midY) * geometry.size.height
                        )
                }
            }
        }
    }
}

struct ResultsView: View {
    let mode: MLCameraView.MLMode
    let classificationResults: [VNClassificationObservation]
    let detectedObjects: [VNRecognizedObjectObservation]
    let recognizedText: [String]
    let detectedFaces: [VNFaceObservation]
    
    var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Results")
                .font(.headline)
            
            switch mode {
            case .classification:
                ForEach(classificationResults.prefix(5), id: \.identifier) { result in
                    HStack {
                        Text(result.identifier)
                        Spacer()
                        Text("\(Int(result.confidence * 100))%")
                    }
                }
            case .objectDetection:
                ForEach(detectedObjects.prefix(5), id: \.uuid) { object in
                    Text("Object detected with confidence: \(Int(object.confidence * 100))%")
                }
            case .textRecognition:
                ForEach(recognizedText, id: \.self) { text in
                    Text(text)
                }
            case .faceDetection:
                Text("\(detectedFaces.count) faces detected")
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(10)
        .padding(.horizontal)
    }
}
```

## **Summary**

Integrating machine learning into iOS apps provides powerful capabilities:

1. **Core ML Integration**: Load and use pre-trained models for various tasks
2. **Vision Framework**: Leverage built-in computer vision capabilities
3. **Custom Model Training**: Create and train custom models for specific needs
4. **Real-time Processing**: Process camera input in real-time with ML
5. **SwiftUI Integration**: Seamlessly integrate ML features into modern UI

By mastering these techniques, you can create intelligent iOS applications that leverage the power of machine learning. 