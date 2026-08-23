/**
 * DUM CULTURE - WhatsApp Food Ordering Engine
 * Single-Page Conversion Focused Web Application
 */

// Global Configuration
const CONFIG = {
  restaurantName: "Dum Culture",
  // Default WhatsApp phone number (International format without '+' or spaces, e.g. 1234567890 or 919030243334)
  defaultWhatsappNumber: "+919030243334",
  deliveryFee: 10.00,
  currencySymbol: "₹",
  estimatedPickupTime: "10-15 mins",
  estimatedDeliveryTime: "25-35 mins"
};

// Menu Data (Limited Curated Menu - 2 Signature Biryanis)
const MENU_ITEMS = [
  {
    id: "dum_biryani",
    name: "South Indian Dum Biryani",
    tag: "⭐ Chef's Signature",
    tagClass: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    description: "Authentic slow-cooked handi dum biryani layered with fragrant aged basmati rice, tender spiced marinated chicken, saffron milk, caramelized birista, fresh mint & boiled egg. Served with mirchi ka salan & raita.",
    price: 130.00,
    image: "assets/dum_biryani.jpg",
    calories: "720 kcal"
  },
  {
    id: "fry_piece_biryani",
    name: "Fry Piece Biryani",
    tag: "🔥 Andhra Special",
    tagClass: "bg-red-500/15 text-red-300 border-red-500/30",
    description: "Signature Andhra-style aromatic flavored biryani rice topped with crispy golden spiced fried chicken chunks, roasted cashews, fresh curry leaves, and green chilies. Served with salan & raita.",
    price: 130.00,
    image: "assets/fry_piece_biryani.jpg",
    calories: "760 kcal"
  }
];

// Application State
const state = {
  cart: {}, // { [itemId]: quantity }
  menuCardQuantities: {
    dum_biryani: 1,
    fry_piece_biryani: 1
  },
  fulfillment: "delivery", // 'pickup' | 'delivery'
  whatsappNumber: localStorage.getItem("dum_theory_whatsapp_phone") || localStorage.getItem("umami_whatsapp_phone") || CONFIG.defaultWhatsappNumber,
  customer: {
    name: "",
    phone: "",
    address: "",
    notes: ""
  }
};

// DOM References
const DOM = {};

// Initialize on DOM Ready
document.addEventListener("DOMContentLoaded", () => {
  cacheDOM();
  renderMenu();
  attachEventListeners();
  updateFulfillmentUI();
  updateCartUI();
  renderConfigUI();
});

function cacheDOM() {
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
  
  // Fulfillment
  DOM.pickupRadio = document.getElementById("fulfillment-pickup");
  DOM.deliveryRadio = document.getElementById("fulfillment-delivery");
  DOM.deliveryAddressWrapper = document.getElementById("delivery-address-wrapper");
  DOM.deliveryAddressInput = document.getElementById("customer-address");
  DOM.deliveryFeeRow = document.getElementById("drawer-delivery-fee-row");
  DOM.drawerSubtotal = document.getElementById("drawer-subtotal");
  DOM.drawerDeliveryFee = document.getElementById("drawer-delivery-fee");
  DOM.drawerTotal = document.getElementById("drawer-total");
  
  // Customer Inputs
  DOM.customerName = document.getElementById("customer-name");
  DOM.customerPhone = document.getElementById("customer-phone");
  DOM.customerNotes = document.getElementById("customer-notes");
  DOM.placeOrderBtn = document.getElementById("place-order-btn");
  
  // Modals & UI
  DOM.whatsappSettingsModal = document.getElementById("whatsapp-settings-modal");
  DOM.whatsappNumberInput = document.getElementById("whatsapp-number-input");
  DOM.currentWhatsappDisplay = document.getElementById("current-whatsapp-display");
  DOM.orderSuccessModal = document.getElementById("order-success-modal");
  DOM.orderSummaryRecap = document.getElementById("order-summary-recap");
  DOM.toastContainer = document.getElementById("toast-container");
  DOM.messagePreviewDrawer = document.getElementById("message-preview-content");
}

/**
 * Render Curated Menu Items
 */
