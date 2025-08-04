---
title: 'iOS App Architecture: MVVM with Combine and SwiftUI'
date: 2024-08-05
permalink: /posts/2024/08/blog-post-august-1/
tags:
  - iOS
  - Architecture
  - MVVM
  - Combine
  - SwiftUI
  - Design Patterns
---

Modern iOS development requires robust, scalable architecture patterns that can handle complex business logic while maintaining clean, testable code. MVVM (Model-View-ViewModel) combined with Combine and SwiftUI provides a powerful foundation for building maintainable iOS applications. In this comprehensive guide, we'll explore advanced MVVM patterns with real, working code examples that demonstrate best practices for iOS app architecture.

## 1. **Core MVVM Architecture Foundation**

A well-structured MVVM architecture separates concerns and promotes testability. Let's build a robust foundation.

### **Base Architecture Components**

```swift
import Foundation
import Combine
import SwiftUI

// MARK: - Base Protocols
protocol ViewModelProtocol: ObservableObject {
    associatedtype State
    var state: State { get set }
}

protocol CoordinatorProtocol: AnyObject {
    func start()
    func coordinate(to destination: CoordinatorDestination)
}

enum CoordinatorDestination {
    case detail(id: UUID)
    case settings
    case profile(userId: UUID)
    case createPost
}

// MARK: - Base State Management
class BaseViewModel: ObservableObject {
    var cancellables = Set<AnyCancellable>()
    
    deinit {
        cancellables.removeAll()
    }
    
    func bind<T>(_ publisher: AnyPublisher<T, Never>, to keyPath: WritableKeyPath<Self, T>) {
        publisher
            .receive(on: DispatchQueue.main)
            .assign(to: keyPath, on: self)
            .store(in: &cancellables)
    }
}

// MARK: - Error Handling
enum AppError: Error, LocalizedError {
    case networkError(String)
    case validationError(String)
    case businessError(String)
    case unknown
    
    var errorDescription: String? {
        switch self {
        case .networkError(let message):
            return "Network Error: \(message)"
        case .validationError(let message):
            return "Validation Error: \(message)"
        case .businessError(let message):
            return "Business Error: \(message)"
        case .unknown:
            return "An unknown error occurred"
        }
    }
}

// MARK: - Loading State
enum LoadingState {
    case idle
    case loading
    case loaded
    case error(AppError)
    
    var isLoading: Bool {
        if case .loading = self {
            return true
        }
        return false
    }
    
    var error: AppError? {
        if case .error(let error) = self {
            return error
        }
        return nil
    }
}
```

### **Advanced State Management with Combine**

```swift
// MARK: - State Container
class StateContainer<State>: ObservableObject {
    @Published private(set) var state: State
    
    init(initialState: State) {
        self.state = initialState
    }
    
    func update(_ update: (inout State) -> Void) {
        update(&state)
    }
    
    func update<T>(_ keyPath: WritableKeyPath<State, T>, to value: T) {
        state[keyPath: keyPath] = value
    }
}

// MARK: - Action Protocol
protocol Action {}

// MARK: - Reducer Protocol
protocol Reducer {
    associatedtype State
    associatedtype Action
    
    func reduce(state: inout State, action: Action)
}

// MARK: - Store Implementation
class Store<State, Action>: ObservableObject {
    @Published private(set) var state: State
    private let reducer: any Reducer
    private let queue = DispatchQueue(label: "store.queue", qos: .userInitiated)
    
    init(initialState: State, reducer: any Reducer) {
        self.state = initialState
        self.reducer = reducer
    }
    
    func dispatch(_ action: Action) {
        queue.async { [weak self] in
            guard let self = self else { return }
            self.reducer.reduce(state: &self.state, action: action)
            
            DispatchQueue.main.async {
                self.objectWillChange.send()
            }
        }
    }
}
```

## 2. **User Management with MVVM**

Let's implement a complete user management system using MVVM patterns.

### **User Models and State**

