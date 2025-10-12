// iOS Interviews Password Unlock
// This is client-side only - not truly secure, just a gentle barrier

// ============================================
// MAIN HUB UNLOCK
// ============================================

function unlockContent(event) {
  if (event) {
    event.preventDefault();
  }
  
  const password = document.getElementById('password-input').value.trim();
  const lockScreen = document.getElementById('lock-screen');
  const hub = document.getElementById('interview-hub');
  
  console.log('Password entered:', password);
  
  // Check password
  if (password === 'iOSMaster2025!') {
    console.log('Password correct! Unlocking...');
    
    // Hide lock screen
    if (lockScreen) {
      lockScreen.style.display = 'none';
    }
    
    // Show hub
    if (hub) {
      hub.classList.add('unlocked');
      hub.style.display = 'block';
    }
    
    // Store in session
    sessionStorage.setItem('ios-interviews-unlocked', 'true');
    
    console.log('Unlocked successfully!');
  } else {
    console.log('Password incorrect:', password);
    alert('Incorrect password! Password is case-sensitive. Try: iOSMaster2025!');
  }
  
  return false;
}

// Check if already unlocked in this session
document.addEventListener('DOMContentLoaded', function() {
  console.log('Page loaded, checking session...');
  
  const isUnlocked = sessionStorage.getItem('ios-interviews-unlocked');
  console.log('Session storage:', isUnlocked);
  
  if (isUnlocked === 'true') {
    console.log('Already unlocked in session, showing hub...');
    
    const lockScreen = document.getElementById('lock-screen');
    const hub = document.getElementById('interview-hub');
    
    if (lockScreen) {
      lockScreen.style.display = 'none';
    }
    
    if (hub) {
      hub.classList.add('unlocked');
      hub.style.display = 'block';
    }
  }
});

// Also try window.addEventListener as fallback
window.addEventListener('load', function() {
  const isUnlocked = sessionStorage.getItem('ios-interviews-unlocked');
  if (isUnlocked === 'true') {
    const lockScreen = document.getElementById('lock-screen');
    const hub = document.getElementById('interview-hub');
    
    if (lockScreen) lockScreen.style.display = 'none';
    if (hub) {
      hub.classList.add('unlocked');
      hub.style.display = 'block';
    }
  }
});

