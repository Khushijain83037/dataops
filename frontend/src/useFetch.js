import { useState, useEffect } from 'react'

const BASE = 'https://pyth.devchauhan.com/'

export function useFetch(endpoint) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    fetch(`${BASE}${endpoint}`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then(json => { if (!cancelled) { setData(json); setLoading(false) } })
      .catch(err => {
        if (!cancelled) {
          setError(err.message || 'Backend se connect nahi ho pa raha')
          setLoading(false)
        }
      })

    return () => { cancelled = true }
  }, [endpoint])

  return { data, loading, error }
}
