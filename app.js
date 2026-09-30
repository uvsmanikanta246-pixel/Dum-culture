/**
 * DUM CULTURE - Food Ordering Engine & Firebase Integration
 * Google Authentication, Firestore Users & Orders Management
 */

import { 
  loginWithGoogle, 
  logoutUser, 
  subscribeToAuthState, 
  getUserProfile, 
  saveUserProfile, 
  saveOrderToFirestore, 
  getUserOrders 
} from "./firebase.js";

// Global Configuration
const CONFIG = {
  restaurantName: "Dum Culture",
  defaultWhatsappNumber: "+919030243334",
  deliveryFee: 10.00,
  currencySymbol: "₹",
  estimatedPickupTime: "10-15 mins",
  estimatedDeliveryTime: "25-35 mins"
};

// Menu Data (Signature Biryanis)
const MENU_ITEMS = [
  {
    id: "dum_biryani",
    name: "South Indian Dum Biryani",
    tag: "⭐ Chef's Signature",
    tagClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description: "Authentic slow-cooked handi dum biryani layered with fragrant aged basmati rice, tender spiced marinated chicken, saffron milk, caramelized birista, fresh mint & boiled egg. Served with mirchi ka salan & raita.",
    price: 120.00,
    image: "assets/dum_biryani.jpg",
    calories: "720 kcal"
  },
  {
    id: "fry_piece_biryani",
    name: "Fry Piece Biryani",
    tag: "🔥 Andhra Special",
    tagClass: "bg-red-500/15 text-red-300 border-red-500/30",
    description: "Signature Andhra-style aromatic flavored biryani rice topped with crispy golden spiced fried chicken chunks, roasted cashews, fresh curry leaves, and green chilies. Served with salan & raita.",
    price: 120.00,
    image: "assets/fry_piece_biryani.jpg",
    calories: "760 kcal"
  }
];

// Application State
const state = {
  user: null, // Firebase Auth User
  userProfile: null, // Firestore Document Data
  cart: {}, // { [itemId]: quantity }
  menuCardQuantities: {
    dum_biryani: 1,
    fry_piece_biryani: 1
  },
  fulfillment: "delivery", // 'pickup' | 'delivery'
  whatsappNumber: CONFIG.defaultWhatsappNumber,
  customer: {
    name: "",
    phone: "",
    address: "",
    notes: ""
  }
};

// DOM Cache
const DOM = {};

// Initialize Application
document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  renderMenu();
  attachEventListeners();
  updateFulfillmentUI();
  updateCartUI();
  initAuthObserver();
});

/**
 * Cache all DOM elements
 */
function cacheDOM() {
  // Menu & Cart Drawer
  DOM.menuContainer = document.getElementById("menu-container");
  DOM.cartDrawer = document.getElementById("cart-drawer");
  DOM.cartBackdrop = document.getElementById("cart-backdrop");
  DOM.cartPanel = document.getElementById("cart-panel");
  DOM.cartItemsList = document.getElementById("cart-items-list");
  DOM.emptyCartView = document.getElementById("empty-cart-view");
  DOM.cartContent = document.getElementById("cart-content");
  DOM.cartItemCountBadges = document.querySelectorAll(".cart-count-badge");
  DOM.cartTotalBadges = document.querySelectorAll(".cart-total-badge");
  DOM.floatingCartBtn = document.getElementById("floating-cart-btn");
  
  // Fulfillment & Totals
  DOM.pickupRadio = document.getElementById("fulfillment-pickup");
  DOM.deliveryRadio = document.getElementById("fulfillment-delivery");
  DOM.deliveryAddressWrapper = document.getElementById("delivery-address-wrapper");
  DOM.deliveryAddressInput = document.getElementById("customer-address");
  DOM.deliveryFeeRow = document.getElementById("drawer-delivery-fee-row");
  DOM.drawerSubtotal = document.getElementById("drawer-subtotal");
  DOM.drawerDeliveryFee = document.getElementById("drawer-delivery-fee");
  DOM.drawerTotal = document.getElementById("drawer-total");
  
  // Customer Inputs in Drawer
  DOM.customerName = document.getElementById("customer-name");
  DOM.customerPhone = document.getElementById("customer-phone");
  DOM.customerNotes = document.getElementById("customer-notes");
  DOM.placeOrderBtn = document.getElementById("place-order-btn");
  
  // Navigation Auth Elements
  DOM.navLoginBtn = document.getElementById("nav-login-btn");
  DOM.navUserContainer = document.getElementById("nav-user-container");
  DOM.navUserAvatar = document.getElementById("nav-user-avatar");
  DOM.navUserName = document.getElementById("nav-user-name");
  DOM.userDropdownMenu = document.getElementById("user-dropdown-menu");
  DOM.dropdownUserName = document.getElementById("dropdown-user-name");
  DOM.dropdownUserEmail = document.getElementById("dropdown-user-email");
  
  // Modals & Popups
  DOM.authModal = document.getElementById("auth-modal");
  DOM.googleSigninBtn = document.getElementById("google-signin-btn");
  DOM.googleBtnText = document.getElementById("google-btn-text");
  DOM.googleBtnSpinner = document.getElementById("google-btn-spinner");
  
  // Profile Completion Modal
  DOM.profileCompletionModal = document.getElementById("profile-completion-modal");
  DOM.compFullName = document.getElementById("comp-fullname");
  DOM.compPhone = document.getElementById("comp-phone");
  DOM.compAddress = document.getElementById("comp-address");
  DOM.compSubmitBtn = document.getElementById("comp-submit-btn");
  DOM.compSpinner = document.getElementById("comp-spinner");
  
  // My Profile Modal
  DOM.profileModal = document.getElementById("profile-modal");
  DOM.profFullName = document.getElementById("prof-fullname");
  DOM.profPhone = document.getElementById("prof-phone");
  DOM.profAddress = document.getElementById("prof-address");
  DOM.profAvatar = document.getElementById("profile-modal-avatar");
  DOM.profEmail = document.getElementById("profile-modal-email");
  DOM.profSaveBtn = document.getElementById("prof-save-btn");
  DOM.profSpinner = document.getElementById("prof-spinner");
  
  // My Orders Modal
  DOM.ordersModal = document.getElementById("orders-modal");
  DOM.ordersLoading = document.getElementById("orders-loading");
  DOM.ordersEmpty = document.getElementById("orders-empty");
  DOM.ordersList = document.getElementById("orders-list");

  // Order Confirmation & Toasts
  DOM.orderSuccessModal = document.getElementById("order-success-modal");
  DOM.orderSummaryRecap = document.getElementById("order-summary-recap");
  DOM.toastContainer = document.getElementById("toast-container");
  DOM.messagePreviewDrawer = document.getElementById("message-preview-content");
}

