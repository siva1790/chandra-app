import { renderToString } from 'react-dom/server'
import BengaluruPanchang from './pages/BengaluruPanchang.jsx'
import { getBengaluruPanchang } from './bengaluruPanchang.js'

export function render(dateKey) {
  const data = getBengaluruPanchang(dateKey)
  return {
    html: renderToString(<BengaluruPanchang initialData={data} />),
    data: JSON.stringify(data).replace(/</g, '\\u003c'),
  }
}
