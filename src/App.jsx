import { useState, useMemo, useEffect } from "react";
import {
  collection, onSnapshot, addDoc, updateDoc,
  deleteDoc, doc, serverTimestamp, orderBy, query
} from "firebase/firestore";
import { db } from "./firebase";

// ─── DATOS DEL GRUPO ───────────────────────────────────────────
const MUSICIANS = [
  { id: "jose",       name: "Jose",       role: "Vocalista"  },
  { id: "roman",      name: "Román",      role: "Vocalista"  },
  { id: "marcelo",    name: "Marcelo",    role: "Bajo"       },
  { id: "windsor",    name: "Windsor",    role: "Vientos 1"  },
  { id: "juancarlos", name: "Juan Carlos",role: "Quena"      },
  { id: "andre",      name: "André",      role: "Vientos 2"  },
  { id: "alex",       name: "Alex",       role: "Guitarra"   },
  { id: "julio",      name: "Julio",      role: "Charango"   },
  { id: "fernando",   name: "Fernando",   role: "Batería"    },
];

const COORDINATORS = [
  { id: "viviana", name: "Viviana" },
  { id: "naty",    name: "Naty"    },
  { id: "milenka", name: "Milenka" },
];

const EVENT_TYPES = {
  matrimonio: { label: "Matrimonio", color: "#c9874a", bg: "#3d2010", icon: "💍" },
  preste:     { label: "Preste",     color: "#b5943a", bg: "#332500", icon: "🎊" },
  concierto:  { label: "Concierto",  color: "#6b9e5e", bg: "#1a2e15", icon: "🎶" },
  ensayo:     { label: "Ensayo",     color: "#7a8fa6", bg: "#1a2330", icon: "🎼" },
  discoteca:  { label: "Discoteca",  color: "#9b6bb5", bg: "#221530", icon: "🎧" },
  grabacion:  { label: "Grabación",  color: "#b55a5a", bg: "#2e1515", icon: "🎙️" },
  otro:       { label: "Otro",       color: "#8a9a7a", bg: "#1e251a", icon: "📌" },
};

const MONTHS    = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT= ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];

const EMPTY_FORM = { title:"", date:"", time:"", place:"", type:"matrimonio", musicians:[], coordinator:"", notes:"", otroLabel:"" };

function formatDate(dateStr) {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("es-ES", { weekday:"long", year:"numeric", month:"long", day:"numeric" });
}

// ─── COLORES ───────────────────────────────────────────────────
const C = {
  bg:       "#1a1410",
  surface:  "#221c14",
  surface2: "#2a2218",
  border:   "#3d3020",
  border2:  "#4a3a28",
  gold:     "#c9a84c",
  goldDim:  "#7a6030",
  terra:    "#c9874a",
  text:     "#e8dfc8",
  textDim:  "#9a8c74",
  textFaint:"#5a5040",
  red:      "#8b3a2a",
  redLight: "#e07060",
};

