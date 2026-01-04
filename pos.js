// pos.js: واجهة نقطة بيع خفيفة تعمل مع نفس localStorage المستخدم في التطبيق الرئيسي
const STORAGE_KEY = 'store-organizer-v1'
let state = { products: [], movements: [], schedules: [], orders: [] }
let cart = []

function loadState(){
  try{ state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || state }catch(e){ state = { products:[], movements:[], schedules:[], orders:[] } }
  if(!Array.isArray(state.orders)) state.orders = []
  // ensure shared cart exists
  if(!Array.isArray(state.currentCart)) state.currentCart = []
  cart = state.currentCart
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8) }

// Render products grid
function renderProducts(filter=''){
  const grid = document.getElementById('productGrid'); grid.innerHTML = ''
  const q = (filter||'').trim().toLowerCase()
  const products = state.products.filter(p => !q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q))
  for(const p of products){
    const div = document.createElement('div'); div.className = 'product-card'
    div.innerHTML = `
      <div style="display:flex;gap:10px;align-items:center">
        <div style="width:72px;height:72px;flex:0 0 72px">
          ${p.image?`<img src="${p.image}" style="width:72px;height:72px;object-fit:cover;border-radius:6px">`:`<div style="width:72px;height:72px;background:#f3f6f8;border-radius:6px;display:flex;align-items:center;justify-content:center;color:#999">No</div>`}
        </div>
        <div style="flex:1">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <strong>${escapeHtml(p.name)}</strong>
            <small>${p.qty} متوفر</small>
          </div>
          <div style="margin-top:6px;color:#666;font-size:13px">${p.category?escapeHtml(p.category):''} ${p.supplier?'- '+escapeHtml(p.supplier):''}</div>
        </div>
      </div>
      <div style="margin-top:8px;display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700">${p.price?p.price.toFixed(2):'0.00'} ر.س</div>
        <div>
          <input data-id="${p.id}" class="pos-qty" type="number" value="1" style="width:60px;padding:6px;border-radius:6px;border:1px solid #ddd">
          <button data-add="${p.id}">أضف</button>
        </div>
      </div>
    `
    grid.appendChild(div)
  }
  // bind add buttons
  grid.querySelectorAll('[data-add]').forEach(b => b.addEventListener('click', e => {
    const id = e.currentTarget.getAttribute('data-add')
    const input = grid.querySelector(`input[data-id="${id}"]`)
    const qty = parseInt(input.value||1,10) || 1
    addToCart(id, qty)
  }))
}

function addToCart(productId, qty){
  const prod = state.products.find(p=>p.id===productId)
  if(!prod) return alert('هذا المنتج غير متوفر')
  // check stock
  if(qty <= 0) return
  const existing = cart.find(i=>i.productId===productId)
  const totalWanted = (existing?existing.qty:0) + qty
  if(totalWanted > prod.qty) return alert('الكمية المطلوبة أكبر من المتوفر')
  if(existing) existing.qty += qty
  else cart.push({ productId, qty, price: prod.price || 0 })
  state.currentCart = cart
  saveState()
  renderCart()
  updateCartCount()
}

function renderCart(){
  const list = document.getElementById('cartList'); list.innerHTML = ''
  let subtotal = 0
  for(const item of cart){
    const prod = state.products.find(p=>p.id===item.productId) || { name:'-'}
    const li = document.createElement('li'); li.className = 'cart-item'
    li.innerHTML = `
      <div style="flex:1">
        <div><strong>${escapeHtml(prod.name)}</strong></div>
        <div style="font-size:13px;color:#666">${item.qty} × ${item.price?item.price.toFixed(2):'0.00'}</div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <button data-dec="${item.productId}" class="ghost">−</button>
        <div>${item.qty}</div>
        <button data-inc="${item.productId}" class="ghost">+</button>
        <button data-rm="${item.productId}" style="background:#ef4444">حذف</button>
      </div>
    `
    list.appendChild(li)
    subtotal += (item.price||0) * item.qty
  }
  document.getElementById('subtotal').textContent = subtotal.toFixed(2)
  // update tax/total display (may be recomputed by updateTotals)
  updateTotals()

  list.querySelectorAll('[data-inc]').forEach(b=>b.addEventListener('click', e=>{ changeQty(e.currentTarget.getAttribute('data-inc'), 1) }))
  list.querySelectorAll('[data-dec]').forEach(b=>b.addEventListener('click', e=>{ changeQty(e.currentTarget.getAttribute('data-dec'), -1) }))
  list.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click', e=>{ removeFromCart(e.currentTarget.getAttribute('data-rm')) }))
}

