// بسيط: تخزين محلي، إدارة منتجات، حركات وارد/صادر، وجدولة تذكيرات
const STORAGE_KEY = 'store-organizer-v1'
let state = { products: [], movements: [], schedules: [] }
// ensure state.currentCart stored with products added in POS

function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8) }

function load(){
  try{ state = JSON.parse(localStorage.getItem(STORAGE_KEY)) || state }catch(e){ state = { products:[], movements:[], schedules:[] } }
  // ensure cart exists in state for cross-page cart
  if(!Array.isArray(state.currentCart)) state.currentCart = []
  renderAll()
}
function save(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) }

// منتجات
function addProduct(){
  const name = document.getElementById('pName').value.trim()
  if(!name) return alert('أدخل اسم المنتج')
  const sku = document.getElementById('pSku').value.trim()
  const category = document.getElementById('pCategory').value.trim()
  const supplier = document.getElementById('pSupplier').value.trim()
  const qty = parseInt(document.getElementById('pQty').value||0,10) || 0
  const reorder = parseInt(document.getElementById('pReorder').value||0,10)
  const price = parseFloat(document.getElementById('pPrice').value||0) || 0
  const imgInput = document.getElementById('pImage')
  const file = imgInput && imgInput.files && imgInput.files[0]
  const createAndSave = (imgDataUrl)=>{
    const p = { id: uid(), name, sku, category: category||null, supplier: supplier||null, qty, reorderThreshold: isNaN(reorder)?null:reorder, price, image: imgDataUrl||null }
    state.products.unshift(p)
    // if initial qty > 0, record an initial 'in' movement for audit
    if(qty > 0){
      state.movements.unshift({ id: uid(), productId: p.id, type: 'in', qty: qty, note: 'Initial stock', at: new Date().toISOString() })
    }
    save(); clearProductForm(); renderAll()
  }
  if(file){
    const reader = new FileReader()
    reader.onload = ()=>{ createAndSave(reader.result) }
    reader.readAsDataURL(file)
  } else {
    createAndSave(null)
  }
}
function clearProductForm(){ document.getElementById('pName').value=''; document.getElementById('pSku').value=''; document.getElementById('pQty').value=0; document.getElementById('pPrice').value=''; document.getElementById('pReorder').value=''; clearImageInput() }
// also clear image input and preview
document.getElementById('pImage')?.addEventListener('change', (e)=>{
  const img = document.getElementById('pImagePreview')
  const file = e.target.files && e.target.files[0]
  if(file){
    const r = new FileReader()
    r.onload = ()=>{ img.src = r.result; img.style.display = 'inline-block' }
    r.readAsDataURL(file)
  } else { img.src=''; img.style.display='none' }
})
function clearImageInput(){ const ip = document.getElementById('pImage'); if(ip){ ip.value=''; const img = document.getElementById('pImagePreview'); if(img){ img.src=''; img.style.display='none' } } }

function renderProducts(filter=''){
  const tbody = document.querySelector('#productsTable tbody'); tbody.innerHTML=''
  const q = filter.trim().toLowerCase()
  const products = state.products.filter(p=>!q || p.name.toLowerCase().includes(q) || (p.sku||'').toLowerCase().includes(q))
  for(const p of products){
    const low = p.reorderThreshold !== null && p.qty <= p.reorderThreshold
    const tr = document.createElement('tr')
    if(low) tr.classList.add('low-stock')
    tr.innerHTML = `
      <td>${p.image?`<img src="${p.image}" style="height:46px;width:46px;object-fit:cover;border-radius:6px">`:'-'}</td>
      <td>${escapeHtml(p.name)}</td>
      <td>${escapeHtml(p.sku||'')}</td>
      <td>${escapeHtml(p.category||'')}</td>
      <td>${escapeHtml(p.supplier||'')}</td>
      <td>${p.qty}</td>
      <td>${p.reorderThreshold!==null?p.reorderThreshold:''}</td>
      <td>${p.price?p.price.toFixed(2):''}</td>
      <td>
        <button data-id="${p.id}" class="btn-in">+ وارد</button>
        <button data-id="${p.id}" class="btn-out">- صادر</button>
        <button data-del="${p.id}" style="background:#ef4444">حذف</button>
      </td>
    `
    tbody.appendChild(tr)
  }
  // bind
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click', e=>{ removeProduct(e.currentTarget.getAttribute('data-del')) }))
  document.querySelectorAll('.btn-in').forEach(b=>b.addEventListener('click', e=>{ quickAdjust(e.currentTarget.getAttribute('data-id'), 'in') }))
  document.querySelectorAll('.btn-out').forEach(b=>b.addEventListener('click', e=>{ quickAdjust(e.currentTarget.getAttribute('data-id'), 'out') }))
  populateMovProductSelect()
}

