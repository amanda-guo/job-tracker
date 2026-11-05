import { Tracker } from './components/Tracker'
import { createLocalStorageStore } from './lib/storage'

// Swap this for another ReviewStore (e.g. a database-backed one) to change where data lives.
const store = createLocalStorageStore()

export default function App() {
  return <Tracker store={store} />
}