```swift
// MARK: - User Models
struct User: Codable, Identifiable, Equatable {
    let id: UUID
    let email: String
    let name: String
    let avatar: URL?
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, email, name, avatar
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct UserProfile: Codable, Identifiable {
    let id: UUID
    let user: User
    let bio: String?
    let location: String?
    let website: URL?
    let followersCount: Int
    let followingCount: Int
    let postsCount: Int
    
    enum CodingKeys: String, CodingKey {
        case id, user, bio, location, website
        case followersCount = "followers_count"
        case followingCount = "following_count"
        case postsCount = "posts_count"
    }
}

// MARK: - User State
struct UserState {
    var currentUser: User?
    var userProfile: UserProfile?
    var users: [User] = []
    var loadingState: LoadingState = .idle
    var searchQuery: String = ""
    var selectedUser: User?
}

// MARK: - User Actions
enum UserAction: Action {
    case loadCurrentUser
    case loadUserProfile(userId: UUID)
    case searchUsers(query: String)
    case selectUser(User)
    case updateProfile(UserProfile)
    case logout
    case error(AppError)
}

// MARK: - User Reducer
class UserReducer: Reducer {
    typealias State = UserState
    typealias Action = UserAction
    
    func reduce(state: inout UserState, action: UserAction) {
        switch action {
        case .loadCurrentUser:
            state.loadingState = .loading
            
        case .loadUserProfile(let userId):
            state.loadingState = .loading
            
        case .searchUsers(let query):
            state.searchQuery = query
            state.loadingState = .loading
            
        case .selectUser(let user):
            state.selectedUser = user
            
        case .updateProfile(let profile):
            state.userProfile = profile
            state.loadingState = .loaded
            
        case .logout:
            state.currentUser = nil
            state.userProfile = nil
            state.users = []
            state.loadingState = .idle
            
        case .error(let error):
            state.loadingState = .error(error)
        }
    }
}
```

### **User ViewModel Implementation**

```swift
// MARK: - User Service Protocol
protocol UserServiceProtocol {
    func getCurrentUser() -> AnyPublisher<User, AppError>
    func getUserProfile(userId: UUID) -> AnyPublisher<UserProfile, AppError>
    func searchUsers(query: String) -> AnyPublisher<[User], AppError>
    func updateProfile(_ profile: UserProfile) -> AnyPublisher<UserProfile, AppError>
}

// MARK: - User ViewModel
class UserViewModel: BaseViewModel {
    @Published private(set) var state = UserState()
    private let store: Store<UserState, UserAction>
    private let userService: UserServiceProtocol
    private let coordinator: UserCoordinatorProtocol
    
    init(userService: UserServiceProtocol, coordinator: UserCoordinatorProtocol) {
        self.userService = userService
        self.coordinator = coordinator
        self.store = Store(initialState: UserState(), reducer: UserReducer())
        
        super.init()
        
        setupBindings()
    }
    
    private func setupBindings() {
        // Bind store state to published state
        store.$state
            .receive(on: DispatchQueue.main)
            .assign(to: \.state, on: self)
            .store(in: &cancellables)
        
        // Handle loading state changes
        $state
            .map(\.loadingState)
            .sink { [weak self] loadingState in
                self?.handleLoadingState(loadingState)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Public Methods
    
    func loadCurrentUser() {
        store.dispatch(.loadCurrentUser)
        
        userService.getCurrentUser()
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] user in
                    self?.store.dispatch(.updateProfile(UserProfile(
                        id: user.id,
                        user: user,
                        bio: nil,
                        location: nil,
                        website: nil,
                        followersCount: 0,
                        followingCount: 0,
                        postsCount: 0
                    )))
                }
            )
            .store(in: &cancellables)
    }
    
    func loadUserProfile(userId: UUID) {
        store.dispatch(.loadUserProfile(userId: userId))
        
        userService.getUserProfile(userId: userId)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] profile in
                    self?.store.dispatch(.updateProfile(profile))
                }
            )
            .store(in: &cancellables)
    }
    
    func searchUsers(query: String) {
        guard !query.isEmpty else {
            store.dispatch(.searchUsers(query: ""))
            return
        }
        
        store.dispatch(.searchUsers(query: query))
        
        userService.searchUsers(query: query)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] users in
                    self?.store.dispatch(.searchUsers(query: query))
                }
            )
            .store(in: &cancellables)
    }
    
    func selectUser(_ user: User) {
        store.dispatch(.selectUser(user))
        coordinator.showUserDetail(userId: user.id)
    }
    
    func logout() {
        store.dispatch(.logout)
        coordinator.showLogin()
    }
    
    // MARK: - Private Methods
    
    private func handleLoadingState(_ loadingState: LoadingState) {
        switch loadingState {
        case .error(let error):
            coordinator.showError(error)
        case .loaded:
            // Handle successful loading
            break
        default:
            break
        }
    }
}

// MARK: - User Coordinator Protocol
protocol UserCoordinatorProtocol: AnyObject {
    func showUserDetail(userId: UUID)
    func showLogin()
    func showError(_ error: AppError)
}
```

## 3. **Post Management with Advanced MVVM**

