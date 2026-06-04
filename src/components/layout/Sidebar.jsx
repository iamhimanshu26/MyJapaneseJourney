import { Link, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from './navConfig'
import { useUiPreferences } from '../../context/UiPreferencesContext'

const JA_LABELS = {
  Dashboard: 'ダッシュボード',
  'Heard New Vocab / AI Lookup': 'AI単語インテリジェンス',
  'My Discovered': 'マイ発見',
  'Review Mode': '復習モード',
  'Dokkai Analyzer': '読解アナライザー',
  'Interview Coach': '面接コーチ',
  Grammar: '文法',
  Vocabulary: '語彙',
  Kanji: '漢字',
  Analytics: '分析',
  'Learning Intelligence': '学習インテリジェンス',
  'Learning Plan': '学習プラン',
  'Learning Timeline': '学習タイムライン',
  'Knowledge Graph': '知識グラフ',
  'Kotoba Sensei': 'ことば先生',
  Settings: '設定',
}

export function Sidebar({ onNavigate }) {
  const location = useLocation()
  const { language, resolvedTheme } = useUiPreferences()
  const isDark = resolvedTheme === 'dark'

  return (
    <aside className={isDark ? 'h-full border-r border-slate-700 bg-slate-900/95 px-3 py-4' : 'h-full border-r border-slate-300 bg-white/95 px-3 py-4'}>
      <Link to="/" className="mb-6 block rounded-xl bg-gradient-to-r from-blue-500 to-violet-500 px-3 py-3 text-sm font-bold text-white">
        {language === 'ja' ? 'ことばセブン' : 'Kotoba Seven'}
      </Link>
      <nav className="space-y-1" aria-label="Sidebar navigation">
        {NAV_ITEMS.map((item) => {
          const active = location.pathname === item.path
          const label = language === 'ja' ? (JA_LABELS[item.label] || item.label) : item.label
          return (
            <Link
              key={item.path}
              to={item.path}
              onClick={onNavigate}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition ${
                active
                  ? (isDark ? 'bg-blue-500/25 text-blue-100' : 'bg-blue-500/15 text-blue-700')
                  : (isDark ? 'text-slate-200 hover:bg-slate-700 hover:text-white' : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900')
              }`}
            >
              <span aria-hidden>{item.icon}</span>
              <span>{label}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
