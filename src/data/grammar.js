// Seed grammar points by level
export const GRAMMAR_N5 = [
  { id: 'n5-1', name: 'は (topic marker)', structure: 'Noun + は', meaning: 'Marks the topic of the sentence.', level: 'N5', example: '私は学生です。(I am a student.)' },
  { id: 'n5-2', name: 'を (object marker)', structure: 'Noun + を + Verb', meaning: 'Marks the direct object of a verb.', level: 'N5', example: '水を飲みます。(I drink water.)' },
  { id: 'n5-3', name: 'に (direction/time)', structure: 'Noun + に', meaning: 'Indicates direction, time, or target.', level: 'N5', example: '学校に行きます。(I go to school.)' },
  { id: 'n5-4', name: 'で (location/means)', structure: 'Noun + で', meaning: 'Indicates location of action or means/method.', level: 'N5', example: '電車で行きます。(I go by train.)' },
  { id: 'n5-5', name: 'です (polite copula)', structure: 'Noun/Adj + です', meaning: 'Polite form of "to be".', level: 'N5', example: '今日は月曜日です。(Today is Monday.)' },
  { id: 'n5-6', name: 'ます form (polite verb)', structure: 'Verb stem + ます', meaning: 'Polite present affirmative form of verbs.', level: 'N5', example: '食べます。(I eat.)' },
]

export const GRAMMAR_N4 = [
  { id: 'n4-1', name: '〜ている', structure: 'Verb-て + いる', meaning: 'Expresses ongoing action or resulting state.', level: 'N4', example: '勉強しています。(I am studying.)' },
  { id: 'n4-2', name: '〜たことがある', structure: 'Verb-た + ことがある', meaning: 'Have done / have experienced.', level: 'N4', example: '日本に行ったことがあります。(I have been to Japan.)' },
]

export const GRAMMAR_BY_LEVEL = {
  N5: GRAMMAR_N5,
  N4: GRAMMAR_N4,
  N3: [],
  N2: [],
  N1: [],
}
