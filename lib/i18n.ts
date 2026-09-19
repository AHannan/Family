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

    /* putting children in order */
    moveUp: 'Up',
    moveDown: 'Down',
    moveUpFor: (name: string) => `Move ${name} up one place`,
    moveDownFor: (name: string) => `Move ${name} down one place`,
    dragHandle: 'Move',
    dragHandleFor: (name: string) =>
      `Move ${name}: hold this and drag, or press the up and down arrow keys`,
    placeHere: 'Place here',
    positionOf: (n: number, total: number) => `Position ${n} of ${total}`,
    reorderHint: 'Children are shown oldest first. Tap Up or Down to move someone one place, or hold the Move handle and drag the person where you want them.',
    movedTo: (n: number, total: number) => `Moved to number ${n} of ${total}.`,
    orderSaved: 'New order saved.',

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

    /* signing in with a phone number */
    signInTitle: 'Sign in',
    signInBody:
      'Type your number and the password that was sent to you. Your families are saved online, so they come back on any phone you sign in on.',
    signInNotice:
      'Only you can open your families. Keep your password to yourself - anyone who has it can sign in as you.',
    phoneLabel: 'Phone number',
    phoneHint: 'With the country code, for example: +92 300 1234567',
    phoneRequired: 'Please type your phone number.',
    phoneInvalid: 'That does not look like a phone number. Please check it and try again.',
    needsCountryCode:
      'Please include the country code, starting with +. For a Pakistani number that is +92, so 0300 1234567 becomes +92 300 1234567.',
    passwordLabel: 'Password',
    passwordHint: 'The password that was sent to you.',
    passwordRequired: 'Please type your password.',
    wrongPassword:
      'That number and password do not match. Please check them and try again, or ask for a new password.',
    accountInactive:
      'This number has been turned off. Nothing has been deleted - ask for it to be turned back on.',
    signInOffline: 'Could not reach the internet. Please check your connection and try again.',
    continueLabel: 'Sign in',
    noAccountTitle: 'Do not have a password yet?',
    noAccountBody:
      'There is nothing to sign up for. Ask for an account and give your phone number, and a password will be sent to you.',
    savedNumbers: 'Numbers used on this device',
    savedNumbersHint: 'Tap a number to fill it in, then type your password.',
    emptyAccount: 'No families yet',
    newNumberNote: 'A number nobody has used here yet starts with an empty list.',
    forgetNumber: 'Remove from list',
    forgetNumberTitle: 'Remove this number from the list',
    forgetNumberConfirm: (phone: string) =>
      `Remove ${phone} from this list? Nothing is deleted - the families stay on this device, and typing the number again brings them straight back.`,
    numberForgotten: (phone: string) => `${phone} removed from the list.`,
    yourNumber: 'Your number',
    yourNumberBody: 'Your families are saved on this device under this number.',
    signOutConfirm: (phone: string) =>
      `Sign out of ${phone}? Nothing is deleted. Type the same number again whenever you want your families back.`,
    signedOut: 'Signed out.',
    signOut: 'Sign out',
    /* syncing */
    savedOnline: 'Saved online',
    syncing: 'Saving...',
    syncError: 'Not saved online yet - it will go up when the internet is back.',
    /* sharing a family */
    share: 'Share',
    shareTitle: 'Share this family',
    shareBody:
      'Off by default. Turn it on and anyone you send the link to can look at this family - they cannot change anything.',
    shareOn: 'Anyone with the link can see it',
    shareOff: 'Only you can see it',
    shareTurnOn: 'Let people see it with a link',
    shareTurnOff: 'Stop sharing',
    shareLink: 'The link to send',
    copyLink: 'Copy the link',
    linkCopied: 'Link copied.',
    shareStopped: 'Sharing stopped. The old link no longer opens.',
    sharePending: 'The link appears once this family has been saved online.',
    publicBadge: 'Shared',
    /* the read-only page a link opens */
    publicHeading: 'A shared family tree',
    publicNote: 'You are looking at a shared family. You cannot change anything here.',
    publicNotFound:
      'This link does not open a family. It may have been turned off, or the link may be incomplete.',
    publicLoading: 'Opening...',
    signOutTitle: 'Sign out of this number',
    familyCount: (n: number) => (n === 1 ? '1 family' : `${n} families`),

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

    /* putting children in order */
    moveUp: 'اوپر',
    moveDown: 'نیچے',
    moveUpFor: (name: string) => `${name} کو ایک درجہ اوپر کریں`,
    moveDownFor: (name: string) => `${name} کو ایک درجہ نیچے کریں`,
    dragHandle: 'کھسکائیں',
    dragHandleFor: (name: string) =>
      `${name} کو کھسکائیں: اسے دبا کر گھسیٹیں، یا اوپر نیچے کے تیر والے بٹن دبائیں`,
    placeHere: 'یہاں رکھیں',
    positionOf: (n: number, total: number) => `${total} میں سے ${n} نمبر`,
    reorderHint: 'اولاد بڑے سے چھوٹے کی ترتیب سے دکھائی جاتی ہے۔ کسی کو ایک درجہ آگے پیچھے کرنے کے لیے «اوپر» یا «نیچے» دبائیں، یا «کھسکائیں» کا نشان دبا کر اُس فرد کو اپنی مرضی کی جگہ گھسیٹ لیں۔',
    movedTo: (n: number, total: number) => `${total} میں سے ${n} نمبر پر کر دیا گیا۔`,
    orderSaved: 'نئی ترتیب محفوظ ہو گئی۔',

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

    /* signing in with a phone number */
    signInTitle: 'اندر آئیں',
    signInBody:
      'اپنا نمبر اور وہ پاس ورڈ لکھیں جو آپ کو بھیجا گیا ہے۔ آپ کے خاندان آن لائن محفوز ہیں، اس لیے جس فون پر بھی اندر آئیں، وہ واپس مل جائیں گے۔',
    signInNotice:
      'آپ کے خاندان صرف آپ کھول سکتے ہیں۔ اپنا پاس ورڈ کسی کو نہ دیں - جس کے پاس ہوگا وہ آپ بن کر اندر آ سکتا ہے۔',
    phoneLabel: 'فون نمبر',
    phoneHint: 'ملک کے کوڈ کے ساتھ، مثال کے طور پر: +92 300 1234567',
    phoneRequired: 'براہِ کرم اپنا فون نمبر لکھیں۔',
    phoneInvalid: 'یہ فون نمبر نہیں لگتا۔ براہِ کرم دوبارہ دیکھ لیں۔',
    needsCountryCode:
      'براہِ کرم ملک کا کوڈ بھی لکھیں، + سے شروع کریں۔ پاکستان کا کوڈ +92 ہے، یعنی 0300 1234567 کی جگہ +92 300 1234567۔',
    passwordLabel: 'پاس ورڈ',
    passwordHint: 'وہ پاس ورڈ جو آپ کو بھیجا گیا ہے۔',
    passwordRequired: 'براہِ کرم اپنا پاس ورڈ لکھیں۔',
    wrongPassword:
      'یہ نمبر اور پاس ورڈ آپس میں نہیں ملتے۔ براہِ کرم دوبارہ دیکھ لیں، یا نیا پاس ورڈ منگوا لیں۔',
    accountInactive:
      'یہ نمبر بند کر دیا گیا ہے۔ کچھ بھی ضائع نہیں ہوا - دوبارہ کھولنے کے لیے کہیں۔',
    signInOffline: 'انٹرنیٹ تک نہیں پہنچ سکے۔ براہِ کرم اپنا کنکشن دیکھ کر دوبارہ کوشش کریں۔',
    continueLabel: 'اندر آئیں',
    noAccountTitle: 'ابھی پاس ورڈ نہیں ملا؟',
    noAccountBody:
      'یہاں خود سے اکاؤنٹ بنانے کی کوئی ضرورت نہیں۔ اپنا فون نمبر دے کر اکاؤنٹ کی درخواست کریں، پاس ورڈ آپ کو بھیج دیا جائے گا۔',
    savedNumbers: 'اس آلے میں استعمال ہونے والے نمبر',
    savedNumbersHint: 'کسی نمبر پر ٹیپ کریں، پھر اپنا پاس ورڈ لکھیں۔',
    emptyAccount: 'ابھی کوئی خاندان نہیں',
    newNumberNote: 'جو نمبر یہاں پہلے استعمال نہیں ہوا، اس کی فہرست خالی ہوگی۔',
    forgetNumber: 'فہرست سے ہٹائیں',
    forgetNumberTitle: 'یہ نمبر فہرست سے ہٹائیں',
    forgetNumberConfirm: (phone: string) =>
      `${phone} کو فہرست سے ہٹا دیں؟ کچھ بھی ضائع نہیں ہوگا - خاندان اسی آلے میں محفوظ رہیں گے، اور نمبر دوبارہ لکھتے ہی واپس آ جائیں گے۔`,
    numberForgotten: (phone: string) => `${phone} فہرست سے ہٹا دیا گیا۔`,
    yourNumber: 'آپ کا نمبر',
    yourNumberBody: 'آپ کے خاندان اسی آلے میں، اس نمبر کے ساتھ محفوظ ہیں۔',
    signOutConfirm: (phone: string) =>
      `${phone} سے باہر نکل جائیں؟ کچھ بھی ضائع نہیں ہوگا۔ جب چاہیں یہی نمبر دوبارہ لکھ کر اپنے خاندان واپس لے لیں۔`,
    signedOut: 'باہر نکل گئے۔',
    signOut: 'باہر نکلیں',
    /* syncing */
    savedOnline: 'آن لائن محفوز',
    syncing: 'محفوز ہو رہا ہے...',
    syncError: 'ابھی آن لائن محفوز نہیں ہوا - انٹرنیٹ آتے ہی ہو جائے گا۔',
    /* sharing a family */
    share: 'دکھائیں',
    shareTitle: 'یہ خاندان دوسروں کو دکھائیں',
    shareBody:
      'یہ پہلے سے بند ہے۔ کھولنے پر جسے آپ لنک بھیجیں گے وہ یہ خاندان دیکھ سکے گا - بدل نہیں سکے گا۔',
    shareOn: 'لنک رکھنے والا کوئی بھی دیکھ سکتا ہے',
    shareOff: 'صرف آپ دیکھ سکتے ہیں',
    shareTurnOn: 'لنک سے دکھانے کی اجازت دیں',
    shareTurnOff: 'دکھانا بند کریں',
    shareLink: 'بھیجنے والا لنک',
    copyLink: 'لنک کاپی کریں',
    linkCopied: 'لنک کاپی ہو گیا۔',
    shareStopped: 'دکھانا بند ہو گیا۔ پرانا لنک اب نہیں کھلے گا۔',
    sharePending: 'یہ خاندان آن لائن محفوز ہوتے ہی لنک آ جائے گا۔',
    publicBadge: 'دکھایا جا رہا ہے',
    /* the read-only page a link opens */
    publicHeading: 'دکھایا گیا خاندانی شجرہ',
    publicNote: 'آپ ایک دکھایا گیا خاندان دیکھ رہے ہیں۔ یہاں کچھ بدلا نہیں جا سکتا۔',
    publicNotFound:
      'اس لنک سے کوئی خاندان نہیں کھلتا۔ ممکن ہے بند کر دیا گیا ہو، یا لنک ادھورا ہو۔',
    publicLoading: 'کھل رہا ہے...',
    signOutTitle: 'اس نمبر سے باہر نکلیں',
    familyCount: (n: number) => `${n} خاندان`,

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
