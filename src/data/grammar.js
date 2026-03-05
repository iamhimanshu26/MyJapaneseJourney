// Seed grammar points by level (examples use 漢字(読み) format for FuriganaText)
export const GRAMMAR_N5 = [
  { id: 'n5-1', name: 'は (topic marker)', structure: 'Noun + は', meaning: 'Marks the topic of the sentence.', level: 'N5', example: '私(わたし)は学生(がくせい)です。(I am a student.)' },
  { id: 'n5-2', name: 'を (object marker)', structure: 'Noun + を + Verb', meaning: 'Marks the direct object of a verb.', level: 'N5', example: '水(みず)を飲(の)みます。(I drink water.)' },
  { id: 'n5-3', name: 'に (direction/time)', structure: 'Noun + に', meaning: 'Indicates direction, time, or target.', level: 'N5', example: '学校(がっこう)に行(い)きます。(I go to school.)' },
  { id: 'n5-4', name: 'で (location/means)', structure: 'Noun + で', meaning: 'Indicates location of action or means/method.', level: 'N5', example: '電車(でんしゃ)で行(い)きます。(I go by train.)' },
  { id: 'n5-5', name: 'です (polite copula)', structure: 'Noun/Adj + です', meaning: 'Polite form of "to be".', level: 'N5', example: '今日(きょう)は月曜日(げつようび)です。(Today is Monday.)' },
  { id: 'n5-6', name: 'ます form (polite verb)', structure: 'Verb stem + ます', meaning: 'Polite present affirmative form of verbs.', level: 'N5', example: '食(た)べます。(I eat.)' },
]

export const GRAMMAR_N4 = [
  { id: 'n4-1', name: '〜ている', structure: 'Verb-て + いる', meaning: 'Expresses ongoing action or resulting state.', level: 'N4', example: '勉強(べんきょう)しています。(I am studying.)' },
  { id: 'n4-2', name: '〜たことがある', structure: 'Verb-た + ことがある', meaning: 'Have done / have experienced.', level: 'N4', example: '日本(にほん)に行(い)ったことがあります。(I have been to Japan.)' },
  { id: 'n4-3', name: '〜ながら', structure: 'Verb stem + ながら', meaning: 'While doing ~', level: 'N4', example: '音楽(おんがく)を聞(き)きながら歩(ある)きます。(I walk while listening to music.)' },
  { id: 'n4-4', name: '〜ておく', structure: 'Verb-て + おく', meaning: 'Do in advance; leave as is.', level: 'N4', example: '予約(よやく)しておきました。(I made a reservation in advance.)' },
  { id: 'n4-5', name: '〜かもしれない', structure: 'Verb/Adj/Noun + かもしれない', meaning: 'Might, may, perhaps.', level: 'N4', example: '明日(あした)は雨(あめ)かもしれません。(It might rain tomorrow.)' },
]

export const GRAMMAR_N3 = [
  { id: 'n3-1', name: '〜らしい', structure: 'Noun + らしい', meaning: 'Seems like, typical of.', level: 'N3', example: '彼(かれ)は本当(ほんとう)に日本人(にほんじん)らしいです。(He really seems like a typical Japanese person.)' },
  { id: 'n3-2', name: '〜うちに', structure: 'Verb/Adj + うちに', meaning: 'While, before ~', level: 'N3', example: '若(わか)いうちにたくさん勉強(べんきょう)したい。(I want to study a lot while I\'m young.)' },
  { id: 'n3-3', name: '〜ばかり', structure: 'Verb-た + ばかり', meaning: 'Just did ~', level: 'N3', example: '日本(にほん)に来(き)たばかりです。(I just came to Japan.)' },
  { id: 'n3-4', name: '〜ことにする', structure: 'Verb dic. + ことにする', meaning: 'Decide to ~', level: 'N3', example: '毎日(まいにち)日本語(にほんご)を勉強(べんきょう)することにしました。(I decided to study Japanese every day.)' },
  { id: 'n3-5', name: '〜に対して', structure: 'Noun + に対して', meaning: 'Toward, regarding.', level: 'N3', example: '生徒(せいと)に対して厳(きび)しい先生(せんせい)です。(He is a strict teacher toward students.)' },
]

export const GRAMMAR_BY_LEVEL = {
  N5: GRAMMAR_N5,
  N4: GRAMMAR_N4,
  N3: GRAMMAR_N3,
  N2: [],
  N1: [],
}
