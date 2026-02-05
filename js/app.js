// --- Database Setup ---
const db = new Dexie("SupiriPOS_DB");
db.version(1).stores({
    products: '++id, name, category, retailPrice, wholesalePrice, costPrice, stock, unit',
    sales: '++id, date, total, discount, type, items', // items is array of objects
    vendors: '++id, name, contact, company',
    settings: 'id, shopName, address, phone1, phone2' // Single record with id=1
});

// --- App Navigation & Core ---
const app = {
    currentView: 'dashboard',
    settings: {
        shopName: 'MINI POS',
        address: 'No Address Set',
        phone1: '000-0000000',
        phone2: ''
    },
    
    init: async () => {
        app.updateTime();
        setInterval(app.updateTime, 1000);
        await account.loadToMemory();
        await app.navigate('dashboard');
    },

    navigate: async (viewId) => {
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));
        
        // Show target view
        const target = document.getElementById(`view-${viewId}`);
        if(target) target.classList.remove('hidden');

        // Update Sidebar Active State
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('bg-gray-800', 'text-white', 'bg-slate-800');
            btn.classList.add('text-slate-300');
        });
        const activeBtn = document.getElementById(`nav-${viewId}`);
        if(activeBtn) {
            activeBtn.classList.add('bg-slate-800', 'text-white');
            activeBtn.classList.remove('text-slate-300');
        }

        // Update Title
        const titleMap = {
            'dashboard': 'Dashboard Overview',
            'pos': 'Point of Sale',
            'inventory': 'Inventory Management',
            'reports': 'Sales Reports',
            'vendors': 'Vendor Management',
            'settings': 'Account Settings'
        };
        document.getElementById('page-title').innerText = titleMap[viewId] || 'MINI POS System';

        // Load Data for View
        if(viewId === 'dashboard') dashboard.load();
        if(viewId === 'inventory') inventory.load();
        if(viewId === 'pos') pos.load();
        if(viewId === 'reports') reports.loadData();
        if(viewId === 'vendors') vendors.load();
        if(viewId === 'settings') account.loadForm();

        app.currentView = viewId;
    },

    updateTime: () => {
        const now = new Date();
        document.getElementById('current-time').innerText = now.toLocaleTimeString();
        document.getElementById('current-date').innerText = now.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
};

// --- Account / Settings ---
const account = {
    loadToMemory: async () => {
        const data = await db.settings.get(1);
        if(data) {
            app.settings = data;
        } else {
            // Init default
            await db.settings.put({id: 1, ...app.settings});
        }
    },

    loadForm: () => {
        document.getElementById('setting-shop-name').value = app.settings.shopName;
        document.getElementById('setting-address').value = app.settings.address;
        document.getElementById('setting-phone1').value = app.settings.phone1;
        document.getElementById('setting-phone2').value = app.settings.phone2 || '';
    },

    save: async (e) => {
        e.preventDefault();
        const newSettings = {
            id: 1,
            shopName: document.getElementById('setting-shop-name').value,
            address: document.getElementById('setting-address').value,
            phone1: document.getElementById('setting-phone1').value,
            phone2: document.getElementById('setting-phone2').value
        };
        
        await db.settings.put(newSettings);
        app.settings = newSettings;
        alert('Settings Saved Successfully!');
    }
};

