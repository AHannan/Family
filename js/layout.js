/* layout.js - works out the shape of a descendant tree.
 *
 * Two steps, deliberately separate:
 *   build()    decides who hangs under whom, and at what depth
 *   position() turns that into pixel coordinates, once the cards have been
 *              measured (names and note lengths vary, so heights do too)
 *
 * Card width is fixed by the stylesheet, which is what keeps positioning
 * simple: a parent centred over its children can never be wider than the
 * span it sits above, so subtrees cannot collide.
 */
(function () {
  'use strict';

  var CARD_W = 208;   // must match --card-w in css/app.css
  var H_GAP = 26;     // horizontal space between sibling cards
  var V_GAP = 58;     // vertical space between generations
  var V_GAP_TIGHT = 26; // used where a generation is a single unbranching link

  /**
   * Decide the tree structure below `rootId`.
   *
   * Each person gets exactly one place in the tree, under their father where
   * the father is part of this tree, otherwise under their mother. That
   * fallback is what keeps, say, a grandchild attached through their mother
   * when the father married in from outside the family.
   *
   * @returns {{children:Object, depth:Object, parentOf:Object, otherParent:Object, order:Array}}
   */
  function build(store, rootId, collapsed) {
    collapsed = collapsed || {};
    if (!store.get(rootId)) return { children: {}, depth: {}, parentOf: {}, otherParent: {}, order: [] };

    // Pass 1: who is reachable from the root through either parent link?
    var reachable = {};
    reachable[rootId] = true;
    var frontier = [rootId], guard = 0;
    while (frontier.length && guard++ < 10000) {
      var next = [];
      frontier.forEach(function (id) {
        store.childrenOf(id).forEach(function (c) {
          if (!reachable[c.id]) { reachable[c.id] = true; next.push(c.id); }
        });
      });
      frontier = next;
    }

    // Pass 2: pick each person's single tree parent, father first.
    var children = {}, parentOf = {}, otherParent = {};
    Object.keys(reachable).forEach(function (id) { children[id] = []; });
    Object.keys(reachable).forEach(function (id) {
      if (id === rootId) return;
      var p = store.get(id);
      var primary = (p.fatherId && reachable[p.fatherId]) ? p.fatherId
                  : (p.motherId && reachable[p.motherId]) ? p.motherId
                  : null;
      if (!primary) return;                       // unreachable through the tree
      parentOf[id] = primary;
      children[primary].push(id);
      var other = primary === p.fatherId ? p.motherId : p.fatherId;
      otherParent[id] = (other && reachable[other]) ? other : null;
    });

    // Pass 3: walk it depth-first for depths and paint order.
    var depth = {}, order = [], seen = {};
    (function walk(id, d) {
      if (seen[id]) return;                       // defensive: never loop
      seen[id] = true;
      depth[id] = d;
      order.push(id);
      if (collapsed[id]) { children[id] = children[id].slice(); return; }
      children[id].forEach(function (c) { walk(c, d + 1); });
    })(rootId, 0);

    // Anyone the walk never reached (cut off by a collapsed branch) is not drawn.
    Object.keys(children).forEach(function (id) { if (!seen[id]) delete children[id]; });

    return { children: children, depth: depth, parentOf: parentOf,
             otherParent: otherParent, order: order, reachable: reachable };
  }

  /**
   * Turn a built tree into coordinates.
   * @param heights  {id: measuredPixelHeight}
   */
  function position(tree, heights, collapsed) {
    collapsed = collapsed || {};
    var pos = {}, cursor = 0;

    // Row tops: every generation starts below the tallest card in the one above.
    var rowH = [];
    tree.order.forEach(function (id) {
      var d = tree.depth[id];
      rowH[d] = Math.max(rowH[d] || 0, heights[id] || 90);
    });
    // A long single-file chain of ancestors would otherwise waste most of the
    // canvas on empty vertical space, so tighten the gap where neither the row
    // nor the one below it has anything to fan out into.
    var perRow = [];
    tree.order.forEach(function (id) { perRow[tree.depth[id]] = (perRow[tree.depth[id]] || 0) + 1; });

    var rowY = [], y = 0;
    for (var d = 0; d < rowH.length; d++) {
      rowY[d] = y;
      var sparse = (perRow[d] || 0) <= 1 && (perRow[d + 1] || 0) <= 1;
      y += (rowH[d] || 90) + (sparse ? V_GAP_TIGHT : V_GAP);
    }

    (function place(id) {
      var kids = collapsed[id] ? [] : (tree.children[id] || []);
      if (!kids.length) {
        pos[id] = { x: cursor + CARD_W / 2, y: rowY[tree.depth[id]], w: CARD_W, h: heights[id] || 90 };
        cursor += CARD_W + H_GAP;
        return;
      }
      kids.forEach(place);
      var first = pos[kids[0]].x, last = pos[kids[kids.length - 1]].x;
      pos[id] = { x: (first + last) / 2, y: rowY[tree.depth[id]], w: CARD_W, h: heights[id] || 90 };
      cursor = Math.max(cursor, pos[id].x + CARD_W / 2 + H_GAP);
    })(tree.order[0]);

    var maxX = 0, maxY = 0;
    Object.keys(pos).forEach(function (id) {
      maxX = Math.max(maxX, pos[id].x + CARD_W / 2);
      maxY = Math.max(maxY, pos[id].y + pos[id].h);
    });

    return { pos: pos, width: maxX, height: maxY };
  }

  /** Elbow path from the bottom of a parent card to the top of a child card. */
  function elbow(px, py, cx, cy) {
    var mid = py + (cy - py) / 2;
    if (Math.abs(px - cx) < 0.5) return 'M' + px + ',' + py + ' V' + cy;
    return 'M' + px + ',' + py + ' V' + mid + ' H' + cx + ' V' + cy;
  }

  /** Gentle curve used for the dashed maternal links, which can run a long way. */
  function curve(x1, y1, x2, y2) {
    var dy = Math.max(30, Math.abs(y2 - y1) * 0.5);
    return 'M' + x1 + ',' + y1 + ' C' + x1 + ',' + (y1 + dy) + ' ' + x2 + ',' + (y2 - dy) + ' ' + x2 + ',' + y2;
  }

  window.Layout = { build: build, position: position, elbow: elbow, curve: curve,
                    CARD_W: CARD_W, H_GAP: H_GAP, V_GAP: V_GAP };
})();
