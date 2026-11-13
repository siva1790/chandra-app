import { renderToString } from 'react-dom/server'
import PublicLearn from './pages/PublicLearn.jsx'
export const render = () => renderToString(<PublicLearn />)
