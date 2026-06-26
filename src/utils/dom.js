// ---------------------------------------------------------------------------
// dom.js – Lightweight DOM utility helpers for the TradingView-clone app
// ---------------------------------------------------------------------------

/**
 * Shorthand for `querySelector`.
 * @param {string}            selector  CSS selector
 * @param {Element|Document}  [ctx=document]
 * @returns {Element|null}
 */
export function $(selector, ctx = document) {
  return ctx.querySelector(selector)
}

/**
 * Shorthand for `querySelectorAll`, always returning a real Array.
 * @param {string}            selector  CSS selector
 * @param {Element|Document}  [ctx=document]
 * @returns {Element[]}
 */
export function $$(selector, ctx = document) {
  return Array.from(ctx.querySelectorAll(selector))
}

/**
 * Add an event listener to an element.
 * @param {EventTarget}  el
 * @param {string}       event    Event type, e.g. 'click'
 * @param {Function}     handler
 * @param {boolean|AddEventListenerOptions} [options]
 */
export function onDOM(el, event, handler, options) {
  el.addEventListener(event, handler, options)
}

/**
 * Remove an event listener from an element.
 * @param {EventTarget}  el
 * @param {string}       event
 * @param {Function}     handler
 * @param {boolean|EventListenerOptions} [options]
 */
export function offDOM(el, event, handler, options) {
  el.removeEventListener(event, handler, options)
}

/**
 * Create a DOM element with optional attributes and children.
 *
 * @param {string}  tag               HTML tag name, e.g. 'div', 'span'
 * @param {Object}  [attrs={}]        Key/value pairs applied to the element.
 *                                    Keys starting with 'on' are treated as
 *                                    event listeners (e.g. onClick → 'click').
 *                                    'class' sets className.
 *                                    'style' may be a string or plain object.
 *                                    All other keys set element properties or
 *                                    attributes as appropriate.
 * @param {Array}   [children=[]]     Strings or Element nodes to append.
 * @returns {HTMLElement}
 *
 * @example
 * const btn = createElement('button', { class: 'btn', onClick: () => alert('hi') }, ['Click me'])
 */
export function createElement(tag, attrs = {}, children = []) {
  const el = document.createElement(tag)

  for (const [key, value] of Object.entries(attrs)) {
    // Event listeners: onClick → 'click', onMouseEnter → 'mouseenter', etc.
    if (key.startsWith('on') && typeof value === 'function') {
      const eventName = key.slice(2).toLowerCase()
      el.addEventListener(eventName, value)
      continue
    }

    // class → className
    if (key === 'class') {
      el.className = value
      continue
    }

    // style as plain object
    if (key === 'style' && typeof value === 'object' && value !== null) {
      Object.assign(el.style, value)
      continue
    }

    // data-* attributes
    if (key.startsWith('data-')) {
      el.setAttribute(key, value)
      continue
    }

    // aria-* and other hyphenated attributes
    if (key.includes('-')) {
      el.setAttribute(key, value)
      continue
    }

    // Boolean attributes / known IDL properties
    if (key in el) {
      el[key] = value
    } else {
      el.setAttribute(key, value)
    }
  }

  for (const child of children) {
    if (child instanceof Node) {
      el.appendChild(child)
    } else if (child !== null && child !== undefined) {
      el.appendChild(document.createTextNode(String(child)))
    }
  }

  return el
}