// ─── ESTILOS GLOBALES ──────────────────────────────────────────
const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap');
  *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
  body { background:${C.bg}; color:${C.text}; }
  ::-webkit-scrollbar { width:5px; }
  ::-webkit-scrollbar-thumb { background:${C.goldDim}; border-radius:3px; }
  ::-webkit-scrollbar-track { background:${C.surface}; }

  .btn        { cursor:pointer; border:none; font-family:'Cinzel',serif; transition:all .2s; border-radius:6px; }
  .btn-gold   { background:linear-gradient(135deg,${C.goldDim},${C.gold}); color:${C.bg}; font-weight:600; padding:9px 20px; font-size:13px; letter-spacing:.04em; }
  .btn-gold:hover   { transform:translateY(-1px); box-shadow:0 4px 18px rgba(180,140,60,.35); }
  .btn-outline      { background:transparent; color:${C.gold}; border:1px solid ${C.goldDim}; padding:7px 16px; font-size:12px; font-family:'Cinzel',serif; border-radius:6px; cursor:pointer; transition:all .2s; }
  .btn-outline:hover{ background:${C.goldDim}22; border-color:${C.gold}; }
  .btn-ghost        { background:transparent; border:none; color:${C.textDim}; cursor:pointer; font-family:'Cinzel',serif; font-size:12px; padding:7px 16px; border-radius:6px; transition:all .15s; }
  .btn-ghost:hover  { color:${C.text}; background:${C.surface2}; }
  .btn-ghost.active { color:${C.gold}; background:${C.surface2}; border:1px solid ${C.goldDim}44; }
  .btn-danger       { background:${C.red}44; border:1px solid ${C.red}; color:${C.redLight}; padding:8px 16px; font-family:'Cinzel',serif; font-size:12px; border-radius:6px; cursor:pointer; transition:all .2s; }
  .btn-danger:hover { background:${C.red}88; }

  .card { background:${C.surface}; border:1px solid ${C.border}; border-radius:12px; padding:18px; }

  .day-cell       { background:${C.surface}; border:1px solid ${C.border}; border-radius:9px; min-height:84px; padding:7px; cursor:pointer; transition:all .15s; }
  .day-cell:hover { border-color:${C.goldDim}; background:${C.surface2}; }
  .day-cell.today { border-color:${C.gold}88; background:${C.surface2}; }

  .epill { border-radius:4px; padding:2px 5px; font-size:11px; font-family:'Crimson Text',serif; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; cursor:pointer; }

  .chip     { display:inline-flex; align-items:center; padding:5px 11px; border-radius:4px; cursor:pointer; font-family:'Crimson Text',serif; font-size:13px; border:1px solid ${C.border2}; background:${C.surface2}; color:${C.textDim}; transition:all .15s; margin:3px; }
  .chip.on  { background:${C.goldDim}22; border-color:${C.goldDim}; color:${C.gold}; }
  .chip:hover { border-color:${C.goldDim}66; }
  .chip.coord.on { background:#2a1a3a; border-color:#8860b0; color:#b090e0; }

  .inp { background:${C.surface2}; border:1px solid ${C.border2}; border-radius:8px; color:${C.text}; font-family:'Crimson Text',serif; font-size:15px; padding:9px 13px; width:100%; outline:none; transition:border-color .2s; }
  .inp:focus { border-color:${C.goldDim}; }
  select.inp option { background:${C.surface2}; color:${C.text}; }

  .modal-bg { position:fixed; inset:0; background:rgba(10,8,4,.82); z-index:100; display:flex; align-items:center; justify-content:center; padding:16px; backdrop-filter:blur(5px); }

  .list-card { border-left:3px solid; border-radius:10px; padding:13px 15px; background:${C.surface}; border-top:1px solid ${C.border}; border-right:1px solid ${C.border}; border-bottom:1px solid ${C.border}; margin-bottom:9px; cursor:pointer; transition:all .15s; }
  .list-card:hover { background:${C.surface2}; }

  @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
  .fadein { animation:fadeIn .3s ease both; }

  .lbl { font-family:'Cinzel',serif; font-size:10px; color:${C.textFaint}; letter-spacing:.08em; display:block; margin-bottom:5px; }
  .section-title { font-family:'Cinzel',serif; font-size:18px; color:${C.gold}; margin-bottom:16px; letter-spacing:.05em; }

  /* Loading spinner */
  .spinner { width:36px; height:36px; border:3px solid ${C.goldDim}44; border-top-color:${C.gold}; border-radius:50%; animation:spin .8s linear infinite; margin:0 auto; }
  @keyframes spin { to { transform:rotate(360deg); } }
`;

// ─── COMPONENTE PRINCIPAL ──────────────────────────────────────
export default function AgendaJachaMallku() {
  const today = new Date();

  // Firebase state
  const [events,   setEvents  ] = useState([]);
  const [loading,  setLoading ] = useState(true);
  const [saving,   setSaving  ] = useState(false);
  const [fbError,  setFbError ] = useState(null);

  // UI state
  const [view,          setView         ] = useState("calendario");
  const [currentDate,   setCurrentDate  ] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showForm,      setShowForm     ] = useState(false);
  const [filterMember,  setFilterMember ] = useState("todos");
  const [editId,        setEditId       ] = useState(null);
  const [form,          setForm         ] = useState(EMPTY_FORM);

  // ── Firebase: escucha en tiempo real ──
  useEffect(() => {
    const q = query(collection(db, "eventos"), orderBy("date", "asc"));
    const unsub = onSnapshot(q,
      (snap) => {
        setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
        setFbError(null);
      },
      (err) => {
        console.error(err);
        setFbError("No se pudo conectar con la base de datos. Revisá la configuración de Firebase.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ── Calendario helpers ──
  const year      = currentDate.getFullYear();
  const month     = currentDate.getMonth();
  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const filteredEvents = useMemo(() => {
    if (filterMember === "todos") return events;
    const isCoord = COORDINATORS.find(c => c.id === filterMember);
    if (isCoord) return events.filter(e => e.coordinator === filterMember);
    return events.filter(e => (e.musicians || []).includes(filterMember));
  }, [events, filterMember]);

  const getEventsForDay = (day) => {
    const dateStr = `${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const upcomingEvents = [...filteredEvents]
    .filter(e => new Date(e.date) >= new Date(today.toDateString()))
    .sort((a,b) => new Date(a.date) - new Date(b.date));

  const conflicts = useMemo(() => {
    const byDate = {};
    events.forEach(ev => { if (!byDate[ev.date]) byDate[ev.date]=[]; byDate[ev.date].push(ev); });
    const found = [];
    Object.entries(byDate).forEach(([date, evs]) => {
      if (evs.length < 2) return;
      const mc = {};
      evs.forEach(ev => (ev.musicians||[]).forEach(m => { if(!mc[m]) mc[m]=[]; mc[m].push(ev.title); }));
      Object.entries(mc).forEach(([musician, titles]) => {
        if (titles.length > 1) found.push({ date, musician, events: titles });
      });
    });
    return found;
  }, [events]);

  // ── CRUD ──
  function openNewForm() {
    setForm(EMPTY_FORM); setEditId(null); setSelectedEvent(null); setShowForm(true);
  }
  function openEditForm(ev) {
    setForm({ ...EMPTY_FORM, ...ev }); setEditId(ev.id); setSelectedEvent(null); setShowForm(true);
  }

  async function saveEvent() {
    if (!form.title || !form.date) return;
    setSaving(true);
    try {
      const { id: _id, ...data } = form;
      data.updatedAt = serverTimestamp();
      if (editId) {
        await updateDoc(doc(db, "eventos", editId), data);
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(collection(db, "eventos"), data);
      }
      setShowForm(false);
    } catch(e) {
      alert("Error al guardar: " + e.message);
    }
    setSaving(false);
  }

  async function deleteEvent(id) {
    if (!window.confirm("¿Eliminar este evento?")) return;
    try {
      await deleteDoc(doc(db, "eventos", id));
      setSelectedEvent(null);
    } catch(e) {
      alert("Error al eliminar: " + e.message);
    }
  }

  function toggleMusician(id) {
    setForm(f => ({
      ...f,
      musicians: (f.musicians||[]).includes(id)
        ? (f.musicians||[]).filter(x=>x!==id)
        : [...(f.musicians||[]), id]
    }));
  }

  const getEventLabel = (ev) =>
    ev.type === "otro" && ev.otroLabel ? ev.otroLabel : EVENT_TYPES[ev.type]?.label;

  // ── Render helpers ──
  const LBL = ({children}) => <span className="lbl">{children}</span>;

  // ── PANTALLA DE ERROR FIREBASE ──
  if (fbError) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Crimson Text',serif" }}>
      <style>{GLOBAL_CSS}</style>
      <div className="card" style={{ maxWidth:480, textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:16 }}>⚠️</div>
        <div style={{ fontFamily:"'Cinzel',serif", color:C.gold, fontSize:18, marginBottom:12 }}>Error de conexión</div>
        <div style={{ color:C.textDim, fontSize:14, lineHeight:1.6 }}>{fbError}</div>
        <div style={{ marginTop:16, color:C.textFaint, fontSize:12 }}>Revisá el archivo <code style={{color:C.gold}}>src/firebase.js</code> y pegá tus credenciales.</div>
      </div>
    </div>
  );

  // ── PANTALLA DE CARGA ──
  if (loading) return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", alignItems:"center", justifyContent:"center", flexDirection:"column", gap:16 }}>
      <style>{GLOBAL_CSS}</style>
      <div className="spinner" />
      <div style={{ fontFamily:"'Cinzel',serif", color:C.goldDim, fontSize:13, letterSpacing:".1em" }}>CARGANDO AGENDA...</div>
    </div>
  );

  // ── APP PRINCIPAL ──
  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.text, fontFamily:"'Crimson Text',serif", position:"relative" }}>
      <style>{GLOBAL_CSS}</style>

      {/* Fondo: patrón chakana */}
      <div style={{ position:"fixed", inset:0, pointerEvents:"none", zIndex:0 }}
        dangerouslySetInnerHTML={{ __html:`<svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="ch" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse"><path d="M20,0 L40,0 L40,20 L60,20 L60,40 L40,40 L40,60 L20,60 L20,40 L0,40 L0,20 L20,20 Z" fill="none" stroke="rgba(180,140,60,0.055)" stroke-width="0.8"/></pattern></defs><rect width="100%" height="100%" fill="url(#ch)"/></svg>` }}
      />

      {/* ── HEADER ── */}
      <div style={{ position:"relative", zIndex:1, background:`linear-gradient(180deg,#100c06,${C.bg})`, borderBottom:`1px solid ${C.border}` }}>
        <div style={{ height:4, background:`linear-gradient(90deg,${C.red}88,${C.gold},${C.terra},${C.gold},${C.red}88)` }} />
        <div style={{ maxWidth:1100, margin:"0 auto", padding:"14px 22px" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
            <div style={{ display:"flex", alignItems:"center", gap:14 }}>
              <div style={{ width:50, height:50, borderRadius:"50%", border:`2px solid ${C.goldDim}`, display:"flex", alignItems:"center", justifyContent:"center", background:C.surface2, flexShrink:0, fontSize:24 }}>🦅</div>
              <div>
                <div style={{ fontFamily:"'Cinzel',serif", fontSize:22, fontWeight:700, color:C.gold, letterSpacing:".08em", lineHeight:1 }}>JACH'A MALLKU</div>
                <div style={{ fontFamily:"'Crimson Text',serif", fontStyle:"italic", fontSize:13, color:C.textDim, marginTop:2 }}>Agenda de contratos y eventos</div>
              </div>
            </div>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              {conflicts.length > 0 && (
                <div style={{ background:`${C.red}44`, border:`1px solid ${C.red}`, borderRadius:20, padding:"4px 12px", fontSize:12, fontFamily:"'Cinzel',serif", color:C.redLight }}>
                  ⚠ {conflicts.length} choque{conflicts.length>1?"s":""}
                </div>
              )}
              <button className="btn btn-gold" onClick={openNewForm}>+ Nuevo Evento</button>
            </div>
          </div>

          {/* Nav */}
          <div style={{ display:"flex", gap:2, marginTop:12, flexWrap:"wrap" }}>
            {[["calendario","📅 Calendario"],["lista","📋 Lista"],["musicos","🎸 Músicos"],["coordinacion","🗂 Coordinación"]].map(([v,l]) => (
              <button key={v} className={`btn-ghost ${view===v?"active":""}`} onClick={()=>setView(v)}>{l}</button>
            ))}
          </div>
        </div>
      </div>

      {/* ── CONTENIDO ── */}
      <div style={{ maxWidth:1100, margin:"0 auto", padding:"22px", position:"relative", zIndex:1 }}>

        {/* Alertas de choque */}
        {conflicts.length > 0 && (
          <div style={{ marginBottom:18 }}>
            {conflicts.map((c,i) => {
              const m = MUSICIANS.find(x=>x.id===c.musician);
              return (
                <div key={i} style={{ background:`${C.red}22`, border:`1px solid ${C.red}66`, borderRadius:8, padding:"8px 14px", marginBottom:6, fontFamily:"'Crimson Text',serif", fontSize:14 }}>
                  <span style={{ color:C.redLight, fontWeight:600 }}>⚠ {m?.name} ({m?.role})</span>
                  <span style={{ color:C.textDim }}> tiene choque el {formatDate(c.date)}: </span>
                  <span style={{ color:C.text }}>{c.events.join(" · ")}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* Filtros */}
        <div style={{ display:"flex", gap:6, marginBottom:20, flexWrap:"wrap", alignItems:"center", paddingBottom:14, borderBottom:`1px solid ${C.border}` }}>
          <span style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.textFaint, marginRight:4, letterSpacing:".08em" }}>FILTRAR:</span>
          <button className={`chip ${filterMember==="todos"?"on":""}`} onClick={()=>setFilterMember("todos")}>Todos</button>
          <span style={{ color:C.border2, fontSize:11, margin:"0 2px" }}>—</span>
          {MUSICIANS.map(m=>(
            <button key={m.id} className={`chip ${filterMember===m.id?"on":""}`} onClick={()=>setFilterMember(m.id)}>{m.name}</button>
          ))}
          <span style={{ color:C.border2, fontSize:11, margin:"0 2px" }}>—</span>
          {COORDINATORS.map(c=>(
            <button key={c.id} className={`chip coord ${filterMember===c.id?"on":""}`} onClick={()=>setFilterMember(c.id)}>{c.name}</button>
          ))}
        </div>

        {/* ══ CALENDARIO ══ */}
        {view==="calendario" && (
          <div className="fadein">
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:18 }}>
              <button className="btn-outline" onClick={()=>setCurrentDate(new Date(year,month-1,1))}>‹ Anterior</button>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:20, fontWeight:600, color:C.gold, letterSpacing:".06em" }}>{MONTHS[month]} {year}</div>
              <button className="btn-outline" onClick={()=>setCurrentDate(new Date(year,month+1,1))}>Siguiente ›</button>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:4 }}>
              {DAYS_SHORT.map(d=>(
                <div key={d} style={{ textAlign:"center", fontFamily:"'Cinzel',serif", fontSize:11, color:C.textFaint, padding:"5px 0", letterSpacing:".07em" }}>{d}</div>
              ))}
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
              {Array.from({length:firstDay}).map((_,i)=>(
                <div key={`e${i}`} style={{ minHeight:84, background:`${C.surface}44`, border:`1px solid ${C.border}44`, borderRadius:9 }} />
              ))}
              {Array.from({length:daysInMonth}).map((_,i)=>{
                const day=i+1;
                const dayEvs=getEventsForDay(day);
                const isToday=day===today.getDate()&&month===today.getMonth()&&year===today.getFullYear();
                return (
                  <div key={day} className={`day-cell${isToday?" today":""}`}>
                    <div style={{ fontFamily:"'Cinzel',serif", fontSize:12, color:isToday?C.gold:C.textDim, marginBottom:2, fontWeight:isToday?700:400 }}>{day}</div>
                    {dayEvs.slice(0,3).map(ev=>{
                      const t=EVENT_TYPES[ev.type];
                      return (
                        <div key={ev.id} className="epill" style={{ background:t?.bg, color:t?.color }}
                          onClick={e=>{e.stopPropagation();setSelectedEvent(ev);}}>
                          {t?.icon} {ev.time} {getEventLabel(ev)}
                        </div>
                      );
                    })}
                    {dayEvs.length>3&&<div style={{ fontSize:10, color:C.textFaint, marginTop:2 }}>+{dayEvs.length-3} más</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ LISTA ══ */}
        {view==="lista" && (
          <div className="fadein">
            <div className="section-title">Próximos Eventos</div>
            {upcomingEvents.length===0&&<div style={{ color:C.textFaint, textAlign:"center", padding:40, fontStyle:"italic" }}>Sin eventos próximos</div>}
            {upcomingEvents.map(ev=>{
              const t=EVENT_TYPES[ev.type];
              const coord=COORDINATORS.find(c=>c.id===ev.coordinator);
              return (
                <div key={ev.id} className="list-card" style={{ borderLeftColor:t?.color }} onClick={()=>setSelectedEvent(ev)}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:10 }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:600, marginBottom:4 }}>{ev.title}</div>
                      <div style={{ fontSize:13, color:C.textDim }}>📅 {formatDate(ev.date)} · 🕐 {ev.time}{ev.place?` · 📍 ${ev.place}`:""}</div>
                      {coord&&<div style={{ fontSize:12, color:"#b090e0", marginTop:3 }}>🗂 Coordinadora: {coord.name}</div>}
                      <div style={{ marginTop:7, display:"flex", flexWrap:"wrap", gap:4 }}>
                        {(ev.musicians||[]).map(mid=>{
                          const m=MUSICIANS.find(x=>x.id===mid);
                          return m?<span key={mid} style={{ background:`${C.goldDim}22`, border:`1px solid ${C.goldDim}55`, borderRadius:4, padding:"2px 9px", fontSize:11, color:C.gold }}>{m.name}</span>:null;
                        })}
                      </div>
                    </div>
                    <div style={{ background:t?.bg, color:t?.color, borderRadius:6, padding:"4px 12px", fontSize:12, fontFamily:"'Cinzel',serif", fontWeight:600, whiteSpace:"nowrap", flexShrink:0 }}>
                      {t?.icon} {getEventLabel(ev)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ══ MÚSICOS ══ */}
        {view==="musicos" && (
          <div className="fadein">
            <div className="section-title">Disponibilidad por Músico</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))", gap:14 }}>
              {MUSICIANS.map(mus=>{
                const myEvs=events.filter(e=>(e.musicians||[]).includes(mus.id)).sort((a,b)=>new Date(a.date)-new Date(b.date));
                const upcoming=myEvs.filter(e=>new Date(e.date)>=new Date(today.toDateString()));
                const hasConflict=conflicts.some(c=>c.musician===mus.id);
                return (
                  <div key={mus.id} className="card" style={{ borderColor:hasConflict?`${C.red}88`:C.border }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ fontFamily:"'Cinzel',serif", fontSize:17, fontWeight:600, color:C.gold }}>{mus.name}</div>
                        <div style={{ fontStyle:"italic", fontSize:13, color:C.textDim }}>{mus.role}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:700, color:upcoming.length>0?C.gold:C.textFaint, lineHeight:1 }}>{upcoming.length}</div>
                        <div style={{ fontSize:11, color:C.textFaint }}>próximos</div>
                      </div>
                    </div>
                    {hasConflict&&<div style={{ background:`${C.red}22`, border:`1px solid ${C.red}55`, borderRadius:6, padding:"5px 10px", marginBottom:10, fontSize:13, color:C.redLight }}>⚠ Tiene choque de fechas</div>}
                    <div style={{ borderTop:`1px solid ${C.border}` }}>
                      {upcoming.slice(0,4).map(ev=>{
                        const t=EVENT_TYPES[ev.type];
                        const d=new Date(ev.date+"T12:00:00");
                        return (
                          <div key={ev.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}44`, cursor:"pointer" }} onClick={()=>setSelectedEvent(ev)}>
                            <div style={{ width:38, textAlign:"center", background:t?.bg, borderRadius:7, padding:"4px 0", flexShrink:0 }}>
                              <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:700, color:t?.color, lineHeight:1 }}>{d.getDate()}</div>
                              <div style={{ fontSize:9, color:t?.color, fontFamily:"'Cinzel',serif" }}>{MONTHS[d.getMonth()].slice(0,3).toUpperCase()}</div>
                            </div>
                            <div>
                              <div style={{ fontSize:14, fontWeight:600 }}>{ev.title}</div>
                              <div style={{ fontSize:12, color:C.textDim }}>{ev.time} · {ev.place}</div>
                            </div>
                          </div>
                        );
                      })}
                      {upcoming.length===0&&<div style={{ fontStyle:"italic", fontSize:13, color:C.textFaint, textAlign:"center", padding:"14px 0" }}>Sin eventos próximos</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ COORDINACIÓN ══ */}
        {view==="coordinacion" && (
          <div className="fadein">
            <div className="section-title">Panel de Coordinación</div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))", gap:14, marginBottom:32 }}>
              {COORDINATORS.map(coord=>{
                const myEvs=events.filter(e=>e.coordinator===coord.id).sort((a,b)=>new Date(a.date)-new Date(b.date));
                const upcoming=myEvs.filter(e=>new Date(e.date)>=new Date(today.toDateString()));
                return (
                  <div key={coord.id} className="card" style={{ borderColor:"#5a3a8a55" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:14 }}>
                      <div>
                        <div style={{ fontFamily:"'Cinzel',serif", fontSize:18, fontWeight:600, color:"#b090e0" }}>{coord.name}</div>
                        <div style={{ fontStyle:"italic", fontSize:13, color:C.textDim }}>Coordinadora</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontFamily:"'Cinzel',serif", fontSize:26, fontWeight:700, color:upcoming.length>0?"#b090e0":C.textFaint, lineHeight:1 }}>{upcoming.length}</div>
                        <div style={{ fontSize:11, color:C.textFaint }}>próximos</div>
                      </div>
                    </div>
                    <div style={{ borderTop:`1px solid ${C.border}` }}>
                      {upcoming.slice(0,5).map(ev=>{
                        const t=EVENT_TYPES[ev.type];
                        const d=new Date(ev.date+"T12:00:00");
                        return (
                          <div key={ev.id} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom:`1px solid ${C.border}44`, cursor:"pointer" }} onClick={()=>setSelectedEvent(ev)}>
                            <div style={{ width:38, textAlign:"center", background:t?.bg, borderRadius:7, padding:"4px 0", flexShrink:0 }}>
                              <div style={{ fontFamily:"'Cinzel',serif", fontSize:15, fontWeight:700, color:t?.color, lineHeight:1 }}>{d.getDate()}</div>
                              <div style={{ fontSize:9, color:t?.color, fontFamily:"'Cinzel',serif" }}>{MONTHS[d.getMonth()].slice(0,3).toUpperCase()}</div>
                            </div>
                            <div style={{ flex:1 }}>
                              <div style={{ fontSize:14, fontWeight:600 }}>{ev.title}</div>
                              <div style={{ fontSize:12, color:C.textDim }}>{ev.time} · {ev.place}</div>
                              <div style={{ fontSize:11, color:t?.color, marginTop:2 }}>{t?.icon} {getEventLabel(ev)}</div>
                            </div>
                          </div>
                        );
                      })}
                      {upcoming.length===0&&<div style={{ fontStyle:"italic", fontSize:13, color:C.textFaint, textAlign:"center", padding:"14px 0" }}>Sin eventos asignados</div>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Resumen general */}
            <div style={{ fontFamily:"'Cinzel',serif", fontSize:14, color:C.textDim, marginBottom:12, letterSpacing:".06em" }}>TODOS LOS EVENTOS</div>
            {[...events].sort((a,b)=>new Date(a.date)-new Date(b.date)).map(ev=>{
              const t=EVENT_TYPES[ev.type];
              const coord=COORDINATORS.find(c=>c.id===ev.coordinator);
              return (
                <div key={ev.id} className="list-card" style={{ borderLeftColor:t?.color }} onClick={()=>setSelectedEvent(ev)}>
                  <div style={{ display:"flex", justifyContent:"space-between", gap:10, alignItems:"center" }}>
                    <div>
                      <span style={{ fontFamily:"'Cinzel',serif", fontSize:13, color:C.gold }}>{ev.title}</span>
                      <span style={{ fontSize:13, color:C.textDim, marginLeft:10 }}>📅 {formatDate(ev.date)}</span>
                    </div>
                    <div style={{ display:"flex", gap:8, alignItems:"center", flexShrink:0 }}>
                      {coord&&<span style={{ fontSize:12, color:"#b090e0" }}>{coord.name}</span>}
                      <span style={{ background:t?.bg, color:t?.color, borderRadius:4, padding:"2px 9px", fontSize:11, fontFamily:"'Cinzel',serif" }}>{t?.icon} {getEventLabel(ev)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ MODAL DETALLE ══ */}
      {selectedEvent && (()=>{
        const t=EVENT_TYPES[selectedEvent.type];
        const coord=COORDINATORS.find(c=>c.id===selectedEvent.coordinator);
        return (
          <div className="modal-bg" onClick={()=>setSelectedEvent(null)}>
            <div className="card fadein" style={{ maxWidth:480, width:"100%", borderColor:`${t?.color}55`, maxHeight:"88vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
              <div style={{ height:3, borderRadius:"8px 8px 0 0", background:`linear-gradient(90deg,${t?.color},${C.goldDim})`, margin:"-18px -18px 16px -18px" }} />
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                <span style={{ background:t?.bg, color:t?.color, borderRadius:5, padding:"3px 13px", fontSize:13, fontFamily:"'Cinzel',serif", fontWeight:600 }}>{t?.icon} {getEventLabel(selectedEvent)}</span>
                <button onClick={()=>setSelectedEvent(null)} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer", fontSize:22, lineHeight:1 }}>×</button>
              </div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:21, fontWeight:700, color:C.gold, marginBottom:14, lineHeight:1.25 }}>{selectedEvent.title}</div>
              <div style={{ display:"flex", flexDirection:"column", gap:7, marginBottom:16 }}>
                <div style={{ fontSize:14, color:C.textDim }}>📅 {formatDate(selectedEvent.date)}</div>
                <div style={{ fontSize:14, color:C.textDim }}>🕐 {selectedEvent.time} hrs</div>
                {selectedEvent.place&&<div style={{ fontSize:14, color:C.textDim }}>📍 {selectedEvent.place}</div>}
                {coord&&<div style={{ fontSize:14, color:"#b090e0" }}>🗂 Coordinadora: <strong>{coord.name}</strong></div>}
                {selectedEvent.notes&&<div style={{ fontSize:14, color:C.textDim, fontStyle:"italic" }}>📝 {selectedEvent.notes}</div>}
              </div>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:11, color:C.textFaint, marginBottom:8, letterSpacing:".07em" }}>MÚSICOS CONVOCADOS ({(selectedEvent.musicians||[]).length})</div>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginBottom:18 }}>
                {(selectedEvent.musicians||[]).map(mid=>{
                  const m=MUSICIANS.find(x=>x.id===mid);
                  return m?<span key={mid} style={{ background:`${C.goldDim}22`, border:`1px solid ${C.goldDim}55`, borderRadius:4, padding:"3px 11px", fontSize:12, color:C.gold }}>
                    {m.name} <span style={{ color:C.textDim, fontSize:11 }}>· {m.role}</span>
                  </span>:null;
                })}
                {!(selectedEvent.musicians||[]).length&&<span style={{ color:C.textFaint, fontStyle:"italic", fontSize:13 }}>Sin músicos asignados</span>}
              </div>
              <div style={{ display:"flex", gap:8 }}>
                <button className="btn btn-gold" style={{ flex:1 }} onClick={()=>openEditForm(selectedEvent)}>✏ Editar</button>
                <button className="btn-danger" onClick={()=>deleteEvent(selectedEvent.id)}>🗑 Eliminar</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ══ MODAL FORMULARIO ══ */}
      {showForm && (
        <div className="modal-bg" onClick={()=>setShowForm(false)}>
          <div className="card fadein" style={{ maxWidth:540, width:"100%", maxHeight:"92vh", overflowY:"auto" }} onClick={e=>e.stopPropagation()}>
            <div style={{ height:3, borderRadius:"8px 8px 0 0", background:`linear-gradient(90deg,${C.goldDim},${C.terra})`, margin:"-18px -18px 18px -18px" }} />
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:18 }}>
              <div style={{ fontFamily:"'Cinzel',serif", fontSize:19, fontWeight:700, color:C.gold }}>{editId?"Editar Evento":"Nuevo Evento"}</div>
              <button onClick={()=>setShowForm(false)} style={{ background:"none", border:"none", color:C.textDim, cursor:"pointer", fontSize:24 }}>×</button>
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:13 }}>

              <div><LBL>NOMBRE DEL EVENTO *</LBL>
                <input className="inp" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} placeholder="Ej: Matrimonio Quispe-Mamani" />
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                <div><LBL>FECHA *</LBL>
                  <input className="inp" type="date" value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} />
                </div>
                <div><LBL>HORA</LBL>
                  <input className="inp" type="time" value={form.time} onChange={e=>setForm(f=>({...f,time:e.target.value}))} />
                </div>
              </div>

              <div><LBL>LUGAR / VENUE</LBL>
                <input className="inp" value={form.place} onChange={e=>setForm(f=>({...f,place:e.target.value}))} placeholder="Ej: Salón Andino, Coliseo..." />
              </div>

              <div><LBL>TIPO DE EVENTO</LBL>
                <select className="inp" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {Object.entries(EVENT_TYPES).map(([k,v])=><option key={k} value={k}>{v.icon} {v.label}</option>)}
                </select>
              </div>

              {form.type==="otro" && (
                <div><LBL>ESPECIFICAR TIPO *</LBL>
                  <input className="inp" value={form.otroLabel} onChange={e=>setForm(f=>({...f,otroLabel:e.target.value}))} placeholder="Ej: Fiesta de graduación..." />
                </div>
              )}

              <div><LBL>MÚSICOS CONVOCADOS</LBL>
                <div style={{ display:"flex", flexWrap:"wrap" }}>
                  {MUSICIANS.map(m=>(
                    <button key={m.id} className={`chip ${(form.musicians||[]).includes(m.id)?"on":""}`} onClick={()=>toggleMusician(m.id)}>
                      {m.name} <span style={{ fontSize:11, opacity:.7, marginLeft:3 }}>· {m.role}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div><LBL>COORDINADORA</LBL>
                <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                  {COORDINATORS.map(c=>(
                    <button key={c.id} className={`chip coord ${form.coordinator===c.id?"on":""}`}
                      onClick={()=>setForm(f=>({...f,coordinator:f.coordinator===c.id?"":c.id}))}>
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>

              <div><LBL>NOTAS ADICIONALES</LBL>
                <textarea className="inp" style={{ resize:"none" }} value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Instrucciones, repertorio, vestuario..." />
              </div>

              <div style={{ display:"flex", gap:8, paddingTop:4 }}>
                <button className="btn btn-gold" style={{ flex:1, opacity:saving?.5:1 }} onClick={saveEvent} disabled={saving}>
                  {saving ? "Guardando..." : editId ? "Guardar cambios" : "Crear evento"}
                </button>
                <button className="btn-outline" onClick={()=>setShowForm(false)}>Cancelar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
