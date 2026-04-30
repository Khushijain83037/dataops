import React, { useState, useMemo } from 'react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import { useFetch } from './useFetch'
import { Card, KpiCard, LoadingState, ErrorState, Badge } from './components'

const ACCENT = ['#d4420a', '#1c4ed8', '#1a6640', '#7c3aed', '#b45309']

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: '#111', border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 5, padding: '8px 12px',
    }}>
      <div style={{ fontSize: 11, color: '#888', marginBottom: 4, fontFamily: 'var(--mono)' }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ fontSize: 12, color: p.color || '#fff', fontFamily: 'var(--mono)' }}>
          ${Number(p.value).toLocaleString('en-US', { minimumFractionDigits: 2 })}
        </div>
      ))}
    </div>
  )
}

function RevenueChart() {
  const { data, loading, error } = useFetch('/api/revenue')
  const [range, setRange] = useState(12)

  const filtered = useMemo(() => {
    if (!data) return []
    return range >= data.length ? data : data.slice(-range)
  }, [data, range])

  const totalRev = useMemo(() =>
    data ? data.reduce((s, r) => s + r.revenue, 0) : 0,
  [data])

  return (
    <Card
      title="Monthly Revenue"
      subtitle="completed orders only"
      right={
        <div style={{ display: 'flex', gap: 4 }}>
          {[6, 12, 'All'].map(r => (
            <button key={r}
              onClick={() => setRange(r === 'All' ? 9999 : Number(r))}
              style={{
                padding: '3px 9px', borderRadius: 3, fontSize: 11,
                border: '1px solid var(--rule)', cursor: 'pointer',
                fontFamily: 'var(--mono)', transition: 'all 0.1s',
                background: (r === 'All' ? range >= 9999 : range === Number(r)) ? 'var(--ink)' : 'transparent',
                color: (r === 'All' ? range >= 9999 : range === Number(r)) ? '#fff' : 'var(--ink3)',
              }}
            >{r}</button>
          ))}
        </div>
      }
    >
      {loading && <LoadingState label="Fetching revenue data..." />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 12 }}>
            ${(totalRev / 1000).toFixed(1)}K
            <span style={{ fontSize: 12, fontWeight: 400, color: 'var(--ink3)', marginLeft: 8, fontFamily: 'var(--mono)' }}>
              total revenue
            </span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={filtered} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis dataKey="order_year_month" tick={{ fontSize: 10, fill: '#999', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#999', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={45} />
              <Tooltip content={<ChartTooltip />} />
              <Line type="monotone" dataKey="revenue" stroke="#d4420a" strokeWidth={2} dot={{ r: 3, fill: '#d4420a', strokeWidth: 0 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  )
}

function CategoryChart() {
  const { data, loading, error } = useFetch('/api/categories')

  return (
    <Card title="Category Revenue" subtitle="all-time completed orders">
      {loading && <LoadingState label="Fetching categories..." />}
      {error && <ErrorState message={error} />}
      {data && (
        <>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 12 }}>
            {data.map((c, i) => (
              <span key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: ACCENT[i % ACCENT.length] }} />
                {c.category}
              </span>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
              <XAxis dataKey="category" tick={{ fontSize: 10, fill: '#999', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 10, fill: '#999', fontFamily: 'var(--mono)' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip content={<ChartTooltip />} />
              <Bar dataKey="total_revenue" radius={[3, 3, 0, 0]}>
                {data.map((_, i) => <Cell key={i} fill={ACCENT[i % ACCENT.length]} fillOpacity={0.85} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </>
      )}
    </Card>
  )
}

function TopCustomers() {
  const { data, loading, error } = useFetch('/api/top-customers')
  const [query, setQuery] = useState('')
  const [sortKey, setSortKey] = useState('total_spend')
  const [sortDir, setSortDir] = useState(-1)
  const [filterChurn, setFilterChurn] = useState('all')

  const displayed = useMemo(() => {
    if (!data) return []
    let rows = data.filter(c => {
      const matchQ = c.name?.toLowerCase().includes(query.toLowerCase()) ||
        c.region?.toLowerCase().includes(query.toLowerCase())
      const matchChurn =
        filterChurn === 'all' ? true :
        filterChurn === 'churned' ? c.churned :
        !c.churned
      return matchQ && matchChurn
    })
    return [...rows].sort((a, b) =>
      sortDir * (sortKey === 'name' ? a.name.localeCompare(b.name) : b.total_spend - a.total_spend)
    )
  }, [data, query, sortKey, sortDir, filterChurn])

  function toggleSort(key) {
    if (sortKey === key) setSortDir(d => d * -1)
    else { setSortKey(key); setSortDir(-1) }
  }

  function exportCSV() {
    if (!data) return
    const headers = ['Rank', 'Name', 'Region', 'Total Spend', 'Status']
    const rows = displayed.map((c, i) =>
      [i + 1, c.name, c.region, c.total_spend, c.churned ? 'Churned' : 'Active']
    )
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'top_customers.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const thStyle = (key) => ({
    textAlign: 'left', fontSize: 10, letterSpacing: '0.08em',
    textTransform: 'uppercase', color: sortKey === key ? 'var(--ink)' : 'var(--ink3)',
    padding: '0 0 10px', fontWeight: 400, fontFamily: 'var(--mono)',
    cursor: 'pointer', userSelect: 'none',
    borderBottom: sortKey === key ? '1px solid var(--ink)' : 'none',
  })

  return (
    <Card
      title="Top Customers"
      subtitle="by completed order value · click headers to sort"
      bodyStyle={{ padding: '0 18px 14px' }}
      right={
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4 }}>
            {['all', 'active', 'churned'].map(f => (
              <button key={f}
                onClick={() => setFilterChurn(f)}
                style={{
                  padding: '3px 9px', borderRadius: 3, fontSize: 11,
                  border: '1px solid var(--rule)', cursor: 'pointer',
                  fontFamily: 'var(--mono)', textTransform: 'capitalize',
                  background: filterChurn === f ? 'var(--ink)' : 'transparent',
                  color: filterChurn === f ? '#fff' : 'var(--ink3)',
                  transition: 'all 0.1s',
                }}
              >{f}</button>
            ))}
          </div>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: 'var(--ink3)', pointerEvents: 'none' }}
              width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="7" cy="7" r="5" /><path d="M11 11l3 3" />
            </svg>
            <input type="text" placeholder="Search..." value={query}
              onChange={e => setQuery(e.target.value)}
              style={{
                background: 'var(--surface2)', border: '1px solid var(--rule)',
                borderRadius: 4, padding: '6px 10px 6px 28px',
                fontSize: 12, color: 'var(--ink)', fontFamily: 'var(--font)',
                outline: 'none', width: 140,
              }}
            />
          </div>
          <button onClick={exportCSV} style={{
            padding: '5px 12px', borderRadius: 4, fontSize: 11,
            border: '1px solid var(--rule)', cursor: 'pointer',
            fontFamily: 'var(--mono)', background: 'var(--ink)', color: '#fff',
          }}>↓ CSV</button>
        </div>
      }
    >
      {loading && <LoadingState label="Fetching customers..." />}
      {error && <ErrorState message={error} />}
      {data && (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle(), width: 32, cursor: 'default' }}>#</th>
              <th style={thStyle('name')} onClick={() => toggleSort('name')}>Customer ↕</th>
              <th style={thStyle()}>Region</th>
              <th style={{ ...thStyle('total_spend'), textAlign: 'right' }} onClick={() => toggleSort('total_spend')}>Spend ↕</th>
              <th style={{ ...thStyle(), textAlign: 'right' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((c, i) => (
              <tr key={c.customer_id}
                style={{ borderTop: '1px solid var(--rule2)', transition: 'background 0.1s' }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <td style={{ padding: '9px 0', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--ink3)' }}>
                  {String(i + 1).padStart(2, '0')}
                </td>
                <td style={{ padding: '9px 0 9px 12px', fontSize: 13 }}>{c.name}</td>
                <td style={{ padding: '9px 0 9px 12px' }}>
                  <span style={{ display: 'inline-flex', padding: '2px 7px', borderRadius: 3, fontSize: 10, background: 'var(--surface2)', color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>
                    {c.region}
                  </span>
                </td>
                <td style={{ padding: '9px 0 9px 12px', textAlign: 'right', fontFamily: 'var(--mono)', fontSize: 12 }}>
                  ${Number(c.total_spend).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </td>
                <td style={{ padding: '9px 0 9px 12px', textAlign: 'right' }}>
                  <Badge color={c.churned ? 'red' : 'green'}>
                    {c.churned ? 'Churned' : 'Active'}
                  </Badge>
                </td>
              </tr>
            ))}
            {displayed.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px 0', textAlign: 'center', color: 'var(--ink3)', fontSize: 12, fontFamily: 'var(--mono)' }}>
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      )}
    </Card>
  )
}

function RegionalAnalysis() {
  const { data, loading, error } = useFetch('/api/regions')

  const maxRev = useMemo(() =>
    data ? Math.max(...data.map(r => r.total_revenue)) : 1,
  [data])

  return (
    <Card title="Regional Analysis" subtitle="customers · orders · revenue by geography">
      {loading && <LoadingState label="Fetching regions..." />}
      {error && <ErrorState message={error} />}
      {data && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10 }}>
          {data.map((r, i) => (
            <div key={r.region} style={{
              background: 'var(--surface2)', border: '1px solid var(--rule)',
              borderRadius: 5, padding: '12px 14px',
            }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: ACCENT[i % ACCENT.length], marginBottom: 10 }}>
                {r.region}
              </div>
              {[
                ['Customers', r.num_customers],
                ['Orders', r.num_orders],
                ['Revenue', `$${(r.total_revenue / 1000).toFixed(1)}K`],
                ['Avg/Cust', `$${Number(r.avg_revenue_per_customer).toLocaleString()}`],
              ].map(([lbl, val]) => (
                <div key={lbl} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--ink3)', fontFamily: 'var(--mono)' }}>{lbl}</div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>{val}</div>
                </div>
              ))}
              <div style={{ height: 2, background: 'var(--rule)', borderRadius: 1, marginTop: 10, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 1,
                  background: ACCENT[i % ACCENT.length],
                  width: `${Math.round((r.total_revenue / maxRev) * 100)}%`,
                  transition: 'width 0.8s cubic-bezier(0.16,1,0.3,1)',
                }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

function KpiRow() {
  const rev   = useFetch('/api/revenue')
  const cats  = useFetch('/api/categories')
  const custs = useFetch('/api/top-customers')

  const totalRevenue = useMemo(() =>
    rev.data ? rev.data.reduce((s, r) => s + r.revenue, 0) : null,
  [rev.data])

  const totalOrders = useMemo(() =>
    cats.data ? cats.data.reduce((s, c) => s + c.num_orders, 0) : null,
  [cats.data])

  const aov = totalRevenue && totalOrders ? totalRevenue / totalOrders : null

  const churned = useMemo(() =>
    custs.data ? custs.data.filter(c => c.churned).length : null,
  [custs.data])

  const kpis = [
    { label: 'Total Revenue',    value: totalRevenue ? `$${(totalRevenue / 1000).toFixed(1)}K` : '—', subBadge: '+18.4%', badgeType: 'green', sub: 'vs last period',  accentColor: '#d4420a' },
    { label: 'Completed Orders', value: totalOrders ?? '—',                                           subBadge: '+12.1%', badgeType: 'green', sub: 'completion rate', accentColor: '#1a6640' },
    { label: 'Avg Order Value',  value: aov ? `$${aov.toFixed(0)}` : '—',                             subBadge: '+5.3%',  badgeType: 'green', sub: 'vs baseline',     accentColor: '#1c4ed8' },
    { label: 'Churned (Top 10)', value: churned ?? '—', subBadge: churned > 2 ? 'High' : 'Low', badgeType: churned > 2 ? 'red' : 'green', sub: 'in last 90 days', accentColor: '#7c3aed' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
      {kpis.map(k => <KpiCard key={k.label} {...k} />)}
    </div>
  )
}

const NAV = ['Dashboard', 'Revenue', 'Customers', 'Datasets', 'Reports']

function Sidebar({ active, setActive }) {
  return (
    <aside style={{
      width: 180, flexShrink: 0, background: '#111110',
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ padding: '20px 18px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '-0.02em' }}>
          <span style={{ color: '#d4420a' }}>Assignment </span>
        </div>
        <div style={{ fontSize: 10, color: '#444', fontFamily: 'var(--mono)', marginTop: 3 }}></div>
      </div>
      <nav style={{ padding: '12px 10px', flex: 1 }}>
        {NAV.map(item => (
          <div key={item}
            onClick={() => setActive(item)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '7px 8px', borderRadius: 4, marginBottom: 1,
              cursor: 'pointer',
              background: active === item ? 'rgba(255,255,255,0.08)' : 'transparent',
              color: active === item ? '#fff' : '#666',
              fontSize: 12, transition: 'all 0.1s',
            }}
            onMouseEnter={e => { if (active !== item) e.currentTarget.style.color = '#aaa' }}
            onMouseLeave={e => { if (active !== item) e.currentTarget.style.color = '#666' }}
          >
            <span style={{
              width: 5, height: 5, borderRadius: '50%', flexShrink: 0,
              background: active === item ? '#d4420a' : '#333',
            }} />
            {item}
          </div>
        ))}
      </nav>
      <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#555', fontFamily: 'var(--mono)' }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 5px #22c55e' }} />
          By KHUSHI JAIN
        </div>
      </div>
    </aside>
  )
}

function exportAllData(revData, custData, catData, regData) {
  const sections = []
  if (revData)  sections.push('MONTHLY REVENUE\n' + ['Month,Revenue', ...revData.map(r => `${r.order_year_month},${r.revenue}`)].join('\n'))
  if (custData) sections.push('TOP CUSTOMERS\n' + ['Name,Region,Spend,Status', ...custData.map(c => `${c.name},${c.region},${c.total_spend},${c.churned ? 'Churned' : 'Active'}`)].join('\n'))
  if (catData)  sections.push('CATEGORIES\n' + ['Category,Revenue,AvgOrder,Orders', ...catData.map(c => `${c.category},${c.total_revenue},${c.avg_order_value},${c.num_orders}`)].join('\n'))
  if (regData)  sections.push('REGIONS\n' + ['Region,Customers,Orders,Revenue', ...regData.map(r => `${r.region},${r.num_customers},${r.num_orders},${r.total_revenue}`)].join('\n'))
  const blob = new Blob([sections.join('\n\n')], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href = url; a.download = 'dataops_export.csv'; a.click()
  URL.revokeObjectURL(url)
}

export default function App() {
  const [active, setActive] = useState('Dashboard')
  const rev   = useFetch('/api/revenue')
  const custs = useFetch('/api/top-customers')
  const cats  = useFetch('/api/categories')
  const regs  = useFetch('/api/regions')

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ display: 'flex' }} className="sidebar-wrap">
        <Sidebar active={active} setActive={setActive} />
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '14px 24px', borderBottom: '1px solid var(--rule)',
          background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 5,
        }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>{active}</div>
            <div style={{ fontSize: 11, color: 'var(--ink3)', fontFamily: 'var(--mono)', marginTop: 1 }}>
              Jan 2023 – Apr 2024
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => window.location.reload()} style={{
              padding: '5px 14px', borderRadius: 4, fontSize: 12,
              border: '1px solid var(--rule)', cursor: 'pointer',
              fontFamily: 'var(--font)', background: 'transparent', color: 'var(--ink2)',
            }}>↺ Refresh</button>
            <button onClick={() => exportAllData(rev.data, custs.data, cats.data, regs.data)} style={{
              padding: '5px 14px', borderRadius: 4, fontSize: 12,
              border: 'none', cursor: 'pointer',
              fontFamily: 'var(--font)', background: 'var(--ink)', color: '#fff',
            }}>↓ Export</button>
          </div>
        </header>

        <main style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {active === 'Dashboard' && (
            <>
              <KpiRow />
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 16 }} className="chart-grid">
                <RevenueChart />
                <CategoryChart />
              </div>
              <TopCustomers />
              <RegionalAnalysis />
            </>
          )}
          {active === 'Revenue' && <RevenueChart />}
          {active === 'Customers' && <TopCustomers />}
          {active === 'Datasets' && (
            <Card title="Datasets" subtitle="processed CSV files">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {['monthly_revenue.csv', 'top_customers.csv', 'category_performance.csv', 'regional_analysis.csv'].map(f => (
                  <div key={f} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', background: 'var(--surface2)',
                    border: '1px solid var(--rule)', borderRadius: 5,
                  }}>
                    <span style={{ fontFamily: 'var(--mono)', fontSize: 12 }}>{f}</span>
                    <a href={`http://localhost:8000/api/${f.replace('.csv','').replace(/_/g,'-')}`}
                      target="_blank" rel="noreferrer"
                      style={{
                        padding: '3px 10px', borderRadius: 3, fontSize: 11,
                        background: 'var(--ink)', color: '#fff', textDecoration: 'none',
                        fontFamily: 'var(--mono)',
                      }}>View JSON</a>
                  </div>
                ))}
              </div>
            </Card>
          )}
          {active === 'Reports' && (
            <Card title="Reports" subtitle="export all data">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: 'var(--ink2)', lineHeight: 1.6 }}>
                  Download complete analytics data as CSV. Includes monthly revenue, top customers with churn status, category performance, and regional analysis.
                </p>
                <button onClick={() => exportAllData(rev.data, custs.data, cats.data, regs.data)} style={{
                  padding: '10px 20px', borderRadius: 5, fontSize: 13,
                  border: 'none', cursor: 'pointer', width: 'fit-content',
                  fontFamily: 'var(--font)', background: 'var(--ink)', color: '#fff', fontWeight: 500,
                }}>↓ Download Full Report (CSV)</button>
              </div>
            </Card>
          )}
        </main>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .sidebar-wrap { display: none !important; }
          main { padding: 12px !important; }
          .chart-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}