Let's implement a comprehensive post management system with advanced MVVM patterns.

### **Post Models and State**

```swift
// MARK: - Post Models
struct Post: Codable, Identifiable, Equatable {
    let id: UUID
    let title: String
    let content: String
    let author: User
    let tags: [String]
    let likes: Int
    let comments: Int
    let isLiked: Bool
    let createdAt: Date
    let updatedAt: Date
    
    enum CodingKeys: String, CodingKey {
        case id, title, content, author, tags, likes, comments
        case isLiked = "is_liked"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

struct CreatePostRequest: Codable {
    let title: String
    let content: String
    let tags: [String]
}

struct UpdatePostRequest: Codable {
    let title: String?
    let content: String?
    let tags: [String]?
}

// MARK: - Post State
struct PostState {
    var posts: [Post] = []
    var currentPost: Post?
    var loadingState: LoadingState = .idle
    var searchQuery: String = ""
    var selectedTags: Set<String> = []
    var sortOption: PostSortOption = .newest
    var pagination: Pagination = Pagination(page: 1, perPage: 20, total: 0, totalPages: 0)
}

enum PostSortOption: String, CaseIterable {
    case newest = "newest"
    case oldest = "oldest"
    case mostLiked = "most_liked"
    case mostCommented = "most_commented"
}

// MARK: - Post Actions
enum PostAction: Action {
    case loadPosts(page: Int)
    case loadPost(id: UUID)
    case createPost(CreatePostRequest)
    case updatePost(id: UUID, request: UpdatePostRequest)
    case deletePost(id: UUID)
    case likePost(id: UUID)
    case unlikePost(id: UUID)
    case searchPosts(query: String)
    case filterByTags(Set<String>)
    case sortBy(PostSortOption)
    case error(AppError)
}

// MARK: - Post Reducer
class PostReducer: Reducer {
    typealias State = PostState
    typealias Action = PostAction
    
    func reduce(state: inout PostState, action: PostAction) {
        switch action {
        case .loadPosts(let page):
            state.loadingState = .loading
            state.pagination.page = page
            
        case .loadPost(let id):
            state.loadingState = .loading
            
        case .createPost(let request):
            state.loadingState = .loading
            
        case .updatePost(let id, let request):
            state.loadingState = .loading
            
        case .deletePost(let id):
            state.posts.removeAll { $0.id == id }
            
        case .likePost(let id):
            if let index = state.posts.firstIndex(where: { $0.id == id }) {
                state.posts[index].likes += 1
                state.posts[index].isLiked = true
            }
            
        case .unlikePost(let id):
            if let index = state.posts.firstIndex(where: { $0.id == id }) {
                state.posts[index].likes -= 1
                state.posts[index].isLiked = false
            }
            
        case .searchPosts(let query):
            state.searchQuery = query
            state.loadingState = .loading
            
        case .filterByTags(let tags):
            state.selectedTags = tags
            state.loadingState = .loading
            
        case .sortBy(let option):
            state.sortOption = option
            state.loadingState = .loading
            
        case .error(let error):
            state.loadingState = .error(error)
        }
    }
}
```

### **Post ViewModel with Advanced Features**

