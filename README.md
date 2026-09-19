# Family Tree

Build and keep your family tree. Works in **English and Urdu**, on a phone or a
laptop, and is designed so that someone who is not comfortable with software can
still use it on their own.

A Next.js app, local-first with a Supabase database behind it. You sign in with
your phone number and a password, your families are kept in the browser as you
work and saved online a moment later, so they come back on any phone you sign in
on — and a cleared browser is no longer the end of them.

**There is no sign-up.** Somebody asks to be let in and gives their number, the
owner creates the account and sends them a link and a password. Nothing is sent
by SMS or email, so no messaging provider is needed and nothing costs anything
per user. See [Accounts](#accounts).

## Running it

```sh
npm install
npm run dev          # http://localhost:3000
```

```sh
npm run build && npm start   # production
```

Copy `.env.local.example` to `.env.local` and fill in the two
`NEXT_PUBLIC_SUPABASE_*` values to connect the database. **Without them the app
still runs** — it falls back to local-only, where a number is just a label again
and nothing is saved online. That is the same thing a dead network gets, on
purpose, so a bad connection never locks anybody out of their own tree.

## Accounts

There is no sign-up screen, no OTP and no SMS provider. An account exists because
you made one:

```sh
npm run invite -- +923001234567 "Nani Amma"     # create, print link + password
npm run invite -- +923001234567 --reset         # send them a new password
```

It prints a link and a password to pass on however you like — WhatsApp, a text,
or read down the phone. The link carries the number, so the person only has to
type the password. Passwords are generated in three short groups with no
lookalike characters, because they get dictated to people.

This works with no messaging provider because `phone_confirm` marks the number
confirmed on the grounds that *you* confirmed it, by talking to them. Supabase
never sends the person anything.

`scripts/invite.mjs` needs `SUPABASE_SERVICE_ROLE_KEY` in `.env.local`. That key
bypasses row level security; it has no `NEXT_PUBLIC_` prefix, so Next.js never
puts it in the browser bundle. Keep it that way.

To take somebody's access away without deleting anything, set
`family_accounts.is_active` to `false`.

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

Two places, and that is deliberate.

The browser holds the copy you are working on, filed under your number, so the
app is instant, works with no signal, and can undo. A second or so after you stop
editing, each changed family is written to the `family_trees` table in Supabase.
The line under the family list says which of those has happened.

Signing in on a new phone pulls your families down. Row level security is what
keeps them yours: every policy is `owner_id = auth.uid()`, so the database itself
refuses to hand your trees to anyone else.

**A sync never destroys a tree.** When the two copies disagree, the one edited
more recently wins, and a family that only one side has is kept rather than
deleted — the same rule the backup import has always followed. The reasoning is
in `lib/cloud.ts`: for somebody whose only other copy is a file they have
probably never saved, a wrong deletion is unrecoverable and a duplicate is not.
Deleting a family on your device does delete it online; a family that merely went
missing is treated as one to restore.

**Settings → Backup → Save a backup file** still writes everything to one JSON
file, and still works offline — it is the one copy that does not depend on
anybody else's servers.

### Sharing a family

Off until you ask for it. **Share** on a family card gives a link that anyone can
open, with no account, to read that family — they cannot change anything. Turn it
off and the link stops working. Nothing else about you is on that page.

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

"See an example" loads **The Malik Family** — an invented Punjabi family, 33
people across five generations. Nobody in it is real. It sits alongside your own
families and can be edited or removed like any other.

It is filler, and it is meant to be: its only job is to give somebody opening the
app for the first time something to tap around in. Change it freely.

It is shaped to exercise the interface rather than to be large:

- five generations, so "Whole tree" has something to scroll
- one man with two wives, so the spouse list on a card is not hypothetical
- a son-in-law who married in with no recorded parents, so his children hang
  under their mother — the layout fallback described below
- somebody who never married and somebody with no children, so the empty
  `+ Add ...` slots are visible
- dates written several different ways, because they are free text and nothing
  parses them

Names carry an Urdu spelling alongside the Latin one, and titles are given in
both languages. The few notes are in English.

## How the chart is drawn

Solid lines follow the paternal line. Each person appears exactly once, under
their father where the father is in the chart and under their mother otherwise
— which is what keeps a grandchild attached through their mother when the
father married in from outside the family.

Dashed lines mark the *other* parent where both are in the chart. Spouses are
not given cards of their own; they are listed on their partner's card and have
full entries everywhere else. That is why the example draws 22 cards for 33
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
  cloud.ts              reading and writing trees in Supabase, and the merge rule
  supabase.ts           the one browser client
  seed.ts               the bundled example
scripts/
  invite.mjs            create an account and print its link and password
supabase/migrations/    the family_accounts and family_trees schema
```

`lib/family.ts`, `lib/layout.ts`, `lib/accounts.ts` and `lib/cloud.ts` are plain
functions with no React in them,
so the rules about how relatives hang together can be reasoned about — and
tested — on their own.

## Known limits

- No sign-up. Accounts are created one at a time from the command line, which is
  the intended design at this size but does not scale to strangers.
- Passwords are delivered by hand and there is no "forgot password" — a reset is
  `npm run invite -- <number> --reset`.
- A number has to be typed with its country code, because nothing here guesses
  one. The link you send already carries it.
- A family deleted on another device can come back on this one: the merge keeps
  anything either side has, and there are no tombstones.
- Marriage records hold who, not when — no marriage or divorce dates.
- No photos yet; people are shown as a coloured initial.
- The chart prints as whatever is currently on screen rather than paginating a
  wall chart.
