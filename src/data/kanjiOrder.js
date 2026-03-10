/**
 * Recommended learning order for common JLPT kanji (by stroke count and frequency).
 * Kanji not in this list are appended at the end.
 */
export const KANJI_LEARNING_ORDER = [
  '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千',
  '人', '口', '日', '月', '火', '水', '木', '金', '土', '山', '川',
  '上', '下', '中', '大', '小', '本', '年', '左', '右', '子', '女',
  '学', '生', '先', '気', '何', '時', '分', '間', '今', '半',
  '行', '来', '食', '飲', '読', '書', '見', '聞', '話', '休',
  '毎', '先', '昨', '明', '朝', '晩', '友', '私', '家', '室',
  '車', '電', '駅', '門', '高', '長', '安', '新', '古', '多', '少',
  '会', '社', '働', '仕', '事', '業', '員', '者', '方', '同',
  '国', '語', '言', '意', '思', '考', '知', '理', '道', '度',
  '後', '前', '外', '内', '東', '西', '南', '北', '方',
]

export function sortKanjiByLearningOrder(items) {
  const orderMap = new Map(KANJI_LEARNING_ORDER.map((c, i) => [c, i]))
  return [...items].sort((a, b) => {
    const ai = orderMap.get(a.char) ?? 9999
    const bi = orderMap.get(b.char) ?? 9999
    if (ai !== bi) return ai - bi
    return (a.reading || '').localeCompare(b.reading || '')
  })
}