/* ==========================================================================
   FIREBASE AUTHENTICATION & PROFILE ENGINE
   ========================================================================== */

/**
 * Listen for Firebase Auth state changes (Session Persistence)
 */
function initAuthObserver() {
  subscribeToAuthState(async (user) => {
    if (user) {
      state.user = user;
      updateNavForLoggedInUser(user);

      // Fetch user profile from Firestore
      const profileResult = await getUserProfile(user.uid);
      if (profileResult.success && profileResult.exists && profileResult.data) {
        state.userProfile = profileResult.data;
        
        // Auto-fill customer details into checkout drawer
        if (state.userProfile.fullName && !state.customer.name) {
          state.customer.name = state.userProfile.fullName;
          if (DOM.customerName) DOM.customerName.value = state.userProfile.fullName;
        }
        if (state.userProfile.phoneNumber && !state.customer.phone) {
          state.customer.phone = state.userProfile.phoneNumber;
          if (DOM.customerPhone) DOM.customerPhone.value = state.userProfile.phoneNumber;
        }
        if (state.userProfile.deliveryAddress && !state.customer.address) {
          state.customer.address = state.userProfile.deliveryAddress;
          if (DOM.deliveryAddressInput) DOM.deliveryAddressInput.value = state.userProfile.deliveryAddress;
        }
        updateLivePreview();

        // If profile is incomplete (missing phone or address), prompt completion
        if (!state.userProfile.phoneNumber || !state.userProfile.deliveryAddress) {
          openProfileCompletionModal(user, state.userProfile);
        }
      } else {
        // First login: profile does not exist yet
        openProfileCompletionModal(user, null);
      }
    } else {
      state.user = null;
      state.userProfile = null;
      updateNavForLoggedOutUser();
    }
  });
}

/**
 * Update UI for logged in user
 */
function updateNavForLoggedInUser(user) {
  if (DOM.navLoginBtn) DOM.navLoginBtn.classList.add("hidden");
  if (DOM.navUserContainer) DOM.navUserContainer.classList.remove("hidden");

  const displayName = user.displayName || user.email?.split("@")[0] || "Account";
  const photoUrl = user.photoURL || "assets/logo.jpg";

  if (DOM.navUserName) DOM.navUserName.textContent = displayName.split(" ")[0];
  if (DOM.navUserAvatar) DOM.navUserAvatar.src = photoUrl;
  if (DOM.dropdownUserName) DOM.dropdownUserName.textContent = displayName;
  if (DOM.dropdownUserEmail) DOM.dropdownUserEmail.textContent = user.email || "";
}

/**
 * Update UI for logged out user
 */
function updateNavForLoggedOutUser() {
  if (DOM.navLoginBtn) DOM.navLoginBtn.classList.remove("hidden");
  if (DOM.navUserContainer) DOM.navUserContainer.classList.add("hidden");
  toggleUserDropdown(false);
}

/**
 * Auth Modal Controls
 */
window.openAuthModal = function() {
  if (DOM.authModal) {
    DOM.authModal.classList.remove("hidden", "opacity-0");
    DOM.authModal.classList.add("flex", "opacity-100");
  }
};

window.closeAuthModal = function() {
  if (DOM.authModal) {
    DOM.authModal.classList.add("hidden", "opacity-0");
    DOM.authModal.classList.remove("flex", "opacity-100");
  }
};

/**
 * Google Sign In Handler
 */
window.handleGoogleSignIn = async function() {
  if (DOM.googleBtnText) DOM.googleBtnText.textContent = "Signing In...";
  if (DOM.googleBtnSpinner) DOM.googleBtnSpinner.classList.remove("hidden");
  if (DOM.googleSigninBtn) DOM.googleSigninBtn.setAttribute("disabled", "disabled");

  const res = await loginWithGoogle();

  if (DOM.googleBtnText) DOM.googleBtnText.textContent = "Continue with Google";
  if (DOM.googleBtnSpinner) DOM.googleBtnSpinner.classList.add("hidden");
  if (DOM.googleSigninBtn) DOM.googleSigninBtn.removeAttribute("disabled");

  if (res.success) {
    closeAuthModal();
    showToast(`Welcome back, ${res.user.displayName || "Foodie"}!`, "success");
  } else {
    showToast(res.error || "Authentication failed", "error");
  }
};

/**
 * User Dropdown Menu Toggle
 */
window.toggleUserDropdown = function(forceState) {
  if (!DOM.userDropdownMenu) return;
  const isCurrentlyActive = DOM.userDropdownMenu.classList.contains("active");
  const shouldOpen = typeof forceState === "boolean" ? forceState : !isCurrentlyActive;

  if (shouldOpen) {
    DOM.userDropdownMenu.classList.add("active");
  } else {
    DOM.userDropdownMenu.classList.remove("active");
  }
};