function removeProduct(id){ if(!confirm('حذف المنتج؟')) return; state.products = state.products.filter(p=>p.id!==id); save(); renderAll() }

// حركة المخزون
function addMovement(){
  const prodId = document.getElementById('movProduct').value
  const type = document.getElementById('movType').value
  const qty = parseInt(document.getElementById('movQty').value||0,10)||0
  const note = document.getElementById('movNote').value.trim()
  if(!prodId) return alert('اختر منتجاً')
  if(qty<=0) return alert('الكمية يجب أن تكون أكبر من صفر')
  const prod = state.products.find(p=>p.id===prodId)
  if(!prod) return alert('خطأ: المنتج غير موجود')
  // prevent negative stock
  if(type==='out' && prod.qty < qty) {
    return alert('غير مسموح: الكمية المطلوبة أكبر من المتوفر')
  }
  const mv = { id: uid(), productId: prodId, type, qty, note, at: new Date().toISOString() }
  state.movements.unshift(mv)
  prod.qty = type==='in' ? prod.qty + qty : prod.qty - qty
  save(); renderAll(); document.getElementById('movQty').value = 1; document.getElementById('movNote').value = ''
}

function quickAdjust(prodId, type){
  const amount = parseInt(prompt('ادخل الكمية', '1')||'0',10)||0
  if(amount<=0) return
  document.getElementById('movProduct').value = prodId
  document.getElementById('movType').value = type
  document.getElementById('movQty').value = amount
  addMovement()
}

function renderMovements(){
  const tbody = document.querySelector('#movTable tbody'); tbody.innerHTML=''
  for(const m of state.movements.slice(0,200)){
    const prod = state.products.find(p=>p.id===m.productId) || { name:'-'}
    const tr = document.createElement('tr')
    tr.innerHTML = `<td>${new Date(m.at).toLocaleString()}</td><td>${escapeHtml(prod.name)}</td><td>${m.type}</td><td>${m.qty}</td><td>${escapeHtml(m.note||'')}</td>`
    tbody.appendChild(tr)
  }
}

function populateMovProductSelect(){
  const sel = document.getElementById('movProduct'); sel.innerHTML=''
  state.products.forEach(p=>{ const o = document.createElement('option'); o.value=p.id; o.textContent = `${p.name} (${p.qty})`; sel.appendChild(o) })
}

// جداول/تذكيرات
function addSchedule(){
  const title = document.getElementById('schedTitle').value.trim();
  const date = document.getElementById('schedDate').value
  const amount = parseFloat(document.getElementById('schedAmount').value||0) || null
  if(!title || !date) return alert('الرجاء إدخال وصف وتاريخ')
  state.schedules.unshift({ id: uid(), title, date, amount, createdAt: new Date().toISOString() })
  save(); renderSchedules(); document.getElementById('schedTitle').value=''; document.getElementById('schedDate').value=''; document.getElementById('schedAmount').value=''
}
function renderSchedules(){
  const ul = document.getElementById('schedulesList'); ul.innerHTML=''
  state.schedules.forEach(s=>{
    const li = document.createElement('li')
    li.innerHTML = `<div><strong>${escapeHtml(s.title)}</strong><div>${s.date}${s.amount?(' - '+s.amount):''}</div></div><div><button data-del="${s.id}" style="background:#ef4444">حذف</button></div>`
    ul.appendChild(li)
  })
  document.querySelectorAll('[data-del]').forEach(b=>b.addEventListener('click',e=>{ const id=e.currentTarget.getAttribute('data-del'); state.schedules = state.schedules.filter(x=>x.id!==id); save(); renderSchedules() }))
}

