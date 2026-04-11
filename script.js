import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBUgBEOjio9su1T1M1X5ISzCooa-IKQfzw",
    authDomain: "ascii-payment.firebaseapp.com",
    projectId: "ascii-payment",
    storageBucket: "ascii-payment.firebasestorage.app",
    messagingSenderId: "637047400318",
    appId: "1:637047400318:web:68634107e3ebb9e9fff52f",
    measurementId: "G-6C7DT4P7ME"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── Admin Notification Config ──
const EMAILJS_PUBLIC_KEY = "YOUR_EMAILJS_PUBLIC_KEY"; 
const EMAILJS_SERVICE_ID = "YOUR_SERVICE_ID";         
const EMAILJS_TEMPLATE_ID = "YOUR_TEMPLATE_ID";       

// Initialize EmailJS
emailjs.init(EMAILJS_PUBLIC_KEY);

let selectedGender = '';
let selectedPaymentMethod = '';

// ── Image Compression to Base64 (100% Free, Bypasses Storage) ──
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = function(event) {
      const img = new Image();
      img.src = event.target.result;
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600; // Resize to max 600px width
        const scaleSize = MAX_WIDTH / img.width;
        canvas.width = MAX_WIDTH;
        canvas.height = img.height * scaleSize;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Output heavily compressed JPEG string (approx 20-50KB)
        const base64String = canvas.toDataURL('image/jpeg', 0.6); 
        resolve(base64String);
      }
    };
  });
}

// ── Pill selections ─────────────────────────────────────────
document.querySelectorAll('.gpill').forEach(function (p) {
  p.addEventListener('click', function () {
    document.querySelectorAll('.gpill').forEach(function (x) {
      x.classList.remove('active');
    });
    p.classList.add('active');
    selectedGender = p.dataset.g;
    document.getElementById('f-gender').classList.remove('invalid');
    document.getElementById('gender-err').style.display = 'none';
  });
});

document.querySelectorAll('.pm-pill').forEach(function (p) {
  p.addEventListener('click', function () {
    document.querySelectorAll('.pm-pill').forEach(function (x) {
      x.classList.remove('active');
    });
    p.classList.add('active');
    selectedPaymentMethod = p.dataset.pm;
    document.getElementById('pm-err').style.display = 'none';
    
    if (selectedPaymentMethod === 'Online') {
        document.getElementById('online-payment-details').style.display = 'block';
    } else {
        document.getElementById('online-payment-details').style.display = 'none';
    }
  });
});

// ── Form Validation ───────────────────────────────────────────────
function validate() {
  var ok = true;
  var name = document.getElementById('donor-name').value.trim();
  var year = document.getElementById('donor-year').value;
  var roll = document.getElementById('donor-roll').value.trim();
  var mobile = document.getElementById('donor-mobile').value.trim();
  var email = document.getElementById('donor-email').value.trim();

  function check(id, bad) {
    var el = document.getElementById(id);
    if (bad) { el.classList.add('invalid'); ok = false; } 
    else { el.classList.remove('invalid'); }
  }

  check('f-name', !name);
  check('f-year', !year);
  check('f-roll', !roll);
  check('f-mobile', !/^\d{10}$/.test(mobile));
  check('f-email', !email || !email.includes('@') || !email.includes('.'));

  var ge = document.getElementById('gender-err');
  if (!selectedGender) { ge.style.display = 'block'; ok = false; } 
  else { ge.style.display = 'none'; }

  var pe = document.getElementById('pm-err');
  if (!selectedPaymentMethod) { pe.style.display = 'block'; ok = false; } 
  else { pe.style.display = 'none'; }

  var txnID = document.getElementById('txn-id').value.trim();
  var screenshotInput = document.getElementById('payment-screenshot');
  var txnErr = document.getElementById('txn-err');
  var screenErr = document.getElementById('screen-err');
  
  if (selectedPaymentMethod === 'Online') {
    if (!txnID) { txnErr.style.display = 'block'; ok = false; } 
    else { txnErr.style.display = 'none'; }

    if (screenshotInput.files.length === 0) { screenErr.style.display = 'block'; ok = false; } 
    else { screenErr.style.display = 'none'; }
  } else {
    txnErr.style.display = 'none';
    screenErr.style.display = 'none';
  }

  return ok;
}

// ── Submit logic ──────────────────────────────────────────────
window.submitRegistration = async function() {
  if (!validate()) return;

  const btn = document.getElementById('submit-btn');
  btn.textContent = 'Submitting...';
  btn.disabled = true;

  const name = document.getElementById('donor-name').value.trim();
  const year = document.getElementById('donor-year').value;
  const roll = document.getElementById('donor-roll').value.trim();
  const mobile = document.getElementById('donor-mobile').value.trim();
  const email = document.getElementById('donor-email').value.trim();
  const txnID = document.getElementById('txn-id').value.trim();
  const screenshotInput = document.getElementById('payment-screenshot');
  const receiptNo = 'CS25-' + Date.now().toString(36).toUpperCase().slice(-6);

  try {
    let screenshotUrl = "";

    // If Online, compress the image locally using Canvas and save as Base64 Text!
    if (selectedPaymentMethod === 'Online' && screenshotInput.files.length > 0) {
      btn.textContent = 'Compressing Image...';
      const file = screenshotInput.files[0];
      screenshotUrl = await compressImage(file);
    }

    btn.textContent = 'Saving Registration...';

    // Add to Firebase Firestore
    await addDoc(collection(db, "registrations"), {
      event: "Farewell Fund",
      status: "Pending", // Requires Admin Approval
      teamName: "-",
      teamSize: 1,
      contact: mobile,
      email: email,
      receiptNo: receiptNo,
      paymentMethod: selectedPaymentMethod,
      transactionId: selectedPaymentMethod === 'Online' ? txnID : "-",
      screenshotUrl: screenshotUrl, // Now saving the pure Base64 string directly into Firestore!
      members: [{
        fullName: name,
        year: year,
        rollNumber: roll,
        contact: mobile,
        email: email,
        department: "Computer", 
        gender: selectedGender
      }],
      timestamp: serverTimestamp()
    });

    // Reset Form
    document.getElementById('donor-name').value = '';
    document.getElementById('donor-year').value = '';
    document.getElementById('donor-roll').value = '';
    document.getElementById('donor-mobile').value = '';
    document.getElementById('donor-email').value = '';
    document.getElementById('txn-id').value = '';
    screenshotInput.value = '';
    document.querySelectorAll('.gpill, .pm-pill').forEach(x => x.classList.remove('active'));
    selectedGender = '';
    selectedPaymentMethod = '';
    document.getElementById('online-payment-details').style.display = 'none';

    // Show Success Modal
    document.getElementById('success-overlay').style.display = 'flex';
    
  } catch (error) {
    console.error("Error adding document: ", error);
    alert("Submission failed. This could be due to the file being too large or network issues.");
  } finally {
    btn.textContent = 'Submit Registration Request →';
    btn.disabled = false;
  }
}

