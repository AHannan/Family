# Family Tree Manager

A family tree you can browse, edit and hand to someone else. No build step, no
server, no dependencies — open `index.html` in a browser and it runs.

It ships with a worked example: the lineage of Prophet Muhammad ﷺ, 85 people
from ʿAdnan down to the beginnings of the sayyid and sharif houses. Replace it
with your own family whenever you like.

## Running it

Double-click `index.html`. That is the whole setup.

It works from `file://` on purpose — the data is a plain `.js` file rather than
a `.json` fetch, so nothing is blocked by browser security rules and you never
need a local server. If you would rather serve it (to share on a LAN, say):

```sh
python -m http.server 8000     # then open http://localhost:8000
```

## The three views

| View | What it is for |
| --- | --- |
| **Tree** | The descendant chart. Pick who it starts from, pan, zoom, collapse branches. |
| **Lineage** | One person's direct ancestral chain, numbered by generation. Best for long unbranching descents. |
| **People** | Every person in a sortable, filterable table. The filter searches names, titles, notes and tags. |

## Using it

- **Click anyone** to open their card on the right: dates, notes, and every
  relative as a button you can click through to.
- **Add people** from a person's card (`+ Child`, `+ Spouse`, `+ Parent`,
  `+ Sibling`) so the relationship is wired up for you, or with `+ Add person`
  in the header for someone unattached.
- **Collapse a branch** with the small circle at the bottom of a card. The
  number on it tells you how many children are hidden.
- **Search** with `/` or the header box. Jumping to someone expands any
  collapsed branch in their way and centres the canvas on them.
- **Undo** with `Ctrl+Z`, or from the link in the message that appears after a
  change. The last 40 changes are kept.
- **Start the tree somewhere else** with the `Start from` dropdown, or
  `Start tree here` on anyone's card.

## Your data

Everything you change is saved to this browser's local storage immediately.
That means it is private to you and survives closing the tab, but it does **not**
sync between browsers, devices or profiles, and clearing site data erases it.

So: **export a JSON copy** (`⋯ → Export JSON`) whenever you have done real work.
`Import JSON` reads it back on any machine, and `Reset to sample lineage`
restores the shipped dataset.

### Data format

Export and import both use this shape, which is also what `js/seed.js` holds:

```json
{
  "meta": {
    "title": "Ahl al-Bayt",
    "subtitle": "The lineage of Prophet Muhammad ﷺ",
    "rootId": "abd-al-muttalib",
    "focusId": "muhammad",
    "note": "Shown at the foot of the Lineage view."
  },
  "people": [
    {
      "id": "muhammad",
      "name": "Muhammad",
      "arabic": "مُحَمَّد",
      "title": "Messenger of God",
      "gender": "m",
      "birth": "c. 570 CE",
      "death": "11 AH / 632 CE",
      "fatherId": "abdullah",
      "motherId": "amina",
      "spouseIds": ["khadija"],
      "tags": ["prophet"],
      "notes": "Free text, shown on the person's card."
    }
  ]
}
```

Only `id` and `name` are required; anything missing is filled in with a blank.
Dates are free text, so `1987`, `c. 570 CE` and `11 AH / 632 CE` are all fine —
nothing tries to parse them.

On import the file is repaired rather than rejected: references to people who
are not in the file get dropped, marriages are made to point both ways, and any
parent link that would make someone their own ancestor is removed.

### Starting your own family from scratch

Easiest route: open the app, `Reset to sample lineage` if needed, then delete
people and add your own. Or write a JSON file in the shape above and import it.

To change what the app ships with, edit `js/seed.js` and set `meta.rootId` to
whoever the tree should start from.

## About the sample lineage

The ascending chain from the Prophet ﷺ to ʿAdnan — 21 forefathers — is the
portion the classical biographers agree on. Ibn Ishaq (through Ibn Hisham's
*Sira*), Ibn Saʿd's *Tabaqat* and al-Tabari's *Tarikh* all transmit it
identically, and the `Lineage` view shows it in full.

Ancestry **above** ʿAdnan, up to Ismaʿil ibn Ibrahim, is disputed and is
deliberately not included — Ibn Ishaq himself stops there. Descendants are
carried a few generations past al-Hasan and al-Husayn, far enough to show where
the sayyid and sharif houses begin, and no further.

Dates are approximate: pre-Hijra figures are given CE only, later ones AH/CE,
and `c.` marks anything the sources do not fix precisely. Where the sources
themselves disagree — Shahrbanu's identity, whether Maria al-Qibtiyya is counted
among the wives — the note on that person says so.

## How the tree is drawn

Solid lines follow the paternal line. Each person appears exactly once, under
their father where the father is in the tree and under their mother otherwise,
which is what keeps a grandchild like Umama attached through Zaynab when her
father married in from outside the family.

Dashed lines mark the *other* parent where both parents are in the tree — so
al-Hasan hangs under ʿAli by a solid line and is joined to Fatima by a dashed
one. Turn them off with the `Maternal links` checkbox.

Spouses are not given cards of their own; they are listed on their partner's
card and get full entries in the `People` view and the detail panel. That is why
the sample tree draws 46 cards out of 85 people when it starts at
ʿAbd al-Muttalib.

## Files

```
index.html        markup for all three views, the detail panel and the dialogs
css/app.css       one stylesheet; light and dark themes, print rules
js/seed.js        the shipped dataset
js/store.js       people, relationships, undo, local storage, import/export
js/layout.js      works out the tree's shape and positions
js/app.js         views, canvas, forms, files
```

No dependencies, no build, no package.json.

## Known limits

- `Print / save as PDF` is reliable for the Lineage and People views. The tree
  canvas is pan-and-zoom, so printing it captures the current view rather than
  paginating the whole chart — export and use a dedicated tool for a wall chart.
- One dataset at a time. To keep several families, export each to its own JSON
  file and import the one you want.
- Marriage records hold who, not when — there are no marriage or divorce dates.
