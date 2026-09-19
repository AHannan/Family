# Family Tree

Build and keep your family tree. Works in **English and Urdu**, on a phone or a
laptop, and is designed so that someone who is not comfortable with software can
still use it on their own.

A Next.js app. Everything is stored on the device — no sign-up, no password,
no server to run. You open it by typing a phone number, which is only the label
your families are filed under on that device; one phone or tablet can hold
several people's trees that way.

## Running it

```sh
npm install
npm run dev          # http://localhost:3000
```

```sh
npm run build && npm start   # production
```

## What it does

- **Several families.** Start as many as you like from the home screen; rename
  or remove any of them.
- **Add relatives by relationship.** "Add son", "Add wife", "Add father" —
  never "create a record". The relationship is wired up for you.
- **Three ways to look at a family**, switchable at any time.
- **English ⇄ Urdu**, with the whole interface flipping right-to-left.
- **Undo** on every change, with an Undo button in the message that appears.
- **Backup to a file** and restore it on any device.
- **One device, several people.** Each phone number opens its own set of
  families. Switch numbers from Settings; the ones used before are listed on the
  first screen.

### Designed for a non-technical user

This part drove most of the design decisions, so they are worth spelling out:

- **The Family view is the default, not a chart.** It shows one person with
  their parents above, husband or wife beside, and children below. Tapping any
  relative walks to them, so the whole tree is reachable without ever touching a
  zoom control.
- **Every empty slot is a labelled button.** A missing mother is not a blank
  space, it is a dashed "+ Add mother" button in the place a mother would go.
- **Fewer questions per screen.** Adding a daughter does not ask for her
  gender — the button already said it — and does not show parent pickers,
  because the relationship is already known. One question: her name.
- **Adding a relative keeps you where you are.** Entering four children in a row
  does not make you walk back after each one.
- **Nothing is icon-only.** Every control has words on it.
- **Tap targets are at least 3rem**, which is 48px at the default text size and
  grows with it.
- **Text size is a setting** — Normal, Large, Very large — and it scales the
  entire interface, not just body copy.
- **Destructive actions ask in plain language**, say what will happen to
  everyone else, and can be undone from the message afterwards.
- **The tree grows upward by itself.** Add a grandfather and the chart
  re-roots on him, so nobody has to discover the "Start from" control.

### The three views

| View | What it is for |
| --- | --- |
| **Family** | One person and their immediate family. The default, and the easiest. |
| **Whole tree** | The full chart — pan, zoom, collapse branches. |
| **List** | Every person, searchable. |

## Urdu

Choosing اردو sets `lang` and `dir` on the document, and the layout flips
right-to-left throughout — the back arrow, the tabs, the cards, the forms.
Urdu text is set in Noto Nastaliq Urdu with the extra leading Nastaliq needs.

Every person can carry two names, one in Latin script and one in Urdu. Whichever
matches the current language is shown large, and the other is shown underneath,
so a family with relatives who read only one of the two scripts still works.

The language switch sits in the header on every screen rather than inside
Settings, and each option is written in its own script — someone who opens the
app in a language they cannot read is still one tap from fixing it.

## Where your data lives

In this browser, on this device, under the phone number you typed on the first
screen. That is the trade for having no account to create and no password to
remember, and the app says so on both screens.

The number is a label, not a login. Nothing is sent anywhere, nothing is
verified, and anyone holding the device can open any number — so it separates
one family's trees from another's on a shared tablet, and nothing more. Do not
keep anything private in here.

It means: trees do not sync between your phone and your laptop, and clearing
browser data erases them. **Settings → Backup → Save a backup file** writes
everything to one JSON file; "Open a backup file" reads it back on any device
and merges it with whatever is already there.

### File format

