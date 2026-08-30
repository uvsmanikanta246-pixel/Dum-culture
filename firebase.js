/**
 * DUM CULTURE - Firebase Authentication & Firestore Service Engine
 * Modular Firebase v10 SDK Integration
 */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  browserLocalPersistence,
  setPersistence
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { 
  getFirestore, 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase Project Configuration
const firebaseConfig = {
  apiKey: "AIzaSyDyYpXUmLXx3sR73vfhp4GDT7ltLPfgO8o",
  authDomain: "dum-culture.firebaseapp.com",
  projectId: "dum-culture",
  storageBucket: "dum-culture.firebasestorage.app",
  messagingSenderId: "588684182184",
  appId: "1:588684182184:web:b1e062e7e21ac0c768789d"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Configure Google Auth Provider
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account"
});

// Set local persistence (keep user logged in across sessions/tabs)
setPersistence(auth, browserLocalPersistence).catch((err) => {
  console.warn("Firebase persistence error:", err);
});

/**
 * Sign in with Google Popup
 */
export async function loginWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    return { success: true, user };
  } catch (error) {
    console.error("Google Sign-In Error:", error);
    let message = "Sign in failed. Please try again.";
    if (error.code === "auth/popup-closed-by-user") {
      message = "Sign in was cancelled.";
    } else if (error.code === "auth/popup-blocked") {
      message = "Popup blocked by browser. Please allow popups for this site.";
    } else if (error.code === "auth/unauthorized-domain") {
      message = "This domain is not authorized in Firebase Console. Please add it to Authentication > Settings > Authorized domains.";
    } else if (error.message) {
      message = error.message;
    }
    return { success: false, error: message, code: error.code };
  }
}

/**
 * Log out current user
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    return { success: true };
  } catch (error) {
    console.error("Logout Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Auth State Observer Listener
 */
export function subscribeToAuthState(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Get User Document from Firestore ('users' collection)
 */
export async function getUserProfile(uid) {
  try {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { success: true, data: userSnap.data(), exists: true };
    } else {
      return { success: true, data: null, exists: false };
    }
  } catch (error) {
    console.error("Fetch User Profile Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save / Update User Profile in Firestore ('users' collection)
 */
export async function saveUserProfile(uid, profileData) {
  try {
    const userRef = doc(db, "users", uid);
    const payload = {
      fullName: profileData.fullName || "",
      phoneNumber: profileData.phoneNumber || "",
      deliveryAddress: profileData.deliveryAddress || "",
      email: profileData.email || "",
      photoURL: profileData.photoURL || "",
      updatedAt: serverTimestamp()
    };
    
    // Include createdAt only if new
    if (profileData.isNew) {
      payload.createdAt = serverTimestamp();
    }

    await setDoc(userRef, payload, { merge: true });
    return { success: true, data: payload };
  } catch (error) {
    console.error("Save User Profile Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Save Order to Firestore ('orders' collection)
 */
export async function saveOrderToFirestore(orderData) {
  try {
    const ordersCollection = collection(db, "orders");
    const payload = {
      userId: orderData.userId || "guest",
      userName: orderData.userName || "Guest",
      phoneNumber: orderData.phoneNumber || "",
      address: orderData.address || "N/A",
      items: orderData.items || [],
      totalAmount: Number(orderData.totalAmount) || 0,
      subtotal: Number(orderData.subtotal) || 0,
      deliveryFee: Number(orderData.deliveryFee) || 0,
      fulfillment: orderData.fulfillment || "delivery",
      orderStatus: orderData.orderStatus || "Received",
      notes: orderData.notes || "",
      createdAt: serverTimestamp()
    };

    const docRef = await addDoc(ordersCollection, payload);
    return { success: true, orderId: docRef.id, data: payload };
  } catch (error) {
    console.error("Save Order Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Fetch All Orders for a User from Firestore ('orders' collection)
 */
export async function getUserOrders(uid) {
  try {
    if (!uid) return { success: false, orders: [] };
    const ordersCollection = collection(db, "orders");
    
    // First try ordered query
    try {
      const q = query(
        ordersCollection,
        where("userId", "==", uid),
        orderBy("createdAt", "desc")
      );
      const querySnapshot = await getDocs(q);
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      return { success: true, orders };
    } catch (indexError) {
      // Fallback without orderBy in case composite index is not created yet
      console.warn("Firestore ordered query failed (composite index might be pending), falling back to client sort:", indexError);
      const fallbackQuery = query(ordersCollection, where("userId", "==", uid));
      const querySnapshot = await getDocs(fallbackQuery);
      const orders = [];
      querySnapshot.forEach((doc) => {
        orders.push({
          id: doc.id,
          ...doc.data()
        });
      });
      // Sort in memory by createdAt
      orders.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      return { success: true, orders };
    }
  } catch (error) {
    console.error("Fetch Orders Error:", error);
    return { success: false, error: error.message, orders: [] };
  }
}

// Export Auth & DB instances for any advanced needs
export { auth, db };
