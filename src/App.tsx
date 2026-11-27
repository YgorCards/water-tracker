import { useEffect, useMemo, useState } from 'react'
import { BarChart3, Check, ChevronLeft, ChevronRight, Droplet, GlassWater, Settings, Undo2, Trophy, X } from 'lucide-react'
import { collection, doc, getDoc, getDocs, setDoc } from 'firebase/firestore'
import { onAuthStateChanged, signInAnonymously } from 'firebase/auth'
import { auth, db, firebaseEnabled } from './lib/firebase'
import { localDayKey } from './lib/date'
import type { DailyRecord, UserSettings, WaterEntry } from './types'

type Tab = 'today' | 'calendar' | 'settings' | 'cup'
const defaults: UserSettings = { goalMl: 3000, bottleMl: 250, name: 'Você' }
const cupSizes = [200, 250, 350, 500]

const readSettings = (): UserSettings => {
  try { return { ...defaults, ...JSON.parse(localStorage.getItem('gota-settings') || '{}') } } catch { return defaults }
}
const readRecord = (date: string, goalMl: number): DailyRecord => {
  try {
    const value = JSON.parse(localStorage.getItem(`gota-day-${date}`) || 'null') as DailyRecord | null
    return value ? { ...value, goalMl } : { date, totalMl: 0, goalMl, entries: [] }
  } catch { return { date, totalMl: 0, goalMl, entries: [] } }
}
const formatMl = (amount: number) => amount.toLocaleString('pt-BR')

function Bottle({ progress }: { progress: number }) {
  const height = 320
  const waterTop = 463 - Math.round(Math.min(progress, 1) * 421)
  return <svg viewBox="0 0 240 500" style={{ height: `${height}px`, width: `${height * 0.48}px` }} className="max-w-full drop-shadow-[0_18px_24px_rgba(0,0,0,0.18)]" role="img" aria-label={`Garrafa com ${Math.round(progress * 100)}% da meta diária`}>
    <defs><clipPath id="bottle-inside"><path d="M94 42h52v44l18 20 24 42q9 16 9 35v260q0 20-20 20H76q-20 0-20-20V183q0-19 9-35l24-42 18-20v-44h-13z" /></clipPath></defs>
    <rect x="83" y="12" width="74" height="28" rx="7" fill="#52647c" />
    <path d="M91 38h58v48l19 22 25 43q10 17 10 40v247q0 35-34 35H71q-34 0-34-35V191q0-23 10-40l25-43 19-22z" fill="#25344a" stroke="#3a4b63" strokeWidth="3" />
    <rect x="36" y={waterTop} width="168" height="440" fill="#45a8ff" clipPath="url(#bottle-inside)" />
    <path d="M49 190h20M171 190h20M49 250h14M177 250h14M49 310h20M171 310h20M49 370h14M177 370h14" stroke="#8293a9" strokeWidth="3" strokeLinecap="round" opacity=".55" />
    <path d="M57 211h126" stroke="#87ccff" strokeWidth="3" opacity=".65" />
    <path d="M67 202v204" stroke="#ffffff" strokeWidth="5" strokeLinecap="round" opacity=".13" />
  </svg>
}

