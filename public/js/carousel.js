(function () {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCarousel);
  } else {
    initCarousel();
  }

  async function initCarousel() {
    const stageWrap = document.querySelector('.hero-stage-wrap');
    const stage = document.getElementById('hero-stage');
    const pager = document.getElementById('hero-pager');
    const hero = document.querySelector('.hero');
    if (!stageWrap || !stage || !hero) return;

    // Fetch hero items from API
    let items = [];
    try {
      if (window.BeyondAPI && typeof window.BeyondAPI.getHeroProducts === 'function') {
        const res = await window.BeyondAPI.getHeroProducts();
        if (res && res.success && Array.isArray(res.items) && res.items.length > 0) {
          items = res.items;
        }
      }
      if (items.length === 0) {
        const res = await fetch('/api/products/hero');
        const data = await res.json();
        if (data && data.success && Array.isArray(data.items)) {
          items = data.items;
        }
      }
    } catch (e) {
      console.warn('Failed to load hero items from API:', e);
    }

    if (!items || items.length < 2) {
      console.warn('Carousel requires at least 2 items.');
      return;
    }

    const n = items.length;

    // Render slides
    stage.innerHTML = '';
    const slideEls = [];
    items.forEach((item, i) => {
      const slide = document.createElement('a');
      slide.className = 'hero-slide';
      slide.href = '/product/' + encodeURIComponent(item.slug);
      slide.setAttribute('role', 'group');
      slide.setAttribute('aria-roledescription', 'slide');
      slide.setAttribute('aria-label', `${item.name} - ₹${item.price.toLocaleString('en-IN')}`);
      slide.dataset.index = i;
      slide.dataset.slug = item.slug;
      slide.dataset.scale = item.scale || 1.0;

      const picture = document.createElement('picture');
      if (item.mobileImage) {
        const source = document.createElement('source');
        source.media = '(max-width: 768px)';
        source.srcset = item.mobileImage;
        picture.appendChild(source);
      }

      const img = document.createElement('img');
      img.src = item.image;
      img.alt = item.alt || item.name;
      img.width = 956;
      img.height = 1200;
      img.decoding = i === 0 ? 'auto' : 'async';
      if (i === 0) {
        img.setAttribute('fetchpriority', 'high');
      }
      picture.appendChild(img);
      slide.appendChild(picture);

      stage.appendChild(slide);
      slideEls.push(slide);
    });

    // Render pager dots and tilt button
    if (pager) {
      pager.innerHTML = '';

      // iOS tilt button check
      if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        const tiltBtn = document.createElement('button');
        tiltBtn.type = 'button';
        tiltBtn.className = 'hero-tilt-btn';
        tiltBtn.id = 'hero-tilt-btn';
        tiltBtn.setAttribute('aria-label', 'Enable motion tilt');
        tiltBtn.textContent = 'Tilt';
        tiltBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          DeviceOrientationEvent.requestPermission()
            .then(res => {
              if (res === 'granted') {
                enableDeviceOrientation();
                tiltBtn.style.display = 'none';
              }
            })
            .catch(() => {});
        });
        pager.appendChild(tiltBtn);
      }

      items.forEach((item, i) => {
        const dot = document.createElement('button');
        dot.type = 'button';
        dot.className = 'hero-pager-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}: ${item.name}`);
        dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        dot.dataset.index = i;

        const dotSpan = document.createElement('span');
        dot.appendChild(dotSpan);

        dot.addEventListener('click', (e) => {
          e.stopPropagation();
          goToIndex(i);
          resetAutoAdvance();
        });

        pager.appendChild(dot);
      });
    }

    const dotEls = pager ? Array.from(pager.querySelectorAll('.hero-pager-dot')) : [];

    // State variables
    let pos = 0;
    let target = 0;
    let stageW = stage.clientWidth || window.innerWidth;
    let stageH = stage.clientHeight || 500;
    let boxW = 360;
    let boxH = 396;
    let slideSpacing = 400;

    let isDragging = false;
    let hasMoved = false;
    let startX = 0;
    let startY = 0;
    let startPos = 0;
    let lastX = 0;
    let lastTime = 0;
    let velocity = 0;

    let targetTiltX = 0;
    let targetTiltY = 0;
    let currentTiltX = 0;
    let currentTiltY = 0;
    let dragTiltY = 0;

    let pauseUntil = performance.now() + 4500;
    let isMouseInside = false;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function updateSizing() {
      stageW = stage.clientWidth || stageWrap.clientWidth || window.innerWidth;
      stageH = stage.clientHeight || stageWrap.clientHeight || 500;

      // Use one square-ish box per slide: width = min(96% of stage width, 91% of stage height); height = 1.1 times the width
      boxW = Math.round(Math.min(stageW * 0.96, stageH * 0.91));
      boxH = Math.round(boxW * 1.10);

      stage.style.setProperty('--slide-w', boxW + 'px');
      stage.style.setProperty('--slide-h', boxH + 'px');

      // Slide horizontal spacing S:
      // On phones, center fills almost full width, neighbors peek off screen edges
      if (stageW < 700) {
        slideSpacing = Math.round(Math.max(boxW * 0.70, stageW * 0.68));
      } else {
        slideSpacing = Math.round(Math.max(boxW * 0.74, Math.min(stageW * 0.55, 520)));
      }
    }

    updateSizing();
    window.addEventListener('resize', updateSizing, { passive: true });

    function goToIndex(idx) {
      // Find nearest representation of idx
      const currentNorm = ((pos % n) + n) % n;
      let diff = idx - currentNorm;
      if (diff > n / 2) diff -= n;
      if (diff < -n / 2) diff += n;
      target = pos + diff;
      if (reduceMotion) {
        pos = target;
      }
    }

    function resetAutoAdvance(delay = 6000) {
      pauseUntil = performance.now() + delay;
    }

    // Auto-advance
    function checkAutoAdvance() {
      if (reduceMotion) return;
      if (isDragging) return;
      if (document.visibilityState === 'hidden') return;

      const now = performance.now();
      if (now >= pauseUntil) {
        target += 1;
        pauseUntil = now + 4500;
      }
    }

    // Desktop cursor tilt
    hero.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'mouse') {
        isMouseInside = true;
        const rect = hero.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const nx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
        const ny = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));

        // Tilt toward pointer position: rotateY up to 16 deg, rotateX up to 9 deg
        targetTiltY = nx * 16;
        targetTiltX = -ny * 9;
      }
    }, { passive: true });

    hero.addEventListener('pointerleave', () => {
      isMouseInside = false;
      targetTiltX = 0;
      targetTiltY = 0;
    });

    // Mobile device tilt
    function handleOrientation(e) {
      if (isDragging || isMouseInside || reduceMotion) return;
      // gamma for left-right (-90..90), beta minus 50 for forward-back, clamped to -1..1
      const gamma = e.gamma || 0;
      const beta = e.beta || 50;

      const normGamma = Math.max(-1, Math.min(1, gamma / 30));
      const normBeta = Math.max(-1, Math.min(1, (beta - 50) / 30));

      targetTiltY = normGamma * 16;
      targetTiltX = -normBeta * 9;
    }

    function enableDeviceOrientation() {
      window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    }

    // Automatically enable on Android / non-iOS permission browsers
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') {
      enableDeviceOrientation();
    }

    // Pointer Drag & Swipe
    stageWrap.addEventListener('pointerdown', (e) => {
      // Ignore if clicking on tilt button or pager dot
      if (e.target.closest('#hero-tilt-btn') || e.target.closest('.hero-pager-dot')) return;

      isDragging = true;
      hasMoved = false;
      startX = e.clientX;
      startY = e.clientY;
      startPos = pos;
      lastX = e.clientX;
      lastTime = performance.now();
      velocity = 0;
      dragTiltY = 0;

      resetAutoAdvance(6000);

      try {
        stageWrap.setPointerCapture(e.pointerId);
      } catch (err) {}
    });

    stageWrap.addEventListener('pointermove', (e) => {
      if (!isDragging) return;

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      if (!hasMoved && Math.hypot(dx, dy) > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        const now = performance.now();
        const dt = now - lastTime;
        if (dt > 8) {
          velocity = (e.clientX - lastX) / dt;
          lastX = e.clientX;
          lastTime = now;
        }

        const deltaPos = -dx / slideSpacing;
        pos = startPos + deltaPos;
        target = pos;

        // While dragging with a finger, tilt the item with the finger movement instead
        dragTiltY = Math.max(-16, Math.min(16, (dx / slideSpacing) * 16));
      }
    });

    function endDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      dragTiltY = 0;

      try {
        stageWrap.releasePointerCapture(e.pointerId);
      } catch (err) {}

      resetAutoAdvance(6000);

      if (!hasMoved) {
        // Tap / Click on slide (not a drag) opens /product/:slug
        const slide = e.target.closest('.hero-slide');
        if (slide && slide.dataset.slug) {
          window.location.href = '/product/' + encodeURIComponent(slide.dataset.slug);
        }
        return;
      }

      // Fast flick / swipe or snap to nearest
      if (Math.abs(velocity) > 0.35) {
        const dir = velocity > 0 ? -1 : 1;
        target = Math.round(pos + dir * 0.45);
      } else {
        target = Math.round(pos);
      }

      if (reduceMotion) {
        pos = target;
      }
    }

    stageWrap.addEventListener('pointerup', endDrag);
    stageWrap.addEventListener('pointercancel', endDrag);

    // Prevent default click navigation when dragging
    stageWrap.addEventListener('click', (e) => {
      if (hasMoved) {
        e.preventDefault();
        e.stopPropagation();
      }
    }, true);

    // Keyboard navigation
    stageWrap.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        target -= 1;
        if (reduceMotion) pos = target;
        resetAutoAdvance(6000);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        target += 1;
        if (reduceMotion) pos = target;
        resetAutoAdvance(6000);
      } else if (e.key === 'Enter') {
        const activeIdx = ((Math.round(pos) % n) + n) % n;
        const currentItem = items[activeIdx];
        if (currentItem) {
          window.location.href = '/product/' + encodeURIComponent(currentItem.slug);
        }
      }
    });

    // Main animation loop
    function animate() {
      checkAutoAdvance();

      // Smooth easing toward target
      if (reduceMotion) {
        pos = target;
        currentTiltX = 0;
        currentTiltY = 0;
      } else {
        if (!isDragging) {
          pos += (target - pos) * 0.11;
          // Keep pos & target within clean range when settled
          if (Math.abs(target - pos) < 0.001) {
            pos = target;
            const norm = ((target % n) + n) % n;
            pos = norm;
            target = norm;
          }
        }

        // Lerp tilt
        const effectiveTargetTiltY = isDragging ? dragTiltY : targetTiltY;
        const effectiveTargetTiltX = isDragging ? 0 : targetTiltX;
        currentTiltX += (effectiveTargetTiltX - currentTiltX) * 0.08;
        currentTiltY += (effectiveTargetTiltY - currentTiltY) * 0.08;
      }

      // Update slides
      slideEls.forEach((slide, i) => {
        // o = ((i - pos) mod n), mapped to [-n/2, n/2]
        let o = ((i - pos) % n + n) % n;
        if (o > n / 2) o -= n;

        slide.dataset.offset = o.toFixed(4);

        const absO = Math.abs(o);

        // Visibility & Opacity rules:
        // Fully opaque (1.0) within 1 slot (|o| <= 1)
        // Fade out only items more than one slot away (1 < |o| < 1.5)
        // Fully hide beyond 1.5 slots
        let opacity = 1;
        if (absO <= 1) {
          opacity = 1;
        } else if (absO < 1.5) {
          opacity = 1 - (absO - 1) / 0.5;
        } else {
          opacity = 0;
        }

        if (absO >= 1.5) {
          slide.style.visibility = 'hidden';
          slide.style.pointerEvents = 'none';
          slide.style.transform = 'translate3d(0, -9999px, 0)';
          return;
        }

        slide.style.visibility = 'visible';
        slide.style.opacity = opacity.toFixed(3);
        slide.style.pointerEvents = absO < 0.5 ? 'auto' : (absO <= 1.0 ? 'auto' : 'none');

        // Transforms:
        // Differentiate neighbors only with scale (about 0.7), slight rotateY (about 20 deg), z-index
        const tx = Math.round(o * slideSpacing);
        const neighborScale = 1.0 - Math.min(1, absO) * 0.30; // 1.0 at center, 0.70 at neighbor
        const itemScale = parseFloat(slide.dataset.scale) || 1.0;
        const totalScale = (neighborScale * itemScale).toFixed(4);

        // Center item tilts with cursor/device; neighbors rotate slightly inward
        const centerWeight = Math.max(0, 1 - absO);
        const neighborRotY = -Math.sign(o) * Math.min(1, absO) * 20;
        const rotY = (neighborRotY * (1 - centerWeight) + currentTiltY * centerWeight).toFixed(2);
        const rotX = (currentTiltX * centerWeight).toFixed(2);

        const zIndex = Math.round(10 - absO * 5);
        slide.style.zIndex = zIndex;

        slide.style.transform = `translate3d(${tx}px, 0, 0) scale(${totalScale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      });

      // Update pager dots
      const activeIdx = ((Math.round(pos) % n) + n) % n;
      dotEls.forEach((dot, idx) => {
        const isActive = idx === activeIdx;
        dot.setAttribute('aria-current', isActive ? 'true' : 'false');
      });

      requestAnimationFrame(animate);
    }

    requestAnimationFrame(animate);
  }
})();
