(function () {
  var cards = Array.prototype.slice.call(document.querySelectorAll('.mps-card'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('.mps-manual'));
  if (!cards.length) return;

  function select(slug, push) {
    var found = false;
    cards.forEach(function (c) {
      var on = c.dataset.module === slug;
      c.setAttribute('aria-selected', on ? 'true' : 'false');
      c.classList.toggle('is-active', on);
      if (on) { found = true; c.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
    });
    panels.forEach(function (p) { p.hidden = p.id !== 'manual-' + slug; });
    if (found && push) { try { history.replaceState(null, '', '#' + slug); } catch (e) {} }
  }

  cards.forEach(function (c) {
    c.addEventListener('click', function () { select(c.dataset.module, true); });
  });
  document.querySelectorAll('.mps-carousel__arrow').forEach(function (a) {
    a.addEventListener('click', function () {
      var i = cards.findIndex(function (c) { return c.classList.contains('is-active'); });
      var n = (i + parseInt(a.dataset.dir, 10) + cards.length) % cards.length;
      select(cards[n].dataset.module, true);
    });
  });

  var nav = document.querySelector('.mps-carousel');
  var track = document.querySelector('.mps-carousel__track');
  function measure() { nav.classList.toggle('has-overflow', track.scrollWidth > track.clientWidth + 2); }
  measure(); window.addEventListener('resize', measure);

  var start = location.hash.slice(1);
  select(cards.some(function (c) { return c.dataset.module === start; }) ? start : cards[0].dataset.module, false);
})();