function renderMenu() {
  if (!DOM.menuContainer) return;

  DOM.menuContainer.innerHTML = MENU_ITEMS.map((item) => {
    const qty = state.menuCardQuantities[item.id] || 1;
    return `
      <article class="bg-white rounded-2xl overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 group border border-neutral-200 shadow-sm hover:shadow-xl" id="card-${item.id}">
        <!-- Food Image Container -->
        <div class="relative h-60 w-full overflow-hidden bg-neutral-100">
          <img 
            src="${item.image}" 
            alt="${item.name}" 
            class="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
          <div class="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none"></div>
          
          <!-- Badge -->
          <span class="absolute top-3.5 left-3.5 px-3 py-1 rounded-full text-xs font-semibold backdrop-blur-md bg-white/90 text-amber-800 border border-amber-300 shadow-sm">
            ${item.tag}
          </span>
          
          <!-- Calorie / Info Badge -->
          <span class="absolute top-3.5 right-3.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-black/60 backdrop-blur-md text-white border border-white/20">
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
            <h3 class="text-xl font-bold text-[#2A2420] mb-2 font-heading group-hover:text-amber-600 transition-colors">
              ${item.name}
            </h3>
            <p class="text-[#5A534C] text-sm leading-relaxed mb-6 line-clamp-3">
              ${item.description}
            </p>
          </div>

          <!-- Card Actions (Quantity selector + Add button) -->
          <div class="pt-4 border-t border-neutral-100 flex items-center justify-between gap-3">
            <!-- Counter -->
            <div class="flex items-center bg-neutral-100 rounded-xl p-1 border border-neutral-200">
              <button 
                type="button"
                onclick="changeMenuQty('${item.id}', -1)"
                aria-label="Decrease quantity for ${item.name}"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200 transition-colors btn-press text-lg font-bold"
              >
                -
              </button>
              <span id="qty-${item.id}" class="w-8 text-center font-bold text-sm text-[#2A2420] font-heading select-none">
                ${qty}
              </span>
              <button 
                type="button"
                onclick="changeMenuQty('${item.id}', 1)"
                aria-label="Increase quantity for ${item.name}"
                class="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200 transition-colors btn-press text-lg font-bold"
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

  // Reset menu card quantity to 1
  state.menuCardQuantities[itemId] = 1;
  const qtyEl = document.getElementById(`qty-${itemId}`);
  if (qtyEl) qtyEl.textContent = "1";

  // Visual button feedback
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
            <li class="flex items-center gap-3.5 p-3 rounded-xl bg-white border border-neutral-200 group hover:border-amber-400/60 shadow-sm transition-all">
              <img src="${item.image}" alt="${item.name}" class="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm text-[#2A2420] truncate font-heading">${item.name}</h4>
                <div class="text-xs text-[#5A534C] mt-0.5">${CONFIG.currencySymbol}${item.price.toFixed(2)} each</div>
                <div class="text-amber-700 font-extrabold text-sm mt-1">${CONFIG.currencySymbol}${itemTotal}</div>
              </div>
              
              <!-- Quantity Modifier -->
              <div class="flex items-center gap-1 bg-neutral-100 rounded-lg p-1 border border-neutral-200">
                <button 
                  type="button" 
                  onclick="updateCartItemQty('${item.id}', -1)"
                  class="w-7 h-7 rounded flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200 text-sm font-bold btn-press"
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span class="w-6 text-center text-xs font-bold text-[#2A2420] select-none">${qty}</span>
                <button 
                  type="button" 
                  onclick="updateCartItemQty('${item.id}', 1)"
                  class="w-7 h-7 rounded flex items-center justify-center text-neutral-700 hover:text-neutral-950 hover:bg-neutral-200 text-sm font-bold btn-press"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>

              <!-- Delete Button -->
              <button 
                type="button" 
                onclick="removeCartItem('${item.id}')"
                class="text-neutral-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
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

  // Active state visual styles for radio option containers
  const pickupCard = document.getElementById("option-card-pickup");
  const deliveryCard = document.getElementById("option-card-delivery");
  if (pickupCard && deliveryCard) {
    if (isDelivery) {
      deliveryCard.classList.add("border-amber-500", "bg-amber-50");
      deliveryCard.classList.remove("border-neutral-200", "bg-white");
      pickupCard.classList.remove("border-amber-500", "bg-amber-50");
      pickupCard.classList.add("border-neutral-200", "bg-white");
    } else {
      pickupCard.classList.add("border-amber-500", "bg-amber-50");
      pickupCard.classList.remove("border-neutral-200", "bg-white");
      deliveryCard.classList.remove("border-amber-500", "bg-amber-50");
      deliveryCard.classList.add("border-neutral-200", "bg-white");
    }
  }

  updateCartUI();
}

/**
 * Generate formatted WhatsApp message text
 */
function buildWhatsAppMessage() {
  const totals = calculateTotals();
  
  // Format items list
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

  // Exact required template format
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
 * Validate customer inputs and trigger WhatsApp URL
 */
function handlePlaceOrder(e) {
  if (e) e.preventDefault();

  const totals = calculateTotals();
  if (totals.itemCount === 0) {
    showToast("Your cart is empty! Please add items from the menu first.", "error");
    return;
  }

  // Read current form values
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
    waUrl
  });

  showToast("Order initiated! Redirecting to WhatsApp...", "success");
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
      <div class="bg-neutral-50 rounded-xl p-4 border border-neutral-200 text-left space-y-2 text-sm text-[#2A2420]">
        <div class="flex justify-between border-b border-neutral-200/80 pb-2">
          <span class="text-[#5A534C]">Customer:</span>
          <span class="font-bold text-[#2A2420]">${order.name}</span>
        </div>
        <div class="flex justify-between border-b border-neutral-200/80 pb-2">
          <span class="text-[#5A534C]">Fulfillment:</span>
          <span class="font-bold text-amber-700">${order.fulfillment}</span>
        </div>
        <div class="flex justify-between text-base pt-1">
          <span class="text-[#2A2420] font-bold">Total:</span>
          <span class="font-extrabold text-amber-600">${order.total}</span>
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
  // Optionally reset cart after order
  toggleCart(false);
};

/**
 * Configuration Modal (for testing custom WhatsApp numbers)
 */
window.toggleConfigModal = function(isOpen) {
  if (!DOM.whatsappSettingsModal) return;
  if (isOpen) {
    if (DOM.whatsappNumberInput) DOM.whatsappNumberInput.value = state.whatsappNumber;
    DOM.whatsappSettingsModal.classList.remove("hidden", "opacity-0");
    DOM.whatsappSettingsModal.classList.add("flex", "opacity-100");
  } else {
    DOM.whatsappSettingsModal.classList.add("hidden", "opacity-0");
    DOM.whatsappSettingsModal.classList.remove("flex", "opacity-100");
  }
};

window.saveWhatsappSettings = function(e) {
  if (e) e.preventDefault();
  const input = DOM.whatsappNumberInput?.value.replace(/[^0-9]/g, "");
  if (!input || input.length < 7) {
    showToast("Please enter a valid phone number (digits only with country code).", "error");
    return;
  }

  state.whatsappNumber = input;
  localStorage.setItem("dum_theory_whatsapp_phone", input);
  renderConfigUI();
  toggleConfigModal(false);
  showToast(`WhatsApp recipient updated to +${input}!`, "success");
};

function renderConfigUI() {
  if (DOM.currentWhatsappDisplay) {
    DOM.currentWhatsappDisplay.textContent = `+${state.whatsappNumber}`;
  }
}

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
    success: "bg-white border-emerald-300 text-[#2A2420] shadow-lg",
    error: "bg-white border-red-300 text-[#2A2420] shadow-lg",
    info: "bg-white border-amber-300 text-[#2A2420] shadow-lg"
  };

  toast.className = `toast flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl backdrop-blur-md text-sm font-medium ${bgBorder[type] || bgBorder.info}`;
  toast.innerHTML = `
    ${icons[type] || icons.info}
    <span>${message}</span>
  `;

  DOM.toastContainer.appendChild(toast);

  // Trigger animation
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

  // Submit WhatsApp Order
  DOM.placeOrderBtn?.addEventListener("click", handlePlaceOrder);

  // Close drawer on backdrop click
  DOM.cartBackdrop?.addEventListener("click", () => toggleCart(false));

  // Keybindings (Escape closes modals/drawers)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      toggleCart(false);
      toggleConfigModal(false);
      closeSuccessModal();
    }
  });
}

/**
 * Interactive Royal Journey Story Chapter Selector
 */
window.selectJourneyChapter = function(chapterNumber) {
  // Clear all previous active states
  for (let i = 1; i <= 4; i++) {
    const chapterEl = document.getElementById(`story-chapter-${i}`);
    const btnEl = document.getElementById(`pillar-btn-${i}`);
    if (chapterEl) chapterEl.classList.remove("active-chapter");
    if (btnEl) btnEl.classList.remove("active-pillar");
  }

  // Activate selected story chapter and button
  const targetChapter = document.getElementById(`story-chapter-${chapterNumber}`);
  if (targetChapter) {
    targetChapter.classList.add("active-chapter");
  }

  const targetBtn = document.getElementById(`pillar-btn-${chapterNumber}`);
  if (targetBtn) {
    targetBtn.classList.add("active-pillar");
  }
};

