import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  onValue,
  remove
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// ✅ Your Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyAFEksOno9wfbWN3D6X6Z-XTkzGjNLPDhE",
  authDomain: "aichat-website-ad94b.firebaseapp.com",
  projectId: "aichat-website-ad94b",
  storageBucket: "aichat-website-ad94b.appspot.com",
  messagingSenderId: "259180068093",
  appId: "1:259180068093:web:9d15e4257e6a4f5eaa1294"
};

// 🔌 Initialize
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

// 🔗 Elements
const loginPage = document.getElementById("login-page");
const chatPage = document.getElementById("chat-page");
const loginBtn = document.getElementById("login-btn");
const logoutBtn = document.getElementById("logout-btn");
const chatBox = document.getElementById("chat-box");
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const micBtn = document.getElementById("mic-btn");

let currentUser = null;
let username = null;

// 🔐 Auth
loginBtn.onclick = () => {
  signInWithPopup(auth, provider).catch(err => {
    alert("Login error: " + err.message);
    console.error(err);
  });
};

logoutBtn.onclick = () => signOut(auth);

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    username = user.displayName ? user.displayName.replace(/\s+/g, "_") : user.uid;
    loginPage.classList.add("hidden");
    chatPage.classList.remove("hidden");
    loadMessages(username);
  } else {
    currentUser = null;
    username = null;
    chatBox.innerHTML = "";
    loginPage.classList.remove("hidden");
    chatPage.classList.add("hidden");
  }
});

// 💬 Chat
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = userInput.value.trim();
  if (!input || !currentUser) return;

  displayMessage("user", input);
  saveMessage("user", input);
  userInput.value = "";

  const loading = showTypingDots();
  const botMsg = await askGemini(input);
  loading.remove();

  displayMessage("bot", botMsg);
  speak(botMsg);
  saveMessage("bot", botMsg);
});

// 👤 Save + Load Chats
function saveMessage(role, message) {
  const userRef = ref(db, `users/${username}/chats`);
  push(userRef, {
    role,
    message,
    timestamp: Date.now()
  });
}

function loadMessages(userKey) {
  const userRef = ref(db, `users/${userKey}/chats`);
  onValue(userRef, (snapshot) => {
    chatBox.innerHTML = "";
    const now = Date.now();
    snapshot.forEach((child) => {
      const data = child.val();
      if (now - data.timestamp > 86400000) {
        remove(ref(db, `users/${userKey}/chats/${child.key}`));
      } else {
        displayMessage(data.role, data.message);
      }
    });
  });
}

// 💬 UI
function displayMessage(role, text) {
  const div = document.createElement("div");
  div.className = `message ${role}`;
  div.textContent = text;
  chatBox.appendChild(div);
  chatBox.scrollTop = chatBox.scrollHeight;
}

// 🔄 Typing Dots
function showTypingDots() {
  const dot = document.createElement("div");
  dot.className = "message bot typing-dots";
  dot.innerHTML = "Thinking<span class='dots'>...</span>";
  chatBox.appendChild(dot);
  chatBox.scrollTop = chatBox.scrollHeight;
  return dot;
}

// 🎙️ Voice Input
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "en-US";

  micBtn.addEventListener("click", () => {
    recognition.start();
  });

  recognition.onresult = (e) => {
    userInput.value = e.results[0][0].transcript;
  };
}

// 🗣️ Voice Output
function speak(text) {
  const say = new SpeechSynthesisUtterance(text);
  say.lang = "en-US";
  speechSynthesis.speak(say);
}

// 🤖 Gemini Flash 2.0 API
async function askGemini(prompt) {
  const apiKey = "AIzaSyA7r5AtiKOB_qXutu9WKcMfxowXH8dnEzU"; // Gemini API key
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const body = {
    contents: [
      {
        role: "user",
        parts: [{ text: prompt }]
      }
    ]
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    console.log("🔍 Gemini Response:", data);

    if (data?.candidates?.length > 0) {
      return data.candidates[0].content.parts[0].text;
    }

    if (data.error) {
      return `❌ Gemini API Error: ${data.error.message}`;
    }

    return "⚠️ Gemini returned no usable candidates.";
  } catch (error) {
    console.error("❌ Network or Fetch Error:", error);
    return "⚠️ Failed to connect to Gemini.";
  }
}