// استيراد/تصدير
function exportCsv(){
  const rows = [['name','sku','category','supplier','qty','reorderThreshold','price']]
  state.products.forEach(p=>rows.push([p.name,p.sku||'',p.category||'',p.supplier||'',p.qty,p.reorderThreshold!==null?p.reorderThreshold:'',p.price||'']))
  const csv = rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n')
  download('products.csv', csv)
}
function exportJson(){ download('store-data.json', JSON.stringify(state,null,2)) }
function importJson(file){
  const reader = new FileReader()
  reader.onload = ()=>{
    try{ const obj = JSON.parse(reader.result); if(obj.products && Array.isArray(obj.products)){ state = obj; save(); renderAll(); alert('تم الاستيراد') } else alert('الملف لا يبدو صالحاً') }catch(e){ alert('خطأ قراءة الملف') }
  }
  reader.readAsText(file)
}

function download(name, text){ const a=document.createElement('a'); a.href = URL.createObjectURL(new Blob([text], {type:'text/plain'})); a.download=name; document.body.appendChild(a); a.click(); a.remove() }

// أدوات
function escapeHtml(s){ if(!s) return ''; return String(s).replace(/[&<>\"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c])) }

function renderAll(){ renderProducts(document.getElementById('search').value||''); renderMovements(); renderSchedules(); populateMovProductSelect() }
// Header & cart utilities
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
// users stored as [{username, passHash}]
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
  // check lockout
  if(u.lockedUntil && Date.now() < u.lockedUntil) {
    const mins = Math.ceil((u.lockedUntil - Date.now())/60000)
    throw new Error('الحساب مقفل مؤقتًا. حاول بعد ' + mins + ' دقيقة')
  }
  const hash = await hashPassword(password)
  if(hash !== u.passHash){
    u.failedAttempts = (u.failedAttempts||0) + 1
    if(u.failedAttempts >= 5){
      u.lockedUntil = Date.now() + (15*60*1000) // 15 minutes
      saveUsers(users)
      throw new Error('عدة محاولات فاشلة. الحساب مقفل مؤقتًا لمدة 15 دقيقة')
    }
    saveUsers(users)
    throw new Error('كلمة المرور خاطئة. المحاولات: ' + u.failedAttempts)
  }
  // success
  u.failedAttempts = 0; u.lockedUntil = null; saveUsers(users)
  setCurrentUser(username, !!remember)
  return true
}

function showAuthModal(show){ const m = document.getElementById('authModal'); if(!m) return; if(show) m.classList.remove('hidden'); else m.classList.add('hidden') }
function blockUntilAuth(){ const u = getCurrentUser(); if(!u){ showAuthModal(true); } else { showAuthModal(false) } }
function updateUserDisplay(){ const btn = document.getElementById('loginBtn'); if(!btn) return; const u = getCurrentUser(); btn.textContent = u?u+' (خروج)':'تسجيل دخول' }
function updateCartCount(){ const el = document.getElementById('cartCount'); if(!el) return; const count = state.currentCart.reduce((s,i)=>s+(i.qty||0),0); el.textContent = count }
function renderGlobalCartPanel(){ const panel = document.getElementById('globalCartPanel'); const container = document.getElementById('globalCartItems'); if(!panel || !container) return; container.innerHTML = ''; if(!state.currentCart || state.currentCart.length===0){ container.innerHTML = '<div>السلة فارغة</div>'; return }
  for(const it of state.currentCart){ const p = state.products.find(x=>x.id===it.productId) || {name:'-'}; const div = document.createElement('div'); div.className='global-cart-item'; div.innerHTML = `<div class="left"><img class="cart-item-thumb" src="${p.image||''}" onerror="this.style.display='none'"/><div><div style=\"font-weight:600\">${escapeHtml(p.name)}</div><div style=\"font-size:13px;color:#666\">${it.qty} × ${it.price?it.price.toFixed(2):'0.00'}</div></div></div><div><button data-rm="${it.productId}" style=\"background:#ef4444\">حذف</button></div>`; container.appendChild(div)
  }
  // bind remove
  container.querySelectorAll('[data-rm]').forEach(b=>b.addEventListener('click', e=>{ const id = e.currentTarget.getAttribute('data-rm'); state.currentCart = state.currentCart.filter(x=>x.productId!==id); save(); renderGlobalCartPanel(); updateCartCount() }))
}

function initHeader(){ updateUserDisplay(); updateCartCount();
  const loginBtn = document.getElementById('loginBtn'); if(loginBtn){ loginBtn.addEventListener('click', ()=>{ const u = getCurrentUser(); if(u){ if(confirm('تسجيل الخروج؟')){ setCurrentUser(null) } } else { const name = prompt('ادخل اسم المستخدم'); if(name) setCurrentUser(name) } }) }
  const cartBtn = document.getElementById('cartBtn'); if(cartBtn){ cartBtn.addEventListener('click', ()=>{ const panel = document.getElementById('globalCartPanel'); if(!panel) return; panel.classList.toggle('hidden'); renderGlobalCartPanel() }) }
  const clearBtn = document.getElementById('clearGlobalCart'); if(clearBtn){ clearBtn.addEventListener('click', ()=>{ if(!confirm('تفريغ السلة؟')) return; state.currentCart = []; save(); renderGlobalCartPanel(); updateCartCount() }) }
  const gotoPOS = document.getElementById('gotoPOS'); if(gotoPOS){ gotoPOS.addEventListener('click', ()=>{ window.open('pos.html','_blank') }) }
}

// أحداث DOM
window.addEventListener('load', ()=>{ load(); initHeader();
  // prepare auth modal actions
  blockUntilAuth();
  const tabLogin = document.getElementById('tabLogin'); const tabRegister = document.getElementById('tabRegister'); const loginPane = document.getElementById('loginPane'); const registerPane = document.getElementById('registerPane');
  tabLogin?.addEventListener('click', ()=>{ loginPane.classList.remove('hidden'); registerPane.classList.add('hidden') })
  tabRegister?.addEventListener('click', ()=>{ registerPane.classList.remove('hidden'); loginPane.classList.add('hidden') })
  document.getElementById('doRegister')?.addEventListener('click', async ()=>{
    const un = document.getElementById('regUser').value.trim(); const p1 = document.getElementById('regPass').value; const p2 = document.getElementById('regPass2').value; const role = document.getElementById('regRole')?.value || 'customer'
    try{ if(p1 !== p2) return alert('كلمتا المرور لا تتطابقان'); await registerUser(un,p1,role); alert('تم إنشاء الحساب. يمكنك الآن تسجيل الدخول.'); tabLogin?.click() }catch(e){ alert(e.message) }
  })
  document.getElementById('doLogin')?.addEventListener('click', async ()=>{
    const un = document.getElementById('loginUser').value.trim(); const pw = document.getElementById('loginPass').value; const remember = !!document.getElementById('rememberMe')?.checked
    try{ await loginUser(un,pw,remember); showAuthModal(false); updateUserDisplay(); }catch(e){ alert(e.message) }
  })
})
document.getElementById('addProduct').addEventListener('click', addProduct)
document.getElementById('addMov').addEventListener('click', addMovement)
document.getElementById('search').addEventListener('input', ()=>renderProducts(document.getElementById('search').value))
document.getElementById('addSched').addEventListener('click', addSchedule)
document.getElementById('exportCsv').addEventListener('click', exportCsv)
document.getElementById('exportJson').addEventListener('click', exportJson)
document.getElementById('importJson').addEventListener('click', ()=>document.getElementById('fileInput').click())
document.getElementById('fileInput').addEventListener('change', e=>{ if(e.target.files && e.target.files[0]) importJson(e.target.files[0]) })