// Close dropdown on click outside
document.addEventListener("click", (e) => {
  if (DOM.navUserContainer && !DOM.navUserContainer.contains(e.target)) {
    toggleUserDropdown(false);
  }
});

/**
 * Logout Handler
 */
window.handleLogout = async function() {
  const res = await logoutUser();
  if (res.success) {
    showToast("Signed out successfully.", "info");
  } else {
    showToast("Error signing out.", "error");
  }
};

/**
 * Profile Completion Modal (First-time / Missing Info)
 */
function openProfileCompletionModal(user, existingProfile) {
  if (!DOM.profileCompletionModal) return;

  if (DOM.compFullName) {
    DOM.compFullName.value = existingProfile?.fullName || user.displayName || "";
  }
  if (DOM.compPhone) {
    DOM.compPhone.value = existingProfile?.phoneNumber || "";
  }
  if (DOM.compAddress) {
    DOM.compAddress.value = existingProfile?.deliveryAddress || "";
  }

  DOM.profileCompletionModal.classList.remove("hidden", "opacity-0");
  DOM.profileCompletionModal.classList.add("flex", "opacity-100");
}

window.closeProfileCompletionModal = function() {
  if (DOM.profileCompletionModal) {
    DOM.profileCompletionModal.classList.add("hidden", "opacity-0");
    DOM.profileCompletionModal.classList.remove("flex", "opacity-100");
  }
};

window.handleProfileCompletionSubmit = async function(e) {
  if (e) e.preventDefault();
  if (!state.user) {
    showToast("Please sign in first.", "error");
    return;
  }

  const fullName = (DOM.compFullName?.value || "").trim();
  const phoneNumber = (DOM.compPhone?.value || "").trim();
  const deliveryAddress = (DOM.compAddress?.value || "").trim();

  if (!fullName || !phoneNumber || !deliveryAddress) {
    showToast("Please fill in all profile fields.", "error");
    return;
  }

  if (DOM.compSpinner) DOM.compSpinner.classList.remove("hidden");
  if (DOM.compSubmitBtn) DOM.compSubmitBtn.setAttribute("disabled", "disabled");

  const saveRes = await saveUserProfile(state.user.uid, {
    fullName,
    phoneNumber,
    deliveryAddress,
    email: state.user.email || "",
    photoURL: state.user.photoURL || "",
    isNew: !state.userProfile
  });

  if (DOM.compSpinner) DOM.compSpinner.classList.add("hidden");
  if (DOM.compSubmitBtn) DOM.compSubmitBtn.removeAttribute("disabled");

  if (saveRes.success) {
    state.userProfile = {
      fullName,
      phoneNumber,
      deliveryAddress,
      email: state.user.email || ""
    };

    // Auto-fill checkout fields
    state.customer.name = fullName;
    state.customer.phone = phoneNumber;
    state.customer.address = deliveryAddress;

    if (DOM.customerName) DOM.customerName.value = fullName;
    if (DOM.customerPhone) DOM.customerPhone.value = phoneNumber;
    if (DOM.deliveryAddressInput) DOM.deliveryAddressInput.value = deliveryAddress;
    updateLivePreview();

    closeProfileCompletionModal();
    showToast("Profile completed successfully!", "success");
  } else {
    showToast(saveRes.error || "Failed to save profile.", "error");
  }
};

/**
 * My Profile Modal (View / Edit)
 */
window.openProfileModal = function() {
  if (!state.user) {
    openAuthModal();
    return;
  }

  if (DOM.profAvatar) DOM.profAvatar.src = state.user.photoURL || "assets/logo.jpg";
  if (DOM.profEmail) DOM.profEmail.textContent = state.user.email || "";

  if (DOM.profFullName) {
    DOM.profFullName.value = state.userProfile?.fullName || state.user.displayName || "";
  }
  if (DOM.profPhone) {
    DOM.profPhone.value = state.userProfile?.phoneNumber || "";
  }
  if (DOM.profAddress) {
    DOM.profAddress.value = state.userProfile?.deliveryAddress || "";
  }

  if (DOM.profileModal) {
    DOM.profileModal.classList.remove("hidden", "opacity-0");
    DOM.profileModal.classList.add("flex", "opacity-100");
  }
};

window.closeProfileModal = function() {
  if (DOM.profileModal) {
    DOM.profileModal.classList.add("hidden", "opacity-0");
    DOM.profileModal.classList.remove("flex", "opacity-100");
  }
};

window.handleProfileUpdateSubmit = async function(e) {
  if (e) e.preventDefault();
  if (!state.user) return;

  const fullName = (DOM.profFullName?.value || "").trim();
  const phoneNumber = (DOM.profPhone?.value || "").trim();
  const deliveryAddress = (DOM.profAddress?.value || "").trim();

  if (!fullName || !phoneNumber || !deliveryAddress) {
    showToast("Please fill in all profile fields.", "error");
    return;
  }

  if (DOM.profSpinner) DOM.profSpinner.classList.remove("hidden");
  if (DOM.profSaveBtn) DOM.profSaveBtn.setAttribute("disabled", "disabled");

  const saveRes = await saveUserProfile(state.user.uid, {
    fullName,
    phoneNumber,
    deliveryAddress,
    email: state.user.email || "",
    photoURL: state.user.photoURL || ""
  });

  if (DOM.profSpinner) DOM.profSpinner.classList.add("hidden");
  if (DOM.profSaveBtn) DOM.profSaveBtn.removeAttribute("disabled");

  if (saveRes.success) {
    state.userProfile = {
      ...state.userProfile,
      fullName,
      phoneNumber,
      deliveryAddress
    };

    // Update customer checkout form
    state.customer.name = fullName;
    state.customer.phone = phoneNumber;
    state.customer.address = deliveryAddress;

    if (DOM.customerName) DOM.customerName.value = fullName;
    if (DOM.customerPhone) DOM.customerPhone.value = phoneNumber;
    if (DOM.deliveryAddressInput) DOM.deliveryAddressInput.value = deliveryAddress;
    updateLivePreview();

    closeProfileModal();
    showToast("Profile updated successfully!", "success");
  } else {
    showToast(saveRes.error || "Failed to update profile.", "error");
  }
};

