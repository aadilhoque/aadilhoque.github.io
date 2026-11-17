/* Custom video player (pop-up). Each video card on the Portfolio page carries:
   data-video  = path to the .mp4
   data-poster = thumbnail image
   data-ratio  = shape of the video, e.g. "9/16", "1/1", "16/9"
   data-title  = text shown at the top of the player
   The video file is only requested when the card is clicked. */
(function () {
  'use strict';

  var player = document.getElementById('player');
  if (!player) return;

  var frame = player.querySelector('.player__frame');
  var video = player.querySelector('video');
  var titleEl = player.querySelector('.player__title');
  var msg = player.querySelector('.player__msg');
  var closeBtn = player.querySelector('.player__close');
  var btnPlay = player.querySelector('.player__play');
  var btnBig = player.querySelector('.player__big');
  var btnMute = player.querySelector('.player__mute');
  var btnFs = player.querySelector('.player__fs');
  var seek = player.querySelector('.player__seek');
  var vol = player.querySelector('.player__vol');
  var tCur = player.querySelector('.player__cur');
  var tDur = player.querySelector('.player__dur');

  var lastTrigger = null;
  var idleTimer = null;
  var cleanTimer = null;
  var scrubbing = false;

  function fmt(s) {
    if (!isFinite(s) || s < 0) return '0:00';
    s = Math.floor(s);
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  function fill(input) {
    var min = parseFloat(input.min) || 0;
    var max = parseFloat(input.max) || 100;
    var pct = max > min ? ((parseFloat(input.value) - min) / (max - min)) * 100 : 0;
    input.style.setProperty('--fill', pct + '%');
  }

  function showControls() {
    frame.classList.remove('is-idle');
    clearTimeout(idleTimer);
    if (!video.paused) {
      idleTimer = setTimeout(function () { frame.classList.add('is-idle'); }, 2600);
    }
  }

  function syncState() {
    frame.classList.toggle('is-playing', !video.paused && !video.ended);
    var label = video.paused ? 'Play' : 'Pause';
    btnPlay.setAttribute('aria-label', label);
    btnBig.setAttribute('aria-label', label);
    showControls();
  }

  function syncVolume() {
    var muted = video.muted || video.volume === 0;
    frame.classList.toggle('is-muted', muted);
    btnMute.setAttribute('aria-label', muted ? 'Unmute' : 'Mute');
    vol.value = muted ? 0 : video.volume;
    fill(vol);
  }

  function toggle() {
    if (video.paused || video.ended) {
      var p = video.play();
      if (p && p.catch) p.catch(function () {});
    } else {
      video.pause();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (frame.requestFullscreen) {
      frame.requestFullscreen();
    } else if (video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen(); // iPhone
    }
  }

  function open(card) {
    clearTimeout(cleanTimer);
    lastTrigger = card;

    var parts = (card.getAttribute('data-ratio') || '16/9').split('/');
    var w = parseFloat(parts[0]) || 16;
    var h = parseFloat(parts[1]) || 9;
    frame.style.setProperty('--rn', (w / h).toFixed(4));
    frame.style.setProperty('--r', w + ' / ' + h);

    titleEl.textContent = card.getAttribute('data-title') || '';
    msg.hidden = true;
    frame.classList.remove('is-error');
    frame.classList.add('is-loading');

    video.poster = card.getAttribute('data-poster') || '';
    video.src = card.getAttribute('data-video');
    video.load();

    seek.value = 0; seek.max = 1; fill(seek);
    tCur.textContent = '0:00'; tDur.textContent = '0:00';
    video.volume = 1; video.muted = false; syncVolume();

    player.classList.add('is-open');
    player.setAttribute('aria-hidden', 'false');
    document.body.classList.add('no-scroll');
    btnPlay.focus({ preventScroll: true });

    var p = video.play();
    if (p && p.catch) p.catch(function () {});
    syncState();
  }

  function close() {
    if (!player.classList.contains('is-open')) return;
    if (document.fullscreenElement) document.exitFullscreen();
    video.pause();
    player.classList.remove('is-open');
    player.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('no-scroll');
    cleanTimer = setTimeout(function () {
      video.removeAttribute('src');
      video.load();
    }, 400);
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  /* ---- Open from cards ---- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-video]'), function (card) {
    card.addEventListener('click', function () { open(card); });
  });

  /* ---- Close ---- */
  Array.prototype.forEach.call(player.querySelectorAll('[data-close]'), function (el) {
    el.addEventListener('click', close);
  });

  /* ---- Video events ---- */
  video.addEventListener('loadedmetadata', function () {
    seek.max = video.duration || 1;
    tDur.textContent = fmt(video.duration);
  });
  video.addEventListener('timeupdate', function () {
    if (!scrubbing) { seek.value = video.currentTime; fill(seek); }
    tCur.textContent = fmt(video.currentTime);
  });
  video.addEventListener('play', syncState);
  video.addEventListener('pause', syncState);
  video.addEventListener('ended', syncState);
  video.addEventListener('volumechange', syncVolume);
  video.addEventListener('waiting', function () { frame.classList.add('is-loading'); });
  video.addEventListener('canplay', function () { frame.classList.remove('is-loading'); });
  video.addEventListener('playing', function () { frame.classList.remove('is-loading'); });
  video.addEventListener('error', function () {
    if (!video.getAttribute('src')) return;
    frame.classList.remove('is-loading');
    frame.classList.add('is-error');
    msg.hidden = false;
  });

  /* ---- Controls ---- */
  video.addEventListener('click', toggle);
  video.addEventListener('dblclick', toggleFullscreen);
  btnPlay.addEventListener('click', toggle);
  btnBig.addEventListener('click', toggle);
  btnMute.addEventListener('click', function () {
    if (video.muted || video.volume === 0) { video.muted = false; if (video.volume === 0) video.volume = 0.6; }
    else { video.muted = true; }
  });
  btnFs.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', function () {
    frame.classList.toggle('is-fs', document.fullscreenElement === frame);
  });

  seek.addEventListener('pointerdown', function () { scrubbing = true; });
  seek.addEventListener('pointerup', function () { scrubbing = false; });
  seek.addEventListener('input', function () {
    video.currentTime = parseFloat(seek.value);
    fill(seek);
    tCur.textContent = fmt(video.currentTime);
  });
  vol.addEventListener('input', function () {
    video.muted = false;
    video.volume = parseFloat(vol.value);
    fill(vol);
  });

  frame.addEventListener('pointermove', showControls);
  frame.addEventListener('pointerdown', showControls);

  /* ---- Keyboard ---- */
  document.addEventListener('keydown', function (e) {
    if (!player.classList.contains('is-open')) return;
    var onRange = e.target && e.target.type === 'range';
    var onButton = e.target && e.target.tagName === 'BUTTON';

    if (e.key === 'Escape') { if (!document.fullscreenElement) close(); return; }

    if (e.key === 'Tab') {
      var f = [closeBtn, btnPlay, seek, btnMute, vol, btnFs].filter(function (el) { return el.offsetParent !== null; });
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      return;
    }

    showControls();
    if ((e.key === ' ' || e.key === 'k') && !onButton && !onRange) { e.preventDefault(); toggle(); }
    else if (e.key === 'ArrowRight' && !onRange) { e.preventDefault(); video.currentTime = Math.min(video.duration || 0, video.currentTime + 5); }
    else if (e.key === 'ArrowLeft' && !onRange) { e.preventDefault(); video.currentTime = Math.max(0, video.currentTime - 5); }
    else if (e.key === 'm') { btnMute.click(); }
    else if (e.key === 'f') { toggleFullscreen(); }
  });
})();