window.closeSuccessModal = function() {
  document.getElementById('success-overlay').style.display = 'none';
}


// ── Check Status & Receipt ─────────────────────────────────────
window.openStatusModal = function() {
  document.getElementById('check-status-overlay').style.display = 'flex';
  document.getElementById('check-mobile').value = '';
  document.getElementById('status-message').style.display = 'none';
};

window.closeStatusModal = function() {
  document.getElementById('check-status-overlay').style.display = 'none';
};

window.checkStatus = async function() {
  const mobile = document.getElementById('check-mobile').value.trim();
  const msgEl = document.getElementById('status-message');
  const btn = document.getElementById('check-status-btn');
  
  if (!/^\d{10}$/.test(mobile)) {
    msgEl.style.display = 'block';
    msgEl.style.color = '#dc3545';
    msgEl.textContent = 'Please enter a valid 10-digit mobile number.';
    return;
  }
  
  btn.textContent = 'Checking...';
  btn.disabled = true;
  msgEl.style.display = 'none';

  try {
    const q = query(collection(db, "registrations"), where("contact", "==", mobile), where("event", "==", "Farewell Fund"));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      msgEl.style.display = 'block';
      msgEl.style.color = '#dc3545';
      msgEl.textContent = 'No registration found for this mobile number.';
      btn.textContent = 'Check Status';
      btn.disabled = false;
      return;
    }
    
    let docData = null;
    querySnapshot.forEach((doc) => {
      docData = doc.data();
    });

    if (docData.status === "Pending") {
      msgEl.style.display = 'block';
      msgEl.style.color = '#f0913a';
      msgEl.textContent = 'Registration found. Still waiting for admin approval.';
    } else if (docData.status === "Approved" || docData.status === "Accepted") {
      window.closeStatusModal();
      window.showReceipt(docData);
    } else if (docData.status === "Rejected") {
      msgEl.style.display = 'block';
      msgEl.style.color = '#dc3545';
      msgEl.textContent = 'Your registration was rejected by the admin.';
    } else {
      msgEl.style.display = 'block';
      msgEl.style.color = '#1a7d4f';
      msgEl.textContent = 'Status: ' + docData.status;
    }

  } catch (error) {
    console.error("Error fetching status", error);
    msgEl.style.display = 'block';
    msgEl.style.color = '#dc3545';
    msgEl.textContent = 'Error checking status. Try again later.';
  }

  btn.textContent = 'Check Status';
  btn.disabled = false;
};

window.showReceipt = function(docData) {
  const m = docData.members[0];
  document.getElementById('r-receipt-no').textContent = docData.receiptNo || '—';
  
  let dateStr = '—';
  if (docData.timestamp && docData.timestamp.toDate) {
    const d = docData.timestamp.toDate();
    dateStr = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  }

  document.getElementById('r-date').textContent = dateStr;
  document.getElementById('r-name').textContent = m.fullName || '—';
  document.getElementById('r-year').textContent = m.year || '—';
  document.getElementById('r-roll').textContent = m.rollNumber || '—';
  document.getElementById('r-gender').textContent = m.gender || '—';
  document.getElementById('r-mobile').textContent = m.contact || '—';
  document.getElementById('r-email').textContent = m.email || '—';

  // Generate Unique QR Code for Student
  const qrString = `ReceiptNo: ${docData.receiptNo}\nName: ${m.fullName}\nYear: ${m.year}\nRoll No: ${m.rollNumber}\nPhone: ${m.contact}\nAmount: ₹500\nStatus: APPROVED`;
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrString)}`;
  document.getElementById('r-qr-code').src = qrUrl;

  document.getElementById('receipt-overlay').style.display = 'flex';
};

window.closeReceipt = function() {
  document.getElementById('receipt-overlay').style.display = 'none';
};

window.printReceipt = function() {
  window.print();
};

// ── Toast ─────────────────────────────────────────────────────────
function showToast(msg) {
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(function () { t.classList.remove('show'); }, 3500);
}

window.showToast = showToast;

// ── Auto-Check via URL ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const mobileToCheck = params.get('check');
  if (mobileToCheck && /^\d{10}$/.test(mobileToCheck)) {
    // Open the status modal first to show progress
    window.openStatusModal();
    // Fill the input
    const input = document.getElementById('check-mobile');
    if (input) input.value = mobileToCheck;
    // Trigger the check
    window.checkStatus();
    
    // Clean up URL without refreshing
    const newUrl = window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
});