function changeQty(productId, delta){
  const item = cart.find(i=>i.productId===productId); if(!item) return
  const prod = state.products.find(p=>p.id===productId)
  const newQty = item.qty + delta
  if(newQty <= 0) return removeFromCart(productId)
  if(newQty > prod.qty) return alert('الكمية المطلوبة أكبر من المتوفر')
  item.qty = newQty
  state.currentCart = cart; saveState(); renderCart(); updateCartCount()
}
function removeFromCart(productId){ cart = cart.filter(i=>i.productId!==productId); state.currentCart = cart; saveState(); renderCart(); updateCartCount() }

function clearCart(){ cart = []; state.currentCart = cart; saveState(); renderCart(); updateCartCount() }

function checkout(){
  if(cart.length===0) return alert('العربة فارغة')
  // validate all stock again
  for(const item of cart){
    const prod = state.products.find(p=>p.id===item.productId)
    if(!prod) return alert('منتج غير موجود: ' + item.productId)
    if(item.qty > prod.qty) return alert('الكمية المطلوبة أكبر من المتوفر: ' + prod.name)
  }
  const customer = document.getElementById('customerName').value.trim() || null
  const payment = document.getElementById('paymentMethod').value
  const total = parseFloat(document.getElementById('total').textContent||0)
  const paid = parseFloat(document.getElementById('paidAmount').value||0) || 0
  const taxPercent = parseFloat(document.getElementById('taxPercent').value||0) || 0
  const discount = parseFloat(document.getElementById('discount').value||0) || 0
  // if cash payment require enough paid amount
  if(payment === 'cash' && paid < total) return alert('مبلغ الدفع أقل من الإجمالي، أدخل المبلغ الكامل')
  // create order
  const order = { id: uid(), items: cart.map(i=>({ productId:i.productId, qty:i.qty, price:i.price })), subtotal: parseFloat(document.getElementById('subtotal').textContent||0), taxPercent, discount, total, payment, paid, change: Math.max(0, paid - total), customer, at: new Date().toISOString() }
  state.orders.unshift(order)
  // create movements and update stock
  for(const it of cart){
    const prod = state.products.find(p=>p.id===it.productId)
    prod.qty -= it.qty
    state.movements.unshift({ id: uid(), productId: it.productId, type: 'out', qty: it.qty, note: 'Sale - order:'+order.id, at: new Date().toISOString() })
  }
  // clear shared cart and persist
  state.currentCart = []
  cart = []
  saveState()
  showReceipt(order)
  renderProducts(document.getElementById('posSearch').value)
  renderCart()
}

function showReceipt(order){
  const wrap = document.getElementById('receiptWrap'); const r = document.getElementById('receipt')
  let text = `ايصال بيع — رقم: ${order.id}\nالتاريخ: ${new Date(order.at).toLocaleString()}\n` 
  if(order.customer) text += `العميل: ${order.customer}\n`
  text += '-------------------------\n'
  for(const it of order.items){ const p = state.products.find(x=>x.id===it.productId) || {name:'-'}; text += `${p.name} x${it.qty} @ ${it.price.toFixed(2)} = ${(it.qty*it.price).toFixed(2)}\n` }
  text += '-------------------------\n'
  text += `المجموع: ${order.subtotal.toFixed(2)}\nالضريبة (${order.taxPercent}%): ${((order.subtotal*order.taxPercent)/100).toFixed(2)}\nالخصم: ${order.discount.toFixed(2)}\nالإجمالي: ${order.total.toFixed(2)}\nطريقة الدفع: ${order.payment}\n`
  if(order.paid) text += `المبلغ المدفوع: ${order.paid.toFixed(2)}\nالباقي: ${order.change.toFixed(2)}\n`
  r.textContent = text
  wrap.classList.remove('hidden')
}

// compute totals (subtotal, tax, discount, total, change)
function updateTotals(){
  const subtotal = parseFloat(document.getElementById('subtotal').textContent||0) || 0
  const taxPercent = parseFloat(document.getElementById('taxPercent').value||0) || 0
  const discount = parseFloat(document.getElementById('discount').value||0) || 0
  const taxAmount = subtotal * (taxPercent/100)
  let total = subtotal + taxAmount - discount
  if(total < 0) total = 0
  document.getElementById('tax').textContent = taxAmount.toFixed(2)
  document.getElementById('total').textContent = total.toFixed(2)
  const paid = parseFloat(document.getElementById('paidAmount').value||0) || 0
  const change = Math.max(0, paid - total)
  document.getElementById('change').textContent = change.toFixed(2)
}