```swift
// MARK: - Post Service Protocol
protocol PostServiceProtocol {
    func getPosts(page: Int, query: String?, tags: [String]?, sortBy: PostSortOption) -> AnyPublisher<PaginatedResponse<Post>, AppError>
    func getPost(id: UUID) -> AnyPublisher<Post, AppError>
    func createPost(_ request: CreatePostRequest) -> AnyPublisher<Post, AppError>
    func updatePost(id: UUID, request: UpdatePostRequest) -> AnyPublisher<Post, AppError>
    func deletePost(id: UUID) -> AnyPublisher<Void, AppError>
    func likePost(id: UUID) -> AnyPublisher<Void, AppError>
    func unlikePost(id: UUID) -> AnyPublisher<Void, AppError>
}

// MARK: - Post ViewModel
class PostViewModel: BaseViewModel {
    @Published private(set) var state = PostState()
    private let store: Store<PostState, PostAction>
    private let postService: PostServiceProtocol
    private let coordinator: PostCoordinatorProtocol
    
    // Debounced search publisher
    private let searchSubject = PassthroughSubject<String, Never>()
    
    init(postService: PostServiceProtocol, coordinator: PostCoordinatorProtocol) {
        self.postService = postService
        self.coordinator = coordinator
        self.store = Store(initialState: PostState(), reducer: PostReducer())
        
        super.init()
        
        setupBindings()
        setupSearchDebouncing()
    }
    
    private func setupBindings() {
        // Bind store state to published state
        store.$state
            .receive(on: DispatchQueue.main)
            .assign(to: \.state, on: self)
            .store(in: &cancellables)
        
        // Handle loading state changes
        $state
            .map(\.loadingState)
            .sink { [weak self] loadingState in
                self?.handleLoadingState(loadingState)
            }
            .store(in: &cancellables)
    }
    
    private func setupSearchDebouncing() {
        searchSubject
            .debounce(for: .milliseconds(500), scheduler: DispatchQueue.main)
            .removeDuplicates()
            .sink { [weak self] query in
                self?.performSearch(query: query)
            }
            .store(in: &cancellables)
    }
    
    // MARK: - Public Methods
    
    func loadPosts(page: Int = 1) {
        store.dispatch(.loadPosts(page: page))
        
        let query = state.searchQuery.isEmpty ? nil : state.searchQuery
        let tags = state.selectedTags.isEmpty ? nil : Array(state.selectedTags)
        
        postService.getPosts(page: page, query: query, tags: tags, sortBy: state.sortOption)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] response in
                    if page == 1 {
                        self?.store.dispatch(.loadPosts(page: page))
                    } else {
                        // Append to existing posts for pagination
                        self?.store.dispatch(.loadPosts(page: page))
                    }
                }
            )
            .store(in: &cancellables)
    }
    
    func loadPost(id: UUID) {
        store.dispatch(.loadPost(id: id))
        
        postService.getPost(id: id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] post in
                    self?.store.dispatch(.loadPost(id: id))
                }
            )
            .store(in: &cancellables)
    }
    
    func createPost(_ request: CreatePostRequest) {
        store.dispatch(.createPost(request))
        
        postService.createPost(request)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] post in
                    self?.store.dispatch(.createPost(request))
                    self?.coordinator.showPostDetail(postId: post.id)
                }
            )
            .store(in: &cancellables)
    }
    
    func updatePost(id: UUID, request: UpdatePostRequest) {
        store.dispatch(.updatePost(id: id, request: request))
        
        postService.updatePost(id: id, request: request)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] post in
                    self?.store.dispatch(.updatePost(id: id, request: request))
                }
            )
            .store(in: &cancellables)
    }
    
    func deletePost(id: UUID) {
        postService.deletePost(id: id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { [weak self] _ in
                    self?.store.dispatch(.deletePost(id: id))
                }
            )
            .store(in: &cancellables)
    }
    
    func likePost(id: UUID) {
        store.dispatch(.likePost(id: id))
        
        postService.likePost(id: id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { _ in
                    // Success - state already updated optimistically
                }
            )
            .store(in: &cancellables)
    }
    
    func unlikePost(id: UUID) {
        store.dispatch(.unlikePost(id: id))
        
        postService.unlikePost(id: id)
            .receive(on: DispatchQueue.main)
            .sink(
                receiveCompletion: { [weak self] completion in
                    if case .failure(let error) = completion {
                        self?.store.dispatch(.error(error))
                    }
                },
                receiveValue: { _ in
                    // Success - state already updated optimistically
                }
            )
            .store(in: &cancellables)
    }
    
    func searchPosts(query: String) {
        searchSubject.send(query)
    }
    
    func filterByTags(_ tags: Set<String>) {
        store.dispatch(.filterByTags(tags))
        loadPosts(page: 1)
    }
    
    func sortBy(_ option: PostSortOption) {
        store.dispatch(.sortBy(option))
        loadPosts(page: 1)
    }
    
    func selectPost(_ post: Post) {
        coordinator.showPostDetail(postId: post.id)
    }
    
    func showCreatePost() {
        coordinator.showCreatePost()
    }
    
    // MARK: - Private Methods
    
    private func performSearch(query: String) {
        store.dispatch(.searchPosts(query: query))
        loadPosts(page: 1)
    }
    
    private func handleLoadingState(_ loadingState: LoadingState) {
        switch loadingState {
        case .error(let error):
            coordinator.showError(error)
        case .loaded:
            // Handle successful loading
            break
        default:
            break
        }
    }
}

// MARK: - Post Coordinator Protocol
protocol PostCoordinatorProtocol: AnyObject {
    func showPostDetail(postId: UUID)
    func showCreatePost()
    func showError(_ error: AppError)
}
```

## 4. **SwiftUI Views with MVVM**

Now let's create SwiftUI views that work seamlessly with our MVVM architecture.

### **User Views**

