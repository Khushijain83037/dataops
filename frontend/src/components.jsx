import React from 'react'

const S = {
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--rule)',
    borderRadius: 6,
    overflow: 'hidden',
  },
  cardHead: {
    padding: '14px 18px 12px',
    borderBottom: '1px solid var(--rule2)',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: 600,
    color: 'var(--ink)',
    letterSpacing: '-0.01em',
  },
  cardSub: {
    fontSize: 11,
    color: 'var(--ink3)',
    fontFamily: 'var(--mono)',
    marginTop: 2,
  },
  cardBody: { padding: '16px 18px' },
}

export function Card({ title, subtitle, right, children, bodyStyle = {} }) {
  return (
    <div style={S.card}>
      <div style={S.cardHead}>
        <div>
          <div style={S.cardTitle}>{title}</div>
          {subtitle && <div style={S.cardSub}>{subtitle}</div>}
        </div>
        {right}
      </div>
      <div style={{ ...S.cardBody, ...bodyStyle }}>{children}</div>
    </div>
  )
}

export function LoadingState({ label = 'Loading...' }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '40px 0', gap: 10, color: 'var(--ink3)', fontSize: 12,
      fontFamily: 'var(--mono)',
    }}>
      <Spinner />
      {label}
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '20px 18px', background: '#fff5f5',
      border: '1px solid #fecaca', borderRadius: 6,
      color: '#991b1b', fontSize: 12, fontFamily: 'var(--mono)',
    }}>
      <span style={{ fontSize: 14 }}>⚠</span>
      {message || 'Something went wrong. Check if the backend is running.'}
    </div>
  )
}

function Spinner() {
  return (
    <div style={{
      width: 14, height: 14, border: '2px solid var(--rule)',
      borderTop: '2px solid var(--ink3)', borderRadius: '50%',
      animation: 'spin 0.7s linear infinite',
    }} />
  )
}

// Inject spin keyframe once
if (typeof document !== 'undefined' && !document.getElementById('spin-kf')) {
  const s = document.createElement('style')
  s.id = 'spin-kf'
  s.textContent = '@keyframes spin { to { transform: rotate(360deg) } }'
  document.head.appendChild(s)
}

export function Badge({ children, color = 'gray' }) {
  const colors = {
    green:  { background: '#dcfce7', color: '#166534' },
    red:    { background: '#fee2e2', color: '#991b1b' },
    blue:   { background: '#dbeafe', color: '#1e40af' },
    gray:   { background: '#f0ede8', color: '#4a4946' },
    amber:  { background: '#fef3c7', color: '#92400e' },
  }
  return (
    <span style={{
      display: 'inline-flex', padding: '2px 7px', borderRadius: 3,
      fontSize: 10, fontWeight: 500, fontFamily: 'var(--mono)',
      ...(colors[color] || colors.gray),
    }}>
      {children}
    </span>
  )
}

export function KpiCard({ label, value, sub, subBadge, badgeType, accentColor }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--rule)',
      borderRadius: 6, padding: '16px 18px', position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: accentColor,
      }} />
      <div style={{
        fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em',
        color: 'var(--ink3)', marginBottom: 8, fontFamily: 'var(--mono)',
      }}>
        {label}
      </div>
      <div style={{
        fontSize: 24, fontWeight: 700, color: 'var(--ink)',
        letterSpacing: '-0.03em', lineHeight: 1, marginBottom: 6,
      }}>
        {value}
      </div>
      <div style={{
        fontSize: 11, color: 'var(--ink3)', display: 'flex',
        alignItems: 'center', gap: 5,
      }}>
        {subBadge && <Badge color={badgeType}>{subBadge}</Badge>}
        {sub}
      </div>
    </div>
  )
}
