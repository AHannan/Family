/* store.js - the data layer.
 *
 * Holds every person, keeps relationships consistent, persists to
 * localStorage, and keeps an undo stack. Nothing in here touches the DOM.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'family-tree-manager/v1';
  var UNDO_LIMIT = 40;

  function clone(v) { return JSON.parse(JSON.stringify(v)); }

  function slugify(name) {
    var s = (name || '')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')  // strip accents
      .replace(/[^\w\s-]/g, '')                          // strip punctuation
      .trim().toLowerCase().replace(/\s+/g, '-');
    return s || 'person';
  }

  /** A person with every field present, so the rest of the app never guards. */
  function normalize(p) {
    return {
      id: p.id,
      name: p.name || 'Unnamed',
      arabic: p.arabic || '',
      title: p.title || '',
      gender: p.gender === 'f' ? 'f' : (p.gender === 'm' ? 'm' : ''),
      birth: p.birth || '',
      death: p.death || '',
      fatherId: p.fatherId || null,
      motherId: p.motherId || null,
      spouseIds: Array.isArray(p.spouseIds) ? p.spouseIds.slice() : [],
      tags: Array.isArray(p.tags) ? p.tags.slice() : [],
      notes: p.notes || ''
    };
  }

  function Store() {
    this.people = [];
    this.meta = {};
    this.index = {};
    this._undo = [];
    this._listeners = [];
  }

  /* ---- lifecycle ------------------------------------------------------ */

  Store.prototype.load = function () {
    var saved = null;
    try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { /* private mode */ }
    if (saved) {
      try { this.adopt(JSON.parse(saved), { silent: true }); return 'saved'; }
      catch (e) { /* corrupt - fall through to the seed */ }
    }
    this.adopt(clone(window.FAMILY_SEED), { silent: true });
    return 'seed';
  };

  Store.prototype.resetToSeed = function () {
    this.adopt(clone(window.FAMILY_SEED));
  };

  /** Replace the whole dataset, repairing anything inconsistent in it. */
  Store.prototype.adopt = function (data, opts) {
    if (!data || !Array.isArray(data.people)) throw new Error('No "people" array in that file.');
    this.meta = Object.assign({ title: 'Family Tree', subtitle: '', note: '' }, data.meta || {});
    this.people = data.people.map(function (p, i) {
      var n = normalize(p);
      if (!n.id) n.id = 'p' + i + '-' + slugify(n.name);
      return n;
    });
    this._reindex();
    this._repair();
    if (!opts || !opts.silent) this._commit();
    else this._reindex();
  };

  Store.prototype._reindex = function () {
    var ix = {};
    for (var i = 0; i < this.people.length; i++) ix[this.people[i].id] = this.people[i];
    this.index = ix;
  };

  /** Drop dangling references and make every marriage point both ways. */
  Store.prototype._repair = function () {
    var ix = this.index;
    this.people.forEach(function (p) {
      if (p.fatherId && !ix[p.fatherId]) p.fatherId = null;
      if (p.motherId && !ix[p.motherId]) p.motherId = null;
      if (p.fatherId === p.id) p.fatherId = null;
      if (p.motherId === p.id) p.motherId = null;
      p.spouseIds = p.spouseIds.filter(function (id, i, arr) {
        return ix[id] && id !== p.id && arr.indexOf(id) === i;
      });
    });
    this.people.forEach(function (p) {
      p.spouseIds.forEach(function (sid) {
        var other = ix[sid];
        if (other.spouseIds.indexOf(p.id) === -1) other.spouseIds.push(p.id);
      });
    });
    // A person cannot be their own ancestor.
    var self = this;
    this.people.forEach(function (p) {
      ['fatherId', 'motherId'].forEach(function (key) {
        if (p[key] && self._wouldCycle(p.id, p[key])) p[key] = null;
      });
    });
  };

  Store.prototype._wouldCycle = function (childId, parentId) {
    var seen = {}, cur = parentId, guard = 0;
    while (cur && guard++ < 500) {
      if (cur === childId) return true;
      if (seen[cur]) return false;
      seen[cur] = true;
      var p = this.index[cur];
      if (!p) return false;
      cur = p.fatherId || p.motherId;
    }
    return false;
  };

  /* ---- change plumbing ------------------------------------------------ */

  Store.prototype.onChange = function (fn) { this._listeners.push(fn); };

  Store.prototype._snapshot = function () {
    this._undo.push(JSON.stringify({ meta: this.meta, people: this.people }));
    if (this._undo.length > UNDO_LIMIT) this._undo.shift();
  };

  Store.prototype._commit = function () {
    this._reindex();
    try { localStorage.setItem(STORAGE_KEY, this.toJSON()); } catch (e) { /* quota or private mode */ }
    this._listeners.forEach(function (fn) { fn(); });
  };

  Store.prototype.canUndo = function () { return this._undo.length > 0; };

  Store.prototype.undo = function () {
    if (!this._undo.length) return false;
    var prev = JSON.parse(this._undo.pop());
    this.meta = prev.meta;
    this.people = prev.people;
    this._reindex();
    try { localStorage.setItem(STORAGE_KEY, this.toJSON()); } catch (e) { /* ignore */ }
    this._listeners.forEach(function (fn) { fn(); });
    return true;
  };

  /* ---- reads ---------------------------------------------------------- */

  Store.prototype.get = function (id) { return this.index[id] || null; };

  Store.prototype.name = function (id) {
    var p = this.index[id];
    return p ? p.name : '';
  };

  Store.prototype.childrenOf = function (id) {
    return this.people.filter(function (p) { return p.fatherId === id || p.motherId === id; });
  };

  Store.prototype.spousesOf = function (id) {
    var p = this.index[id];
    if (!p) return [];
    var self = this;
    return p.spouseIds.map(function (sid) { return self.index[sid]; }).filter(Boolean);
  };

  Store.prototype.parentsOf = function (id) {
    var p = this.index[id];
    if (!p) return [];
    return [p.fatherId, p.motherId].map(this.get, this).filter(Boolean);
  };

  Store.prototype.siblingsOf = function (id) {
    var p = this.index[id];
    if (!p || (!p.fatherId && !p.motherId)) return [];
    return this.people.filter(function (q) {
      if (q.id === id) return false;
      return (p.fatherId && q.fatherId === p.fatherId) || (p.motherId && q.motherId === p.motherId);
    });
  };

  /** Ancestors of `id`, nearest first, following father then mother. */
  Store.prototype.ancestorsOf = function (id) {
    var out = [], seen = {}, p = this.index[id];
    while (p && (p.fatherId || p.motherId)) {
      var next = this.index[p.fatherId] || this.index[p.motherId];
      if (!next || seen[next.id]) break;
      seen[next.id] = true;
      out.push(next);
      p = next;
    }
    return out;
  };

  /** People with no recorded parent - the natural starting points for a tree. */
  Store.prototype.roots = function () {
    return this.people.filter(function (p) { return !p.fatherId && !p.motherId; });
  };

  Store.prototype.search = function (query, limit) {
    var q = (query || '').trim().toLowerCase();
    if (!q) return [];
    var hits = [];
    for (var i = 0; i < this.people.length && hits.length < (limit || 8); i++) {
      var p = this.people[i];
      var hay = (p.name + ' ' + p.title + ' ' + p.arabic + ' ' + p.tags.join(' ')).toLowerCase();
      if (hay.indexOf(q) !== -1) hits.push(p);
    }
    return hits;
  };

  /* ---- writes --------------------------------------------------------- */

  Store.prototype.uniqueId = function (name) {
    var base = slugify(name), id = base, n = 2;
    while (this.index[id]) id = base + '-' + (n++);
    return id;
  };

  /**
   * Add a person, optionally wired to an existing one.
   * relation: {type: 'child'|'parent'|'spouse'|'sibling', toId: '...'}
   */
  Store.prototype.addPerson = function (data, relation) {
    this._snapshot();
    var p = normalize(data);
    p.id = this.uniqueId(p.name);
    this.people.push(p);
    this._reindex();

    if (relation && this.index[relation.toId]) {
      var other = this.index[relation.toId];
      if (relation.type === 'child') {
        if (other.gender === 'f') p.motherId = other.id; else p.fatherId = other.id;
        // If the parent has exactly one spouse, assume the other parent.
        if (other.spouseIds.length === 1) {
          var sp = this.index[other.spouseIds[0]];
          if (sp.gender === 'f' && !p.motherId) p.motherId = sp.id;
          else if (sp.gender !== 'f' && !p.fatherId) p.fatherId = sp.id;
        }
      } else if (relation.type === 'parent') {
        if (p.gender === 'f') other.motherId = p.id; else other.fatherId = p.id;
      } else if (relation.type === 'spouse') {
        this._link(p, other);
      } else if (relation.type === 'sibling') {
        p.fatherId = other.fatherId;
        p.motherId = other.motherId;
      }
    }
    this._repair();
    this._commit();
    return p;
  };

  Store.prototype.updatePerson = function (id, patch) {
    var p = this.index[id];
    if (!p) return null;
    this._snapshot();
    ['name', 'arabic', 'title', 'gender', 'birth', 'death', 'notes'].forEach(function (k) {
      if (k in patch) p[k] = patch[k] || '';
    });
    if ('tags' in patch) p.tags = patch.tags;
    ['fatherId', 'motherId'].forEach(function (k) {
      if (!(k in patch)) return;
      var v = patch[k] || null;
      if (v === id || (v && this._wouldCycle(id, v))) return;   // refuse loops
      p[k] = v;
    }, this);
    this._repair();
    this._commit();
    return p;
  };

  Store.prototype._link = function (a, b) {
    if (a.spouseIds.indexOf(b.id) === -1) a.spouseIds.push(b.id);
    if (b.spouseIds.indexOf(a.id) === -1) b.spouseIds.push(a.id);
  };

  Store.prototype.addSpouse = function (aId, bId) {
    var a = this.index[aId], b = this.index[bId];
    if (!a || !b || a === b) return false;
    this._snapshot();
    this._link(a, b);
    this._commit();
    return true;
  };

  Store.prototype.removeSpouse = function (aId, bId) {
    var a = this.index[aId], b = this.index[bId];
    if (!a || !b) return false;
    this._snapshot();
    a.spouseIds = a.spouseIds.filter(function (i) { return i !== bId; });
    b.spouseIds = b.spouseIds.filter(function (i) { return i !== aId; });
    this._commit();
    return true;
  };

  /** Remove a person and detach every reference to them. */
  Store.prototype.deletePerson = function (id) {
    if (!this.index[id]) return false;
    this._snapshot();
    this.people = this.people.filter(function (p) { return p.id !== id; });
    this.people.forEach(function (p) {
      if (p.fatherId === id) p.fatherId = null;
      if (p.motherId === id) p.motherId = null;
      p.spouseIds = p.spouseIds.filter(function (s) { return s !== id; });
    });
    this._commit();
    return true;
  };

  Store.prototype.setMeta = function (patch) {
    this._snapshot();
    Object.assign(this.meta, patch);
    this._commit();
  };

  /* ---- import / export ------------------------------------------------ */

  Store.prototype.toJSON = function () {
    return JSON.stringify({ meta: this.meta, people: this.people }, null, 2);
  };

  Store.prototype.stats = function () {
    var men = 0, women = 0;
    this.people.forEach(function (p) {
      if (p.gender === 'm') men++; else if (p.gender === 'f') women++;
    });
    return { total: this.people.length, men: men, women: women, roots: this.roots().length };
  };

  window.Store = Store;
  window.slugify = slugify;
})();
