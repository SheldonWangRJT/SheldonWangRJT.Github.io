# iOS Interview Questions - Encryption Guide

## 🔐 How It Works

The iOS interview questions are encrypted using **AES-256 encryption** with CryptoJS. This means:

✅ **Secure**: Content is actually encrypted, not just hidden  
✅ **GitHub Pages Compatible**: No server needed  
✅ **Can't Be Bypassed**: Viewing page source shows encrypted gibberish  
✅ **Session Persistence**: Password saved for the browser session  

## 🔑 Current Password

**Password:** `iOSMaster2025!`

Share this password only with people you want to give access to.

## 📝 How to Update Content

### Method 1: Use the Encryption Script (Recommended)

1. Edit your questions in `_interviews/sample-questions.md`
2. Run the encryption script:
   ```bash
   node _interviews/encrypt.js
   ```
3. Copy the generated encrypted string
4. Paste it into `_pages/ios-interviews.html` replacing the `encryptedContent` variable
5. Commit and push

### Method 2: Use the Helper Tool

1. Open `_interviews/encrypt-helper.html` in your browser
2. Paste your HTML content
3. Set your password
4. Click "Encrypt Content"
5. Copy the encrypted string and update `ios-interviews.html`

## 🔄 Changing the Password

1. Edit `_interviews/encrypt.js` and change the `password` variable
2. Run `node _interviews/encrypt.js` to get new encrypted string
3. Update `ios-interviews.html` with the new encrypted string
4. Share new password with authorized users

## 📊 What's Inside Currently

The encrypted content includes 5 sample iOS interview questions:

1. **Design an Instagram-like Feed** (Hard) - Architecture, caching, performance
2. **Design a Real-Time Chat System** (Hard) - WebSocket, offline sync, encryption
3. **Image Caching System** (Medium) - Memory management, eviction policies
4. **App Launch Optimization** (Hard) - Profiling, optimization strategies
5. **Main Thread Optimization** (Medium) - Scrolling performance, debugging

## 🎯 Adding More Questions

Just edit `_interviews/encrypt.js` to add more questions in the `content` variable, then re-run the encryption script!

## 🚀 Testing Locally

1. Visit: http://localhost:4000/ios-interviews/
2. Enter password: `iOSMaster2025!`
3. Content should unlock and display
4. Try refreshing - should stay unlocked for the session

---

**Security Note:** This is client-side encryption. It's secure enough for interview questions but not for highly sensitive data. For truly sensitive content, consider using Netlify with server-side password protection.

