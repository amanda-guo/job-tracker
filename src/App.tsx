import { Route, Routes } from 'react-router'
import { AllOpportunitiesScreen } from './components/AllOpportunitiesScreen'
import { HomeScreen } from './components/HomeScreen'
import { NotFoundScreen } from './components/NotFoundScreen'
import { OpportunityDetailScreen } from './components/OpportunityDetailScreen'

/** The app's screens. The router itself is provided by the caller. */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeScreen />} />
      <Route path="/opportunities" element={<AllOpportunitiesScreen />} />
      <Route path="/opportunities/:id" element={<OpportunityDetailScreen />} />
      <Route path="*" element={<NotFoundScreen />} />
    </Routes>
  )
}