// --- Inventory Manager ---
const inventory = {
    products: [],

    load: async () => {
        inventory.products = await db.products.toArray();
        inventory.renderTable();
    },

    renderTable: () => {
        const tbody = document.getElementById('inventory-table-body');
        const search = document.getElementById('inv-search').value.toLowerCase();
        
        tbody.innerHTML = '';

        const filtered = inventory.products.filter(p => p.name.toLowerCase().includes(search));

        if(filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-400">No products found</td></tr>';
            return;
        }

        filtered.forEach(p => {
            const stockClass = p.stock < 10 ? 'text-red-600 font-bold' : 'text-slate-600';
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-none';
            tr.innerHTML = `
                <td class="px-4 py-3 font-medium text-slate-800">${p.name}</td>
                <td class="px-4 py-3"><span class="bg-gray-100 text-slate-600 px-2 py-1 rounded text-xs font-bold uppercase">${p.category}</span></td>
                <td class="px-4 py-3 text-slate-500">Rs. ${parseFloat(p.costPrice).toFixed(2)}</td>
                <td class="px-4 py-3 font-medium text-emerald-600">Rs. ${parseFloat(p.retailPrice).toFixed(2)}</td>
                <td class="px-4 py-3 font-medium text-blue-600">Rs. ${parseFloat(p.wholesalePrice).toFixed(2)}</td>
                <td class="px-4 py-3 ${stockClass}">${p.stock} <span class="text-xs text-slate-400 font-normal">${p.unit}</span></td>
                <td class="px-4 py-3 text-center">
                    <button onclick="inventory.editProduct(${p.id})" class="text-blue-500 hover:text-blue-700 mx-1"><i class="fa-solid fa-pen-to-square"></i></button>
                    <button onclick="inventory.deleteProduct(${p.id})" class="text-red-500 hover:text-red-700 mx-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    openModal: (product = null) => {
        document.getElementById('modal-product').classList.remove('hidden');
        if(product) {
            document.getElementById('modal-product-title').innerText = 'Edit Product';
            document.getElementById('prod-id').value = product.id;
            document.getElementById('prod-name').value = product.name;
            document.getElementById('prod-category').value = product.category;
            document.getElementById('prod-retail').value = product.retailPrice;
            document.getElementById('prod-wholesale').value = product.wholesalePrice;
            document.getElementById('prod-cost').value = product.costPrice;
            document.getElementById('prod-stock').value = product.stock;
            document.getElementById('prod-unit').value = product.unit;
        } else {
            document.getElementById('modal-product-title').innerText = 'Add New Product';
            document.getElementById('product-form').reset();
            document.getElementById('prod-id').value = '';
        }
    },

    closeModal: () => {
        document.getElementById('modal-product').classList.add('hidden');
    },

    saveProduct: async (e) => {
        e.preventDefault();
        const id = document.getElementById('prod-id').value;
        const data = {
            name: document.getElementById('prod-name').value,
            category: document.getElementById('prod-category').value,
            retailPrice: parseFloat(document.getElementById('prod-retail').value),
            wholesalePrice: parseFloat(document.getElementById('prod-wholesale').value),
            costPrice: parseFloat(document.getElementById('prod-cost').value),
            stock: parseFloat(document.getElementById('prod-stock').value),
            unit: document.getElementById('prod-unit').value
        };

        if(id) {
            await db.products.update(parseInt(id), data);
        } else {
            await db.products.add(data);
        }
        
        inventory.closeModal();
        inventory.load();
        alert('Product Saved!');
    },

    editProduct: async (id) => {
        const product = await db.products.get(id);
        inventory.openModal(product);
    },

    deleteProduct: async (id) => {
        if(confirm('Are you sure you want to delete this product?')) {
            await db.products.delete(id);
            inventory.load();
        }
    }
};

// --- POS Logic ---
const pos = {
    cart: [],
    pricingMode: 'retail', // 'retail' or 'wholesale'

    load: async () => {
        // Render Product Grid
        pos.renderGrid();
        // Setup Search Listener
        document.getElementById('pos-search').addEventListener('keyup', pos.renderGrid);
        document.getElementById('pos-category-filter').addEventListener('change', pos.renderGrid);
    },

    setOrderType: (type) => {
        pos.pricingMode = type;
        document.getElementById('btn-retail').className = type === 'retail' ? 
            'flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-white text-primary shadow-sm' : 
            'flex-1 py-2 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';
            
        document.getElementById('btn-wholesale').className = type === 'wholesale' ? 
            'flex-1 py-2 rounded-lg text-sm font-bold transition-all bg-white text-primary shadow-sm' : 
            'flex-1 py-2 rounded-lg text-sm font-bold transition-all text-slate-500 hover:text-slate-700';

        pos.renderCart(); // Re-calc prices
    },

    renderGrid: async () => {
        const products = await db.products.toArray();
        const search = document.getElementById('pos-search').value.toLowerCase();
        const cat = document.getElementById('pos-category-filter').value;

        const grid = document.getElementById('pos-product-grid');
        grid.innerHTML = '';

        const filtered = products.filter(p => {
            const matchesSearch = p.name.toLowerCase().includes(search); // Add barcode logic here if needed
            const matchesCat = cat === 'all' || p.category === cat;
            return matchesSearch && matchesCat;
        });

        filtered.forEach(p => {
            const el = document.createElement('div');
            el.className = 'bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group';
            el.onclick = () => pos.addToCart(p);
            
            el.innerHTML = `
                <div class="flex justify-between items-start mb-2">
                    <span class="bg-gray-100 text-slate-500 text-[10px] uppercase font-bold px-2 py-0.5 rounded">${p.category}</span>
                    <span class="text-xs font-bold ${p.stock < 5 ? 'text-red-500' : 'text-emerald-600'}">${p.stock} ${p.unit}</span>
                </div>
                <h4 class="font-bold text-slate-800 leading-tight mb-2 group-hover:text-primary transition-colors">${p.name}</h4>
                <div class="text-sm">
                    <span class="text-slate-400 text-xs">Retail:</span> <span class="font-semibold text-slate-700">Rs.${p.retailPrice}</span>
                </div>
            `;
            grid.appendChild(el);
        });
    },

    addToCart: (product) => {
        if(product.stock <= 0) {
            alert('Out of Stock!');
            return;
        }

        const existing = pos.cart.find(item => item.id === product.id);
        if(existing) {
            if(existing.qty + 1 > product.stock) {
                alert('Not enough stock!');
                return;
            }
            existing.qty += 1;
        } else {
            pos.cart.push({
                ...product,
                qty: 1
            });
        }
        pos.renderCart();
    },

    removeFromCart: (index) => {
        pos.cart.splice(index, 1);
        pos.renderCart();
    },

    updateQty: (index, delta) => {
        const item = pos.cart[index];
        const newQty = item.qty + delta;
        
        if(newQty > item.stock) {
            alert('Stock limit reached!');
            return;
        }
        if(newQty <= 0) {
            pos.removeFromCart(index);
            return;
        }
        item.qty = newQty;
        pos.renderCart();
    },

    renderCart: () => {
        const container = document.getElementById('pos-cart-items');
        container.innerHTML = '';
        
        let subtotal = 0;

        if(pos.cart.length === 0) {
            container.innerHTML = `
                <div class="flex flex-col items-center justify-center h-full text-slate-400">
                    <i class="fa-solid fa-basket-shopping text-4xl mb-3 opacity-30"></i>
                    <p>Cart is empty</p>
                </div>`;
            document.getElementById('cart-subtotal').innerText = 'Rs. 0.00';
            document.getElementById('cart-total').innerText = 'Rs. 0.00';
            return;
        }

        pos.cart.forEach((item, index) => {
            const price = pos.pricingMode === 'retail' ? item.retailPrice : item.wholesalePrice;
            const lineTotal = price * item.qty;
            subtotal += lineTotal;

            const div = document.createElement('div');
            div.className = 'flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100';
            div.innerHTML = `
                <div class="flex-1">
                    <h5 class="font-bold text-slate-700 text-sm line-clamp-1">${item.name}</h5>
                    <p class="text-xs text-slate-500">Rs. ${price} x ${item.qty}</p>
                </div>
                <div class="flex items-center gap-3">
                    <div class="flex items-center bg-white border border-gray-200 rounded-lg h-8">
                        <button onclick="pos.updateQty(${index}, -1)" class="w-8 h-full flex items-center justify-center text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-l-lg transition-colors"><i class="fa-solid fa-minus text-xs"></i></button>
                        <span class="w-8 text-center text-xs font-bold text-slate-700">${item.qty}</span>
                        <button onclick="pos.updateQty(${index}, 1)" class="w-8 h-full flex items-center justify-center text-slate-500 hover:text-emerald-500 hover:bg-emerald-50 rounded-r-lg transition-colors"><i class="fa-solid fa-plus text-xs"></i></button>
                    </div>
                    <p class="font-bold text-slate-800 text-sm w-16 text-right">Rs.${lineTotal.toFixed(0)}</p>
                </div>
            `;
            container.appendChild(div);
        });

        // Discount logic could be better, for now flat 0
        const discount = 0; 
        const total = subtotal - discount;

        document.getElementById('cart-subtotal').innerText = 'Rs. ' + subtotal.toFixed(2);
        document.getElementById('cart-discount').innerText = 'Rs. ' + discount.toFixed(2);
        document.getElementById('cart-total').innerText = 'Rs. ' + total.toFixed(2);
    },

    checkout: async () => {
        if(pos.cart.length === 0) return alert('Cart is empty!');

        if(!confirm('Process Payment?')) return;

        let total = 0;
        const finalItems = pos.cart.map(item => {
            const price = pos.pricingMode === 'retail' ? item.retailPrice : item.wholesalePrice;
            total += price * item.qty;
            return {
                productId: item.id,
                name: item.name,
                qty: item.qty,
                price: price,
                cost: item.costPrice
            };
        });

        // Create Sale Record
        const saleId = await db.sales.add({
            date: new Date(),
            total: total,
            discount: 0,
            type: pos.pricingMode,
            items: finalItems
        });

        // Update Stock
        for(const item of pos.cart) {
            const product = await db.products.get(item.id);
            if(product) {
                const newStock = product.stock - item.qty;
                await db.products.update(item.id, { stock: newStock });
            }
        }

        alert('Payment Successful! Receipt Generated.');
        pos.printReceipt(saleId, total, finalItems);
        
        // Reset
        pos.cart = [];
        pos.renderCart();
        pos.renderGrid(); // Update stock display
    },

    printReceipt: (id, total, items) => {
        const win = window.open('', 'Print Receipt', 'height=600,width=400');
        const date = new Date().toLocaleString();
        const { shopName, address, phone1, phone2 } = app.settings;
        
        // CSS for Thermal Printer (approx 58mm or 80mm)
        const styles = `
            <style>
                body { font-family: 'Courier New', monospace; font-size: 12px; margin: 0; padding: 10px; }
                .text-center { text-align: center; }
                .text-right { text-align: right; }
                .bold { font-weight: bold; }
                .line { border-bottom: 1px dashed #000; margin: 5px 0; }
                table { w-full: 100%; width: 100%; border-collapse: collapse; }
                td { padding: 2px 0; }
                .title { font-size: 16px; font-weight: bold; }
            </style>
        `;

        const itemsHtml = items.map(i => `
            <tr>
                <td colspan="4">${i.name}</td>
            </tr>
            <tr>
                <td>${i.qty} x ${i.price}</td>
                <td class="text-right">${(i.qty * i.price).toFixed(2)}</td>
            </tr>
        `).join('');

        const content = `
            <html>
            <head><title>Receipt #${id}</title>${styles}</head>
            <body>
                <div class="text-center">
                    <div class="title">${shopName}</div>
                    <div>${address}</div>
                    <div>Tel: ${phone1}</div>
                    ${phone2 ? `<div>Tel: ${phone2}</div>` : ''}
                </div>
                <div class="line"></div>
                <div>Date: ${date}</div>
                <div>Receipt No: #${id}</div>
                <div class="line"></div>
                <table>
                    ${itemsHtml}
                </table>
                <div class="line"></div>
                <table>
                    <tr>
                        <td class="bold">TOTAL</td>
                        <td class="text-right bold" style="font-size: 14px;">Rs. ${total.toFixed(2)}</td>
                    </tr>
                </table>
                <div class="line"></div>
                <div class="text-center">
                    <p>Thank You! Come Again!</p>
                    <p style="font-size: 10px;">Powered by MINI POS</p>
                </div>
            </body>
            </html>
        `;

        win.document.write(content);
        win.document.close();
        win.focus();
        setTimeout(() => win.print(), 500);
    }
};

// --- Dashboard ---
const dashboard = {
    load: async () => {
        const today = new Date();
        today.setHours(0,0,0,0);
        
        const sales = await db.sales.where('date').aboveOrEqual(today).toArray();
        const products = await db.products.toArray();

        // 1. Daily Sales
        const totalSales = sales.reduce((sum, s) => sum + s.total, 0);
        document.getElementById('dash-daily-sales').innerText = 'Rs. ' + totalSales.toLocaleString();

        // 2. Orders Count
        document.getElementById('dash-order-count').innerText = sales.length;

        // 3. Low Stock
        const lowStock = products.filter(p => p.stock < 10).length;
        document.getElementById('dash-low-stock').innerText = lowStock;

        // 4. Total Products
        document.getElementById('dash-total-products').innerText = products.length;

        // 5. Recent Table
        const recentSales = await db.sales.reverse().limit(5).toArray();
        const tbody = document.getElementById('dash-recent-sales-body');
        tbody.innerHTML = '';
        recentSales.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs">#${s.id}</td>
                <td class="px-6 py-4">${s.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                <td class="px-6 py-4"><span class="px-2 py-1 bg-gray-100 rounded text-xs uppercase font-bold text-slate-500">${s.type}</span></td>
                <td class="px-6 py-4 text-right font-bold text-slate-700">Rs. ${s.total.toFixed(2)}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};

// --- Reports ---
const reports = {
    // Keep track of what's being shown
    currentSales: [],

    loadData: async () => {
        const startInput = document.getElementById('report-start').value;
        const endInput = document.getElementById('report-end').value;

        // Fetch All First
        let sales = await db.sales.orderBy('date').reverse().toArray();

        // Filter by date if set
        if(startInput && endInput) {
            const start = new Date(startInput); start.setHours(0,0,0,0);
            const end = new Date(endInput); end.setHours(23,59,59,999);
            sales = sales.filter(s => s.date >= start && s.date <= end);
        }

        reports.currentSales = sales; // Store for download

        const tbody = document.getElementById('report-table-body');
        tbody.innerHTML = '';
        let totalRevenue = 0;

        if(sales.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-400">No sales found for this period</td></tr>';
            document.getElementById('report-total-revenue').innerText = 'Total: Rs. 0.00';
            return;
        }

        sales.forEach(s => {
            totalRevenue += s.total;
            const tr = document.createElement('tr');
            tr.className = 'hover:bg-gray-50 transition-colors';
            // Use date string for CSV export consistency
            
            tr.innerHTML = `
                <td class="px-6 py-4 font-mono text-xs text-slate-500">#${s.id}</td>
                <td class="px-6 py-4 text-slate-700">
                    <div class="font-bold text-xs text-slate-500 mb-0.5">${s.date.toLocaleDateString()}</div>
                    <div class="font-mono text-xs text-slate-400">${s.date.toLocaleTimeString()}</div>
                </td>
                <td class="px-6 py-4"><span class="capitalize px-2 py-1 rounded ${s.type==='wholesale'?'bg-blue-100 text-blue-600':'bg-emerald-100 text-emerald-600'} text-xs font-bold">${s.type}</span></td>
                <td class="px-6 py-4 text-right text-slate-500">Rs. ${s.discount.toFixed(2)}</td>
                <td class="px-6 py-4 text-right font-bold text-slate-800">Rs. ${s.total.toFixed(2)}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="reports.deleteSale(${s.id})" class="text-red-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-all" title="Delete Sale">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('report-total-revenue').innerText = 'Total: Rs. ' + totalRevenue.toLocaleString();
    },

    deleteSale: async (id) => {
        if(confirm('Are you sure you want to delete this sale? This cannot be undone.')) {
            await db.sales.delete(id);
            // Optionally: Restore stock? For now, we just delete the record as per request "clear history"
            reports.loadData();
        }
    },

    clearAll: async () => {
        const startInput = document.getElementById('report-start').value;
        const endInput = document.getElementById('report-end').value;
        const count = reports.currentSales.length;

        if(count === 0) return alert('No sales to delete.');

        let msg = "Are you sure you want to delete ALL displayed sales history?";
        if(startInput && endInput) {
            msg = `Are you sure you want to delete all ${count} sales between ${startInput} and ${endInput}?`;
        }

        if(confirm(msg)) {
            // Delete only the filtered ones
            const ids = reports.currentSales.map(s => s.id);
            await db.sales.bulkDelete(ids);
            reports.loadData();
            alert('Sales history cleared.');
        }
    },

    downloadCSV: () => {
        const sales = reports.currentSales;
        if(sales.length === 0) return alert('No data to export!');

        // Headers
        let csv = 'Sale ID,Date,Time,Type,Discount,Total,Items\n';

        // Rows
        sales.forEach(s => {
            const date = s.date.toLocaleDateString();
            const time = s.date.toLocaleTimeString();
            // Simplify items list string
            const itemsStr = s.items ? s.items.map(i => `${i.name}(x${i.qty})`).join('; ') : '';
            
            // Escape quotes if needed
            const row = [
                s.id,
                date,
                time,
                s.type,
                s.discount,
                s.total,
                `"${itemsStr}"`
            ].join(',');
            csv += row + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `sales_report_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

// --- Vendors ---
const vendors = {
    load: async () => {
        const list = await db.vendors.toArray();
        const tbody = document.getElementById('vendor-table-body');
        tbody.innerHTML = '';
        list.forEach(v => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="px-6 py-4 font-bold text-slate-700">${v.name}</td>
                <td class="px-6 py-4 text-slate-500">${v.contact}</td>
                <td class="px-6 py-4 text-slate-500">${v.company || '-'}</td>
                 <td class="px-4 py-3 text-center">
                    <button onclick="vendors.delete(${v.id})" class="text-red-500 hover:text-red-700 mx-1"><i class="fa-solid fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },
    addVendor: () => {
        document.getElementById('modal-vendor').classList.remove('hidden');
        document.getElementById('vendor-form').reset();
    },

    closeModal: () => {
        document.getElementById('modal-vendor').classList.add('hidden');
    },

    saveVendor: async (e) => {
        e.preventDefault();
        const name = document.getElementById('vend-name').value;
        const contact = document.getElementById('vend-contact').value;
        const company = document.getElementById('vend-company').value;
        
        await db.vendors.add({name, contact, company});
        vendors.closeModal();
        vendors.load();
    },
    delete: async (id) => {
        if(confirm('Delete Vendor?')) {
            await db.vendors.delete(id);
            vendors.load();
        }
    }
}

// Initialize
window.onload = () => {
    app.init();
};
