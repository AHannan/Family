/** Every word the interface says, in both languages.
 *
 *  Urdu is right-to-left, so picking a locale also flips the whole layout -
 *  see `dirFor` and the <html dir> it drives in app/layout.tsx.
 *
 *  Wording rule for both languages: short, plain, no jargon. "Add son", not
 *  "Create child record". The people using this are not database users.
 */
import type { Locale } from './types';

export const strings = {
  en: {
    /* app + home */
    appName: 'Family Tree',
    myFamilies: 'My families',
    myFamiliesSub: 'Tap a family to open it.',
    newFamily: 'Start a new family',
    newFamilyTitle: 'Start a new family',
    familyName: 'Family name',
    familyNameHint: 'For example: The Khan Family',
    noFamiliesTitle: 'You have no families yet',
    noFamiliesBody: 'Start your own family tree, or look at the example first to see how it works.',
    openFamily: 'Open',
    openExample: 'See an example',
    exampleBadge: 'Example',
    peopleCount: (n: number) => (n === 1 ? '1 person' : `${n} people`),
    lastEdited: 'Last changed',
    renameFamily: 'Rename this family',
    deleteFamily: 'Delete this family',
    deleteFamilyConfirm: (name: string) =>
      `Delete "${name}" and everyone in it? You can undo this straight away if it was a mistake.`,

    /* views */
    viewFamily: 'Family',
    viewChart: 'Whole tree',
    viewList: 'List',
    familyViewHint: 'Tap any name to move to that person.',

    /* relationships */
    parents: 'Parents',
    father: 'Father',
    mother: 'Mother',
    marriedTo: 'Married to',
    husband: 'Husband',
    wife: 'Wife',
    children: 'Children',
    siblings: 'Brothers and sisters',
    noneYet: 'None added yet',

    /* actions */
    add: 'Add',
    addSon: 'Add son',
    addDaughter: 'Add daughter',
    addWife: 'Add wife',
    addHusband: 'Add husband',
    addFather: 'Add father',
    addMother: 'Add mother',
    addBrother: 'Add brother',
    addSister: 'Add sister',
    addPerson: 'Add a person',
    addFirstPerson: 'Add the first person',
    addFirstPersonBody: 'Start with yourself, or with the oldest person you know of.',
    edit: 'Edit',
    remove: 'Remove',
    removePerson: 'Remove this person',
    removeConfirm: (name: string) => `Remove ${name} from this family?`,
    removeConfirmChildren: (name: string, n: number) =>
      `Remove ${name}? ${n === 1 ? 'One person' : `${n} people`} listed as their child will stay, but will no longer show this parent.`,
    save: 'Save',
    cancel: 'Cancel',
    done: 'Done',
    back: 'Back',
    close: 'Close',
    undo: 'Undo',
    undone: 'Put back.',
    nothingToUndo: 'Nothing to undo.',
    confirm: 'Yes, do it',

    /* person form */
    personDetails: 'Details',
    name: 'Name',
    nameUr: 'Name in Urdu',
    nameRequired: 'Please type a name.',
    title: 'Title',
    titleHint: 'For example: Doctor, Nana Abu',
    gender: 'Man or woman',
    male: 'Man',
    female: 'Woman',
    unspecified: 'Not saying',
    born: 'Born',
    died: 'Died',
    dateHint: 'Write it any way you like, such as 1952',
    notes: 'About this person',
    notesHint: 'Anything you want to remember',
    linkExisting: 'Or choose someone already in the family',
    choosePerson: 'Choose a person…',
    noParent: 'Not known',

    /* chart */
    startFrom: 'Start from',
    zoomIn: 'Bigger',
    zoomOut: 'Smaller',
    fit: 'Fit on screen',
    showSpouses: 'Show husbands and wives',
    showMaternal: 'Show mother links',
    chartHint: 'Drag to move around. Tap a person to open them.',
    hideBranch: 'Hide this branch',
    showBranch: 'Show this branch',

    /* list + search */
    search: 'Search',
    searchHint: 'Search by name',
    noResults: 'Nobody matches that.',
    everyone: 'Everyone in this family',

    /* settings + backup */
    settings: 'Settings',
    language: 'Language',
    textSize: 'Text size',
    textNormal: 'Normal',
    textLarge: 'Large',
    textExtraLarge: 'Very large',
    backup: 'Backup',
    backupBody: 'Your families are kept on this device only. Save a backup file so nothing is lost.',
    saveToFile: 'Save a backup file',
    openFromFile: 'Open a backup file',
    importDone: (n: number) => `Loaded ${n === 1 ? '1 family' : `${n} families`}.`,
    importFailed: 'That file could not be read.',
    savedOnDevice: 'Saved on this device',

    /* messages */
    familyRemoved: (name: string) => `"${name}" removed.`,
    personAdded: (name: string) => `${name} added.`,
    personRemoved: (name: string) => `${name} removed.`,
    saved: 'Saved.',

    /* misc */
    unnamed: 'Unnamed',
    you: 'You',
    loading: 'Loading…',
  },

  ur: {
    /* app + home */
    appName: 'شجرۂ نسب',
    myFamilies: 'میرے خاندان',
    myFamiliesSub: 'خاندان کھولنے کے لیے اس پر ٹیپ کریں۔',
    newFamily: 'نیا خاندان شروع کریں',
    newFamilyTitle: 'نیا خاندان شروع کریں',
    familyName: 'خاندان کا نام',
    familyNameHint: 'مثال کے طور پر: خان خاندان',
    noFamiliesTitle: 'ابھی کوئی خاندان نہیں ہے',
    noFamiliesBody: 'اپنا شجرۂ نسب شروع کریں، یا پہلے مثال دیکھ لیں کہ یہ کیسے کام کرتا ہے۔',
    openFamily: 'کھولیں',
    openExample: 'مثال دیکھیں',
    exampleBadge: 'مثال',
    peopleCount: (n: number) => `${n} افراد`,
    lastEdited: 'آخری تبدیلی',
    renameFamily: 'خاندان کا نام بدلیں',
    deleteFamily: 'یہ خاندان حذف کریں',
    deleteFamilyConfirm: (name: string) =>
      `کیا آپ «${name}» اور اس کے تمام افراد کو حذف کرنا چاہتے ہیں؟ غلطی ہو جائے تو فوراً واپس کر سکتے ہیں۔`,

    /* views */
    viewFamily: 'خاندان',
    viewChart: 'پورا شجرہ',
    viewList: 'فہرست',
    familyViewHint: 'کسی بھی نام پر ٹیپ کریں تاکہ اس فرد پر پہنچ جائیں۔',

    /* relationships */
    parents: 'والدین',
    father: 'والد',
    mother: 'والدہ',
    marriedTo: 'شادی',
    husband: 'شوہر',
    wife: 'بیوی',
    children: 'اولاد',
    siblings: 'بھائی بہن',
    noneYet: 'ابھی کوئی شامل نہیں',

    /* actions */
    add: 'شامل کریں',
    addSon: 'بیٹا شامل کریں',
    addDaughter: 'بیٹی شامل کریں',
    addWife: 'بیوی شامل کریں',
    addHusband: 'شوہر شامل کریں',
    addFather: 'والد شامل کریں',
    addMother: 'والدہ شامل کریں',
    addBrother: 'بھائی شامل کریں',
    addSister: 'بہن شامل کریں',
    addPerson: 'فرد شامل کریں',
    addFirstPerson: 'پہلا فرد شامل کریں',
    addFirstPersonBody: 'اپنے آپ سے شروع کریں، یا سب سے بزرگ فرد سے جو آپ کو یاد ہوں۔',
    edit: 'تبدیلی کریں',
    remove: 'ہٹا دیں',
    removePerson: 'اس فرد کو ہٹا دیں',
    removeConfirm: (name: string) => `کیا ${name} کو اس خاندان سے ہٹا دیں؟`,
    removeConfirmChildren: (name: string, n: number) =>
      `کیا ${name} کو ہٹا دیں؟ ان کی اولاد میں شامل ${n} افراد باقی رہیں گے، مگر اُن پر یہ والدین نظر نہیں آئیں گے۔`,
    save: 'محفوظ کریں',
    cancel: 'منسوخ کریں',
    done: 'مکمل',
    back: 'واپس',
    close: 'بند کریں',
    undo: 'واپس کریں',
    undone: 'واپس کر دیا گیا۔',
    nothingToUndo: 'واپس کرنے کے لیے کچھ نہیں۔',
    confirm: 'جی ہاں، کر دیں',

    /* person form */
    personDetails: 'تفصیل',
    name: 'نام',
    nameUr: 'اردو میں نام',
    nameRequired: 'براہِ کرم نام لکھیں۔',
    title: 'لقب',
    titleHint: 'مثال کے طور پر: ڈاکٹر، نانا ابو',
    gender: 'مرد یا عورت',
    male: 'مرد',
    female: 'عورت',
    unspecified: 'نہیں بتانا',
    born: 'پیدائش',
    died: 'وفات',
    dateHint: 'جیسے چاہیں لکھ دیں، مثلاً ۱۹۵۲',
    notes: 'اس فرد کے بارے میں',
    notesHint: 'جو کچھ یاد رکھنا چاہیں',
    linkExisting: 'یا خاندان میں پہلے سے موجود کسی فرد کو چنیں',
    choosePerson: 'کوئی فرد چنیں…',
    noParent: 'معلوم نہیں',

    /* chart */
    startFrom: 'یہاں سے شروع',
    zoomIn: 'بڑا کریں',
    zoomOut: 'چھوٹا کریں',
    fit: 'سکرین پر پورا کریں',
    showSpouses: 'میاں بیوی دکھائیں',
    showMaternal: 'والدہ کا تعلق دکھائیں',
    chartHint: 'اِدھر اُدھر لے جانے کے لیے گھسیٹیں۔ کسی فرد پر ٹیپ کریں۔',
    hideBranch: 'یہ شاخ چھپائیں',
    showBranch: 'یہ شاخ دکھائیں',

    /* list + search */
    search: 'تلاش',
    searchHint: 'نام سے تلاش کریں',
    noResults: 'کوئی نہیں ملا۔',
    everyone: 'اس خاندان کے تمام افراد',

    /* settings + backup */
    settings: 'ترتیبات',
    language: 'زبان',
    textSize: 'لکھائی کا سائز',
    textNormal: 'عام',
    textLarge: 'بڑا',
    textExtraLarge: 'بہت بڑا',
    backup: 'بیک اپ',
    backupBody: 'آپ کے خاندان صرف اسی آلے میں محفوظ ہیں۔ بیک اپ فائل بنا لیں تاکہ کچھ ضائع نہ ہو۔',
    saveToFile: 'بیک اپ فائل محفوظ کریں',
    openFromFile: 'بیک اپ فائل کھولیں',
    importDone: (n: number) => `${n} خاندان کھول لیے گئے۔`,
    importFailed: 'یہ فائل نہیں پڑھی جا سکی۔',
    savedOnDevice: 'اسی آلے میں محفوظ',

    /* messages */
    familyRemoved: (name: string) => `«${name}» ہٹا دیا گیا۔`,
    personAdded: (name: string) => `${name} شامل کر دیے گئے۔`,
    personRemoved: (name: string) => `${name} کو ہٹا دیا گیا۔`,
    saved: 'محفوظ ہو گیا۔',

    /* misc */
    unnamed: 'بے نام',
    you: 'آپ',
    loading: 'کھل رہا ہے…',
  },
} as const;

export type Strings = (typeof strings)['en'];

export function t(locale: Locale): Strings {
  return (strings[locale] ?? strings.en) as Strings;
}

export function dirFor(locale: Locale): 'ltr' | 'rtl' {
  return locale === 'ur' ? 'rtl' : 'ltr';
}

/** Show the Urdu name when reading in Urdu, falling back to the Latin one. */
export function displayName(
  p: { name: string; nameUr?: string },
  locale: Locale,
): string {
  if (locale === 'ur' && p.nameUr) return p.nameUr;
  return p.name;
}

/** The secondary name to show underneath, if it adds anything. */
export function altName(
  p: { name: string; nameUr?: string },
  locale: Locale,
): string {
  if (locale === 'ur') return p.nameUr ? p.name : '';
  return p.nameUr || '';
}