function printReceipt(){ const content = document.getElementById('receipt').textContent; const w = window.open('', '_blank'); w.document.write(`<pre>${escapeHtml(content)}</pre>`); w.print(); w.close() }

function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])) }

// events
// Header & cart UI for POS
function getCurrentUser(){
  const s = sessionStorage.getItem('store-organizer-user')
  if(s) return s
  return localStorage.getItem('store-organizer-user')
}
function setCurrentUser(name, remember){
  if(name){
    if(remember) localStorage.setItem('store-organizer-user', name)
    else sessionStorage.setItem('store-organizer-user', name)
  } else {
    localStorage.removeItem('store-organizer-user')
    sessionStorage.removeItem('store-organizer-user')
  }
  updateUserDisplay()
}
function updateUserDisplay(){ const btn = document.getElementById('loginBtn'); if(!btn) return; const u = getCurrentUser(); btn.textContent = u?u+' (خروج)':'تسجيل دخول' }
function updateCartCount(){ const el = document.getElementById('cartCount'); if(!el) return; const count = (state.currentCart||[]).reduce((s,i)=>s+(i.qty||0),0); el.textContent = count }
function renderGlobalCartPanel(){ const panel = document.getElementById('globalCartPanel'); const container = document.getElementById('globalCartItems'); if(!panel || !container) return; container.innerHTML = ''; if(!state.currentCart || state.currentCart.length===0){ container.innerHTML = '<div>السلة فارغة</div>'; return }
  for(const it of state.currentCart){ const p = state.products.find(x=>x.id===it.productId) || {name:'-'}; const div = document.createElement('div'); div.className='global-cart-item'; div.innerHTML = `<div class="left"><img class="cart-item-thumb" src="${p.image||''}" onerror="this.style.display='none'"/><div><div style=\"font-weight:600\">${escapeHtml(p.name)}</div><div style=\"font-size:13px;color:#666\">${it.qty} × ${it.price?it.price.toFixed(2):'0.00'}</div></div></div><div><button data-rm="${it.productId}" style=\"background:#ef4444\">حذف</button></div>`; container.appendChild(div)
  }
  container.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click', e=>{ const id = e.currentTarget.getAttribute('data-rm'); state.currentCart = state.currentCart.filter(x=>x.productId!==id); cart = state.currentCart; saveState(); renderGlobalCartPanel(); updateCartCount() }))
}
function initHeaderPos(){ updateUserDisplay(); updateCartCount(); const loginBtn = document.getElementById('loginBtn'); if(loginBtn){ loginBtn.addEventListener('click', ()=>{ const u = getCurrentUser(); if(u){ if(confirm('تسجيل الخروج؟')){ setCurrentUser(null) } } else { const name = prompt('ادخل اسم المستخدم'); if(name) setCurrentUser(name) } }) }
  const cartBtn = document.getElementById('cartBtn'); const globalPanel = document.getElementById('globalCartPanel')
  // hide cart UI from non-admins by default; check user role
  const curUser = getCurrentUser(); const userObj = curUser ? getUsers().find(x=>x.username===curUser) : null
  if(!userObj || userObj.role !== 'admin'){
    if(cartBtn) cartBtn.style.display = 'none'
    if(globalPanel) globalPanel.classList.add('hidden')
  } else {
    if(cartBtn) cartBtn.style.display = ''
    if(cartBtn){ cartBtn.addEventListener('click', ()=>{ const panel = document.getElementById('globalCartPanel'); if(!panel) return; panel.classList.toggle('hidden'); renderGlobalCartPanel() }) }
  }
  const clearBtn = document.getElementById('clearGlobalCart'); if(clearBtn){ clearBtn.addEventListener('click', ()=>{ if(!confirm('تفريغ السلة؟')) return; state.currentCart = []; cart = []; saveState(); renderGlobalCartPanel(); updateCartCount() }) }
  const checkoutFromCart = document.getElementById('checkoutFromCart'); if(checkoutFromCart){ checkoutFromCart.addEventListener('click', ()=>{ const panel = document.getElementById('globalCartPanel'); if(panel) panel.classList.add('hidden'); renderCart(); }) }
}

