/* The bundled example: the lineage of Prophet Muhammad ﷺ.
 *
 * Sourcing ------------------------------------------------------------------
 * The ascending chain from the Prophet to 'Adnan - 21 forefathers - is the
 * portion the classical biographers agree on. Ibn Ishaq (through Ibn Hisham's
 * Sira), Ibn Sa'd's Tabaqat and al-Tabari's Tarikh all transmit it identically.
 * Ancestry ABOVE 'Adnan, up to Isma'il ibn Ibrahim, is disputed and is left
 * out; Ibn Ishaq himself stops there. Descendants run a few generations past
 * al-Hasan and al-Husayn, far enough to show where the sayyid and sharif
 * houses begin.
 *
 * Every name carries an Urdu spelling alongside the Latin one, and titles are
 * given in both languages. The longer notes stay in English.
 *
 * Dates are approximate: pre-Hijra figures CE only, later ones AH/CE, and "c."
 * marks anything the sources do not fix precisely.
 * -------------------------------------------------------------------------- */
import type { Person, Tree } from './types';

export const SAMPLE_TREE_ID = 'sample-ahl-al-bayt';

const SAMPLE_PEOPLE: Person[] = [
  {
    id: 'adnan',
    name: 'ʿAdnan',
    nameUr: 'عدنان',
    title: 'Forefather of the northern Arabs',
    titleUr: 'شمالی عرب کے جدِ اعلیٰ',
    gender: 'm',
    fatherId: null,
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'The furthest ancestor the classical biographers accept with confidence. Ibn Ishaq stops the chain here; what lies between ʿAdnan and Ismaʿil ibn Ibrahim was not reliably transmitted.'
  },
  {
    id: 'maadd',
    name: 'Maʿadd',
    nameUr: 'معد',
    gender: 'm',
    fatherId: 'adnan',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'nizar',
    name: 'Nizar',
    nameUr: 'نزار',
    gender: 'm',
    fatherId: 'maadd',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'mudar',
    name: 'Mudar',
    nameUr: 'مضر',
    gender: 'm',
    fatherId: 'nizar',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Eponym of the Mudar confederation of North Arabian tribes.'
  },
  {
    id: 'ilyas',
    name: 'Ilyas',
    nameUr: 'الیاس',
    gender: 'm',
    fatherId: 'mudar',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'mudrika',
    name: 'Mudrika',
    nameUr: 'مدرکہ',
    gender: 'm',
    fatherId: 'ilyas',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Given name ʿAmir; "Mudrika" is the byname the sources use.'
  },
  {
    id: 'khuzayma',
    name: 'Khuzayma',
    nameUr: 'خزیمہ',
    gender: 'm',
    fatherId: 'mudrika',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'kinana',
    name: 'Kinana',
    nameUr: 'کنانہ',
    gender: 'm',
    fatherId: 'khuzayma',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Eponym of the Kinana tribe, of which Quraysh is a branch.'
  },
  {
    id: 'al-nadr',
    name: 'al-Nadr',
    nameUr: 'النضر',
    gender: 'm',
    fatherId: 'kinana',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Also called Qays. Some genealogists date the name "Quraysh" to him rather than to Fihr.'
  },
  {
    id: 'malik',
    name: 'Malik',
    nameUr: 'مالک',
    gender: 'm',
    fatherId: 'al-nadr',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'fihr',
    name: 'Fihr',
    nameUr: 'فہر',
    title: 'Quraysh',
    titleUr: 'قریش',
    gender: 'm',
    fatherId: 'malik',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Bynamed Quraysh; the majority view makes him the eponym of the tribe.'
  },
  {
    id: 'ghalib',
    name: 'Ghalib',
    nameUr: 'غالب',
    gender: 'm',
    fatherId: 'fihr',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'luayy',
    name: 'Luʿayy',
    nameUr: 'لؤی',
    gender: 'm',
    fatherId: 'ghalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'kaab',
    name: 'Kaʿb',
    nameUr: 'کعب',
    gender: 'm',
    fatherId: 'luayy',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'murra',
    name: 'Murra',
    nameUr: 'مرہ',
    gender: 'm',
    fatherId: 'kaab',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Also the common ancestor of Abu Bakr al-Siddiq and of ʿUmar ibn al-Khattab.'
  },
  {
    id: 'kilab',
    name: 'Kilab',
    nameUr: 'کلاب',
    gender: 'm',
    fatherId: 'murra',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ]
  },
  {
    id: 'qusayy',
    name: 'Qusayy',
    nameUr: 'قصی',
    title: 'Custodian of the Kaʿba',
    titleUr: 'خادمِ کعبہ',
    gender: 'm',
    death: 'c. 480 CE',
    fatherId: 'kilab',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Given name Zayd. United Quraysh and settled them around the Kaʿba, taking custody of its keys, the pilgrims’ water supply and the assembly house.'
  },
  {
    id: 'abd-manaf',
    name: 'ʿAbd Manaf',
    nameUr: 'عبد مناف',
    gender: 'm',
    fatherId: 'qusayy',
    motherId: null,
    spouseIds: [],
    tags: [
      'lineage'
    ],
    notes: 'Given name al-Mughira.'
  },
  {
    id: 'hashim',
    name: 'Hashim',
    nameUr: 'ہاشم',
    title: 'Eponym of the Banu Hashim',
    titleUr: 'بنو ہاشم کے جدِ امجد',
    gender: 'm',
    death: 'c. 497 CE',
    fatherId: 'abd-manaf',
    motherId: null,
    spouseIds: [
      'salma'
    ],
    tags: [
      'lineage'
    ],
    notes: 'Given name ʿAmr. Bynamed Hashim, "he who crumbles bread", for feeding the pilgrims in a famine year. Established the Quraysh trade caravans to Syria and Yemen. Died at Gaza.'
  },
  {
    id: 'salma',
    name: 'Salma bint ʿAmr',
    nameUr: 'سلمیٰ',
    gender: 'f',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'hashim'
    ],
    tags: [
      'matriarch'
    ],
    notes: 'Of the Banu al-Najjar of Yathrib, later Madina. Raised ʿAbd al-Muttalib in her own city until his uncle brought him to Mecca.'
  },
  {
    id: 'abd-al-muttalib',
    name: 'ʿAbd al-Muttalib',
    nameUr: 'عبد المطلب',
    title: 'Chief of Quraysh',
    titleUr: 'سردارِ قریش',
    gender: 'm',
    birth: 'c. 497 CE',
    death: 'c. 578 CE',
    fatherId: 'hashim',
    motherId: 'salma',
    spouseIds: [
      'fatima-bint-amr'
    ],
    tags: [
      'lineage'
    ],
    notes: 'Given name Shayba. Re-dug the well of Zamzam. Head of Quraysh in the Year of the Elephant; raised the Prophet after Amina died, for two years until his own death.'
  },
  {
    id: 'fatima-bint-amr',
    name: 'Fatima bint ʿAmr',
    nameUr: 'فاطمہ',
    gender: 'f',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'abd-al-muttalib'
    ],
    tags: [
      'matriarch'
    ],
    notes: 'Of the Banu Makhzum. Mother of ʿAbd Allah, Abu Talib, al-Zubayr and several daughters.'
  },
  {
    id: 'abdullah',
    name: 'ʿAbd Allah',
    nameUr: 'عبد اللہ',
    title: 'Father of the Prophet ﷺ',
    titleUr: 'والدِ رسول ﷺ',
    gender: 'm',
    birth: 'c. 545 CE',
    death: 'c. 570 CE',
    fatherId: 'abd-al-muttalib',
    motherId: 'fatima-bint-amr',
    spouseIds: [
      'amina'
    ],
    tags: [
      'lineage'
    ],
    notes: 'Died on a trading journey at Yathrib, around the time the Prophet was born.'
  },
  {
    id: 'amina',
    name: 'Amina bint Wahb',
    nameUr: 'آمنہ',
    title: 'Mother of the Prophet ﷺ',
    titleUr: 'والدۂ رسول ﷺ',
    gender: 'f',
    death: 'c. 576 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'abdullah'
    ],
    tags: [
      'matriarch'
    ],
    notes: 'Of the Banu Zuhra, daughter of Wahb ibn ʿAbd Manaf ibn Zuhra. Died at al-Abwaʾ when the Prophet was about six.'
  },
  {
    id: 'al-harith-b-am',
    name: 'al-Harith',
    gender: 'm',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle'
    ],
    notes: 'Eldest son of ʿAbd al-Muttalib, and the only one to die before his father.'
  },
  {
    id: 'al-zubayr-b-am',
    name: 'al-Zubayr',
    gender: 'm',
    fatherId: 'abd-al-muttalib',
    motherId: 'fatima-bint-amr',
    spouseIds: [],
    tags: [
      'uncle'
    ],
    notes: 'A signatory of the Hilf al-Fudul, the Meccan pact for protecting the wronged.'
  },
  {
    id: 'abu-talib',
    name: 'Abu Talib',
    nameUr: 'ابو طالب',
    title: 'Guardian of the Prophet ﷺ',
    titleUr: 'سرپرستِ رسول ﷺ',
    gender: 'm',
    birth: 'c. 535 CE',
    death: 'c. 619 CE',
    fatherId: 'abd-al-muttalib',
    motherId: 'fatima-bint-amr',
    spouseIds: [
      'fatima-bint-asad'
    ],
    tags: [
      'uncle'
    ],
    notes: 'Given name ʿAbd Manaf. Raised the Prophet after ʿAbd al-Muttalib died and shielded him through the Meccan persecution and the boycott of the Banu Hashim.'
  },
  {
    id: 'fatima-bint-asad',
    name: 'Fatima bint Asad',
    gender: 'f',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'abu-talib'
    ],
    tags: [
      'matriarch'
    ],
    notes: 'Mother of ʿAli. An early emigrant to Madina.'
  },
  {
    id: 'hamza',
    name: 'Hamza',
    nameUr: 'حمزہ',
    title: 'Lion of God, Chief of the Martyrs',
    titleUr: 'اسد اللہ، سیدالشہداء',
    gender: 'm',
    death: '3 AH / 625 CE',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle',
      'companion'
    ],
    notes: 'Foster-brother as well as uncle of the Prophet. Killed at the battle of Uhud.'
  },
  {
    id: 'al-abbas',
    name: 'al-ʿAbbas',
    nameUr: 'العباس',
    gender: 'm',
    birth: 'c. 566 CE',
    death: 'c. 32 AH / 653 CE',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [
      'umm-al-fadl'
    ],
    tags: [
      'uncle',
      'companion'
    ],
    notes: 'Held the pilgrims’ water rights at Mecca. Ancestor of the Abbasid caliphs.'
  },
  {
    id: 'umm-al-fadl',
    name: 'Umm al-Fadl Lubaba',
    gender: 'f',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'al-abbas'
    ],
    tags: [
      'matriarch',
      'companion'
    ],
    notes: 'Sister of Maymuna bint al-Harith, and among the earliest women to accept Islam.'
  },
  {
    id: 'abu-lahab',
    name: 'Abu Lahab',
    nameUr: 'ابو لہب',
    gender: 'm',
    death: '2 AH / 624 CE',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle'
    ],
    notes: 'Given name ʿAbd al-ʿUzza. Opposed the Prophet’s mission; named in Surat al-Masad.'
  },
  {
    id: 'al-muqawwim',
    name: 'al-Muqawwim',
    gender: 'm',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle'
    ]
  },
  {
    id: 'al-ghaydaq',
    name: 'al-Ghaydaq',
    gender: 'm',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle'
    ],
    notes: 'Bynamed for his generosity; the sources record little else.'
  },
  {
    id: 'dirar',
    name: 'Dirar',
    gender: 'm',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'uncle'
    ]
  },
  {
    id: 'safiyya-bint-am',
    name: 'Safiyya',
    nameUr: 'صفیہ',
    gender: 'f',
    death: 'c. 20 AH / 641 CE',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt',
      'companion'
    ],
    notes: 'Full sister of Hamza, and mother of al-Zubayr ibn al-ʿAwwam. Defended the fortress at the battle of the Trench.'
  },
  {
    id: 'atika',
    name: 'ʿAtika',
    gender: 'f',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt'
    ]
  },
  {
    id: 'arwa',
    name: 'Arwa',
    gender: 'f',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt'
    ]
  },
  {
    id: 'umayma',
    name: 'Umayma',
    gender: 'f',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt'
    ],
    notes: 'Mother of Zaynab bint Jahsh, who later married the Prophet.'
  },
  {
    id: 'barra',
    name: 'Barra',
    gender: 'f',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt'
    ]
  },
  {
    id: 'umm-hakim',
    name: 'Umm Hakim al-Baydaʾ',
    gender: 'f',
    fatherId: 'abd-al-muttalib',
    motherId: null,
    spouseIds: [],
    tags: [
      'aunt'
    ],
    notes: 'Twin sister of ʿAbd Allah, the Prophet’s father.'
  },
  {
    id: 'muhammad',
    name: 'Muhammad',
    nameUr: 'محمد ﷺ',
    title: 'Messenger of God',
    titleUr: 'رسول اللہ',
    gender: 'm',
    birth: 'c. 570 CE',
    death: '11 AH / 632 CE',
    fatherId: 'abdullah',
    motherId: 'amina',
    spouseIds: [
      'khadija',
      'sawda',
      'aisha',
      'hafsa',
      'zaynab-bint-khuzayma',
      'umm-salama',
      'zaynab-bint-jahsh',
      'juwayriya',
      'umm-habiba',
      'safiyya-bint-huyayy',
      'maymuna',
      'maria'
    ],
    tags: [
      'prophet'
    ],
    notes: 'Born in Mecca in the Year of the Elephant, orphaned young, raised by ʿAbd al-Muttalib and then Abu Talib. Received revelation at about forty, emigrated to Madina in 622 CE, and died there in 11 AH.'
  },
  {
    id: 'khadija',
    name: 'Khadija bint Khuwaylid',
    nameUr: 'خدیجہ',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    birth: 'c. 555 CE',
    death: 'c. 619 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'A merchant of Quraysh and the Prophet’s first wife, married about 595 CE, and the first person to believe in his message. Mother of all his children but Ibrahim. He took no other wife in her lifetime.'
  },
  {
    id: 'sawda',
    name: 'Sawda bint Zamʿa',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 54 AH / 674 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'An emigrant to Abyssinia, widowed there. Married the Prophet after Khadija’s death.'
  },
  {
    id: 'aisha',
    name: 'ʿAʾisha bint Abi Bakr',
    nameUr: 'عائشہ',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: '58 AH / 678 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Daughter of Abu Bakr al-Siddiq. One of the most prolific transmitters of hadith, and a jurist consulted by the Companions for decades after the Prophet’s death.'
  },
  {
    id: 'hafsa',
    name: 'Hafsa bint ʿUmar',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 45 AH / 665 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Daughter of ʿUmar ibn al-Khattab. The first written collection of the Qurʾan was kept in her custody.'
  },
  {
    id: 'zaynab-bint-khuzayma',
    name: 'Zaynab bint Khuzayma',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 4 AH / 625 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Called Umm al-Masakin, "mother of the poor", for her charity. Died a few months after the marriage.'
  },
  {
    id: 'umm-salama',
    name: 'Umm Salama (Hind bint Abi Umayya)',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 62 AH / 681 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Emigrated twice, to Abyssinia and to Madina. Her counsel at al-Hudaybiya resolved the crisis among the Companions.'
  },
  {
    id: 'zaynab-bint-jahsh',
    name: 'Zaynab bint Jahsh',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 20 AH / 641 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'The Prophet’s cousin, daughter of his aunt Umayma. Known for working with her hands and giving away the proceeds.'
  },
  {
    id: 'juwayriya',
    name: 'Juwayriya bint al-Harith',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 56 AH / 676 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Daughter of the chief of the Banu al-Mustaliq. On her marriage the Companions freed their captives from her tribe as the Prophet’s new in-laws.'
  },
  {
    id: 'umm-habiba',
    name: 'Umm Habiba (Ramla bint Abi Sufyan)',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 44 AH / 665 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Daughter of Abu Sufyan. Emigrated to Abyssinia, where she was widowed; the Negus concluded her marriage to the Prophet in absentia.'
  },
  {
    id: 'safiyya-bint-huyayy',
    name: 'Safiyya bint Huyayy',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 50 AH / 670 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'Of the Banu al-Nadir, descended from Harun. Freed after Khaybar, and her freedom was her dower.'
  },
  {
    id: 'maymuna',
    name: 'Maymuna bint al-Harith',
    title: 'Mother of the Believers',
    titleUr: 'امّ المؤمنین',
    gender: 'f',
    death: 'c. 51 AH / 671 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'The last woman the Prophet married, in 7 AH. Sister of Umm al-Fadl, wife of al-ʿAbbas.'
  },
  {
    id: 'maria',
    name: 'Maria al-Qibtiyya',
    gender: 'f',
    death: 'c. 16 AH / 637 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'muhammad'
    ],
    tags: [
      'wife'
    ],
    notes: 'A Copt of Egypt, sent to the Prophet by the Muqawqis and freed by him. Mother of Ibrahim. The sources differ over whether to count her among the wives.'
  },
  {
    id: 'qasim',
    name: 'al-Qasim',
    gender: 'm',
    death: 'c. 605 CE',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [],
    tags: [
      'child'
    ],
    notes: 'The eldest son; the Prophet’s kunya Abu al-Qasim is taken from him. Died in infancy.'
  },
  {
    id: 'zaynab-bint-muhammad',
    name: 'Zaynab',
    gender: 'f',
    birth: 'c. 600 CE',
    death: '8 AH / 629 CE',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [
      'abu-al-as'
    ],
    tags: [
      'child'
    ],
    notes: 'The eldest daughter. Remained in Mecca apart from her husband; they were reunited when he accepted Islam years later.'
  },
  {
    id: 'abu-al-as',
    name: 'Abu al-ʿAs ibn al-Rabiʿ',
    gender: 'm',
    death: '12 AH / 634 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'zaynab-bint-muhammad'
    ],
    tags: [
      'in-law'
    ],
    notes: 'Captured at Badr and released; accepted Islam before the conquest of Mecca.'
  },
  {
    id: 'ruqayya',
    name: 'Ruqayya',
    gender: 'f',
    death: '2 AH / 624 CE',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [
      'uthman'
    ],
    tags: [
      'child'
    ],
    notes: 'Emigrated to Abyssinia and then Madina with ʿUthman. Died while he nursed her, during the battle of Badr.'
  },
  {
    id: 'umm-kulthum-bint-muhammad',
    name: 'Umm Kulthum',
    gender: 'f',
    death: '9 AH / 630 CE',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [
      'uthman'
    ],
    tags: [
      'child'
    ],
    notes: 'Married ʿUthman after Ruqayya’s death, for which he was called Dhu al-Nurayn, "possessor of the two lights".'
  },
  {
    id: 'uthman',
    name: 'ʿUthman ibn ʿAffan',
    title: 'Third Caliph',
    titleUr: 'تیسرے خلیفہ',
    gender: 'm',
    death: '35 AH / 656 CE',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'ruqayya',
      'umm-kulthum-bint-muhammad'
    ],
    tags: [
      'in-law',
      'companion'
    ],
    notes: 'Oversaw the compilation of the Qurʾan into a single authoritative codex.'
  },
  {
    id: 'abdullah-b-muhammad',
    name: 'ʿAbd Allah',
    gender: 'm',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [],
    tags: [
      'child'
    ],
    notes: 'Also called al-Tayyib and al-Tahir. Died in infancy.'
  },
  {
    id: 'fatima',
    name: 'Fatima al-Zahraʾ',
    nameUr: 'فاطمہ الزہراء',
    title: 'Mistress of the women of Paradise',
    titleUr: 'سیدۃ نساء اہلِ جنت',
    gender: 'f',
    birth: 'c. 605 CE',
    death: '11 AH / 632 CE',
    fatherId: 'muhammad',
    motherId: 'khadija',
    spouseIds: [
      'ali'
    ],
    tags: [
      'child'
    ],
    notes: 'The youngest daughter, and the only child to outlive the Prophet, by about six months. Every living descendant of the Prophet traces to her.'
  },
  {
    id: 'ibrahim',
    name: 'Ibrahim',
    gender: 'm',
    birth: '8 AH / 630 CE',
    death: '10 AH / 632 CE',
    fatherId: 'muhammad',
    motherId: 'maria',
    spouseIds: [],
    tags: [
      'child'
    ],
    notes: 'Died before his second year. The Prophet wept at his death, and refused to let an eclipse that day be read as a sign for it.'
  },
  {
    id: 'ali',
    name: 'ʿAli ibn Abi Talib',
    nameUr: 'علی',
    title: 'Fourth Caliph',
    titleUr: 'چوتھے خلیفہ',
    gender: 'm',
    birth: 'c. 600 CE',
    death: '40 AH / 661 CE',
    fatherId: 'abu-talib',
    motherId: 'fatima-bint-asad',
    spouseIds: [
      'fatima'
    ],
    tags: [
      'in-law',
      'companion'
    ],
    notes: 'Cousin of the Prophet, raised in his household, and among the first to believe. Married Fatima in 2 AH.'
  },
  {
    id: 'hasan',
    name: 'al-Hasan',
    nameUr: 'الحسن',
    gender: 'm',
    birth: '3 AH / 625 CE',
    death: 'c. 50 AH / 670 CE',
    fatherId: 'ali',
    motherId: 'fatima',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'Took the caliphate after ʿAli, then ceded it to Muʿawiya to stop the fighting between Muslims. Ancestor of the sharif houses.'
  },
  {
    id: 'husayn',
    name: 'al-Husayn',
    nameUr: 'الحسین',
    gender: 'm',
    birth: '4 AH / 626 CE',
    death: '61 AH / 680 CE',
    fatherId: 'ali',
    motherId: 'fatima',
    spouseIds: [
      'shahrbanu'
    ],
    tags: [
      'grandchild'
    ],
    notes: 'Killed with his household at Karbalaʾ on 10 Muharram 61 AH. Ancestor of the sayyid houses.'
  },
  {
    id: 'shahrbanu',
    name: 'Shahrbanu',
    gender: 'f',
    fatherId: null,
    motherId: null,
    spouseIds: [
      'husayn'
    ],
    tags: [
      'in-law'
    ],
    notes: 'Named in later tradition as a Sasanian princess and mother of ʿAli Zayn al-ʿAbidin; historians debate the identification.'
  },
  {
    id: 'muhsin',
    name: 'Muhsin',
    gender: 'm',
    fatherId: 'ali',
    motherId: 'fatima',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'Died in infancy, or before birth, according to the reports.'
  },
  {
    id: 'zaynab-bint-ali',
    name: 'Zaynab bint ʿAli',
    gender: 'f',
    death: 'c. 62 AH / 682 CE',
    fatherId: 'ali',
    motherId: 'fatima',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'Survived Karbalaʾ and confronted the Umayyad court at Kufa and Damascus over the killing of her brother.'
  },
  {
    id: 'umm-kulthum-bint-ali',
    name: 'Umm Kulthum bint ʿAli',
    gender: 'f',
    fatherId: 'ali',
    motherId: 'fatima',
    spouseIds: [],
    tags: [
      'grandchild'
    ]
  },
  {
    id: 'umama',
    name: 'Umama bint Zaynab',
    gender: 'f',
    fatherId: 'abu-al-as',
    motherId: 'zaynab-bint-muhammad',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'The Prophet would carry her on his shoulder while leading prayer, setting her down when he prostrated.'
  },
  {
    id: 'ali-b-abi-al-as',
    name: 'ʿAli ibn Abi al-ʿAs',
    gender: 'm',
    fatherId: 'abu-al-as',
    motherId: 'zaynab-bint-muhammad',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'Died young.'
  },
  {
    id: 'abdullah-b-uthman',
    name: 'ʿAbd Allah ibn ʿUthman',
    gender: 'm',
    death: '4 AH / 626 CE',
    fatherId: 'uthman',
    motherId: 'ruqayya',
    spouseIds: [],
    tags: [
      'grandchild'
    ],
    notes: 'Died at about six years old.'
  },
  {
    id: 'zayn-al-abidin',
    name: 'ʿAli Zayn al-ʿAbidin',
    gender: 'm',
    birth: 'c. 38 AH / 659 CE',
    death: 'c. 95 AH / 713 CE',
    fatherId: 'husayn',
    motherId: 'shahrbanu',
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Survived Karbalaʾ through illness. A major transmitter of hadith; the supplications of al-Sahifa al-Sajjadiyya are ascribed to him.'
  },
  {
    id: 'ali-al-akbar',
    name: 'ʿAli al-Akbar',
    gender: 'm',
    death: '61 AH / 680 CE',
    fatherId: 'husayn',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Killed at Karbalaʾ alongside his father.'
  },
  {
    id: 'sukayna',
    name: 'Sukayna bint al-Husayn',
    gender: 'f',
    death: 'c. 117 AH / 735 CE',
    fatherId: 'husayn',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'A figure of Madinan literary life, remembered for her poetry gatherings.'
  },
  {
    id: 'fatima-bint-husayn',
    name: 'Fatima bint al-Husayn',
    gender: 'f',
    fatherId: 'husayn',
    motherId: null,
    spouseIds: [
      'hasan-al-muthanna'
    ],
    tags: [
      'descendant'
    ],
    notes: 'Married her cousin al-Hasan al-Muthanna, joining the two houses.'
  },
  {
    id: 'muhammad-al-baqir',
    name: 'Muhammad al-Baqir',
    gender: 'm',
    birth: 'c. 57 AH / 677 CE',
    death: 'c. 114 AH / 732 CE',
    fatherId: 'zayn-al-abidin',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'His mother was Fatima bint al-Hasan, so he descends from both grandsons of the Prophet. A leading jurist of Madina.'
  },
  {
    id: 'zayd-b-ali',
    name: 'Zayd ibn ʿAli',
    gender: 'm',
    death: '122 AH / 740 CE',
    fatherId: 'zayn-al-abidin',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Rose against the Umayyads at Kufa and was killed. The Zaydi school takes its name from him.'
  },
  {
    id: 'jafar-al-sadiq',
    name: 'Jaʿfar al-Sadiq',
    gender: 'm',
    birth: 'c. 83 AH / 702 CE',
    death: '148 AH / 765 CE',
    fatherId: 'muhammad-al-baqir',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'One of the most influential jurists of his generation; Abu Hanifa and Malik ibn Anas both narrated from him.'
  },
  {
    id: 'hasan-al-muthanna',
    name: 'al-Hasan al-Muthanna',
    gender: 'm',
    death: 'c. 97 AH / 715 CE',
    fatherId: 'hasan',
    motherId: null,
    spouseIds: [
      'fatima-bint-husayn'
    ],
    tags: [
      'descendant'
    ],
    notes: 'Wounded at Karbalaʾ and spared.'
  },
  {
    id: 'zayd-b-hasan',
    name: 'Zayd ibn al-Hasan',
    gender: 'm',
    death: 'c. 120 AH / 738 CE',
    fatherId: 'hasan',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Administered the Prophet’s endowments in Madina.'
  },
  {
    id: 'abdullah-al-mahd',
    name: 'ʿAbd Allah al-Mahd',
    gender: 'm',
    death: '145 AH / 762 CE',
    fatherId: 'hasan-al-muthanna',
    motherId: 'fatima-bint-husayn',
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Called al-Mahd, "of pure descent", being Hasanid on both sides. Died in Abbasid custody.'
  },
  {
    id: 'nafs-al-zakiyya',
    name: 'Muhammad al-Nafs al-Zakiyya',
    gender: 'm',
    death: '145 AH / 762 CE',
    fatherId: 'abdullah-al-mahd',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: '"The Pure Soul". Led a rising at Madina against al-Mansur and was killed.'
  },
  {
    id: 'idris-i',
    name: 'Idris ibn ʿAbd Allah',
    gender: 'm',
    death: '175 AH / 791 CE',
    fatherId: 'abdullah-al-mahd',
    motherId: null,
    spouseIds: [],
    tags: [
      'descendant'
    ],
    notes: 'Escaped the defeat at Fakhkh to the Maghrib and founded the Idrisid state and the city of Fez; ancestor of the Moroccan sharifs.'
  }
];

export function buildSampleTree(): Tree {
  const now = new Date().toISOString();
  return {
    id: SAMPLE_TREE_ID,
    name: 'Ahl al-Bayt',
    nameUr: 'اہلِ بیت',
    note: 'The lineage of Prophet Muhammad ﷺ, from ʿAdnan onward. The chain to ʿAdnan is agreed by Ibn Ishaq, Ibn Saʿd and al-Tabari; ancestry above ʿAdnan is disputed and is omitted. Dates are approximate.',
    rootId: 'abd-al-muttalib',
    focusId: 'muhammad',
    createdAt: now,
    updatedAt: now,
    isSample: true,
    people: SAMPLE_PEOPLE.map((p) => ({ ...p, spouseIds: [...p.spouseIds] })),
  };
}
