import { useState, useRef, useEffect, useCallback } from 'react'

const MAP = { 1: ".,?!'-@_:;()/1", 2: 'abc2', 3: 'def3', 4: 'ghi4', 5: 'jkl5', 6: 'mno6', 7: 'pqrs7', 8: 'tuv8', 9: 'wxyz9', 0: ' 0' }
const SYMBOLS = [..."., ?!'\"-_@#$%&*+=/\\:;()<>[]{}~^|".replace(' ', '')]
const SHORT = ['Ami pouchhe gesi, tumi kothay?', 'Mama, 500 taka pathaisi. Bkash e dekh!', 'Happy birthday! Allah tomar mongol koruk.', 'Class 2 tay hobe, ROOM 105 e ay @ 10am', 'Ma bolse: bazar theke dim ante!']
const LONG = [
  'Assalamu alaikum, ami ekhon bus e achi. Raat 9 tar moddhe bari pouchhe jabo, ma ke bole dio.',
  'Bhai kal sokale cricket khelte jabi? Sobai ashbe @ 8am. Ball ami ante bhulbo na, tui bat niye aish.',
]
const RANKS = [[30, 'Nokia 1100 Legend'], [20, 'Symphony Pro'], [12, 'Bus Stand Texter'], [0, 'Notun Shikhar']]
const rank = (w) => RANKS.find(([m]) => w >= m)[1]
const pick = (a) => a[Math.floor(Math.random() * a.length)]
const TIMEOUT = 1000, HOLD = 500, MODES = ['ABC', 'Abc', 'abc', '123']
const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '*', '0', '#']

const applyCase = (c, m, t) => {
  if (m === '123' || !/[a-z]/i.test(c)) return c
  if (m === 'ABC') return c.toUpperCase()
  if (m === 'abc') return c.toLowerCase()
  return /(^|[.?!] )$/.test(t) ? c.toUpperCase() : c.toLowerCase()
}
const sub = (k, m) => { const s = MAP[k].replace(/\d/g, ''); return m === 'ABC' ? s.toUpperCase() : s }

const Signal = () => <svg width="14" height="12" viewBox="0 0 14 12" fill="currentColor"><rect y="8" width="2" height="4"/><rect x="4" y="5" width="2" height="7"/><rect x="8" y="2" width="2" height="10"/><rect x="12" width="2" height="12"/></svg>
const Battery = () => <svg width="21" height="11" viewBox="0 0 21 11" fill="none" stroke="currentColor"><rect x=".5" y=".5" width="17" height="10" rx="2"/><rect x="2.5" y="2.5" width="11" height="6" fill="currentColor" stroke="none"/><rect x="19" y="3" width="2" height="5" fill="currentColor" stroke="none"/></svg>
const Voicemail = () => <svg width="20" height="10" viewBox="0 0 20 10" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="5" cy="5" r="3"/><circle cx="15" cy="5" r="3"/><path d="M5 8h10"/></svg>
const Space = () => <svg width="18" height="10" viewBox="0 0 18 10" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M2 2v5h14V2"/></svg>

