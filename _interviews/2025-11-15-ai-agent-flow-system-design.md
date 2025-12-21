---
title: "Design an AI Agent Flow System for Mobile Development"
description: "System design: Build an AI agent orchestration system for mid-scale mobile development teams. Integrate multiple AI services (Cursor, Claude API, OpenAI API, testing AI tools) without building internal UIs."
date: 2025-11-15
category: system-design
permalink: /interviews/ai-agent-flow-system-design/
tags:
  - System Design
  - AI/ML
  - Agent Orchestration
  - API Integration
  - Mobile Development
  - Cursor
  - Claude API
  - OpenAI API
difficulty: Medium-Hard
excerpt: "Design an AI agent flow system for a mid-scale mobile development team. Integrate multiple external AI services (Cursor, Claude API, OpenAI, testing AI tools) to automate code review, testing, documentation, and architecture analysis without building custom UIs."
---

## 🎯 Problem Statement

Design an **AI agent orchestration system** for a mid-scale mobile development company (50-200 engineers) that:

- Integrates multiple external AI services (Cursor, Claude API, OpenAI API, testing AI tools)
- Automates development workflows (code review, testing, documentation, architecture analysis)
- Works with existing iOS/Android codebases
- Doesn't require building custom UIs—uses existing tools and APIs
- Handles failures gracefully and provides fallback mechanisms
- Scales to support multiple teams and projects

