# Project: Smart POS System (Wholesale & Retail)
**Version:** 1.0.0  
**Stack:** HTML5, Tailwind CSS, JavaScript, Dexie.js (IndexedDB)

---

## 1. Business Requirements

### A. Inventory Management (තොග පාලනය)
* **Product Categorization:** ඇඳුම් (Cloths) සහ ග්‍රොසරි (Grocery) ලෙස වෙන් කිරීමේ හැකියාව.
* **Dual Pricing:** එකම භාණ්ඩයට Retail (සිල්ලර) සහ Wholesale (තොග) ලෙස මිල ගණන් දෙකක් ඇතුළත් කිරීම.
* **Stock Tracking:** බඩු ඉවර වෙද්දී (Low stock) alert එකක් ලැබීම.
* **Unit Management:** පැකට්, කිලෝ, මීටර් හෝ කෑලි (Units) අනුව විකිණීමේ හැකියාව.

### B. Sales & Billing (බිල්පත් කිරීම)
* **Cart System:** බඩුවල නම හෝ Barcode එක මගින් cart එකට ඇතුළත් කිරීම.
* **Switchable Pricing:** බිල් එක දාන වෙලාවට "Retail" ද "Wholesale" ද කියලා තෝරා ගැනීමට හැකි වීම.
* **Discounts:** මුළු බිල් එකට හෝ අයිතමයකට වට්ටම් ලබා දීම.
* **Print Receipt:** Thermal printer එකකට ගැලපෙන සරල රිසිට් පතක් ජනනය කිරීම.

### C. Vendor & Purchase Management
* **Supplier Records:** බඩු ගන්නා වෙන්ඩර්ලාගේ විස්තර (නම, දුරකථන අංකය).
* **Purchase History:** කවදාද බඩු ගත්තේ සහ කීයකටද (Cost price) ගත්තේ යන දත්ත.

### D. Reports (වාර්තා)
* **Daily Sales:** දවසේ මුළු අලෙවිය.
* **Profit Calculation:** (Selling Price - Cost Price) හරහා ලැබෙන ලාභය ගණනය කිරීම.

---

## 2. Technical Requirements & Architecture

### A. Frontend (UI/UX)
* **Responsive Design:** Tailwind CSS පාවිච්චි කර ටැබ් එකකට හෝ ලැප්ටොප් එකකට ගැලපෙන පරිදි සකස් කිරීම.
* **Modular UI:** * `Dashboard.html` (Overview)
    * `Inventory.html` (Manage Products)
    * `POS.html` (Billing Interface)
    * `Reports.html` (Sales Data)

### B. Database Schema (Dexie.js)
Dexie පාවිච්චි කර පහත tables (stores) සකස් කළ යුතුය:
* **products:** `id, name, category, retailPrice, wholesalePrice, costPrice, stock, unit`
* **sales:** `id, date, totalAmount, discount, items (array), type (retail/wholesale)`
* **vendors:** `id, name, contact, company`

### C. Core Logic Functions
1.  **addProduct():** නව භාණ්ඩ ඇතුළත් කිරීම.
2.  **updateStock():** බිල් එකක් දැමූ පසු පවතින තොගයෙන් අදාළ ප්‍රමාණය අඩු කිරීම.
3.  **calculateTotal():** Cart එකේ ඇති භාණ්ඩවල එකතුව සහ වට්ටම් ගණනය කිරීම.

---

## 3. Implementation Instructions (පියවරෙන් පියවර)

### Step 1: Library Setup
HTML එකේ `<head>` කොටසට පහත CDN ඇතුළත් කරගන්න:
* Tailwind CSS: `<script src="https://cdn.tailwindcss.com"></script>`
* Dexie.js: `<script src="https://unpkg.com/dexie/dist/dexie.js"></script>`

### Step 2: Database Initialization
`app.js` එකක් සාදා Database එක සෙට් කරගන්න:
```javascript
const db = new Dexie("ShopDB");
db.version(1).stores({
  products: '++id, name, category',
  sales: '++id, date',
  vendors: '++id, name'
});