function App() {
  const [settings, setSettings] = useState<UserSettings>(readSettings)
  const [date, setDate] = useState(localDayKey())
  const [record, setRecord] = useState<DailyRecord>(() => readRecord(localDayKey(), readSettings().goalMl))
  const [tab, setTab] = useState<Tab>('today')
  const [uid, setUid] = useState<string | null>(null)
  const [firebaseReady, setFirebaseReady] = useState(!firebaseEnabled)
  const [notice, setNotice] = useState('')
  const [completionDismissed, setCompletionDismissed] = useState(false)
  const [amountText, setAmountText] = useState(String(readSettings().bottleMl))
  const [goalText, setGoalText] = useState(String(readSettings().goalMl / 1000))
  const [cupText, setCupText] = useState(String(readSettings().bottleMl))
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  const [cloudDays, setCloudDays] = useState<Record<string, number>>({})

  const progress = Math.min(record.totalMl / Math.max(record.goalMl, 1), 1)
  const remaining = Math.max(record.goalMl - record.totalMl, 0)

  useEffect(() => { if (progress < 1) setCompletionDismissed(false) }, [progress])

  useEffect(() => { localStorage.setItem('gota-settings', JSON.stringify(settings)) }, [settings])
  useEffect(() => {
    setAmountText(String(settings.bottleMl))
    setGoalText(String(settings.goalMl / 1000))
    setCupText(String(settings.bottleMl))
  }, [settings])
  useEffect(() => { localStorage.setItem(`gota-day-${record.date}`, JSON.stringify(record)) }, [record])
  useEffect(() => {
    if (!firebaseEnabled || !auth || !db) return
    const activeAuth = auth
    const firestore = db
    return onAuthStateChanged(activeAuth, async user => {
      try {
        const currentUser = user ?? (await signInAnonymously(activeAuth)).user
        const prefs = await getDoc(doc(firestore, 'users', currentUser.uid))
        if (prefs.exists()) setSettings(current => ({ ...current, ...prefs.data() as Partial<UserSettings> }))
        const today = await getDoc(doc(firestore, 'users', currentUser.uid, 'days', date))
        if (today.exists()) setRecord(current => ({ ...current, ...today.data() as DailyRecord, date }))
        setUid(currentUser.uid)
        setFirebaseReady(true)
      } catch (error) { console.error('Falha ao conectar ao Firebase.', error); setFirebaseReady(true) }
    })
  }, [date])
  useEffect(() => {
    if (!uid || !db || !firebaseReady) return
    void setDoc(doc(db, 'users', uid), settings, { merge: true }).catch(error => console.error('Falha ao salvar preferências.', error))
  }, [settings, uid, firebaseReady])
  useEffect(() => {
    if (!uid || !db || !firebaseReady) return
    void setDoc(doc(db, 'users', uid, 'days', record.date), record, { merge: true }).catch(error => console.error('Falha ao salvar registros.', error))
  }, [record, uid, firebaseReady])
  useEffect(() => {
    const timer = window.setInterval(() => {
      const today = localDayKey()
      if (today !== date) { setDate(today); setRecord(readRecord(today, settings.goalMl)) }
    }, 60_000)
    return () => window.clearInterval(timer)
  }, [date, settings.goalMl])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 2200); return () => window.clearTimeout(timer) }, [notice])
  useEffect(() => {
    if (!uid || !db) return
    const firestore = db
    void getDocs(collection(firestore, 'users', uid, 'days')).then(snapshot => {
      const days: Record<string, number> = {}
      snapshot.forEach(day => { days[day.id] = Number(day.data().totalMl || 0) })
      setCloudDays(days)
    }).catch(error => console.error('Falha ao carregar calendário.', error))
  }, [uid, month])

  const calendar = useMemo(() => {
    const year = month.getFullYear()
    const monthNumber = month.getMonth()
    const count = new Date(year, monthNumber + 1, 0).getDate()
    const offset = new Date(year, monthNumber, 1).getDay()
    const today = localDayKey()
    const days = Array.from({ length: count }, (_, index) => {
      const dayNumber = index + 1
      const key = `${year}-${String(monthNumber + 1).padStart(2, '0')}-${String(dayNumber).padStart(2, '0')}`
      const local = readRecord(key, settings.goalMl).totalMl
      const total = key === record.date ? record.totalMl : Math.max(local, cloudDays[key] || 0)
      return { key, dayNumber, total, ratio: Math.min(total / Math.max(settings.goalMl, 1), 1), isToday: key === today, isFuture: key > today }
    })
    const monthTotal = days.filter(day => day.key <= today).reduce((sum, day) => sum + day.total, 0)
    return { offset, days, monthTotal }
  }, [month, settings.goalMl, record, cloudDays])

  function addWater() {
    const amountMl = Math.floor(Number(amountText))
    if (!Number.isFinite(amountMl) || amountMl <= 0) { setNotice('Digite uma quantidade válida em ml'); return }
    const entry: WaterEntry = { id: crypto.randomUUID(), amountMl, time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
    setRecord(current => ({ ...current, totalMl: current.totalMl + amountMl, entries: [entry, ...current.entries] }))
    setNotice(`+${formatMl(amountMl)} ml`)
  }
  function undoLast() {
    const [last, ...entries] = record.entries
    if (!last) return
    setRecord(current => ({ ...current, entries, totalMl: Math.max(0, current.totalMl - last.amountMl) }))
    setNotice(`−${formatMl(last.amountMl)} ml`)
  }
  function savePreferences() {
    const goal = Math.round(Number(goalText.replace(',', '.')) * 1000)
    if (!Number.isFinite(goal) || goal < 250) { setNotice('Digite uma meta válida em litros'); return }
    const cup = Math.floor(Number(cupText))
    if (!Number.isFinite(cup) || cup < 1) { setNotice('Digite a capacidade do copo em ml'); return }
    setSettings(current => ({ ...current, goalMl: goal, bottleMl: cup }))
    setRecord(current => ({ ...current, goalMl: goal }))
    setAmountText(String(cup))
    setNotice('Preferências salvas')
    setTab('today')
  }
  function chooseCup(amount: number) { setCupText(String(amount)) }
  function moveMonth(step: number) { setMonth(current => new Date(current.getFullYear(), current.getMonth() + step, 1)) }

  const monthLabel = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(month)
  const monthName = new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(month)

  return <main className="min-h-dvh bg-[#080a0e] text-slate-50">
    <div className="mx-auto flex min-h-dvh w-full max-w-[460px] flex-col px-5 pb-[max(env(safe-area-inset-bottom),14px)] pt-6">
      {tab === 'today' && <>
        <header className="flex items-center justify-between">
          <button onClick={() => setTab('calendar')} aria-label="Ver calendário mensal" className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-[#20242d] text-sm font-bold" style={{ background: `conic-gradient(#18c4e8 ${progress * 360}deg, #20242d 0deg)` }}><span className="grid h-10 w-10 place-items-center rounded-full bg-[#080a0e] text-white">{Math.round(progress * 100)}<span className="text-[9px]">%</span></span></button>
          <span className="text-sm font-semibold tracking-wide text-slate-300">Water Tracker</span>
        </header>
        <section className="mt-5 rounded-3xl border border-white/[.07] bg-gradient-to-b from-[#151d29] to-[#10151e] px-5 py-5 text-center shadow-[0_16px_40px_rgba(0,0,0,.16)]">
          <p className="text-[10px] font-semibold uppercase tracking-[.2em] text-cyan-300/80">Água consumida hoje</p>
          <p className="mt-2 text-[52px] font-semibold leading-none tracking-[-3px] text-white">{formatMl(record.totalMl)}<span className="ml-1 text-[24px] font-medium tracking-normal text-slate-300">ml</span></p>
          <div className="mt-4 flex items-center justify-between text-xs"><span className="text-slate-400">0 ml</span><span className="font-medium text-slate-200">Meta: {formatMl(record.goalMl)} ml</span></div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-sky-300 transition-all duration-500" style={{ width: `${progress * 100}%` }} /></div>
          <p className="mt-3 text-sm font-medium text-slate-400">{remaining > 0 ? `Faltam ${formatMl(remaining)} ml · ${Math.round(progress * 100)}% da meta` : 'Meta diária concluída · 100%'}</p>
        </section>
        <section className="flex min-h-[270px] flex-1 items-center justify-center py-1" aria-label="Garrafa com seu progresso">
          <Bottle progress={progress} />
        </section>
        <section className="pb-4">
          <div className="mx-auto flex max-w-sm items-center gap-2 rounded-2xl border border-white/10 bg-[#121722] p-2">
            <input id="water-amount" type="number" min="1" inputMode="numeric" value={amountText} onChange={event => setAmountText(event.target.value)} aria-label="Quantidade de água em ml" className="min-w-0 flex-1 bg-transparent px-3 py-2 text-center text-xl font-semibold text-white outline-none placeholder:text-slate-600" />
            <span className="text-sm text-slate-500">ml</span>
            <button onClick={addWater} className="flex h-11 items-center gap-2 rounded-xl bg-[#159ec0] px-4 text-sm font-semibold text-white transition hover:bg-[#20b7d8] active:scale-95"><Droplet size={17} /> Adicionar</button>
          </div>
          {record.entries.length > 0 && <div className="mt-3 flex justify-end text-xs text-slate-500"><button onClick={undoLast} className="flex items-center gap-1 text-slate-400"><Undo2 size={13} /> −{formatMl(record.entries[0].amountMl)} ml</button></div>}
        </section>
      </>}

      {tab === 'calendar' && <section className="flex-1 pt-6">
        <header className="mb-7 flex items-end justify-between">
          <div><p className="text-[42px] font-semibold leading-none tracking-[-2px]">{formatMl(calendar.monthTotal)}<span className="ml-1 text-lg font-medium tracking-normal text-slate-300">ml</span></p><p className="mt-2 text-sm capitalize text-slate-400">bebidos em {monthName}</p></div>
          <div className="mb-1 flex items-center gap-1"><button onClick={() => moveMonth(-1)} aria-label="Mês anterior" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><ChevronLeft size={19} /></button><span className="min-w-24 text-center text-xs capitalize text-slate-300">{monthLabel}</span><button onClick={() => moveMonth(1)} aria-label="Próximo mês" className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-white/10"><ChevronRight size={19} /></button></div>
        </header>
        <div className="grid grid-cols-7 bg-[#1b1b20] py-3 text-center text-xs font-medium text-slate-400">{['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="grid grid-cols-7 gap-y-3 py-4">
          {Array.from({ length: calendar.offset }, (_, index) => <span key={`blank-${index}`} />)}
          {calendar.days.map(day => <div key={day.key} className="flex h-14 items-center justify-center">
            <span className={`relative grid h-11 w-11 place-items-center rounded-full text-sm ${day.isToday ? 'bg-[#24242b] font-semibold text-white' : day.isFuture ? 'bg-[#24242b] text-slate-500' : 'text-white'}`} style={day.ratio > 0 ? { background: `conic-gradient(#16c5e8 ${day.ratio * 360}deg, #24242b ${day.ratio * 360}deg)` } : undefined}>
              <span className={`grid h-[34px] w-[34px] place-items-center rounded-full ${day.isToday || day.isFuture ? 'bg-[#24242b]' : 'bg-[#080a0e]'}`}>{day.dayNumber}</span>
            </span>
          </div>)}
        </div>
        <p className="mt-3 text-center text-xs text-slate-500">Cada círculo mostra o quanto da meta diária foi atingido.</p>
      </section>}

      {tab === 'settings' && <section className="flex-1 pt-8">
        <p className="text-xs uppercase tracking-[.18em] text-slate-500">Personalize</p><h1 className="mt-2 text-3xl font-semibold">Sua hidratação</h1>
        <div className="mt-7 rounded-3xl bg-[#121722] p-5"><label htmlFor="goal-liters" className="text-sm font-medium">Meta diária</label><p className="mt-1 text-xs text-slate-400">Digite quanto você quer beber por dia.</p><div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 px-4"><input id="goal-liters" type="number" min="0.25" step="0.25" inputMode="decimal" value={goalText} onChange={event => setGoalText(event.target.value)} className="w-full bg-transparent py-3 text-2xl font-semibold outline-none" /><span className="text-sm text-slate-400">litros</span></div><p className="mt-2 text-[11px] text-slate-500">Uma sugestão inicial de 3 litros já está preenchida. Você pode trocar.</p></div>
        <p className="mt-4 text-center text-xs leading-5 text-slate-500">A garrafa acompanha seu progresso e fica cheia ao atingir a meta.</p>
        <button onClick={savePreferences} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#159ec0] text-sm font-semibold text-white hover:bg-[#20b7d8]"><Check size={17} /> Salvar meta</button>
      </section>}

      {tab === 'cup' && <section className="flex-1 pt-8">
        <p className="text-xs uppercase tracking-[.18em] text-slate-500">Seu recipiente</p><h1 className="mt-2 text-3xl font-semibold">Tamanho do copo</h1>
        <p className="mt-2 text-sm text-slate-400">Escolha um tamanho conhecido para preencher rapidamente ao registrar água.</p>
        <div className="mt-7 rounded-3xl bg-[#121722] p-5"><div className="flex items-center gap-3"><GlassWater size={19} className="text-cyan-300" /><div><p className="text-sm font-medium">Capacidade do copo ou garrafa</p><p className="mt-1 text-xs text-slate-400">Você pode personalizar o volume abaixo.</p></div></div><div className="mt-5 grid grid-cols-2 gap-3">{cupSizes.map(ml => <button key={ml} onClick={() => chooseCup(ml)} className={`rounded-2xl py-4 text-sm transition ${Number(cupText) === ml ? 'bg-[#159ec0] font-semibold text-white ring-2 ring-cyan-200/30' : 'bg-white/5 text-slate-300 hover:bg-white/10'}`}>{ml} ml</button>)}</div><label htmlFor="custom-cup" className="mt-5 block text-xs text-slate-400">Outro tamanho</label><div className="mt-2 flex items-center rounded-xl border border-white/10 px-4"><input id="custom-cup" type="number" min="1" inputMode="numeric" placeholder="Ex.: 420" value={cupText} onChange={event => setCupText(event.target.value)} className="w-full bg-transparent py-3 text-base outline-none placeholder:text-slate-600" /><span className="text-sm text-slate-500">ml</span></div></div>
        <button onClick={savePreferences} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#159ec0] text-sm font-semibold text-white hover:bg-[#20b7d8]"><Check size={17} /> Salvar tamanho</button>
      </section>}

      <nav className="mt-auto grid grid-cols-4 rounded-full border border-[#272a32] bg-[#17191f] p-1.5">
        <button aria-label="Garrafa" onClick={() => setTab('today')} className={`grid h-12 place-items-center rounded-full transition ${tab === 'today' ? 'bg-[#30323a] text-[#20c6e8]' : 'text-slate-500'}`}><Droplet size={22} fill={tab === 'today' ? 'currentColor' : 'none'} /></button>
        <button aria-label="Calendário" onClick={() => setTab('calendar')} className={`grid h-12 place-items-center rounded-full transition ${tab === 'calendar' ? 'bg-[#30323a] text-[#20c6e8]' : 'text-slate-500'}`}><BarChart3 size={22} /></button>
        <button aria-label="Configurações" onClick={() => setTab('settings')} className={`grid h-12 place-items-center rounded-full transition ${tab === 'settings' ? 'bg-[#30323a] text-[#20c6e8]' : 'text-slate-500'}`}><Settings size={22} /></button>
        <button aria-label="Tamanho do copo" onClick={() => setTab('cup')} className={`grid h-12 place-items-center rounded-full transition ${tab === 'cup' ? 'bg-[#30323a] text-[#20c6e8]' : 'text-slate-500'}`}><GlassWater size={22} /></button>
      </nav>
      {notice && <div className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-900 shadow-xl">{notice}</div>}
      {tab === 'today' && progress >= 1 && !completionDismissed && <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/65 px-6 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="completion-title"><section className="relative w-full max-w-sm rounded-[2rem] border border-emerald-200/20 bg-[#131d25] px-7 py-9 text-center shadow-[0_24px_80px_rgba(0,0,0,.55)]"><button onClick={() => setCompletionDismissed(true)} aria-label="Fechar" className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-full bg-white/5 text-slate-400 hover:bg-white/10"><X size={18} /></button><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-300/15 text-emerald-300"><Trophy size={30} /></span><h2 id="completion-title" className="mt-5 text-2xl font-semibold text-emerald-100">Meta atingida!</h2><p className="mt-2 text-sm leading-6 text-slate-300">Parabéns! Você completou sua meta de {formatMl(record.goalMl)} ml hoje.</p><button onClick={() => setCompletionDismissed(true)} className="mt-6 h-11 w-full rounded-xl bg-emerald-300 font-semibold text-emerald-950 transition hover:bg-emerald-200">Continuar</button></section></div>}
    </div>
  </main>
}

export default App