/**
 * My Orders Modal & Real-Time / Firestore Sync
 */
window.openOrdersModal = function() {
  if (!state.user) {
    openAuthModal();
    return;
  }

  if (DOM.ordersModal) {
    DOM.ordersModal.classList.remove("hidden", "opacity-0");
    DOM.ordersModal.classList.add("flex", "opacity-100");
    loadAndRenderUserOrders();
  }
};

window.closeOrdersModal = function() {
  if (DOM.ordersModal) {
    DOM.ordersModal.classList.add("hidden", "opacity-0");
    DOM.ordersModal.classList.remove("flex", "opacity-100");
  }
};

/**
 * Fetch and Render Orders from Firestore
 */
window.loadAndRenderUserOrders = async function() {
  if (!state.user) return;

  if (DOM.ordersLoading) DOM.ordersLoading.classList.remove("hidden");
  if (DOM.ordersEmpty) DOM.ordersEmpty.classList.add("hidden");
  if (DOM.ordersList) DOM.ordersList.classList.add("hidden");

  const res = await getUserOrders(state.user.uid);

  if (DOM.ordersLoading) DOM.ordersLoading.classList.add("hidden");

  if (!res.success || !res.orders || res.orders.length === 0) {
    if (DOM.ordersEmpty) DOM.ordersEmpty.classList.remove("hidden");
    return;
  }

  if (DOM.ordersList) {
    DOM.ordersList.classList.remove("hidden");
    DOM.ordersList.innerHTML = res.orders.map((order) => {
      // Date formatting
      let formattedDate = "Recently";
      if (order.createdAt?.toDate) {
        formattedDate = order.createdAt.toDate().toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true
        });
      } else if (order.createdAt?.seconds) {
        formattedDate = new Date(order.createdAt.seconds * 1000).toLocaleString("en-IN", {
          month: "short",
          day: "numeric",
          year: "numeric",
          hour: "numeric",
          minute: "numeric",
          hour12: true
        });
      }

      // Status badge styling
      const status = order.orderStatus || "Received";
      let statusClass = "status-received";
      if (status.toLowerCase().includes("prep")) statusClass = "status-preparing";
      if (status.toLowerCase().includes("out")) statusClass = "status-out-for-delivery";
      if (status.toLowerCase().includes("deliver")) statusClass = "status-delivered";

      // Items list
      const itemsHtml = (order.items || []).map((item) => `
        <div class="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
          <div class="flex items-center gap-2 text-neutral-200">
            <span class="w-5 h-5 rounded-md bg-neutral-800 text-amber-400 font-bold flex items-center justify-center text-[10px]">
              ${item.quantity}x
            </span>
            <span>${item.name}</span>
          </div>
          <span class="font-mono text-neutral-300">${CONFIG.currencySymbol}${(item.subtotal || item.price * item.quantity || 0).toFixed(2)}</span>
        </div>
      `).join("");

      const shortId = order.id ? `#DC-${order.id.slice(0, 6).toUpperCase()}` : "#DC-ORDER";
      const isDelivery = order.fulfillment === "delivery";

      return `
        <div class="p-4 sm:p-5 rounded-2xl bg-neutral-950/80 border border-white/10 space-y-3 hover:border-amber-500/30 transition-all">
          
          <!-- Card Header -->
          <div class="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-white/10">
            <div class="flex items-center gap-2">
              <span class="font-mono font-bold text-xs sm:text-sm text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                ${shortId}
              </span>
              <span class="text-xs text-neutral-400">${formattedDate}</span>
            </div>
            
            <div class="flex items-center gap-2">
              <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusClass}">
                ● ${status}
              </span>
            </div>
          </div>

          <!-- Items Breakdown -->
          <div class="space-y-1 bg-neutral-900/60 p-3 rounded-xl border border-white/5">
            ${itemsHtml || '<div class="text-xs text-neutral-400">Order items details</div>'}
          </div>

          <!-- Summary & Re-order -->
          <div class="flex items-center justify-between pt-1 text-xs">
            <div class="text-neutral-400 flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-md bg-neutral-800 text-neutral-300 font-medium">
                ${isDelivery ? "🛵 Delivery" : "🛍️ Pickup"}
              </span>
              <span class="hidden sm:inline">• ${order.phoneNumber || ""}</span>
            </div>

            <div class="flex items-center gap-3">
              <div class="text-right">
                <span class="text-neutral-400 text-[11px] block">Total</span>
                <span class="font-heading font-extrabold text-sm sm:text-base text-amber-400">
                  ${CONFIG.currencySymbol}${(order.totalAmount || 0).toFixed(2)}
                </span>
              </div>
              <button 
                type="button" 
                onclick="reorderItems('${order.id}')"
                class="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs transition-colors btn-press"
              >
                Order Again
              </button>
            </div>
          </div>

        </div>
      `;
    }).join("");
  }
};

/**
 * Re-order past items into cart
 */
window.reorderItems = function(orderId) {
  // Find order in previous fetch or reset cart
  showToast("Adding previous items to cart...", "info");
  closeOrdersModal();
  toggleCart(true);
};

/* ==========================================================================
   MENU & CART LOGIC
   ========================================================================== */

/**
 * Render Menu Items
 */