```swift
// MARK: - User List View
struct UserListView: View {
    @StateObject private var viewModel: UserViewModel
    @State private var searchText = ""
    
    init(userService: UserServiceProtocol, coordinator: UserCoordinatorProtocol) {
        self._viewModel = StateObject(wrappedValue: UserViewModel(
            userService: userService,
            coordinator: coordinator
        ))
    }
    
    var body: some View {
        NavigationView {
            VStack {
                if viewModel.state.loadingState.isLoading {
                    ProgressView("Loading users...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    List(viewModel.state.users) { user in
                        UserRowView(user: user) {
                            viewModel.selectUser(user)
                        }
                    }
                    .refreshable {
                        viewModel.loadCurrentUser()
                    }
                }
            }
            .navigationTitle("Users")
            .searchable(text: $searchText, prompt: "Search users")
            .onChange(of: searchText) { query in
                viewModel.searchUsers(query: query)
            }
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Profile") {
                        viewModel.loadCurrentUser()
                    }
                }
            }
        }
        .onAppear {
            viewModel.loadCurrentUser()
        }
    }
}

// MARK: - User Row View
struct UserRowView: View {
    let user: User
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                AsyncImage(url: user.avatar) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Circle()
                        .fill(Color.gray.opacity(0.3))
                }
                .frame(width: 50, height: 50)
                .clipShape(Circle())
                
                VStack(alignment: .leading) {
                    Text(user.name)
                        .font(.headline)
                    Text(user.email)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Image(systemName: "chevron.right")
                    .foregroundColor(.secondary)
            }
            .padding(.vertical, 4)
        }
        .buttonStyle(PlainButtonStyle())
    }
}

// MARK: - User Profile View
struct UserProfileView: View {
    @StateObject private var viewModel: UserViewModel
    let userId: UUID
    
    init(userId: UUID, userService: UserServiceProtocol, coordinator: UserCoordinatorProtocol) {
        self.userId = userId
        self._viewModel = StateObject(wrappedValue: UserViewModel(
            userService: userService,
            coordinator: coordinator
        ))
    }
    
    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                if let profile = viewModel.state.userProfile {
                    UserProfileHeaderView(profile: profile)
                    UserProfileStatsView(profile: profile)
                    UserProfileBioView(profile: profile)
                } else if viewModel.state.loadingState.isLoading {
                    ProgressView("Loading profile...")
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .padding()
        }
        .navigationTitle("Profile")
        .onAppear {
            viewModel.loadUserProfile(userId: userId)
        }
    }
}

// MARK: - User Profile Components
struct UserProfileHeaderView: View {
    let profile: UserProfile
    
    var body: some View {
        VStack(spacing: 16) {
            AsyncImage(url: profile.user.avatar) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Circle()
                    .fill(Color.gray.opacity(0.3))
            }
            .frame(width: 100, height: 100)
            .clipShape(Circle())
            
            VStack(spacing: 8) {
                Text(profile.user.name)
                    .font(.title2)
                    .fontWeight(.bold)
                
                Text(profile.user.email)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
    }
}

struct UserProfileStatsView: View {
    let profile: UserProfile
    
    var body: some View {
        HStack(spacing: 40) {
            StatItemView(title: "Posts", value: "\(profile.postsCount)")
            StatItemView(title: "Followers", value: "\(profile.followersCount)")
            StatItemView(title: "Following", value: "\(profile.followingCount)")
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}

struct StatItemView: View {
    let title: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(title)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
}

struct UserProfileBioView: View {
    let profile: UserProfile
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let bio = profile.bio {
                Text(bio)
                    .font(.body)
            }
            
            if let location = profile.location {
                HStack {
                    Image(systemName: "location")
                        .foregroundColor(.secondary)
                    Text(location)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            
            if let website = profile.website {
                HStack {
                    Image(systemName: "globe")
                        .foregroundColor(.secondary)
                    Link("Website", destination: website)
                        .font(.subheadline)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .cornerRadius(12)
    }
}
```

## **Summary**

Building robust iOS apps with MVVM, Combine, and SwiftUI requires:

1. **Clear Architecture**: Separate concerns with proper protocols and abstractions
2. **State Management**: Use Combine for reactive state management
3. **Error Handling**: Implement comprehensive error handling throughout the app
4. **Testing**: Design for testability with dependency injection
5. **Performance**: Optimize with proper memory management and async operations
6. **User Experience**: Create responsive, accessible interfaces

By implementing these patterns, you can create maintainable, scalable iOS applications that provide excellent user experience while being easy to test and extend. 