```json
{
  "version": 1,
  "settings": { "locale": "en", "textScale": 1 },
  "trees": [
    {
      "id": "t1a2b3c4",
      "name": "The Khan Family",
      "nameUr": "خان خاندان",
      "rootId": "karim-khan",
      "focusId": "karim-khan",
      "people": [
        {
          "id": "karim-khan",
          "name": "Karim Khan",
          "nameUr": "کریم خان",
          "gender": "m",
          "birth": "1948",
          "fatherId": null,
          "motherId": null,
          "spouseIds": ["ayesha-khan"],
          "notes": "Free text."
        }
      ]
    }
  ]
}
```

Only `id` and `name` are required on a person. Dates are free text on purpose —
`1952`, `c. 570 CE` and `11 AH / 632 CE` all work, and nothing tries to parse
them.

Imports are repaired rather than rejected: references to people who are not in
the file are dropped, marriages are made to point both ways, duplicate ids are
renamed, and any parent link that would make someone their own ancestor is
removed.

## The bundled example

"See an example" loads the lineage of Prophet Muhammad ﷺ — 85 people from
ʿAdnan down to the beginnings of the sayyid and sharif houses. It sits alongside
your own families and can be removed like any other.

The ascending chain from the Prophet ﷺ to ʿAdnan — 21 forefathers — is the
portion the classical biographers agree on; Ibn Ishaq (through Ibn Hisham's
*Sira*), Ibn Saʿd's *Tabaqat* and al-Tabari's *Tarikh* all transmit it
identically. Ancestry **above** ʿAdnan, up to Ismaʿil ibn Ibrahim, is disputed
and is deliberately left out — Ibn Ishaq himself stops there. Where the sources
disagree with each other (Shahrbanu's identity, whether Maria al-Qibtiyya is
counted among the wives), the note on that person says so.

Names carry an Urdu spelling alongside the Latin one, and titles are given in
both languages. The longer historical notes are in English only.

Dates are approximate: pre-Hijra figures CE only, later ones AH/CE, and `c.`
marks anything the sources do not fix precisely.

## How the chart is drawn

Solid lines follow the paternal line. Each person appears exactly once, under
their father where the father is in the chart and under their mother otherwise
— which is what keeps a grandchild attached through their mother when the
father married in from outside the family.

Dashed lines mark the *other* parent where both are in the chart. Spouses are
not given cards of their own; they are listed on their partner's card and have
full entries everywhere else. That is why the example draws 46 cards for 85
people.

## Layout of the code

```
app/
  layout.tsx            fonts, providers, document shell
  page.tsx              home - the list of families
  settings/page.tsx     language, text size, backup
  tree/[id]/page.tsx    one family, and the three views
  globals.css           theme tokens, type scale, RTL-safe base styles
components/
  LocaleShell.tsx       puts language and text size onto <html>
  Header.tsx            header bar and the language switch
  FamilyView.tsx        the default one-person-at-a-time view
  ChartView.tsx         the pan/zoom chart
  ListView.tsx          searchable list
  PersonSheet.tsx       one person: details and every action
  PersonForm.tsx        add and edit
  ui.tsx                buttons, fields, sheet, confirm, avatar
  Toast.tsx             one message at a time, with an undo action
lib/
  types.ts              Person, Tree, Settings
  family.ts             relationship rules, repair, attach
  layout.ts             chart shape and positioning
  store.tsx             state, device storage, undo, import/export
  accounts.ts           phone numbers: normalising, and which one is open
  seed.ts               the bundled example
```

`lib/family.ts`, `lib/layout.ts` and `lib/accounts.ts` are plain functions with
no React in them,
so the rules about how relatives hang together can be reasoned about — and
tested — on their own.

## Known limits

- One device. No sync; the backup file is the way to move between devices.
- The phone number is not checked and gives no protection — it only keeps one
  person's families apart from another's on the same device.
- Marriage records hold who, not when — no marriage or divorce dates.
- No photos yet; people are shown as a coloured initial.
- The chart prints as whatever is currently on screen rather than paginating a
  wall chart.