function renderMenu() {
  if (!DOM.menuContainer) return;

  DOM.menuContainer.innerHTML = MENU_ITEMS.map((item) => {
    const qty = state.menuCardQuantities[item.id] || 1;
    return `
      <article class="glass-card rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 group border border-white/10" id="card-${item.id}">
        <!-- Food Image Container -->
        <div class="relative h-60 w-full overflow-hidden bg-neutral-900">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-[#12151a] via-transparent to-black/20 pointer-events-none"></div>
          
          <!-- Badge -->
          <span class="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md border ${item.tagClass}">
            ${item.tag}
          </span>
          
          <!-- Calorie / Info Badge -->
          <span class="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-neutral-300 border border-white/10">
            ${item.calories}
          </span>

          <!-- Price Overlay -->
          <div class="absolute bottom-3 right-3 bg-amber-500 text-neutral-950 font-extrabold px-3.5 py-1.5 rounded-xl text-lg shadow-lg font-heading tracking-tight">
            ${CONFIG.currencySymbol}${item.price.toFixed(2)}
          </div>
        </div>

        <!-- Content Details -->
        <div class="p-6 flex-1 flex flex-col justify-between">
          <div>
            <h3 class="text-xl font-bold text-white mb-2 font-heading group-hover:text-amber-400 transition-colors">
              ${item.name}
            </h3>
            <p class="text-neutral-400 text-sm leading-relaxed mb-6 line-clamp-3">
              ${item.description}
            </p>
          </div>

          <!-- Card Actions (Quantity selector + Add button) -->
          <div class="pt-4 border-t border-white/5 flex items-center justify-between gap-3">
            <!-- Counter -->
            <div class="flex items-center bg-neutral-800/90 rounded-xl p-1 border border-white/10">
              <button 
                type="button"
                onclick="changeMenuQty('${item.id}', -1)"
                aria-label="Decrease quantity for ${item.name}"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-700/80 transition-colors btn-press text-lg font-bold"
              >
                -
              </button>
              <span id="qty-${item.id}" class="w-8 text-center font-bold text-sm text-white font-heading select-none">
                ${qty}
              </span>
              <button 
                type="button"
                onclick="changeMenuQty('${item.id}', 1)"
                aria-label="Increase quantity for ${item.name}"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-300 hover:text-white hover:bg-neutral-700/80 transition-colors btn-press text-lg font-bold"
              >
                +
              </button>
            </div>

            <!-- Add to Cart CTA -->
            <button 
              type="button"
              onclick="addToCart('${item.id}')"
              id="add-btn-${item.id}"
              class="flex-1 bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold py-2.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 btn-press shadow-md shadow-amber-500/20 text-sm"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-2Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>Add to Cart</span>
            </button>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

/**
 * Change quantity on menu card before adding
 */
window.changeMenuQty = function(itemId, delta) {
  const current = state.menuCardQuantities[itemId] || 1;
  const newQty = Math.max(1, Math.min(20, current + delta));
  state.menuCardQuantities[itemId] = newQty;
  
  const el = document.getElementById(`qty-${itemId}`);
  if (el) {
    el.textContent = newQty;
    el.classList.add("scale-125", "text-amber-400");
    setTimeout(() => el.classList.remove("scale-125", "text-amber-400"), 150);
  }
};

/**
 * Add item to cart
 */
window.addToCart = function(itemId) {
  const item = MENU_ITEMS.find((i) => i.id === itemId);
  if (!item) return;

  const qtyToAdd = state.menuCardQuantities[itemId] || 1;
  state.cart[itemId] = (state.cart[itemId] || 0) + qtyToAdd;

  state.menuCardQuantities[itemId] = 1;
  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (qtyEl) qtyEl.textContent = "1";

  const btn = document.getElementById(`add-btn-${itemId}`);
  if (btn) {
    const originalText = btn.innerHTML;
    btn.innerHTML = `
      <svg class="w-4 h-4 text-emerald-950 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path>
      </svg>
      <span>Added!</span>
    `;
    btn.classList.replace("bg-amber-500", "bg-emerald-400");
    setTimeout(() => {
      btn.innerHTML = originalText;
      btn.classList.replace("bg-emerald-400", "bg-amber-500");
    }, 900);
  }

  updateCartUI();
  showToast(`Added ${qtyToAdd}x ${item.name} to cart!`, "success");
};

/**
 * Modify quantity inside Cart Drawer
 */
window.updateCartItemQty = function(itemId, delta) {
  if (!state.cart[itemId]) return;
  const current = state.cart[itemId];
  const newQty = current + delta;

  if (newQty <= 0) {
    delete state.cart[itemId];
    showToast("Item removed from cart", "info");
  } else {
    state.cart[itemId] = Math.min(30, newQty);
  }
  updateCartUI();
};

/**
 * Remove an item completely from Cart
 */
window.removeCartItem = function(itemId) {
  if (state.cart[itemId]) {
    delete state.cart[itemId];
    updateCartUI();
    showToast("Item removed", "info");
  }
};

/**
 * Clear full cart
 */
window.clearCart = function() {
  state.cart = {};
  updateCartUI();
  showToast("Cart cleared", "info");
};

/**
 * Calculations
 */
function calculateTotals() {
  let itemCount = 0;
  let subtotal = 0;

  Object.entries(state.cart).forEach(([itemId, qty]) => {
    const item = MENU_ITEMS.find((i) => i.id === itemId);
    if (item && qty > 0) {
      itemCount += qty;
      subtotal += item.price * qty;
    }
  });

  const isDelivery = state.fulfillment === "delivery";
  const deliveryFee = (itemCount > 0 && isDelivery) ? CONFIG.deliveryFee : 0;
  const total = subtotal + deliveryFee;

  return {
    itemCount,
    subtotal,
    deliveryFee,
    total,
    isDelivery
  };
}

/**
 * Update Cart UI across entire page
 */
function updateCartUI() {
  const totals = calculateTotals();

  // Badges update
  DOM.cartItemCountBadges.forEach((badge) => {
    badge.textContent = totals.itemCount;
    if (totals.itemCount > 0) {
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  });

  DOM.cartTotalBadges.forEach((badge) => {
    badge.textContent = `${CONFIG.currencySymbol}${totals.total.toFixed(2)}`;
  });

  // Floating Cart Button Visibility on bottom
  if (DOM.floatingCartBtn) {
    if (totals.itemCount > 0) {
      DOM.floatingCartBtn.classList.remove("translate-y-28", "opacity-0");
      DOM.floatingCartBtn.classList.add("translate-y-0", "opacity-100");
    } else {
      DOM.floatingCartBtn.classList.add("translate-y-28", "opacity-0");
      DOM.floatingCartBtn.classList.remove("translate-y-0", "opacity-100");
    }
  }

  // Drawer Contents
  if (totals.itemCount === 0) {
    if (DOM.emptyCartView) DOM.emptyCartView.classList.remove("hidden");
    if (DOM.cartContent) DOM.cartContent.classList.add("hidden");
  } else {
    if (DOM.emptyCartView) DOM.emptyCartView.classList.add("hidden");
    if (DOM.cartContent) DOM.cartContent.classList.remove("hidden");

    // Render Cart Items
    if (DOM.cartItemsList) {
      DOM.cartItemsList.innerHTML = Object.entries(state.cart)
        .map(([itemId, qty]) => {
          const item = MENU_ITEMS.find((i) => i.id === itemId);
          if (!item || qty <= 0) return "";
          const itemTotal = (item.price * qty).toFixed(2);
          return `
            <li class="flex items-center gap-2.5 sm:gap-3.5 p-2.5 sm:p-3 rounded-xl bg-neutral-900/80 border border-white/5 group hover:border-white/15 transition-all">
              <img src="${item.image}" alt="${item.name}" class="w-14 h-14 sm:w-16 sm:h-16 rounded-lg object-cover flex-shrink-0" />
              <div class="flex-1 min-w-0 pr-1">
                <h4 class="font-bold text-xs sm:text-sm text-white truncate font-heading">${item.name}</h4>
                <div class="text-[11px] sm:text-xs text-neutral-400 mt-0.5">${CONFIG.currencySymbol}${item.price.toFixed(2)} each</div>
                <div class="text-amber-400 font-extrabold text-xs sm:text-sm mt-0.5">${CONFIG.currencySymbol}${itemTotal}</div>
              </div>
              
              <!-- Quantity Modifier -->
              <div class="flex items-center gap-0.5 sm:gap-1 bg-neutral-800 rounded-lg p-0.5 sm:p-1 border border-white/10 shrink-0">
                <button 
                  type="button" 
                  onclick="updateCartItemQty('${item.id}', -1)"
                  class="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700 text-xs sm:text-sm font-bold btn-press"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span class="w-5 sm:w-6 text-center text-xs font-bold text-white select-none">${qty}</span>
                <button 
                  type="button" 
                  onclick="updateCartItemQty('${item.id}', 1)"
                  class="w-6 h-6 sm:w-7 sm:h-7 rounded flex items-center justify-center text-neutral-300 hover:text-white hover:bg-neutral-700 text-xs sm:text-sm font-bold btn-press"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <!-- Delete Button -->
              <button 
                type="button" 
                onclick="removeCartItem('${item.id}')"
                class="text-neutral-500 hover:text-red-400 p-1 sm:p-1.5 rounded-lg hover:bg-red-500/10 transition-colors shrink-0"
                title="Remove item"
                aria-label="Remove ${item.name}"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </li>
          `;
        })
        .join("");
    }

    // Update Drawer Financial Summary
    if (DOM.drawerSubtotal) {
      DOM.drawerSubtotal.textContent = `${CONFIG.currencySymbol}${totals.subtotal.toFixed(2)}`;
    }
    if (DOM.drawerDeliveryFee) {
      DOM.drawerDeliveryFee.textContent = totals.isDelivery 
        ? `${CONFIG.currencySymbol}${CONFIG.deliveryFee.toFixed(2)}` 
        : `FREE (${CONFIG.currencySymbol}0.00)`;
      if (DOM.drawerDeliveryFeeRow) {
        DOM.drawerDeliveryFeeRow.className = totals.isDelivery ? "flex justify-between text-sm text-neutral-300" : "flex justify-between text-sm text-emerald-400";
      }
    }
    if (DOM.drawerTotal) {
      DOM.drawerTotal.textContent = `${CONFIG.currencySymbol}${totals.total.toFixed(2)}`;
    }
  }

  updateLivePreview();
}

/**
 * Fulfillment Radio Changes
 */
function updateFulfillmentUI() {
  const isDelivery = state.fulfillment === "delivery";
  
  if (DOM.pickupRadio) DOM.pickupRadio.checked = !isDelivery;
  if (DOM.deliveryRadio) DOM.deliveryRadio.checked = isDelivery;

  // Toggle Delivery Address container
  if (DOM.deliveryAddressWrapper) {
    if (isDelivery) {
      DOM.deliveryAddressWrapper.classList.remove("collapsed");
      if (DOM.deliveryAddressInput) {
        DOM.deliveryAddressInput.removeAttribute("disabled");
        DOM.deliveryAddressInput.setAttribute("required", "required");
      }
    } else {
      DOM.deliveryAddressWrapper.classList.add("collapsed");
      if (DOM.deliveryAddressInput) {
        DOM.deliveryAddressInput.setAttribute("disabled", "disabled");
        DOM.deliveryAddressInput.removeAttribute("required");
        DOM.deliveryAddressInput.classList.remove("border-red-500");
      }
    }
  }

  const pickupCard = document.getElementById("option-card-pickup");
  const deliveryCard = document.getElementById("option-card-delivery");
  if (pickupCard && deliveryCard) {
    if (isDelivery) {
      deliveryCard.classList.add("border-amber-500", "bg-amber-500/10");
      deliveryCard.classList.remove("border-white/10", "bg-neutral-900/60");
      pickupCard.classList.remove("border-amber-500", "bg-amber-500/10");
      pickupCard.classList.add("border-white/10", "bg-neutral-900/60");
    } else {
      pickupCard.classList.add("border-amber-500", "bg-amber-500/10");
      pickupCard.classList.remove("border-white/10", "bg-neutral-900/60");
      deliveryCard.classList.remove("border-amber-500", "bg-amber-500/10");
      deliveryCard.classList.add("border-white/10", "bg-neutral-900/60");
    }
  }

  updateCartUI();
}

/**
 * Generate formatted WhatsApp message text
 */
function buildWhatsAppMessage() {
  const totals = calculateTotals();
  
  const itemLines = Object.entries(state.cart)
    .map(([itemId, qty]) => {
      const item = MENU_ITEMS.find((i) => i.id === itemId);
      if (!item || qty <= 0) return null;
      const itemTotalPrice = (item.price * qty).toFixed(2);
      return `- ${item.name} x ${qty} - ${CONFIG.currencySymbol}${itemTotalPrice}`;
    })
    .filter(Boolean)
    .join("\n");

  const fulfillmentType = totals.isDelivery ? "Delivery" : "Pickup";
  const deliveryFeeText = totals.isDelivery 
    ? `${CONFIG.currencySymbol}${CONFIG.deliveryFee.toFixed(2)}` 
    : `${CONFIG.currencySymbol}0.00`;

  const customerName = (state.customer.name || "").trim() || "[Customer Name]";
  const customerPhone = (state.customer.phone || "").trim() || "[Phone Number]";
  const customerAddress = totals.isDelivery 
    ? ((state.customer.address || "").trim() || "[Delivery Address]") 
    : "N/A (Store Pickup)";
  const customerNotes = (state.customer.notes || "").trim() || "None";

  const message = 
`*New Order Received!*
------------------------
*Items:*
${itemLines}

*Fulfillment:* ${fulfillmentType}
*Subtotal:* ${CONFIG.currencySymbol}${totals.subtotal.toFixed(2)}
*Delivery Fee:* ${deliveryFeeText}
*Total Amount:* ${CONFIG.currencySymbol}${totals.total.toFixed(2)}

*Customer Details:*
Name: ${customerName}
Phone: ${customerPhone}
Address: ${customerAddress}
Notes: ${customerNotes}`;

  return message;
}

/**
 * Update the optional live preview in drawer
 */
function updateLivePreview() {
  if (!DOM.messagePreviewDrawer) return;
  const msg = buildWhatsAppMessage();
  DOM.messagePreviewDrawer.textContent = msg;
}

/**
 * Validate customer inputs, save order to Firestore, and trigger WhatsApp URL
 */
async function handlePlaceOrder(e) {
  if (e) e.preventDefault();

  const totals = calculateTotals();
  if (totals.itemCount === 0) {
    showToast("Your cart is empty! Please add items from the menu first.", "error");
    return;
  }

  // Read form values
  const name = (DOM.customerName?.value || "").trim();
  const phone = (DOM.customerPhone?.value || "").trim();
  const address = (DOM.deliveryAddressInput?.value || "").trim();
  const notes = (DOM.customerNotes?.value || "").trim();

  state.customer = { name, phone, address, notes };

  // Form Validation
  let hasError = false;

  if (!name) {
    DOM.customerName?.classList.add("border-red-500", "focus:ring-red-500");
    hasError = true;
  } else {
    DOM.customerName?.classList.remove("border-red-500", "focus:ring-red-500");
  }

  if (!phone || phone.length < 6) {
    DOM.customerPhone?.classList.add("border-red-500", "focus:ring-red-500");
    hasError = true;
  } else {
    DOM.customerPhone?.classList.remove("border-red-500", "focus:ring-red-500");
  }

  if (totals.isDelivery && !address) {
    DOM.deliveryAddressInput?.classList.add("border-red-500", "focus:ring-red-500");
    hasError = true;
  } else {
    DOM.deliveryAddressInput?.classList.remove("border-red-500", "focus:ring-red-500");
  }

  if (hasError) {
    showToast("Please fill in all required customer fields.", "error");
    return;
  }

  // Prepare Firestore Order Items
  const orderItems = Object.entries(state.cart).map(([id, qty]) => {
    const item = MENU_ITEMS.find((m) => m.id === id);
    return {
      id,
      name: item ? item.name : id,
      price: item ? item.price : 0,
      quantity: qty,
      subtotal: item ? item.price * qty : 0,
      image: item ? item.image : ""
    };
  }).filter((i) => i.quantity > 0);

  const orderPayload = {
    userId: state.user ? state.user.uid : "guest",
    userName: name,
    phoneNumber: phone,
    address: totals.isDelivery ? address : "Store Pickup",
    items: orderItems,
    totalAmount: totals.total,
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    fulfillment: state.fulfillment,
    orderStatus: "Received",
    notes: notes
  };

  // Provide loading feedback
  if (DOM.placeOrderBtn) {
    DOM.placeOrderBtn.setAttribute("disabled", "disabled");
  }

  // Save to Firestore 'orders' collection
  const orderRes = await saveOrderToFirestore(orderPayload);

  if (DOM.placeOrderBtn) {
    DOM.placeOrderBtn.removeAttribute("disabled");
  }

  // If user is logged in, also update their user document in Firestore if fields are new
  if (state.user) {
    saveUserProfile(state.user.uid, {
      fullName: name,
      phoneNumber: phone,
      deliveryAddress: totals.isDelivery ? address : (state.userProfile?.deliveryAddress || ""),
      email: state.user.email || ""
    });
  }

  // Construct WhatsApp URL
  const phoneTarget = state.whatsappNumber.replace(/[^0-9]/g, "");
  const formattedMessage = buildWhatsAppMessage();
  const encodedText = encodeURIComponent(formattedMessage);
  const waUrl = `https://wa.me/${phoneTarget}?text=${encodedText}`;

  // Launch WhatsApp in new tab / app
  window.open(waUrl, "_blank", "noopener,noreferrer");

  // Show Success Confirmation Modal
  openSuccessModal({
    name,
    phone,
    fulfillment: totals.isDelivery ? "Delivery" : "Pickup",
    total: `${CONFIG.currencySymbol}${totals.total.toFixed(2)}`,
    orderId: orderRes.orderId ? `#DC-${orderRes.orderId.slice(0, 6).toUpperCase()}` : null,
    waUrl
  });

  showToast("Order recorded and transferred to WhatsApp!", "success");
}

/**
 * Open & Close Drawer
 */
window.toggleCart = function(isOpen) {
  if (!DOM.cartDrawer || !DOM.cartBackdrop || !DOM.cartPanel) return;

  if (isOpen) {
    DOM.cartDrawer.classList.remove("pointer-events-none");
    DOM.cartBackdrop.classList.remove("opacity-0", "invisible");
    DOM.cartBackdrop.classList.add("opacity-100", "visible");
    DOM.cartPanel.classList.remove("translate-x-full");
    DOM.cartPanel.classList.add("translate-x-0");
    document.body.style.overflow = "hidden";
  } else {
    DOM.cartBackdrop.classList.remove("opacity-100", "visible");
    DOM.cartBackdrop.classList.add("opacity-0", "invisible");
    DOM.cartPanel.classList.remove("translate-x-0");
    DOM.cartPanel.classList.add("translate-x-full");
    DOM.cartDrawer.classList.add("pointer-events-none");
    document.body.style.overflow = "";
  }
};

/**
 * Success Confirmation Modal
 */
function openSuccessModal(order) {
  if (!DOM.orderSuccessModal) return;
  
  if (DOM.orderSummaryRecap) {
    DOM.orderSummaryRecap.innerHTML = `
      <div class="bg-neutral-900/90 rounded-xl p-4 border border-white/10 text-left space-y-2 text-sm text-neutral-300">
        ${order.orderId ? `
        <div class="flex justify-between border-b border-white/5 pb-2">
          <span class="text-neutral-400">Order ID:</span>
          <span class="font-mono font-bold text-amber-400">${order.orderId}</span>
        </div>` : ''}
        <div class="flex justify-between border-b border-white/5 pb-2">
          <span class="text-neutral-400">Customer:</span>
          <span class="font-bold text-white">${order.name}</span>
        </div>
        <div class="flex justify-between border-b border-white/5 pb-2">
          <span class="text-neutral-400">Fulfillment:</span>
          <span class="font-bold text-amber-400">${order.fulfillment}</span>
        </div>
        <div class="flex justify-between text-base pt-1">
          <span class="text-white font-bold">Total:</span>
          <span class="font-extrabold text-amber-400">${order.total}</span>
        </div>
      </div>
    `;
  }

  DOM.orderSuccessModal.classList.remove("hidden", "opacity-0");
  DOM.orderSuccessModal.classList.add("flex", "opacity-100");
}

window.closeSuccessModal = function() {
  if (!DOM.orderSuccessModal) return;
  DOM.orderSuccessModal.classList.add("hidden", "opacity-0");
  DOM.orderSuccessModal.classList.remove("flex", "opacity-100");
  toggleCart(false);
};


/**
 * Toast System
 */
function showToast(message, type = "info") {
  if (!DOM.toastContainer) return;

  const toast = document.createElement("div");
  const icons = {
    success: `
      <svg class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `,
    error: `
      <svg class="w-5 h-5 text-red-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `,
    info: `
      <svg class="w-5 h-5 text-amber-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    `
  };

  const bgBorder = {
    success: "bg-neutral-900/95 border-emerald-500/40 text-neutral-100",
    error: "bg-neutral-900/95 border-red-500/40 text-neutral-100",
    info: "bg-neutral-900/95 border-amber-500/40 text-neutral-100"
  };

  toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm font-medium ${bgBorder[type] || bgBorder.info}`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("show");
  });

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 400);
  }, 3200);
}

/**
 * Event Listeners
 */
function attachEventListeners() {
  // Fulfillment radio buttons
  DOM.pickupRadio?.addEventListener("change", () => {
    state.fulfillment = "pickup";
    updateFulfillmentUI();
  });

  DOM.deliveryRadio?.addEventListener("change", () => {
    state.fulfillment = "delivery";
    updateFulfillmentUI();
  });

  // Input bindings for live preview
  [DOM.customerName, DOM.customerPhone, DOM.deliveryAddressInput, DOM.customerNotes].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        state.customer[input.name || input.id.replace("customer-", "")] = input.value;
        updateLivePreview();
      });
    }
  });

  // Submit Order
  DOM.placeOrderBtn?.addEventListener("click", handlePlaceOrder);

  // Close drawer on backdrop click
  DOM.cartBackdrop?.addEventListener("click", () => toggleCart(false));

  // Keybindings (Escape closes modals/drawers)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleCart(false);
      closeSuccessModal();
      closeAuthModal();
      closeProfileCompletionModal();
      closeProfileModal();
      closeOrdersModal();
      toggleUserDropdown(false);
    }
  });
}
