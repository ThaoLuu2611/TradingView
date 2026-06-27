export function initMobileUI() {
  const btnWatchlist = document.getElementById('btn-mobile-watchlist')
  const rightPanel = document.getElementById('right-panel')
  const fabDraw = document.getElementById('fab-draw')
  const leftPanel = document.getElementById('left-panel')
  const overlay = document.getElementById('mobile-overlay')
  const fabContainer = document.getElementById('fab-container')

  if (!btnWatchlist || !rightPanel || !fabDraw || !leftPanel || !overlay || !fabContainer) return

  // Show mobile buttons if on small screen
  function checkMobile() {
    if (window.innerWidth <= 768) {
      btnWatchlist.style.display = 'flex'
      fabContainer.style.display = 'flex'
    } else {
      btnWatchlist.style.display = 'none'
      fabContainer.style.display = 'none'
      // close all panels if resized to desktop
      closeAll()
    }
  }

  function closeAll() {
    rightPanel.classList.remove('open')
    leftPanel.classList.remove('open')
    overlay.classList.remove('visible')
    if (window.innerWidth <= 768) {
      fabContainer.style.display = 'flex'
    }
  }

  btnWatchlist.addEventListener('click', () => {
    rightPanel.classList.add('open')
    overlay.classList.add('visible')
    fabContainer.style.display = 'none'
  })

  fabDraw.addEventListener('click', () => {
    leftPanel.classList.add('open')
    overlay.classList.add('visible')
    fabContainer.style.display = 'none'
  })

  overlay.addEventListener('click', closeAll)

  // Initial check and listen for resize
  checkMobile()
  window.addEventListener('resize', checkMobile)
}