export default function App() {
  const [theme, setTheme] = useState('color')
  const [mode, setMode] = useState('short')
  const [textMode, setTextMode] = useState('Abc')
  const [target, setTarget] = useState(() => pick(SHORT))
  const [text, setText] = useState('')
  const [pend, setPend] = useState(null)
  const [taps, setTaps] = useState(0)
  const [now, setNow] = useState(0)
  const [result, setResult] = useState(null)
  const [msg, setMsg] = useState('')
  const [picker, setPicker] = useState(false)
  const [symIdx, setSymIdx] = useState(0)
  const [flash, setFlash] = useState(0)
  const [switches, setSwitches] = useState(0)
  const start = useRef(null), pendRef = useRef(null), timer = useRef(), lock = useRef(false)
  const textRef = useRef(''), modeRef = useRef('Abc'), targetRef = useRef(target), tapsRef = useRef(0)
  const hold = useRef({ t: null, fired: false })
  const challenge = Number(new URLSearchParams(location.search).get('c')) || 0
  const color = theme === 'color'

  const put = useCallback((fn) => { textRef.current = fn(textRef.current); setText(textRef.current) }, [])

  const commit = useCallback(() => {
    clearTimeout(timer.current)
    const p = pendRef.current
    if (!p) return
    pendRef.current = null; setPend(null)
    put((t) => t + applyCase(MAP[p.k][p.i], modeRef.current, t))
  }, [put])

  const finish = useCallback(() => {
    if (lock.current || !start.current) return
    lock.current = true
    const t = textRef.current, tg = targetRef.current
    const secs = Math.max(1, (Date.now() - start.current) / 1000)
    const right = [...tg].filter((c, i) => t[i] === c).length
    const wpm = Math.round(((right / 5) / (secs / 60)) * 10) / 10
    setResult({ wpm, acc: Math.round((right / tg.length) * 100), taps: tapsRef.current, secs: Math.round(secs), rank: rank(wpm) })
  }, [])

  const bump = () => { if (!start.current) start.current = Date.now(); tapsRef.current += 1; setTaps(tapsRef.current) }

  const cycleMode = useCallback(() => {
    commit()
    const n = MODES[(MODES.indexOf(modeRef.current) + 1) % MODES.length]
    modeRef.current = n; setTextMode(n); setSwitches((s) => s + 1); setFlash((f) => f + 1)
  }, [commit])

  const openPicker = useCallback(() => { commit(); setSymIdx(0); setPicker(true) }, [commit])

  const insertSymbol = useCallback((s) => { if (lock.current) return; bump(); commit(); put((t) => t + s); setPicker(false) }, [commit, put])

  const nav = useCallback((dx, dy) => setSymIdx((i) => Math.min(SYMBOLS.length - 1, Math.max(0, i + dx + dy * 4))), [])

  const press = useCallback((k) => {
    if (lock.current) return
    bump()
    if (k === '*') {
      if (pendRef.current) { pendRef.current = null; setPend(null); clearTimeout(timer.current) }
      else put((t) => t.slice(0, -1))
      return
    }
    if (k === '#') return commit()
    if (modeRef.current === '123') { commit(); put((t) => t + k); return }
    clearTimeout(timer.current)
    const p = pendRef.current
    let np
    if (p && p.k === k) np = { k, i: (p.i + 1) % MAP[k].length, n: p.n + 1 }
    else { commit(); np = { k, i: 0, n: 0 } }
    pendRef.current = np; setPend(np)
    timer.current = setTimeout(commit, TIMEOUT)
  }, [commit, put])

  const startHold = useCallback((k) => {
    const h = hold.current
    clearTimeout(h.t); h.fired = false
    h.t = setTimeout(() => { h.fired = true; k === '#' ? cycleMode() : openPicker() }, HOLD)
  }, [cycleMode, openPicker])
  const endHold = useCallback((k, act = true) => {
    const h = hold.current
    clearTimeout(h.t)
    if (act && !h.fired) press(k)
    h.fired = false
  }, [press])

  useEffect(() => {
    const down = (e) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (picker) {
        e.preventDefault()
        const k = e.key
        if (k === 'Escape' || k === '*') setPicker(false)
        else if (k === 'Enter' || k === '5' || k === '#') insertSymbol(SYMBOLS[symIdx])
        else if (k === 'ArrowUp' || k === '2') nav(0, -1)
        else if (k === 'ArrowDown' || k === '8') nav(0, 1)
        else if (k === 'ArrowLeft' || k === '4') nav(-1, 0)
        else if (k === 'ArrowRight' || k === '6') nav(1, 0)
        return
      }
      if (e.repeat) return
      if (/^[0-9]$/.test(e.key)) press(e.key)
      else if (e.key === 'Backspace') press('*')
      else if (e.key === 'Enter' || e.key === '#') startHold('#')
      else if (e.key === '*') startHold('*')
    }
    const up = (e) => {
      if (picker) return
      if (e.key === 'Enter' || e.key === '#') endHold('#')
      else if (e.key === '*') endHold('*')
    }
    addEventListener('keydown', down); addEventListener('keyup', up)
    return () => { removeEventListener('keydown', down); removeEventListener('keyup', up) }
  }, [picker, symIdx, press, startHold, endHold, insertSymbol, nav])

  useEffect(() => {
    if (start.current && !result) { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i) }
  }, [taps, result])

  useEffect(() => { if (!pend && text.length >= target.length) finish() }, [text, pend, target, finish])

  const reset = (m = mode) => {
    clearTimeout(timer.current); clearTimeout(hold.current.t)
    pendRef.current = null; start.current = null; lock.current = false; tapsRef.current = 0
    const t = m === 'short' ? pick(SHORT) : pick(LONG)
    targetRef.current = t; textRef.current = ''; modeRef.current = 'Abc'
    setMode(m); setTarget(t); setText(''); setPend(null); setTaps(0); setResult(null); setMsg('')
    setTextMode('Abc'); setSwitches(0); setPicker(false); setSymIdx(0)
  }

  const keyProps = (k) => {
    const holdKey = k === '#' || k === '*'
    return {
      onPointerDown: (e) => { e.preventDefault(); holdKey ? startHold(k) : press(k) },
      onPointerUp: () => holdKey && endHold(k),
      onPointerLeave: () => holdKey && endHold(k, false),
      onPointerCancel: () => holdKey && endHold(k, false),
    }
  }

  const typed = text + (pend ? applyCase(MAP[pend.k][pend.i], textMode, text) : '')
  const pendChar = pend ? applyCase(MAP[pend.k][pend.i], textMode, text) : ''
  const secs = start.current && !result ? Math.round((now - start.current) / 1000) : 0
  const link = result ? `${location.origin}${location.pathname}?c=${Math.round(result.wpm)}` : ''
  const shareText = result ? `Ami Nokia keypad e ${result.wpm} WPM e SMS likhlam (${result.rank}). Tumi parbe beat korte?` : ''

  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: 'Nokia SMS Typing Test', text: shareText, url: link })
      else { await navigator.clipboard.writeText(`${shareText} ${link}`); setMsg('Link copied') }
    } catch { /* cancelled */ }
  }

  const download = () => {
    const c = document.createElement('canvas'); c.width = 1080; c.height = 1080
    const g = c.getContext('2d'); g.textAlign = 'center'
    const F = (s, f) => { g.font = `${s}px ${f}` }
    if (color) {
      g.fillStyle = '#0b0c0f'; g.fillRect(0, 0, 1080, 1080)
      g.fillStyle = '#fff'; g.fillRect(90, 130, 900, 700)
      g.fillStyle = '#1f6fb2'; g.fillRect(90, 130, 900, 90)
      g.fillStyle = '#fff'; F(40, '"Chakra Petch", sans-serif'); g.fillText('NOKIA SMS TYPING TEST', 540, 190)
      g.fillStyle = '#1f6fb2'; F(260, '"Chakra Petch", sans-serif'); g.fillText(String(result.wpm), 540, 520)
      F(54, '"Chakra Petch", sans-serif'); g.fillText(`WPM  ·  ${result.acc}% accurate`, 540, 620)
      g.fillStyle = '#222'; F(60, '"Chakra Petch", sans-serif'); g.fillText(result.rank, 540, 740)
      g.fillStyle = '#e8eef5'; F(44, '"Chakra Petch", sans-serif'); g.fillText('Tumi parbe beat korte?', 540, 940)
    } else {
      g.fillStyle = '#14202e'; g.fillRect(0, 0, 1080, 1080)
      g.fillStyle = '#9fc23a'; g.fillRect(90, 160, 900, 620)
      g.fillStyle = '#1b2a0a'
      F(48, '"DotGothic16", monospace'); g.fillText('NOKIA SMS TYPING TEST', 540, 260)
      F(240, '"DotGothic16", monospace'); g.fillText(String(result.wpm), 540, 520)
      F(56, '"DotGothic16", monospace'); g.fillText(`WPM  ·  ${result.acc}% accurate`, 540, 610); g.fillText(result.rank, 540, 710)
      g.fillStyle = '#e8eef5'; F(44, '"Chakra Petch", sans-serif'); g.fillText('Tumi parbe beat korte?', 540, 890)
    }
    const a = document.createElement('a'); a.download = 'my-sms-score.png'; a.href = c.toDataURL('image/png'); a.click()
  }

  const screen = (
    <div className="screen">
      <div className="bar">
        <span className="bl">{color && <Signal />}<b key={flash} className="chip">{textMode}</b></span>
        <span className="br">{secs}s · {taps} taps{color && <Battery />}</span>
      </div>
      {color && <div className="title">Write message</div>}
      <p className="target">
        {[...target].map((c, i) => (
          <span key={i} className={i < typed.length ? (typed[i] === c ? 'ok' : 'bad') : i === typed.length ? 'cur' : ''}>{c}</span>
        ))}
      </p>
      <p className="typed">{text}{pend && <u key={pend.n + pend.k}>{pendChar}</u>}<i /></p>
      <div className="foot">
        <span>{color ? 'New' : `${typed.length}/${target.length}`}</span>
        {pend ? <b key={taps} className="tbar" /> : color ? <span>{typed.length}/{target.length}</span> : null}
        <span>{color ? 'Clear' : pend ? 'Next ›' : 'Options'}</span>
      </div>
      {picker && (
        <div className="picker">
          <div className="sgrid">
            {SYMBOLS.map((s, i) => (
              <button key={s + i} className={i === symIdx ? 'sel' : ''} onClick={() => insertSymbol(s)}>{s}</button>
            ))}
          </div>
          <div className="shint">{color ? 'D-pad move · centre select · end cancel' : '2/8/4/6 move · 5 select · * cancel'}</div>
        </div>
      )}
    </div>
  )

  const keypad = KEYS.map((k) => (
    <button key={k} className="k" aria-label={`key ${k}`} {...keyProps(k)}>
      <b>{k}</b>
      <small>
        {color
          ? (k === '1' ? <Voicemail /> : k === '*' ? '+' : k === '0' ? <Space /> : k === '#' ? '⇧' : sub(k, textMode))
          : (k === '1' ? '.,?!' : k === '0' ? 'space' : k === '*' ? 'del' : k === '#' ? 'next' : sub(k, textMode))}
      </small>
      {!color && k === '#' && <em>hold: mode</em>}
      {!color && k === '*' && <em>hold: symbols</em>}
    </button>
  ))

  return (
    <main className="stage">
      <button className="theme-toggle" onClick={() => setTheme(color ? 'classic' : 'color')}>{color ? 'Classic green' : 'Color 2700'}</button>

      <section className={`phone t-${theme}`}>
        {color ? (
          <div className="shell">
            <i className="slit" />
            <div className="word">NOKIA</div>
            {screen}
            <div className="nav">
              <div className="sc">
                <button className="dash" aria-label="New SMS" onClick={() => reset()} />
                <button className="call green" aria-label="Send" onClick={finish}>
                  <svg viewBox="0 0 34 22" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M4 16c0-9 26-9 26 0M4 12v4M30 12v4"/></svg>
                </button>
              </div>
              <div className="dpad">
                <button className="z zu" aria-label="up" onClick={() => picker && nav(0, -1)} />
                <button className="z zd" aria-label="down" onClick={() => picker && nav(0, 1)} />
                <button className="z zl" aria-label="left" onClick={() => picker && nav(-1, 0)} />
                <button className="z zr" aria-label="right" onClick={() => picker && nav(1, 0)} />
                <button className="mid" aria-label="select" onClick={() => picker && insertSymbol(SYMBOLS[symIdx])} />
              </div>
              <div className="sc">
                <button className="dash" aria-label="Clear" onClick={() => press('*')} />
                <button className="call red" aria-label="End" onClick={() => reset()}>
                  <svg viewBox="0 0 34 22" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round"><circle cx="17" cy="12" r="8"/><path d="M17 6v6"/></svg>
                </button>
              </div>
            </div>
            <div className="plate"><div className="keys">{keypad}</div></div>
          </div>
        ) : (
          <>
            <div className="brand">NOKIA <span>SMS Test</span></div>
            {screen}
            <div className="soft">
              <button onClick={() => reset()}>New SMS</button>
              <button onClick={() => reset(mode === 'short' ? 'long' : 'short')}>{mode === 'short' ? 'Short' : 'Long'} ⇄</button>
            </div>
            <div className="pad">{keypad}</div>
          </>
        )}
      </section>

      <aside className="side">
        <h1>Mone ache 2-2-2?</h1>
        <p>Same key bar bar chepe letter change koro. Porer letter same key-te hole 1 second thamo, ba <b>#</b> chapo.</p>
        <p><b>Hold #</b> text mode (ABC, Abc, abc, 123). <b>Hold *</b> special characters.</p>
        {challenge > 0 && !result && <div className="chal">A friend scored {challenge} WPM. Can you beat it?</div>}
        <p className="hint">Desktop: number keys, Backspace, Enter (hold Enter = mode, hold * = symbols).</p>
        <div className="modes">
          <button className={mode === 'short' ? 'on' : ''} onClick={() => reset('short')}>Short SMS</button>
          <button className={mode === 'long' ? 'on' : ''} onClick={() => reset('long')}>Long SMS</button>
        </div>
      </aside>

      {result && (
        <div className="modal" role="dialog" aria-label="Result">
          <div className="card">
            <small>Message sent</small>
            <div className="big">{result.wpm}<span>WPM</span></div>
            <h2>{result.rank}</h2>
            <p>{result.acc}% accuracy · {result.taps} key presses · {result.secs}s</p>
            <p>Mode switches: {switches}</p>
            {challenge > 0 && <p className={result.wpm > challenge ? 'win' : 'lose'}>{result.wpm > challenge ? `You beat ${challenge} WPM` : `Friend's score: ${challenge} WPM. Try again`}</p>}
            <div className="row">
              <button className="pri" onClick={share}>Share challenge</button>
              <button onClick={download}>Save card</button>
              <button onClick={() => reset()}>Try again</button>
            </div>
            {msg && <em>{msg}</em>}
          </div>
        </div>
      )}
    </main>
  )
}
