import { Routes, Route, Navigate } from 'react-router-dom'
import { MainLayout } from './layouts/MainLayout'
import { Dashboard } from './pages/Dashboard'
import { Vocab } from './pages/Vocab'
import { Grammar } from './pages/Grammar'
import { Lookup } from './pages/Lookup'
import { MyDiscovered } from './pages/MyDiscovered'

function App() {
  return (
    <Routes>
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="vocab" element={<Vocab />} />
        <Route path="grammar" element={<Grammar />} />
        <Route path="lookup" element={<Lookup />} />
        <Route path="discovered" element={<MyDiscovered />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
