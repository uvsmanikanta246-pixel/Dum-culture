# 🥘 DUM THEORY - WhatsApp Food Ordering Web App

A clean, conversion-focused single-page food ordering website with a curated 2-item signature Biryani menu that transmits orders directly to WhatsApp with dynamic pricing, pickup/delivery fee calculation, and full customer details.

---

## 🚀 Live Demo & Features

- **Curated 2-Item Biryani Menu**: High-resolution imagery, quantity selectors, dynamic pricing, and instant add-to-cart.
- **Floating / Sticky Cart**: Real-time counter and subtotal updates on both mobile and desktop.
- **Slide-out Cart Drawer**: Itemized order list, individual quantity controls (`+` / `-`), remove items, and clear cart.
- **Fulfillment Selector**:
  - **Pickup**: Free (₹0.00).
  - **Delivery**: Automatically adds flat delivery fee (+₹10.00) and enables delivery address field with animated transition.
- **Form Validation**: Validates Customer Name, Phone Number, and Delivery Address before checkout.
- **WhatsApp Integration**: Generates the exact formatted message and opens `https://wa.me/{PHONE_NUMBER}?text={ENCODED_MESSAGE}`.
- **Live WhatsApp Message Preview**: Accordion inside the cart drawer lets customers preview the text before submitting.
- **WhatsApp Phone Settings**: Change the recipient phone number dynamically in the UI or in `app.js`.

---

## 📱 WhatsApp Configuration (Where to insert your phone number)

There are **two easy ways** to set your WhatsApp phone number:

### Method 1: Directly in Code (`app.js`)
Open [app.js](file:///c:/Users/Srinivas/OneDrive/Desktop/New%20folder/app.js) and update line 10 with your international phone number (digits only, including country code, without `+` or spaces):

```javascript
const CONFIG = {
  restaurantName: "Dum Theory",
  // Replace with your WhatsApp phone number (e.g. 919030243334):
  defaultWhatsappNumber: "+919030243334", 
  deliveryFee: 10.00,
  currencySymbol: "₹",
  // ...
};
```

### Method 2: Live via UI
Click on the **WhatsApp pill button** (`+919030243334`) in the top navigation bar to open the configuration modal and enter any phone number. It will be saved instantly to `localStorage`.

---

## 📋 Generated WhatsApp Message Format

```text
*New Order Received!*
------------------------
*Items:*
- South Indian Dum Biryani x 2 - ₹260.00
- Fry Piece Biryani x 1 - ₹130.00

*Fulfillment:* Delivery
*Subtotal:* ₹390.00
*Delivery Fee:* ₹10.00
*Total Amount:* ₹400.00

*Customer Details:*
Name: Alex Morgan
Phone: +91 9030243334
Address: 742 Evergreen Terrace, Apt 2B
Notes: Extra napkins, please ring doorbell
```

---

## 🛠️ Running on Localhost

### ⚡ 1-Click Launch (Windows)
Double-click [`start.bat`](file:///c:/Users/Srinivas/OneDrive/Desktop/New%20folder/start.bat) or [`run.bat`](file:///c:/Users/Srinivas/OneDrive/Desktop/New%20folder/run.bat). It automatically starts the server and opens `http://localhost:8080` in your default browser.

### 💻 Command Line Options

1. **Via Batch Script / PowerShell:**
```cmd
start.bat
```
or
```powershell
powershell -ExecutionPolicy Bypass -File .\server.ps1 -Port 8080
```

2. **Via npm:**
```bash
npm start
```

3. **Via Python:**
```bash
python -m http.server 8080
```

---

## 🌐 Free 1-Click Deployment Options

- **GitHub Pages**: Push this directory to a GitHub repository and enable GitHub Pages in Settings -> Pages -> Deploy from Branch (`main` / `/root`).
- **Netlify**: Drag and drop this folder directly into [Netlify Drop](https://app.netlify.com/drop).
- **Vercel**: Deploy with `npx vercel` or connect your GitHub repository.