**Constraints:**
- **Team Size**: 50-200 mobile engineers
- **Codebase**: Multiple iOS/Android apps (5-10 projects)
- **Budget**: Mid-scale (can't build custom AI infrastructure)
- **Requirements**: Must integrate with existing CI/CD, code review tools (GitHub/GitLab)
- **Latency**: Agent responses should complete within 2-5 minutes for most tasks
- **Cost**: Optimize API costs across multiple providers

**Key Challenge**: Orchestrate different AI services from different companies (Anthropic, OpenAI, Cursor, testing AI vendors) into cohesive workflows without building internal infrastructure.

---

## 📐 STEP 1: High-Level Architecture

**In the interview, start by drawing this on the whiteboard:**

{% mermaid %}
flowchart TB;
    subgraph DEV["📱 Mobile Development Workflow"];
        DEVELOPER["Developer<br/>Cursor IDE"];
        GITHUB["GitHub PR<br/>Code Review"];
        CICD["CI/CD<br/>Automation"];
        DEVELOPER --> GITHUB;
        GITHUB --> CICD;
    end;
    
    subgraph ORCH["🤖 AI Agent Orchestration Layer"];
        COORD["Agent Flow Coordinator<br/>Workflow, Routing, Error Handling"];
        CODE_AGENT["Code Review Agent"];
        TEST_AGENT["Test Generation Agent"];
        ARCH_AGENT["Architecture Agent"];
        COORD --> CODE_AGENT;
        COORD --> TEST_AGENT;
        COORD --> ARCH_AGENT;
    end;
    
    subgraph AI_SERVICES["🔌 AI Service Integration Layer"];
        CLAUDE["Claude API"];
        OPENAI["OpenAI API"];
        CURSOR["Cursor API"];
        TEST_AI["Testing AI"];
        DOC_AI["Doc Gen AI"];
        SEC_AI["Security AI"];
        GATEWAY["API Gateway<br/>Rate Limiter, Cost Tracker"];
        CLAUDE --> GATEWAY;
        OPENAI --> GATEWAY;
        CURSOR --> GATEWAY;
        TEST_AI --> GATEWAY;
        DOC_AI --> GATEWAY;
        SEC_AI --> GATEWAY;
    end;
    
    subgraph OUTPUT["📤 Result Storage & Notification"];
        GITHUB_COMMENT["GitHub Comments"];
        SLACK["Slack Notifications"];
        DB["Database Results"];
    end;
    
    CICD --> COORD;
    CODE_AGENT --> GATEWAY;
    TEST_AGENT --> GATEWAY;
    ARCH_AGENT --> GATEWAY;
    GATEWAY --> GITHUB_COMMENT;
    GATEWAY --> SLACK;
    GATEWAY --> DB;
    
    style DEV fill:#fff9e6;
    style ORCH fill:#e6f3ff;
    style AI_SERVICES fill:#ffe6f3;
    style OUTPUT fill:#e6ffe6;
{% endmermaid %}

**💬 What to say while drawing:**

> "I'll design a three-layer architecture. At the top, we have the development workflow (developers using Cursor, GitHub PRs, CI/CD). The middle layer is our AI agent orchestration system that coordinates different specialized agents. The bottom layer integrates with multiple external AI services via APIs. Results flow back to GitHub comments, Slack notifications, and our database for tracking."

---

## 🔑 Key Architecture Decisions

### **1. Agent-Based Architecture vs Monolithic Service**

**Choice: Agent-Based Architecture**

**Why:**
- ✅ **Modularity**: Each agent handles a specific task (code review, testing, docs)
- ✅ **Scalability**: Can add new agents without affecting existing ones
- ✅ **Fault Isolation**: If one AI service fails, others continue working
- ✅ **Cost Optimization**: Route tasks to most cost-effective service
- ✅ **Flexibility**: Easy to swap AI providers (Claude → OpenAI)

**Structure:**
```swift
// Agent Protocol
protocol AIAgent {
    var name: String { get }
    var supportedTasks: [TaskType] { get }
    var aiService: AIServiceProvider { get }
    
    func execute(task: AgentTask) async throws -> AgentResult
    func estimateCost(task: AgentTask) -> CostEstimate
}

// Example Agents
class CodeReviewAgent: AIAgent { }
class TestGenerationAgent: AIAgent { }
class DocumentationAgent: AIAgent { }
class ArchitectureReviewAgent: AIAgent { }
```

---

### **2. Workflow Definition: YAML vs Code vs Database**

**Choice: YAML Configuration Files**

**Why:**
- ✅ **Version Control**: Workflows tracked in git
- ✅ **Easy to Modify**: Non-engineers can update workflows
- ✅ **No Deployment**: Changes take effect immediately
- ✅ **Readable**: Clear workflow definitions

**Example Workflow:**
```yaml
# workflows/code-review.yml
name: Automated Code Review
trigger:
  event: pull_request
  conditions:
    - files_changed: ["*.swift", "*.m", "*.h"]
    - lines_changed: "> 100"

agents:
  - name: code-review-agent
    type: CodeReviewAgent
    service: claude-api  # or openai-api
    config:
      model: claude-3-opus
      max_tokens: 4000
      temperature: 0.3
    tasks:
      - analyze_code_quality
      - check_security_issues
      - suggest_improvements
      - verify_best_practices

  - name: test-coverage-agent
    type: TestGenerationAgent
    service: openai-api
    config:
      model: gpt-4-turbo
      focus: unit_tests
    tasks:
      - generate_missing_tests
      - suggest_test_cases

fallback:
  - if: claude-api.fails
    use: openai-api
  - if: openai-api.fails
    notify: slack-channel
    continue: false

output:
  - github_comment: true
  - slack_notification: true
  - database_log: true
```

---

### **3. API Integration Strategy: Direct vs Proxy**

**Choice: API Gateway with Proxy Layer**

**Why:**
- ✅ **Centralized Rate Limiting**: Prevent hitting API limits
- ✅ **Cost Tracking**: Monitor usage across all services
- ✅ **Fallback Logic**: Automatic failover between providers
- ✅ **Request Optimization**: Batch requests, cache responses
- ✅ **Security**: API keys stored securely, not in client code

**Implementation:**
```swift
class AIServiceGateway {
    private let rateLimiter: RateLimiter
    private let costTracker: CostTracker
    private let fallbackManager: FallbackManager
    
    func callService(
        _ service: AIService,
        request: AIRequest
    ) async throws -> AIResponse {
        // Check rate limits
        try await rateLimiter.checkLimit(for: service)
        
        // Estimate cost
        let cost = costTracker.estimate(request, service: service)
        guard costTracker.canAfford(cost) else {
            throw AIServiceError.budgetExceeded
        }
        
        // Make request with retry logic
        do {
            let response = try await service.execute(request)
            costTracker.record(cost, service: service)
            return response
        } catch {
            // Fallback to alternative service
            return try await fallbackManager.fallback(
                from: service,
                request: request
            )
        }
    }
}
```

---

### **4. Task Orchestration: Sequential vs Parallel**

**Choice: Hybrid Approach (Parallel where possible, Sequential when dependencies exist)**

**Why:**
- ✅ **Speed**: Parallel execution for independent tasks
- ✅ **Dependencies**: Sequential for tasks that depend on previous results
- ✅ **Cost Efficiency**: Run expensive tasks only when needed

**Example:**
```swift
class AgentFlowCoordinator {
    func executeWorkflow(_ workflow: Workflow) async throws {
        // Phase 1: Parallel execution (independent tasks)
        async let codeReview = codeReviewAgent.execute(task)
        async let securityScan = securityAgent.execute(task)
        async let lintCheck = lintAgent.execute(task)
        
        let phase1Results = try await [
            codeReview,
            securityScan,
            lintCheck
        ]
        
        // Phase 2: Sequential (depends on Phase 1)
        let testGeneration = try await testAgent.execute(
            task: task,
            context: phase1Results
        )
        
        // Phase 3: Aggregate and report
        let report = aggregateResults(phase1Results + [testGeneration])
        try await reportToGitHub(report)
    }
}
```

---

## 🏗️ Detailed Component Design

### **Component 1: Agent Flow Coordinator**

**Responsibilities:**
- Parse workflow definitions (YAML)
- Route tasks to appropriate agents
- Manage task dependencies
- Handle errors and retries
- Aggregate results

**Implementation:**
```swift
class AgentFlowCoordinator {
    private let workflowParser: WorkflowParser
    private let agentRegistry: AgentRegistry
    private let taskQueue: TaskQueue
    
    func processWorkflow(
        trigger: WorkflowTrigger,
        context: WorkflowContext
    ) async throws {
        // Load workflow definition
        let workflow = try workflowParser.parse(
            trigger: trigger
        )
        
        // Validate workflow
        try validateWorkflow(workflow)
        
        // Execute workflow phases
        for phase in workflow.phases {
            let results = try await executePhase(
                phase,
                context: context
            )
            context.addResults(results)
        }
        
        // Generate final report
        let report = generateReport(
            workflow: workflow,
            results: context.results
        )
        
        // Deliver results
        try await deliverResults(report, to: workflow.output)
    }
    
    private func executePhase(
        _ phase: WorkflowPhase,
        context: WorkflowContext
    ) async throws -> [AgentResult] {
        if phase.parallel {
            // Execute agents in parallel
            return try await withThrowingTaskGroup(
                of: AgentResult.self
            ) { group in
                for agentTask in phase.tasks {
                    group.addTask {
                        try await self.executeAgentTask(
                            agentTask,
                            context: context
                        )
                    }
                }
                return try await group.reduce([], +)
            }
        } else {
            // Execute sequentially
            var results: [AgentResult] = []
            for agentTask in phase.tasks {
                let result = try await executeAgentTask(
                    agentTask,
                    context: context
                )
                results.append(result)
                context.addResult(result)
            }
            return results
        }
    }
}
```

---

### **Component 2: AI Service Integration Layer**

**Responsibilities:**
- Abstract different AI service APIs
- Handle authentication
- Implement rate limiting
- Manage costs
- Provide fallback mechanisms

**Service Abstraction:**
```swift
protocol AIServiceProvider {
    var name: String { get }
    var supportedModels: [String] { get }
    var costPerToken: [String: Double] { get }
    var rateLimit: RateLimit { get }
    
    func generate(
        prompt: String,
        model: String,
        parameters: GenerationParameters
    ) async throws -> AIResponse
    
    func estimateCost(
        prompt: String,
        model: String
    ) -> CostEstimate
}

// Claude API Implementation
class ClaudeService: AIServiceProvider {
    let name = "Claude API"
    let supportedModels = ["claude-3-opus", "claude-3-sonnet", "claude-3-haiku"]
    
    private let apiKey: String
    private let httpClient: HTTPClient
    
    func generate(
        prompt: String,
        model: String,
        parameters: GenerationParameters
    ) async throws -> AIResponse {
        let request = ClaudeRequest(
            model: model,
            messages: [.user(prompt)],
            maxTokens: parameters.maxTokens,
            temperature: parameters.temperature
        )
        
        let response = try await httpClient.post(
            "https://api.anthropic.com/v1/messages",
            body: request,
            headers: [
                "x-api-key": apiKey,
                "anthropic-version": "2023-06-01"
            ]
        )
        
        return ClaudeResponseAdapter.adapt(response)
    }
}

// OpenAI API Implementation
class OpenAIService: AIServiceProvider {
    let name = "OpenAI API"
    let supportedModels = ["gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"]
    
    // Similar implementation...
}

// Cursor API Integration (if available)
class CursorService: AIServiceProvider {
    // Cursor-specific integration
    // May use their API or CLI tools
}
```

---

### **Component 3: Specialized Agents**

#### **Code Review Agent**

```swift
class CodeReviewAgent: AIAgent {
    let name = "CodeReviewAgent"
    let supportedTasks: [TaskType] = [.codeReview, .securityScan]
    
    private let aiService: AIServiceProvider
    private let codeAnalyzer: CodeAnalyzer
    
    func execute(task: AgentTask) async throws -> AgentResult {
        // Extract code from PR
        let codeChanges = try extractCodeChanges(from: task.context)
        
        // Build review prompt
        let prompt = buildReviewPrompt(
            code: codeChanges,
            context: task.context
        )
        
        // Call AI service
        let aiResponse = try await aiService.generate(
            prompt: prompt,
            model: "claude-3-opus",
            parameters: .init(
                maxTokens: 4000,
                temperature: 0.3
            )
        )
        
        // Parse and structure response
        let review = try parseReviewResponse(aiResponse)
        
        // Add code analysis insights
        let analysis = codeAnalyzer.analyze(codeChanges)
        review.addAnalysis(analysis)
        
        return AgentResult(
            agent: self,
            findings: review.findings,
            suggestions: review.suggestions,
            confidence: review.confidence
        )
    }
    
    private func buildReviewPrompt(
        code: CodeChanges,
        context: TaskContext
    ) -> String {
        return """
        You are an expert iOS engineer reviewing a pull request.
        
        Code Changes:
        \(code.diff)
        
        Context:
        - Files changed: \(code.files)
        - Lines changed: \(code.linesAdded) added, \(code.linesRemoved) removed
        - Related files: \(context.relatedFiles)
        
        Please review for:
        1. Code quality and best practices
        2. Potential bugs or edge cases
        3. Security vulnerabilities
        4. Performance issues
        5. Test coverage
        
        Provide specific, actionable feedback.
        """
    }
}
```

#### **Test Generation Agent**

```swift
class TestGenerationAgent: AIAgent {
    let name = "TestGenerationAgent"
    let supportedTasks: [TaskType] = [.testGeneration, .testReview]
    
    private let aiService: AIServiceProvider
    
    func execute(task: AgentTask) async throws -> AgentResult {
        let code = try extractCode(from: task.context)
        let existingTests = try findExistingTests(for: code)
        
        let prompt = """
        Generate comprehensive unit tests for this Swift code:
        
        \(code.source)
        
        Existing tests:
        \(existingTests)
        
        Focus on:
        1. Happy path scenarios
        2. Edge cases and error handling
        3. Boundary conditions
        4. Mocking dependencies
        
        Use XCTest framework.
        """
        
        let response = try await aiService.generate(
            prompt: prompt,
            model: "gpt-4-turbo",
            parameters: .init(maxTokens: 2000)
        )
        
        let tests = try parseTestCode(response)
        
        return AgentResult(
            agent: self,
            generatedTests: tests,
            coverageEstimate: calculateCoverage(tests, for: code)
        )
    }
}
```

#### **Architecture Review Agent**

```swift
class ArchitectureReviewAgent: AIAgent {
    let name = "ArchitectureReviewAgent"
    let supportedTasks: [TaskType] = [.architectureReview, .designPattern]
    
    func execute(task: AgentTask) async throws -> AgentResult {
        let codebaseStructure = try analyzeCodebaseStructure(
            from: task.context
        )
        
        let prompt = """
        Review the architecture of this iOS codebase:
        
        Structure:
        \(codebaseStructure)
        
        Check for:
        1. Separation of concerns (MVVM/MVC/VIPER)
        2. Dependency injection patterns
        3. Testability
        4. Scalability concerns
        5. Code organization
        
        Provide architectural recommendations.
        """
        
        // Use Claude for complex architectural analysis
        let response = try await aiService.generate(
            prompt: prompt,
            model: "claude-3-opus",
            parameters: .init(maxTokens: 3000)
        )
        
        return AgentResult(
            agent: self,
            architectureIssues: parseArchitectureIssues(response),
            recommendations: parseRecommendations(response)
        )
    }
}
```

---

## 🔄 Workflow Examples

### **Workflow 1: Automated PR Review**

**Trigger**: Pull request opened

**Flow:**

{% mermaid %}
flowchart LR
    TRIGGER["PR Opened"] --> COORD["Agent Flow<br/>Coordinator"]
    
    COORD --> PARALLEL["Parallel Execution"]
    
    PARALLEL --> CODE["Code Review Agent<br/>(Claude API)"]
    PARALLEL --> SEC["Security Agent<br/>(OpenAI API)"]
    PARALLEL --> TEST["Test Coverage Agent<br/>(Testing AI)"]
    PARALLEL --> DOC["Documentation Agent<br/>(Claude API)"]
    
    CODE --> AGG["Aggregate Results"]
    SEC --> AGG
    TEST --> AGG
    DOC --> AGG
    
    AGG --> OUTPUT["GitHub PR Comment<br/>with Feedback"]
{% endmermaid %}

**Parallel Execution**: All agents run simultaneously

**Output**: GitHub PR comment with aggregated feedback

```yaml
# workflows/pr-review.yml
name: PR Code Review
trigger:
  event: pull_request.opened

agents:
  - code-review-agent
  - security-agent
  - test-coverage-agent
  - documentation-agent

execution: parallel

output:
  github_comment: true
  format: markdown
```

---

### **Workflow 2: Test Generation Pipeline**

**Trigger**: PR with new features (no tests)

**Flow:**

{% mermaid %}
flowchart TD
    TRIGGER["PR with New Features<br/>(No Tests)"] --> PHASE1["Phase 1: Analysis"]
    
    PHASE1 --> ANALYSIS["Code Analysis Agent<br/>Identifies untested code"]
    
    ANALYSIS --> PHASE2["Phase 2: Generation"]
    PHASE2 --> GENERATE["Test Generation Agent<br/>(OpenAI GPT-4)<br/>Generates unit tests"]
    
    GENERATE --> PHASE3["Phase 3: Review"]
    PHASE3 --> REVIEW["Test Review Agent<br/>(Claude)<br/>Reviews generated tests"]
    
    REVIEW --> PHASE4["Phase 4: Execution"]
    PHASE4 --> RUN["Test Runner<br/>Executes tests in CI"]
    
    RUN --> OUTPUT["Generated Test Files<br/>+ PR Comment"]
    
    style PHASE1 fill:#e1f5ff
    style PHASE2 fill:#e1f5ff
    style PHASE3 fill:#e1f5ff
    style PHASE4 fill:#e1f5ff
{% endmermaid %}

**Sequential Execution**: Each step depends on previous

**Output**: Generated test files + PR comment

```yaml
# workflows/test-generation.yml
name: Auto Test Generation
trigger:
  event: pull_request
  conditions:
    - test_coverage: "< 80%"
    - files_changed: ["*.swift"]

phases:
  - name: analysis
    agents:
      - code-analysis-agent
    parallel: false
    
  - name: generation
    agents:
      - test-generation-agent
    depends_on: [analysis]
    
  - name: review
    agents:
      - test-review-agent
    depends_on: [generation]
    
  - name: execution
    agents:
      - test-runner
    depends_on: [review]

output:
  create_files: true
  github_comment: true
```

---

### **Workflow 3: Architecture Migration Analysis**

**Trigger**: Manual trigger or large refactor PR

**Flow:**

{% mermaid %}
flowchart TD
    TRIGGER["Manual Trigger<br/>or Large Refactor PR"] --> ARCH["Architecture Analysis<br/>Agent (Claude)<br/>Analyzes current architecture"]
    
    ARCH --> PLAN["Migration Planning<br/>Agent (OpenAI)<br/>Plans migration strategy"]
    
    PLAN --> IMPACT["Impact Analysis<br/>Agent (Claude)<br/>Analyzes impact"]
    
    IMPACT --> DOC["Documentation Agent<br/>Generates migration guide"]
    
    DOC --> OUTPUT["Architecture Decision<br/>Record (ADR)<br/>+ Migration Plan"]
    
    style ARCH fill:#fff4e1
    style PLAN fill:#fff4e1
    style IMPACT fill:#fff4e1
    style DOC fill:#fff4e1
{% endmermaid %}

**Output**: Architecture decision record (ADR) + migration plan

---

## 💰 Cost Optimization Strategies

### **1. Model Selection Based on Task Complexity**

```swift
class CostOptimizer {
    func selectModel(
        for task: AgentTask,
        budget: Budget
    ) -> String {
        switch task.complexity {
        case .simple:
            // Use cheaper model (Claude Haiku, GPT-3.5)
            return "claude-3-haiku"  // $0.25 per 1M tokens
            
        case .medium:
            // Use mid-tier model (Claude Sonnet, GPT-4)
            return "claude-3-sonnet"  // $3 per 1M tokens
            
        case .complex:
            // Use best model (Claude Opus, GPT-4 Turbo)
            return "claude-3-opus"    // $15 per 1M tokens
        }
    }
}
```

### **2. Request Batching**

```swift
class RequestBatcher {
    func batchRequests(
        _ requests: [AIRequest],
        maxBatchSize: Int = 10
    ) -> [[AIRequest]] {
        // Group similar requests
        // Send as single API call when possible
        // Reduces API overhead
    }
}
```

### **3. Response Caching**

```swift
class ResponseCache {
    func cacheKey(for request: AIRequest) -> String {
        // Hash of: prompt + model + parameters
        return SHA256.hash(request.prompt + request.model)
    }
    
    func getCached(
        _ request: AIRequest
    ) -> AIResponse? {
        let key = cacheKey(for: request)
        return cache[key]
    }
}
```

### **4. Cost Tracking and Budgets**

```swift
class CostTracker {
    struct Budget {
        let daily: Double
        let monthly: Double
        let perProject: [String: Double]
    }
    
    func canAfford(
        _ cost: Double,
        for project: String
    ) -> Bool {
        // Check daily, monthly, and project budgets
        return currentDailySpend + cost <= budget.daily &&
               currentMonthlySpend + cost <= budget.monthly &&
               projectSpend[project] + cost <= budget.perProject[project]
    }
    
    func record(
        _ cost: Double,
        service: AIServiceProvider,
        project: String
    ) {
        // Track spending
        // Alert if approaching limits
    }
}
```

---

## 🚨 Error Handling & Resilience

### **1. Fallback Strategy**

{% mermaid %}
flowchart TD
    REQUEST["AI Request"] --> PRIMARY["Try Claude API<br/>(Primary)"]
    
    PRIMARY -->|Success| SUCCESS["Return Response"]
    PRIMARY -->|Failure| FALLBACK1["Try OpenAI API<br/>(Fallback 1)"]
    
    FALLBACK1 -->|Success| SUCCESS
    FALLBACK1 -->|Failure| FALLBACK2["Try Alternative Service<br/>(Fallback 2)"]
    
    FALLBACK2 -->|Success| SUCCESS
    FALLBACK2 -->|Failure| ERROR["All Services Failed<br/>Throw Error"]
    
    style PRIMARY fill:#90EE90
    style FALLBACK1 fill:#FFE4B5
    style FALLBACK2 fill:#FFB6C1
    style SUCCESS fill:#87CEEB
    style ERROR fill:#FF6B6B
{% endmermaid %}

```swift
class FallbackManager {
    let fallbackChain: [AIServiceProvider] = [
        ClaudeService(),    // Primary
        OpenAIService(),   // Fallback 1
        // Could add more
    ]
    
    func executeWithFallback(
        _ request: AIRequest
    ) async throws -> AIResponse {
        var lastError: Error?
        
        for service in fallbackChain {
            do {
                return try await service.generate(
                    prompt: request.prompt,
                    model: request.model,
                    parameters: request.parameters
                )
            } catch {
                lastError = error
                logger.warn("Service \(service.name) failed: \(error)")
                continue
            }
        }
        
        throw AIServiceError.allServicesFailed(lastError!)
    }
}
```

### **2. Retry Logic**

```swift
class RetryHandler {
    func executeWithRetry<T>(
        maxAttempts: Int = 3,
        backoff: TimeInterval = 1.0,
        operation: () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...maxAttempts {
            do {
                return try await operation()
            } catch let error as AIServiceError {
                lastError = error
                
                if error.isRetryable {
                    let delay = backoff * Double(attempt)
                    try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                    continue
                } else {
                    throw error
                }
            }
        }
        
        throw lastError!
    }
}
```

### **3. Circuit Breaker Pattern**

{% mermaid %}
stateDiagram-v2
    [*] --> Closed: Initial State
    
    Closed --> Open: Failure Count >= Threshold
    Closed --> Closed: Success (Reset Counter)
    
    Open --> HalfOpen: Timeout Expired
    Open --> Open: Request Rejected
    
    HalfOpen --> Closed: Success (Service Recovered)
    HalfOpen --> Open: Failure (Service Still Down)
    
    note right of Closed
        Normal Operation
        Requests Allowed
    end note
    
    note right of Open
        Service Failing
        Requests Rejected
        Wait for Timeout
    end note
    
    note right of HalfOpen
        Testing Recovery
        Allow One Request
    end note
{% endmermaid %}

```swift
class CircuitBreaker {
    enum State {
        case closed    // Normal operation
        case open      // Failing, reject requests
        case halfOpen  // Testing if service recovered
    }
    
    private var state: State = .closed
    private var failureCount = 0
    private let failureThreshold = 5
    private let timeout: TimeInterval = 60
    
    func execute<T>(
        _ operation: () async throws -> T
    ) async throws -> T {
        switch state {
        case .open:
            if shouldAttemptReset() {
                state = .halfOpen
            } else {
                throw CircuitBreakerError.open
            }
            
        case .halfOpen, .closed:
            break
        }
        
        do {
            let result = try await operation()
            onSuccess()
            return result
        } catch {
            onFailure()
            throw error
        }
    }
    
    private func onSuccess() {
        failureCount = 0
        state = .closed
    }
    
    private func onFailure() {
        failureCount += 1
        if failureCount >= failureThreshold {
            state = .open
        }
    }
}
```

---

## 📊 Scaling Considerations

### **For 50-200 Engineers:**

| Component | Scale | Solution |
|-----------|-------|----------|
| **API Requests/Day** | 10K-50K | Rate limiting, request queuing |
| **Concurrent Workflows** | 50-200 | Task queue (Redis/RabbitMQ) |
| **Storage** | 100GB-1TB | Database for results, S3 for artifacts |
| **Cost/Month** | $500-$5K | Cost optimization, budget alerts |

### **Infrastructure:**

```yaml
# Infrastructure (Mid-scale)
services:
  - agent-orchestrator:
      instances: 3-5
      resources: 2 CPU, 4GB RAM
      
  - api-gateway:
      instances: 2-3
      resources: 1 CPU, 2GB RAM
      
  - task-queue:
      type: Redis
      instances: 1 (cluster)
      
  - database:
      type: PostgreSQL
      size: 100GB-1TB
      
  - monitoring:
      type: Prometheus + Grafana
```

---

## 🔐 Security Considerations

### **1. API Key Management**

```swift
class APIKeyManager {
    // Store keys in secure vault (AWS Secrets Manager, HashiCorp Vault)
    func getAPIKey(for service: AIServiceProvider) async throws -> String {
        return try await secretsManager.getSecret(
            name: "ai-service-\(service.name)-api-key"
        )
    }
}
```

### **2. Code Sanitization**

```swift
class CodeSanitizer {
    func sanitize(_ code: String) -> String {
        // Remove sensitive data before sending to AI
        return code
            .removingAPIKeys()
            .removingSecrets()
            .removingPersonalInfo()
    }
}
```

### **3. Access Control**

```swift
class AccessController {
    func canAccessWorkflow(
        _ workflow: Workflow,
        user: User
    ) -> Bool {
        // Check user permissions
        // Verify project access
        // Validate workflow access
        return user.hasPermission(.executeWorkflow) &&
               user.hasProjectAccess(workflow.project)
    }
}
```

---

## 📈 Monitoring & Observability

### **Key Metrics:**

- **Workflow Execution Time**: P50, P95, P99
- **API Success Rate**: Per service
- **Cost per Workflow**: Track spending
- **Agent Performance**: Accuracy, usefulness
- **Error Rates**: By agent, by service

### **Dashboards:**

```swift
struct Metrics {
    // Workflow metrics
    var workflowsExecuted: Int
    var averageExecutionTime: TimeInterval
    var successRate: Double
    
    // Cost metrics
    var dailySpend: Double
    var costPerWorkflow: Double
    var costByService: [String: Double]
    
    // Quality metrics
    var agentAccuracy: [String: Double]
    var userSatisfaction: Double
}
```

---

## 🎯 Interview Discussion Points

### **What Interviewers Look For:**

1. **System Thinking**: Can you design a system that integrates multiple services?
2. **Cost Awareness**: Do you consider budget constraints?
3. **Error Handling**: How do you handle failures gracefully?
4. **Scalability**: Can the system grow with the team?
5. **Security**: How do you protect API keys and sensitive data?
6. **Trade-offs**: What are the pros/cons of different approaches?

### **Key Points to Emphasize:**

- ✅ **Leveraging External Services**: Don't rebuild what exists
- ✅ **Orchestration Layer**: Coordinate multiple services effectively
- ✅ **Cost Optimization**: Smart model selection, caching, batching
- ✅ **Resilience**: Fallbacks, retries, circuit breakers
- ✅ **Mid-Scale Focus**: Appropriate complexity for team size

---

## 🎓 Conclusion

This design shows how to build an AI agent orchestration system for a mid-scale mobile development team by:

1. **Integrating Multiple Services**: Claude, OpenAI, Cursor, testing AI tools
2. **Agent-Based Architecture**: Modular, scalable, fault-tolerant
3. **Workflow-Driven**: YAML configurations, easy to modify
4. **Cost-Conscious**: Smart model selection, caching, budgeting
5. **Resilient**: Fallbacks, retries, circuit breakers
6. **No Custom UIs**: Uses existing tools (GitHub, Slack, APIs)

**Key Takeaway**: For mid-scale companies, the value is in **orchestration and integration**, not building AI infrastructure from scratch. Focus on connecting existing services effectively.

---

*This design is appropriate for companies with 50-200 engineers who want to leverage AI tools without building custom infrastructure. It balances functionality, cost, and complexity for mid-scale operations.*