// Authentication helpers for POS (register/login modal)
function getUsers(){ try{ return JSON.parse(localStorage.getItem('store-organizer-users')||'[]') }catch(e){ return [] } }
function saveUsers(list){ localStorage.setItem('store-organizer-users', JSON.stringify(list)) }
async function hashPassword(pw){ const enc = new TextEncoder().encode(pw); const buf = await crypto.subtle.digest('SHA-256', enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join('') }
async function registerUser(username, password, role='customer'){
  if(!username || !password) throw new Error('الرجاء إدخال اسم المستخدم وكلمة المرور')
  if(password.length < 8) throw new Error('كلمة المرور يجب أن تكون 8 أحرف على الأقل')
  const users = getUsers()
  if(users.find(u=>u.username===username)) throw new Error('اسم المستخدم موجود بالفعل')
  const hash = await hashPassword(password)
  users.push({ username, passHash: hash, role: role||'customer', failedAttempts: 0, lockedUntil: null })
  saveUsers(users)
  return true
}
async function loginUser(username, password, remember){
  const users = getUsers(); const u = users.find(x=>x.username===username)
  if(!u) throw new Error('المستخدم غير موجود')
  if(u.lockedUntil && Date.now() < u.lockedUntil) {
    const mins = Math.ceil((u.lockedUntil - Date.now())/60000)
    throw new Error('الحساب مقفل مؤقتًا. حاول بعد ' + mins + ' دقيقة')
  }
  const hash = await hashPassword(password)
  if(hash !== u.passHash){
    u.failedAttempts = (u.failedAttempts||0) + 1
    if(u.failedAttempts >= 5){
      u.lockedUntil = Date.now() + (15*60*1000)
      saveUsers(users)
      throw new Error('عدة محاولات فاشلة. الحساب مقفل مؤقتًا لمدة 15 دقيقة')
    }
    saveUsers(users)
    throw new Error('كلمة المرور خاطئة. المحاولات: ' + u.failedAttempts)
  }
  u.failedAttempts = 0; u.lockedUntil = null; saveUsers(users)
  setCurrentUser(username, !!remember)
  return true
}

function showAuthModal(show){ const m = document.getElementById('authModal'); if(!m) return; if(show) m.classList.remove('hidden'); else m.classList.add('hidden') }

window.addEventListener('load', ()=>{ loadState(); renderProducts(); renderCart(); initHeaderPos();
  // auth modal actions
  const tabLogin = document.getElementById('tabLogin'); const tabRegister = document.getElementById('tabRegister'); const loginPane = document.getElementById('loginPane'); const registerPane = document.getElementById('registerPane');
  tabLogin?.addEventListener('click', ()=>{ loginPane.classList.remove('hidden'); registerPane.classList.add('hidden') })
  tabRegister?.addEventListener('click', ()=>{ registerPane.classList.remove('hidden'); loginPane.classList.add('hidden') })
  document.getElementById('doRegister')?.addEventListener('click', async ()=>{
    const un = document.getElementById('regUser').value.trim(); const p1 = document.getElementById('regPass').value; const p2 = document.getElementById('regPass2').value; const role = document.getElementById('regRole')?.value || 'customer'
    try{ if(p1 !== p2) return alert('كلمتا المرور لا تتطابقان'); await registerUser(un,p1,role); alert('تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.'); tabLogin?.click() }catch(e){ alert(e.message) }
  })
  document.getElementById('doLogin')?.addEventListener('click', async ()=>{
    const un = document.getElementById('loginUser').value.trim(); const pw = document.getElementById('loginPass').value; const remember = !!document.getElementById('rememberMe')?.checked
    try{ await loginUser(un,pw,remember); showAuthModal(false); updateUserDisplay();
      // if not admin, hide cart button immediately
      const cur = getCurrentUser(); const uobj = cur?getUsers().find(x=>x.username===cur):null; if(!uobj || uobj.role !== 'admin'){ const cartBtn = document.getElementById('cartBtn'); if(cartBtn) cartBtn.style.display='none' }
    }catch(e){ alert(e.message) }
  })

  // enforce login before browsing
  const cur = getCurrentUser(); if(!cur){ showAuthModal(true) } else { showAuthModal(false) }
})
document.getElementById('posSearch').addEventListener('input', e=>renderProducts(e.target.value))
document.getElementById('clearSearch').addEventListener('click', ()=>{ document.getElementById('posSearch').value=''; renderProducts('') })
document.getElementById('checkoutBtn').addEventListener('click', checkout)
document.getElementById('clearCart').addEventListener('click', ()=>{ if(confirm('تفريغ العربة؟')) clearCart() })
document.getElementById('printReceipt').addEventListener('click', printReceipt)
document.getElementById('closeReceipt').addEventListener('click', ()=>{ document.getElementById('receiptWrap').classList.add('hidden') })
