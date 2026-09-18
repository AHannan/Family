/* app.js - everything the user touches: views, canvas, forms, files. */
(function () {
  'use strict';

  var store = new Store();
  var state = {
    view: 'tree',
    rootId: null,
    focusId: null,
    collapsed: {},
    zoom: 1,
    panX: 0,
    panY: 0,
    showMaternal: true,
    showSpouses: true,
    peopleSort: { key: 'name', dir: 1 },
    pendingRelation: null,   // {type, toId} while the add-person form is open
    editingId: null
  };

  var $ = function (sel) { return document.querySelector(sel); };
  var els = {};

  /* =============================== utils =============================== */

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  var toastTimer = null;
  function toast(msg, actionLabel, actionFn) {
    var t = els.toast;
    t.innerHTML = '';
    t.appendChild(document.createTextNode(msg));
    if (actionLabel) {
      var b = el('button', null, actionLabel);
      b.onclick = function () { t.hidden = true; clearTimeout(toastTimer); actionFn(); };
      t.appendChild(b);
    }
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.hidden = true; }, actionLabel ? 7000 : 3200);
  }

  function lifespan(p) {
    if (p.birth && p.death) return p.birth + ' – ' + p.death;
    if (p.death) return 'd. ' + p.death;
    if (p.birth) return 'b. ' + p.birth;
    return '';
  }

  function genderClass(p) { return p.gender === 'f' ? 'g-f' : (p.gender === 'm' ? 'g-m' : ''); }

  /* ============================ bootstrapping =========================== */

  function init() {
    els = {
      title: $('#treeTitle'), subtitle: $('#treeSubtitle'),
      search: $('#search'), searchResults: $('#searchResults'),
      rootSelect: $('#rootSelect'), lineageSelect: $('#lineageSelect'),
      canvas: $('#canvas'), stage: $('#stage'), links: $('#links'), nodes: $('#nodes'),
      zoomLabel: $('#zoomLabel'),
      lineageList: $('#lineageList'),
      peopleBody: $('#peopleBody'), peopleFilter: $('#peopleFilter'), peopleCount: $('#peopleCount'),
      detail: $('#detail'), detailBody: $('#detailBody'),
      modal: $('#modal'), form: $('#personForm'), modalTitle: $('#modalTitle'), formError: $('#formError'),
      aboutModal: $('#aboutModal'), aboutBody: $('#aboutBody'),
      menu: $('#menu'), menuBtn: $('#menuBtn'),
      toast: $('#toast'), fileInput: $('#fileInput'),
      showMaternal: $('#showMaternal'), showSpouses: $('#showSpouses')
    };

    var source = store.load();
    state.rootId = store.get(store.meta.rootId) ? store.meta.rootId
                 : (store.roots()[0] || store.people[0] || {}).id;
    state.focusId = store.get(store.meta.focusId) ? store.meta.focusId : state.rootId;

    store.onChange(refresh);
    wireEvents();
    refresh();
    fitToScreen();
    if (source === 'seed') {
      toast('Loaded the sample lineage. Every edit saves to this browser.');
    }
  }

  /** Re-render whatever is on screen after the data changed. */
  function refresh() {
    els.title.textContent = store.meta.title || 'Family Tree';
    els.subtitle.textContent = store.meta.subtitle || '';
    document.title = (store.meta.title || 'Family Tree') + ' · Family Tree Manager';

    if (!store.get(state.rootId)) state.rootId = (store.roots()[0] || store.people[0] || {}).id;
    if (!store.get(state.focusId)) state.focusId = state.rootId;

    fillPersonSelect(els.rootSelect, state.rootId);
    fillPersonSelect(els.lineageSelect, state.focusId);

    if (state.view === 'tree') renderTree();
    else if (state.view === 'lineage') renderLineage();
    else renderPeople();

    if (!els.detail.hidden && state.focusId) openDetail(state.focusId, true);
  }

  function fillPersonSelect(sel, selectedId, includeBlank) {
    var sorted = store.people.slice().sort(function (a, b) { return a.name.localeCompare(b.name); });
    var html = includeBlank ? '<option value="">— none —</option>' : '';
    for (var i = 0; i < sorted.length; i++) {
      var p = sorted[i];
      html += '<option value="' + esc(p.id) + '"' + (p.id === selectedId ? ' selected' : '') + '>'
            + esc(p.name) + '</option>';
    }
    sel.innerHTML = html;
    if (includeBlank) sel.value = selectedId || '';
  }

  /* ============================== the tree ============================== */

  function renderTree() {
    var tree = Layout.build(store, state.rootId, state.collapsed);
    els.nodes.innerHTML = '';
    els.links.innerHTML = '';
    if (!tree.order.length) return;

    // Pass 1 - build and measure. Cards carry variable amounts of text, so
    // their heights are only knowable once they are in the document.
    var cards = {}, heights = {};
    tree.order.forEach(function (id) {
      var card = buildCard(store.get(id), tree);
      card.style.visibility = 'hidden';
      els.nodes.appendChild(card);
      cards[id] = card;
    });
    tree.order.forEach(function (id) { heights[id] = cards[id].offsetHeight; });

    // Pass 2 - place them.
    var laid = Layout.position(tree, heights, state.collapsed);
    tree.order.forEach(function (id) {
      var b = laid.pos[id];
      if (!b) { cards[id].remove(); return; }
      cards[id].style.left = (b.x - b.w / 2) + 'px';
      cards[id].style.top = b.y + 'px';
      cards[id].style.visibility = 'visible';
    });

    drawLinks(tree, laid);

    els.stage.style.width = laid.width + 'px';
    els.stage.style.height = laid.height + 'px';
    els.links.setAttribute('width', laid.width);
    els.links.setAttribute('height', laid.height);
    applyTransform();
  }

  function buildCard(p, tree) {
    var card = el('div', 'card ' + genderClass(p));
    card.dataset.id = p.id;
    if (p.id === state.focusId) card.classList.add('is-focus');

    card.appendChild(el('p', 'card-name', p.name));
    if (p.arabic) card.appendChild(el('p', 'card-arabic', p.arabic));
    if (p.title) card.appendChild(el('p', 'card-title', p.title));
    var span = lifespan(p);
    if (span) card.appendChild(el('p', 'card-dates', span));

    if (state.showSpouses) {
      var spouses = store.spousesOf(p.id);
      if (spouses.length) {
        var box = el('div', 'card-spouses');
        var label = el('b', null, spouses.length === 1 ? 'Married ' : 'Married (' + spouses.length + ') ');
        box.appendChild(label);
        box.appendChild(document.createTextNode(
          spouses.length > 3
            ? spouses.slice(0, 3).map(function (s) { return s.name; }).join(', ') + ' and ' + (spouses.length - 3) + ' more'
            : spouses.map(function (s) { return s.name; }).join(', ')
        ));
        card.appendChild(box);
      }
    }

    var kids = tree.children[p.id] || [];
    var hidden = state.collapsed[p.id];
    if (kids.length || hidden) {
      var t = el('button', 'card-toggle' + (hidden ? ' is-collapsed' : ''));
      t.textContent = hidden ? String(kids.length || store.childrenOf(p.id).length) : '–';
      t.title = hidden ? 'Show descendants' : 'Hide descendants';
      t.onclick = function (ev) {
        ev.stopPropagation();
        if (state.collapsed[p.id]) delete state.collapsed[p.id];
        else state.collapsed[p.id] = true;
        renderTree();
      };
      card.appendChild(t);
    }

    card.onclick = function () { openDetail(p.id); };
    return card;
  }

  function drawLinks(tree, laid) {
    var svg = els.links, ns = 'http://www.w3.org/2000/svg', frag = document.createDocumentFragment();

    function path(d, cls) {
      var n = document.createElementNS(ns, 'path');
      n.setAttribute('d', d);
      n.setAttribute('class', cls);
      frag.appendChild(n);
    }

    tree.order.forEach(function (id) {
      var me = laid.pos[id];
      if (!me) return;
      var parentId = tree.parentOf[id];
      var par = parentId && laid.pos[parentId];
      if (par) path(Layout.elbow(par.x, par.y + par.h, me.x, me.y), 'link');

      if (state.showMaternal) {
        var otherId = tree.otherParent[id];
        var other = otherId && laid.pos[otherId];
        if (other) path(Layout.curve(other.x, other.y + other.h, me.x, me.y), 'link-maternal');
      }
    });

    svg.appendChild(frag);
  }

  /* ---- pan and zoom ---- */

  function applyTransform() {
    els.stage.style.transform =
      'translate(' + state.panX + 'px,' + state.panY + 'px) scale(' + state.zoom + ')';
    els.zoomLabel.textContent = Math.round(state.zoom * 100) + '%';
  }

  function setZoom(next, cx, cy) {
    next = Math.max(0.2, Math.min(2.5, next));
    var rect = els.canvas.getBoundingClientRect();
    if (cx == null) { cx = rect.width / 2; cy = rect.height / 2; }
    // Keep the point under the cursor fixed while the scale changes.
    state.panX = cx - (cx - state.panX) * (next / state.zoom);
    state.panY = cy - (cy - state.panY) * (next / state.zoom);
    state.zoom = next;
    applyTransform();
  }

  /**
   * Frame the tree. Big trees would shrink to an illegible 20%, so the scale
   * has a floor - and when that floor bites, we centre on the person of
   * interest instead of on a tree that no longer fits anyway.
   */
  var MIN_FIT = 0.62;

  function fitToScreen() {
    var w = els.stage.offsetWidth, h = els.stage.offsetHeight;
    if (!w || !h) return;
    var rect = els.canvas.getBoundingClientRect();
    var scale = Math.min((rect.width - 60) / w, (rect.height - 80) / h, 1.1);

    state.zoom = Math.max(scale, MIN_FIT);
    state.panX = (rect.width - w * state.zoom) / 2;
    state.panY = 28;

    if (scale < MIN_FIT) {
      // The tree is too big to show whole, so aim at the person of interest
      // instead - horizontally always, vertically only if it overflows.
      var card = state.focusId && els.nodes.querySelector('[data-id="' + CSS.escape(state.focusId) + '"]');
      if (card) {
        state.panX = rect.width / 2 - (card.offsetLeft + card.offsetWidth / 2) * state.zoom;
        if (h * state.zoom > rect.height - 80) {
          state.panY = rect.height / 2 - (card.offsetTop + card.offsetHeight / 2) * state.zoom;
        }
      }
    }
    applyTransform();
  }

  /** Scroll the canvas so a given person sits in the middle. */
  function centreOn(id) {
    if (!id) return false;
    var card = els.nodes.querySelector('[data-id="' + CSS.escape(id) + '"]');
    if (!card) return false;
    var rect = els.canvas.getBoundingClientRect();
    state.panX = rect.width / 2 - (card.offsetLeft + card.offsetWidth / 2) * state.zoom;
    state.panY = rect.height / 2 - (card.offsetTop + card.offsetHeight / 2) * state.zoom;
    applyTransform();
    return true;
  }

  /* ============================== lineage =============================== */

  function renderLineage() {
    var subject = store.get(state.focusId);
    els.lineageList.innerHTML = '';
    if (!subject) return;

    var chain = store.ancestorsOf(subject.id).reverse().concat([subject]);
    chain.forEach(function (p, i) {
      var li = el('li');
      li.appendChild(el('span', 'lineage-gen', String(i + 1)));

      var btn = el('button', 'lineage-card' + (p.id === subject.id ? ' is-subject' : ''));
      var h = el('h3');
      h.appendChild(document.createTextNode(p.name));
      if (p.arabic) {
        h.appendChild(document.createTextNode('  '));
        h.appendChild(el('span', 'ar', p.arabic));
      }
      btn.appendChild(h);

      var bits = [];
      if (p.title) bits.push(p.title);
      var span = lifespan(p);
      if (span) bits.push(span);
      if (i > 0) bits.push((p.gender === 'f' ? 'daughter of ' : 'son of ') + chain[i - 1].name);
      if (bits.length) btn.appendChild(el('p', null, bits.join(' · ')));

      btn.onclick = function () { openDetail(p.id); };
      li.appendChild(btn);
      els.lineageList.appendChild(li);
    });

    if (store.meta.note) {
      var note = el('p', 'lineage-note', store.meta.note);
      els.lineageList.appendChild(note);
    }
  }

  /* =============================== people =============================== */

  function renderPeople() {
    var q = (els.peopleFilter.value || '').trim().toLowerCase();
    var rows = store.people.filter(function (p) {
      if (!q) return true;
      return (p.name + ' ' + p.title + ' ' + p.arabic + ' ' + p.notes + ' ' + p.tags.join(' '))
        .toLowerCase().indexOf(q) !== -1;
    });

    var key = state.peopleSort.key, dir = state.peopleSort.dir;
    rows.sort(function (a, b) {
      var va = sortValue(a, key), vb = sortValue(b, key);
      return va.localeCompare(vb) * dir;
    });

    els.peopleBody.innerHTML = '';
    var frag = document.createDocumentFragment();
    rows.forEach(function (p) {
      var tr = el('tr');
      tr.appendChild(nameCell(p));
      tr.appendChild(el('td', null, p.title || '—'));
      tr.appendChild(el('td', null, p.birth || '—'));
      tr.appendChild(el('td', null, p.death || '—'));
      tr.appendChild(relCell(p.fatherId));
      tr.appendChild(relCell(p.motherId));

      var act = el('td', 'col-actions');
      act.appendChild(mkBtn('Open', 'btn btn-sm', function () { openDetail(p.id); }));
      tr.appendChild(act);
      frag.appendChild(tr);
    });
    els.peopleBody.appendChild(frag);

    var s = store.stats();
    els.peopleCount.textContent = rows.length === s.total
      ? s.total + ' people · ' + s.men + ' men, ' + s.women + ' women'
      : rows.length + ' of ' + s.total + ' people';
  }

  function sortValue(p, key) {
    if (key === 'father') return store.name(p.fatherId);
    if (key === 'mother') return store.name(p.motherId);
    return String(p[key] || '');
  }

  function nameCell(p) {
    var td = el('td');
    var b = mkBtn(p.name, 'link-btn nm', function () { openDetail(p.id); });
    td.appendChild(b);
    if (p.arabic) {
      td.appendChild(document.createTextNode(' '));
      td.appendChild(el('span', 'ar', p.arabic));
    }
    return td;
  }

  function relCell(id) {
    var td = el('td');
    if (!id) { td.textContent = '—'; return td; }
    td.appendChild(mkBtn(store.name(id), 'link-btn', function () { openDetail(id); }));
    return td;
  }

  function mkBtn(text, cls, fn) {
    var b = el('button', cls, text);
    b.type = 'button';
    b.onclick = fn;
    return b;
  }

  /* ============================== detail ================================ */

  function openDetail(id, keepScroll) {
    var p = store.get(id);
    if (!p) return;
    var prevScroll = keepScroll ? els.detail.scrollTop : 0;

    state.focusId = id;
    var body = els.detailBody;
    body.innerHTML = '';

    body.appendChild(el('h2', 'd-name', p.name));
    if (p.arabic) body.appendChild(el('p', 'd-arabic', p.arabic));
    if (p.title) body.appendChild(el('p', 'd-title', p.title));
    var span = lifespan(p);
    if (span) body.appendChild(el('p', 'd-dates', span));

    if (p.tags.length) {
      var tagRow = el('div', 'd-tags');
      p.tags.forEach(function (t) { tagRow.appendChild(el('span', 'tag', t)); });
      body.appendChild(tagRow);
    }
    if (p.notes) body.appendChild(el('div', 'd-notes', p.notes));

    var father = store.get(p.fatherId), mother = store.get(p.motherId);
    if (father || mother) {
      body.appendChild(relSection('Parents', [father, mother].filter(Boolean)));
    }

    var spouses = store.spousesOf(p.id);
    var spouseSection = relSection('Married to', spouses, function (sp) {
      if (confirm('Remove the marriage between ' + p.name + ' and ' + sp.name + '?')) {
        store.removeSpouse(p.id, sp.id);
        toast('Marriage removed.', 'Undo', function () { store.undo(); });
      }
    });
    var linkRow = el('div', 'd-rel');
    linkRow.style.marginTop = '8px';
    var linkSel = document.createElement('select');
    linkSel.className = 'rel-chip';
    linkSel.style.paddingRight = '6px';
    fillPersonSelect(linkSel, '', true);
    linkSel.options[0].textContent = '+ link an existing person…';
    linkSel.onchange = function () {
      if (!linkSel.value) return;
      if (store.addSpouse(p.id, linkSel.value)) toast('Marriage recorded.', 'Undo', function () { store.undo(); });
    };
    linkRow.appendChild(linkSel);
    spouseSection.appendChild(linkRow);
    body.appendChild(spouseSection);

    var kids = store.childrenOf(p.id);
    if (kids.length) body.appendChild(relSection('Children (' + kids.length + ')', kids));

    var sibs = store.siblingsOf(p.id);
    if (sibs.length) body.appendChild(relSection('Siblings (' + sibs.length + ')', sibs));

    var actions = el('div', 'd-actions');
    actions.appendChild(mkBtn('Edit', 'btn', function () { openForm('edit', p.id); }));
    actions.appendChild(mkBtn('+ Child', 'btn', function () { openForm('add', null, { type: 'child', toId: p.id }); }));
    actions.appendChild(mkBtn('+ Spouse', 'btn', function () { openForm('add', null, { type: 'spouse', toId: p.id }); }));
    actions.appendChild(mkBtn('+ Parent', 'btn', function () { openForm('add', null, { type: 'parent', toId: p.id }); }));
    actions.appendChild(mkBtn('+ Sibling', 'btn', function () { openForm('add', null, { type: 'sibling', toId: p.id }); }));
    actions.appendChild(mkBtn('Start tree here', 'btn', function () {
      state.rootId = p.id;
      state.collapsed = {};
      setView('tree');
      renderTree();
      fitToScreen();
    }));
    actions.appendChild(mkBtn('Delete', 'btn btn-danger', function () {
      var n = store.childrenOf(p.id).length;
      var warn = 'Delete ' + p.name + '?' + (n ? '\n\n' + n + ' child record(s) will lose this parent link but will not be deleted.' : '');
      if (!confirm(warn)) return;
      store.deletePerson(p.id);
      closeDetail();
      toast(p.name + ' deleted.', 'Undo', function () { store.undo(); });
    }));
    body.appendChild(actions);

    els.detail.hidden = false;
    els.detail.scrollTop = prevScroll;

    if (state.view === 'tree') {
      var card = els.nodes.querySelector('.card.is-focus');
      if (card) card.classList.remove('is-focus');
      var mine = els.nodes.querySelector('[data-id="' + CSS.escape(id) + '"]');
      if (mine) mine.classList.add('is-focus');
    }
    if (state.view === 'lineage' && !keepScroll) renderLineage();
  }

  function relSection(heading, people, onRemove) {
    var sec = el('div', 'd-section');
    sec.appendChild(el('h4', null, heading));
    var row = el('div', 'd-rel');
    if (!people.length) row.appendChild(el('span', 'muted', 'None recorded'));
    people.forEach(function (q) {
      var chip = mkBtn(q.name, 'rel-chip ' + genderClass(q), function () { openDetail(q.id); });
      if (!onRemove) { row.appendChild(chip); return; }
      // Keep the name and its unlink button together when the row wraps.
      var pair = el('span', 'rel-pair');
      pair.appendChild(chip);
      var x = mkBtn('×', 'rel-x', function () { onRemove(q); });
      x.title = 'Remove this marriage';
      pair.appendChild(x);
      row.appendChild(pair);
    });
    sec.appendChild(row);
    return sec;
  }

  function closeDetail() { els.detail.hidden = true; }

  /* =============================== forms ================================ */

  function openForm(mode, id, relation) {
    var f = els.form;
    state.editingId = mode === 'edit' ? id : null;
    state.pendingRelation = relation || null;
    els.formError.hidden = true;

    fillPersonSelect(f.elements.fatherId, '', true);
    fillPersonSelect(f.elements.motherId, '', true);

    if (mode === 'edit') {
      var p = store.get(id);
      els.modalTitle.textContent = 'Edit ' + p.name;
      f.elements.name.value = p.name;
      f.elements.arabic.value = p.arabic;
      f.elements.title.value = p.title;
      f.elements.gender.value = p.gender;
      f.elements.birth.value = p.birth;
      f.elements.death.value = p.death;
      f.elements.tags.value = p.tags.join(', ');
      f.elements.notes.value = p.notes;
      f.elements.fatherId.value = p.fatherId || '';
      f.elements.motherId.value = p.motherId || '';
      // Nobody may be their own parent.
      [f.elements.fatherId, f.elements.motherId].forEach(function (sel) {
        var opt = sel.querySelector('option[value="' + CSS.escape(id) + '"]');
        if (opt) opt.disabled = true;
      });
    } else {
      f.reset();
      f.elements.fatherId.value = '';
      f.elements.motherId.value = '';
      var toName = relation ? store.name(relation.toId) : '';
      els.modalTitle.textContent = relation
        ? ({ child: 'Add a child of ', spouse: 'Add a spouse of ', parent: 'Add a parent of ', sibling: 'Add a sibling of ' }[relation.type] + toName)
        : 'Add a person';
      if (relation && relation.type === 'child') {
        var parent = store.get(relation.toId);
        if (parent.gender === 'f') f.elements.motherId.value = parent.id; else f.elements.fatherId.value = parent.id;
      }
    }

    els.modal.hidden = false;
    setTimeout(function () { f.elements.name.focus(); }, 30);
  }

  function submitForm(ev) {
    ev.preventDefault();
    var f = els.form;
    var name = f.elements.name.value.trim();
    if (!name) {
      els.formError.textContent = 'A name is required.';
      els.formError.hidden = false;
      return;
    }

    var data = {
      name: name,
      arabic: f.elements.arabic.value.trim(),
      title: f.elements.title.value.trim(),
      gender: f.elements.gender.value,
      birth: f.elements.birth.value.trim(),
      death: f.elements.death.value.trim(),
      notes: f.elements.notes.value.trim(),
      tags: f.elements.tags.value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
      fatherId: f.elements.fatherId.value || null,
      motherId: f.elements.motherId.value || null
    };

    if (state.editingId) {
      store.updatePerson(state.editingId, data);
      toast('Saved.', 'Undo', function () { store.undo(); });
      state.focusId = state.editingId;
    } else {
      var added = store.addPerson(data, state.pendingRelation);
      state.focusId = added.id;
      toast(added.name + ' added.', 'Undo', function () { store.undo(); });
    }

    els.modal.hidden = true;
    openDetail(state.focusId);
  }

  /* ============================ files and menu ========================== */

  function exportJSON() {
    var name = (store.meta.title || 'family-tree').toLowerCase().replace(/[^\w]+/g, '-');
    var blob = new Blob([store.toJSON()], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name + '-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    toast('Exported ' + store.people.length + ' people.');
  }

  function importJSON(file) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        store.adopt(data);
        state.collapsed = {};
        state.rootId = store.get(store.meta.rootId) ? store.meta.rootId : (store.roots()[0] || store.people[0]).id;
        state.focusId = state.rootId;
        closeDetail();
        fitToScreen();
        toast('Imported ' + store.people.length + ' people.', 'Undo', function () { store.undo(); });
      } catch (e) {
        toast('That file could not be read: ' + e.message);
      }
    };
    reader.readAsText(file);
  }

  function showAbout() {
    var s = store.stats();
    els.aboutBody.innerHTML =
      '<p>' + esc(store.meta.subtitle || '') + '</p>' +
      '<p>' + esc(store.meta.note || '') + '</p>' +
      '<dl>' +
      '<dt>People recorded</dt><dd>' + s.total + ' — ' + s.men + ' men, ' + s.women + ' women</dd>' +
      '<dt>Where the data lives</dt><dd>In this browser only. Export to JSON to keep a copy or move it elsewhere.</dd>' +
      '<dt>Reading the tree</dt><dd>Solid lines follow the paternal line. Dashed lines mark the other parent where both appear in the tree.</dd>' +
      '</dl>';
    els.aboutModal.hidden = false;
  }

  /* ============================== searching ============================= */

  var searchIndex = -1;

  function runSearch() {
    var hits = store.search(els.search.value, 8);
    var box = els.searchResults;
    box.innerHTML = '';
    searchIndex = -1;

    if (!els.search.value.trim()) { box.hidden = true; els.search.setAttribute('aria-expanded', 'false'); return; }
    if (!hits.length) {
      var none = el('li', 'empty', 'No one matches that.');
      box.appendChild(none);
    }
    hits.forEach(function (p) {
      var li = el('li');
      li.setAttribute('role', 'option');
      li.appendChild(document.createTextNode(p.name));
      var sub = [p.title, lifespan(p)].filter(Boolean).join(' · ');
      if (sub) li.appendChild(el('small', null, sub));
      li.onmousedown = function (ev) { ev.preventDefault(); pickSearch(p.id); };
      box.appendChild(li);
    });
    box.hidden = false;
    els.search.setAttribute('aria-expanded', 'true');
  }

  function pickSearch(id) {
    els.search.value = '';
    els.searchResults.hidden = true;
    els.search.setAttribute('aria-expanded', 'false');
    openDetail(id);
    if (state.view === 'tree') {
      // Reveal the person if an ancestor of theirs is collapsed.
      var chain = store.ancestorsOf(id);
      var changed = false;
      chain.forEach(function (a) { if (state.collapsed[a.id]) { delete state.collapsed[a.id]; changed = true; } });
      if (changed) renderTree();
      centreOn(id);
    }
  }

  function moveSearch(delta) {
    var items = Array.prototype.slice.call(els.searchResults.querySelectorAll('li:not(.empty)'));
    if (!items.length) return;
    if (searchIndex >= 0) items[searchIndex].removeAttribute('aria-selected');
    searchIndex = (searchIndex + delta + items.length) % items.length;
    items[searchIndex].setAttribute('aria-selected', 'true');
  }

  /* =============================== views ================================ */

  function setView(name) {
    state.view = name;
    document.querySelectorAll('.view-btn').forEach(function (b) {
      var on = b.dataset.view === name;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-selected', String(on));
    });
    document.querySelectorAll('.view').forEach(function (v) {
      v.classList.toggle('is-active', v.id === 'view-' + name);
    });
    if (name === 'tree') renderTree();
    else if (name === 'lineage') { fillPersonSelect(els.lineageSelect, state.focusId); renderLineage(); }
    else renderPeople();
  }

  /* ============================== wiring ================================ */

  function wireEvents() {
    document.querySelectorAll('.view-btn').forEach(function (b) {
      b.onclick = function () { setView(b.dataset.view); };
    });

    els.rootSelect.onchange = function () {
      state.rootId = els.rootSelect.value;
      state.collapsed = {};
      renderTree();
      fitToScreen();
    };
    els.lineageSelect.onchange = function () {
      state.focusId = els.lineageSelect.value;
      renderLineage();
    };
    els.showMaternal.onchange = function () { state.showMaternal = els.showMaternal.checked; renderTree(); };
    els.showSpouses.onchange = function () { state.showSpouses = els.showSpouses.checked; renderTree(); };

    document.querySelectorAll('[data-zoom]').forEach(function (b) {
      b.onclick = function () {
        var k = b.dataset.zoom;
        if (k === 'in') setZoom(state.zoom * 1.2);
        else if (k === 'out') setZoom(state.zoom / 1.2);
        else fitToScreen();
      };
    });

    // Pan by dragging the background.
    var dragging = false, sx = 0, sy = 0, ox = 0, oy = 0;
    els.canvas.addEventListener('mousedown', function (ev) {
      if (ev.target.closest('.card')) return;
      dragging = true; sx = ev.clientX; sy = ev.clientY; ox = state.panX; oy = state.panY;
      els.canvas.classList.add('is-panning');
    });
    window.addEventListener('mousemove', function (ev) {
      if (!dragging) return;
      state.panX = ox + (ev.clientX - sx);
      state.panY = oy + (ev.clientY - sy);
      applyTransform();
    });
    window.addEventListener('mouseup', function () {
      dragging = false;
      els.canvas.classList.remove('is-panning');
    });

    els.canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var rect = els.canvas.getBoundingClientRect();
      var cx = ev.clientX - rect.left, cy = ev.clientY - rect.top;
      if (ev.ctrlKey || Math.abs(ev.deltaY) > 40) setZoom(state.zoom * (ev.deltaY < 0 ? 1.1 : 1 / 1.1), cx, cy);
      else { state.panX -= ev.deltaX; state.panY -= ev.deltaY; applyTransform(); }
    }, { passive: false });

    // Touch: one finger pans, two fingers pinch.
    var touchStart = null;
    els.canvas.addEventListener('touchstart', function (ev) {
      if (ev.touches.length === 1 && !ev.target.closest('.card')) {
        touchStart = { x: ev.touches[0].clientX, y: ev.touches[0].clientY, px: state.panX, py: state.panY };
      } else if (ev.touches.length === 2) {
        touchStart = { d: dist(ev.touches), z: state.zoom };
      }
    }, { passive: true });
    els.canvas.addEventListener('touchmove', function (ev) {
      if (!touchStart) return;
      if (ev.touches.length === 1 && touchStart.px != null) {
        state.panX = touchStart.px + (ev.touches[0].clientX - touchStart.x);
        state.panY = touchStart.py + (ev.touches[0].clientY - touchStart.y);
        applyTransform();
      } else if (ev.touches.length === 2 && touchStart.d) {
        setZoom(touchStart.z * (dist(ev.touches) / touchStart.d));
      }
    }, { passive: true });
    els.canvas.addEventListener('touchend', function () { touchStart = null; }, { passive: true });

    function dist(t) {
      return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    }

    // Search
    els.search.oninput = runSearch;
    els.search.onfocus = runSearch;
    els.search.onblur = function () {
      setTimeout(function () { els.searchResults.hidden = true; }, 120);
    };
    els.search.onkeydown = function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); moveSearch(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveSearch(-1); }
      else if (ev.key === 'Enter') {
        var items = els.searchResults.querySelectorAll('li:not(.empty)');
        var pickIdx = searchIndex >= 0 ? searchIndex : 0;
        if (items[pickIdx]) { ev.preventDefault(); items[pickIdx].onmousedown(new MouseEvent('mousedown')); }
      } else if (ev.key === 'Escape') {
        els.search.value = '';
        els.searchResults.hidden = true;
      }
    };

    // People table
    els.peopleFilter.oninput = renderPeople;
    document.querySelectorAll('.people-table th[data-sort]').forEach(function (th) {
      th.onclick = function () {
        var k = th.dataset.sort;
        state.peopleSort.dir = state.peopleSort.key === k ? -state.peopleSort.dir : 1;
        state.peopleSort.key = k;
        renderPeople();
      };
    });

    // Detail, modals, menu
    $('#detailClose').onclick = closeDetail;
    $('#addPersonBtn').onclick = function () { openForm('add'); };
    els.form.onsubmit = submitForm;
    document.querySelectorAll('[data-close]').forEach(function (b) {
      b.onclick = function () { els.modal.hidden = true; els.aboutModal.hidden = true; };
    });
    [els.modal, els.aboutModal].forEach(function (m) {
      m.onclick = function (ev) { if (ev.target === m) m.hidden = true; };
    });

    els.menuBtn.onclick = function (ev) {
      ev.stopPropagation();
      els.menu.hidden = !els.menu.hidden;
      els.menuBtn.setAttribute('aria-expanded', String(!els.menu.hidden));
    };
    document.addEventListener('click', function () {
      els.menu.hidden = true;
      els.menuBtn.setAttribute('aria-expanded', 'false');
    });
    els.menu.onclick = function (ev) {
      var b = ev.target.closest('button[data-act]');
      if (!b) return;
      var act = b.dataset.act;
      if (act === 'export') exportJSON();
      else if (act === 'import') els.fileInput.click();
      else if (act === 'print') window.print();
      else if (act === 'about') showAbout();
      else if (act === 'reset') {
        if (confirm('Replace everything with the sample lineage? Your current tree will be lost unless you exported it.')) {
          store.resetToSeed();
          state.collapsed = {};
          state.rootId = store.meta.rootId;
          state.focusId = store.meta.focusId || store.meta.rootId;
          closeDetail();
          fitToScreen();
          toast('Sample lineage restored.', 'Undo', function () { store.undo(); });
        }
      }
    };

    els.fileInput.onchange = function () {
      if (els.fileInput.files[0]) importJSON(els.fileInput.files[0]);
      els.fileInput.value = '';
    };

    document.addEventListener('keydown', function (ev) {
      if (ev.key === 'Escape') {
        if (!els.modal.hidden) els.modal.hidden = true;
        else if (!els.aboutModal.hidden) els.aboutModal.hidden = true;
        else if (!els.detail.hidden) closeDetail();
      }
      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
      if (typing) return;
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') {
        ev.preventDefault();
        if (store.undo()) toast('Undone.'); else toast('Nothing left to undo.');
      }
      if (ev.key === '/') { ev.preventDefault(); els.search.focus(); }
    });

    // The detail panel is fixed-position, so it needs to know how tall the
    // header is - it wraps to two or three rows on narrow screens.
    function syncTopbarHeight() {
      document.documentElement.style.setProperty(
        '--topbar-h', document.querySelector('.topbar').offsetHeight + 'px');
    }
    syncTopbarHeight();

    window.addEventListener('resize', function () {
      syncTopbarHeight();
      if (state.view === 'tree') applyTransform();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
