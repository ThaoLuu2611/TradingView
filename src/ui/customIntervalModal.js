// ---------------------------------------------------------------------------
// customIntervalModal.js – "Add custom interval" popup
// ---------------------------------------------------------------------------
// Cho phép user nhập interval tuỳ chọn (VD: "7 minutes"), tự động map về
// Binance interval gần nhất và thêm vào dropdown + pin vào toolbar.
// ---------------------------------------------------------------------------

import { get, set } from '../store/store.js'

// Nhãn hiển thị
const UNIT_SINGULAR = { s:'second', m:'minute', h:'hour', D:'day', W:'week', M:'month' }
const UNIT_PLURAL   = { s:'seconds', m:'minutes', h:'hours', D:'days', W:'weeks', M:'months' }

// Giây tương đương để sort theo thời gian
const UNIT_SEC = { s:1, m:60, h:3600, D:86400, W:604800, M:2592000 }

class CustomIntervalModal {
  constructor() {
    this._el        = null
    this._typeEl    = null
    this._valueEl   = null
    this._addBtn    = null
    this._resolve   = null
  }

  init() {
    // Tạo DOM động — không cần sửa index.html
    this._el = document.createElement('div')
    this._el.className = 'ci-overlay'
    this._el.innerHTML = `
      <div class="ci-box">
        <div class="ci-header">
          <span>Add custom interval</span>
          <button class="ci-close" title="Close">&#215;</button>
        </div>
        <div class="ci-body">
          <div class="ci-field">
            <label>Type</label>
            <select class="ci-type">
              <option value="s">seconds</option>
              <option value="m" selected>minutes</option>
              <option value="h">hours</option>
              <option value="D">days</option>
              <option value="W">weeks</option>
              <option value="M">months</option>
            </select>
          </div>
          <div class="ci-field">
            <label>Interval</label>
            <input class="ci-value" type="number" min="1" max="999" placeholder="e.g. 7">
          </div>
        </div>
        <div class="ci-footer">
          <button class="ci-btn-cancel">Cancel</button>
          <button class="ci-btn-add" disabled>Add</button>
        </div>
      </div>
    `
    document.body.appendChild(this._el)

    this._typeEl  = this._el.querySelector('.ci-type')
    this._valueEl = this._el.querySelector('.ci-value')
    this._addBtn  = this._el.querySelector('.ci-btn-add')

    // Events
    this._el.querySelector('.ci-close').addEventListener('click', () => this.close(null))
    this._el.querySelector('.ci-btn-cancel').addEventListener('click', () => this.close(null))
    this._el.addEventListener('click', (e) => {
      // Ngăn click trong modal bubble lên document (tránh đóng dropdown)
      e.stopPropagation()
      if (e.target === this._el) this.close(null)
    })

    this._valueEl.addEventListener('input', () => {
      const v = parseInt(this._valueEl.value)
      this._addBtn.disabled = !(v >= 1)
    })

    this._addBtn.addEventListener('click', () => this._submit())

    this._valueEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !this._addBtn.disabled) this._submit()
      if (e.key === 'Escape') this.close(null)
    })
  }

  /**
   * Mở modal. Trả về Promise<{tf, label, seconds} | null>
   */
  open() {
    return new Promise((resolve) => {
      this._resolve = resolve
      this._valueEl.value = ''
      this._addBtn.disabled = true
      this._el.classList.add('open')
      setTimeout(() => this._valueEl.focus(), 30)
    })
  }

  close(result) {
    this._el.classList.remove('open')
    if (this._resolve) { this._resolve(result); this._resolve = null }
  }

  _submit() {
    const v    = parseInt(this._valueEl.value)
    const unit = this._typeEl.value
    if (!(v >= 1)) return

    const tf      = `${v}${unit}`
    const label   = `${v} ${v === 1 ? UNIT_SINGULAR[unit] : UNIT_PLURAL[unit]}`
    const seconds = v * UNIT_SEC[unit]

    this.close({ tf, label, unit, value: v, seconds })
  }
}

export const customIntervalModal = new CustomIntervalModal()

// ---------------------------------------------------------------------------
// Helpers để toolbar.js dùng
// ---------------------------------------------------------------------------

/**
 * Thêm custom interval vào store (không trùng lặp).
 * @param {{ tf, label, unit, value, seconds }} item
 */
export function addCustomInterval(item) {
  const list = [...(get('customIntervals') || [])]
  if (list.some(i => i.tf === item.tf)) return // đã tồn tại

  list.push(item)
  // Sort theo thời gian tăng dần
  list.sort((a, b) => a.seconds - b.seconds)
  set('customIntervals', list)
}

/**
 * Lấy danh sách custom intervals từ store, đã sort.
 * @returns {Array<{tf, label, unit, value, seconds}>}
 */
export function getCustomIntervals() {
  return get('customIntervals') || []
}
