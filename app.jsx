import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set, get, update, push } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ═══════════════════════════════════════
   FIREBASE CONFIG
═══════════════════════════════════════ */
const firebaseConfig = {
  apiKey: "AIzaSyCvdZpokkKNJYUKJYozNH7a-LIG6_mZar0",
  authDomain: "zotask-32227.firebaseapp.com",
  projectId: "zotask-32227",
  storageBucket: "zotask-32227.firebasestorage.app",
  messagingSenderId: "434933342924",
  appId: "1:434933342924:web:e6f30866e9b07517ee1869",
  databaseURL: "https://zotask-32227-default-rtdb.firebaseio.com/"
};

const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
const db = getDatabase(firebaseApp);

/* ═══════════════════════════════════════
   KKIAPAY CONFIG
═══════════════════════════════════════ */
const KKIAPAY_ID = "6a0595134337716e6694f2cf";

/* ═══════════════════════════════════════
   APP CONFIG
═══════════════════════════════════════ */
const ADMIN_RATE = 0.15;
const ADMIN_EMAIL = "zotask.app@gmail.com";
const WITHDRAW_MULTIPLIER = 2;

// Plans avec limites de tâches
const PLANS = [
  { amount: 1000,  label: "Starter", color: "#00ffa3", tasks: 2,  gainUser: 50,  gainAdmin: 150, emoji: "🌱" },
  { amount: 2000,  label: "Basic",   color: "#00d4ff", tasks: 4,  gainUser: 75,  gainAdmin: 125, emoji: "⚡" },
  { amount: 5000,  label: "Pro",     color: "#a78bfa", tasks: 6,  gainUser: 150, gainAdmin: 50,  emoji: "🚀" },
  { amount: 10000, label: "Elite",   color: "#fbbf24", tasks: 10, gainUser: 200, gainAdmin: 0,   emoji: "👑" },
];

// Types de tâches
const TASK_TYPES = [
  { id: "ad",     icon: "📺", label: "Regarder une publicité",  type: "timer",  duration: 15, source: "adsense"  },
  { id: "survey", icon: "📋", label: "Sondage sponsorisé",      type: "survey", duration: 0,  source: "cpx"      },
  { id: "game",   icon: "🎮", label: "Mini-jeu",                type: "game",   duration: 0,  source: "internal" },
  { id: "browse", icon: "🌐", label: "Navigation sponsorisée",  type: "timer",  duration: 20, source: "bitlabs"  },
  { id: "video",  icon: "🎬", label: "Regarder une vidéo",     type: "timer",  duration: 30, source: "adsense"  },
  { id: "refer",  icon: "👥", label: "Parrainer un ami",        type: "refer",  duration: 0,  source: "internal" },
  { id: "signup", icon: "📝", label: "Inscription partenaire",  type: "timer",  duration: 10, source: "bitlabs"  },
];

// Pays Afrique de l'Ouest
const COUNTRIES = [
  { code: "BJ", name: "Bénin", flag: "🇧🇯", currency: "FCFA", operators: ["MTN", "Moov"] },
  { code: "SN", name: "Sénégal", flag: "🇸🇳", currency: "FCFA", operators: ["Orange", "Wave", "Free"] },
  { code: "CI", name: "Côte d'Ivoire", flag: "🇨🇮", currency: "FCFA", operators: ["MTN", "Orange", "Moov"] },
  { code: "TG", name: "Togo", flag: "🇹🇬", currency: "FCFA", operators: ["TMoney", "Flooz"] },
  { code: "BF", name: "Burkina Faso", flag: "🇧🇫", currency: "FCFA", operators: ["Orange", "Moov"] },
  { code: "ML", name: "Mali", flag: "🇲🇱", currency: "FCFA", operators: ["Orange Money"] },
  { code: "GN", name: "Guinée", flag: "🇬🇳", currency: "GNF", operators: ["Orange Money"] },
  { code: "NE", name: "Niger", flag: "🇳🇪", currency: "FCFA", operators: ["Airtel Money"] },
];

const fmt = (n) => Math.round(n || 0).toLocaleString("fr-FR") + " FCFA";
const nowStr = () => new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
const todayStr = () => new Date().toISOString().split("T")[0];

const getPlan = (amount) => PLANS.find(p => p.amount === amount) || PLANS[0];

/* ═══════════════════════════════════════
   UI COMPONENTS
═══════════════════════════════════════ */
const GCard = ({ children, style = {}, onClick }) => (
  <div onClick={onClick} style={{
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.07)",
    borderRadius: 20, padding: 20,
    cursor: onClick ? "pointer" : "default",
    transition: "all 0.2s", ...style
  }}
    onMouseEnter={e => onClick && (e.currentTarget.style.borderColor = "rgba(0,255,163,0.35)")}
    onMouseLeave={e => onClick && (e.currentTarget.style.borderColor = "rgba(255,255,255,0.07)")}
  >{children}</div>
);

const ZBtn = ({ onClick, color = "#00ffa3", children, disabled, style = {} }) => (
  <button onClick={disabled ? undefined : onClick} style={{
    width: "100%", padding: "15px 0", borderRadius: 14, border: "none",
    background: disabled ? "#1e293b" : `linear-gradient(135deg,${color},${color}bb)`,
    color: disabled ? "#475569" : "#0a0f1a",
    fontWeight: 900, fontSize: 15, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", letterSpacing: 0.3,
    boxShadow: disabled ? "none" : `0 4px 20px ${color}44`,
    transition: "transform 0.1s", ...style
  }}
    onMouseDown={e => !disabled && (e.currentTarget.style.transform = "scale(0.97)")}
    onMouseUp={e => !disabled && (e.currentTarget.style.transform = "scale(1)")}
  >{children}</button>
);

const Pill = ({ color = "#00ffa3", children, small }) => (
  <span style={{
    display: "inline-block",
    padding: small ? "2px 8px" : "3px 12px",
    borderRadius: 99,
    background: color + "18", color,
    fontSize: small ? 10 : 11,
    fontWeight: 800, letterSpacing: 0.5
  }}>{children}</span>
);

const Toast = ({ msg, type }) => (
  <div style={{
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)",
    background: type === "error" ? "#450a0a" : "#052e16",
    border: `1px solid ${type === "error" ? "#ef4444" : "#22c55e"}`,
    color: "#f8fafc", padding: "12px 24px", borderRadius: 14,
    zIndex: 9999, fontWeight: 700, fontSize: 14,
    boxShadow: "0 8px 40px #000c", whiteSpace: "nowrap",
    animation: "fadeUp 0.25s ease"
  }}>{msg}</div>
);

/* ── TIMER TASK ── */
function TimerTask({ duration, label, onDone }) {
  const [left, setLeft] = useState(duration);
  useEffect(() => {
    if (left <= 0) { onDone(); return; }
    const t = setTimeout(() => setLeft(l => l - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);
  const pct = ((duration - left) / duration) * 100;
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#64748b", marginBottom: 20 }}>{label}…</p>
      <div style={{ position: "relative", width: 120, height: 120, margin: "0 auto 16px" }}>
        <svg width="120" height="120" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
          <circle cx="60" cy="60" r="52" fill="none" stroke="#00ffa3" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 52}`}
            strokeDashoffset={`${2 * Math.PI * 52 * (1 - pct / 100)}`}
            strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }} />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontSize: 32, fontWeight: 900 }}>{left}</span>
        </div>
      </div>
    </div>
  );
}

/* ── MINI GAME ── */
function MiniGame({ onWin, onLose }) {
  const [secret] = useState(() => Math.floor(Math.random() * 5) + 1);
  const [chosen, setChosen] = useState(null);
  const pick = (n) => {
    if (chosen) return; setChosen(n);
    setTimeout(() => n === secret ? onWin() : onLose(), 800);
  };
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ color: "#64748b", marginBottom: 20 }}>Devine le bon chiffre entre 1 et 5</p>
      <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
        {[1,2,3,4,5].map(n => (
          <button key={n} onClick={() => pick(n)} style={{
            width: 52, height: 52, borderRadius: 14,
            border: `2px solid ${chosen === n ? (n === secret ? "#22c55e" : "#ef4444") : "rgba(255,255,255,0.1)"}`,
            background: chosen === n ? (n === secret ? "#14532d" : "#450a0a") : "rgba(255,255,255,0.05)",
            color: "#f8fafc", fontSize: 22, fontWeight: 900, cursor: "pointer", fontFamily: "inherit"
          }}>{n}</button>
        ))}
      </div>
      {chosen && <p style={{ marginTop: 20, fontSize: 22, fontWeight: 900, color: chosen === secret ? "#22c55e" : "#ef4444" }}>
        {chosen === secret ? "🎉 Bravo !" : `❌ C'était le ${secret}`}
      </p>}
    </div>
  );
}

/* ── SURVEY ── */
function Survey({ onDone }) {
  const qs = [
    { q: "Combien d'heures passes-tu en ligne ?", opts: ["Moins de 2h", "2 à 5h", "Plus de 5h"] },
    { q: "Ton appareil principal ?", opts: ["📱 Téléphone", "💻 PC", "📱 Tablette"] },
    { q: "Tu fais des achats en ligne ?", opts: ["Souvent", "Parfois", "Jamais"] },
  ];
  const [step, setStep] = useState(0);
  const answer = () => step < qs.length - 1 ? setStep(s => s + 1) : onDone();
  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        {qs.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i <= step ? "#00ffa3" : "rgba(255,255,255,0.1)", transition: "background 0.3s" }} />
        ))}
      </div>
      <p style={{ fontWeight: 700, marginBottom: 16, color: "#f8fafc" }}>{qs[step].q}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {qs[step].opts.map(o => (
          <button key={o} onClick={answer} style={{
            padding: "12px 16px", borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.08)",
            background: "rgba(255,255,255,0.04)", color: "#f8fafc",
            cursor: "pointer", fontFamily: "inherit", fontSize: 14, fontWeight: 600, textAlign: "left"
          }}>{o}</button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════
   KKIAPAY PAYMENT
═══════════════════════════════════════ */
function KkiapayPayment({ amount, onSuccess, onClose }) {
  useEffect(() => {
    // Load Kkiapay script
    const script = document.createElement("script");
    script.src = "https://cdn.kkiapay.me/k.js";
    script.async = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.openKkiapayWidget) {
        window.openKkiapayWidget({
          amount,
          key: KKIAPAY_ID,
          sandbox: false,
          phone: "",
          callback: onSuccess,
        });
        window.addSuccessListener && window.addSuccessListener(onSuccess);
      }
    };

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div style={{ textAlign: "center", padding: 20 }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>💳</div>
      <p style={{ color: "#64748b", marginBottom: 20 }}>Ouverture du paiement Kkiapay...</p>
      <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
        {["MTN", "Moov", "Orange", "Wave"].map(op => (
          <Pill key={op} color="#00ffa3">{op}</Pill>
        ))}
      </div>
      <button onClick={onClose} style={{
        background: "none", border: "1px solid rgba(255,255,255,0.1)",
        color: "#475569", padding: "10px 20px", borderRadius: 10,
        cursor: "pointer", fontFamily: "inherit", fontSize: 13
      }}>Annuler</button>
    </div>
  );
}

/* ═══════════════════════════════════════
   MAIN APP
═══════════════════════════════════════ */
export default function Zotask() {
  const [screen, setScreen] = useState("landing");
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", ref: "", country: "BJ" });
  const [authErr, setAuthErr] = useState("");
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [taskState, setTaskState] = useState(null);
  const [withdrawMethod, setWithdrawMethod] = useState(null);
  const [withdrawPhone, setWithdrawPhone] = useState("");
  const [withdrawDone, setWithdrawDone] = useState(false);
  const [history, setHistory] = useState([]);
  const [logoTaps, setLogoTaps] = useState(0);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminStats, setAdminStats] = useState({ users: 0, totalCommission: 0 });

  const notify = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const tapLogo = () => {
    const n = logoTaps + 1; setLogoTaps(n);
    if (n >= 7) { setShowAdmin(true); setLogoTaps(0); notify("Panel admin activé 🔓"); }
  };

  /* AUTH */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fu) => {
      if (fu) {
        setUser(fu);
        if (fu.email === ADMIN_EMAIL) setShowAdmin(true);
        await loadUser(fu.uid);
      } else {
        setUser(null); setUserData(null); setScreen("landing");
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const loadUser = async (uid) => {
    try {
      const snap = await get(ref(db, `users/${uid}`));
      if (snap.exists()) {
        const data = snap.val();
        setUserData(data);
        setScreen(data.depositAmount > 0 ? "dashboard" : "plans");
        const hSnap = await get(ref(db, `transactions/${uid}`));
        if (hSnap.exists()) setHistory(Object.values(hSnap.val()).reverse());
      } else {
        setScreen("plans");
      }
    } catch (e) { console.error(e); }
  };

  const doRegister = async () => {
    if (!form.name || !form.email || !form.password) return notify("Remplis tous les champs", "error");
    if (form.password.length < 6) return notify("Mot de passe : 6 caractères minimum", "error");
    setAuthErr("");
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      const refCode = "ZT" + Math.random().toString(36).substr(2, 6).toUpperCase();
      const newUser = {
        uid: cred.user.uid, name: form.name, email: form.email,
        ref: refCode, country: form.country,
        balance: form.ref ? 500 : 0,
        depositAmount: 0, tasksDone: 0, totalEarned: 0,
        adminEarned: 0, tasksToday: 0, lastTaskDate: "",
        joined: new Date().toISOString(),
      };
      await set(ref(db, `users/${cred.user.uid}`), newUser);
      setUserData(newUser);
      if (form.ref) notify("Bonus parrainage : +500 FCFA ! 🎉");
      setScreen("plans");
    } catch (e) {
      const msgs = {
        "auth/email-already-in-use": "Email déjà utilisé",
        "auth/invalid-email": "Email invalide",
        "auth/weak-password": "Mot de passe trop faible",
      };
      setAuthErr(msgs[e.code] || "Erreur d'inscription");
    }
  };

  const doLogin = async () => {
    if (!form.email || !form.password) return notify("Remplis tous les champs", "error");
    setAuthErr("");
    try {
      await signInWithEmailAndPassword(auth, form.email, form.password);
    } catch (e) {
      const msgs = {
        "auth/user-not-found": "Compte introuvable",
        "auth/wrong-password": "Mot de passe incorrect",
        "auth/invalid-credential": "Email ou mot de passe incorrect",
      };
      setAuthErr(msgs[e.code] || "Erreur de connexion");
    }
  };

  const doLogout = async () => {
    await signOut(auth);
    setScreen("landing"); setUserData(null); setHistory([]);
  };

  /* PAYMENT SUCCESS */
  const onPaymentSuccess = async (response) => {
    if (!selectedPlan || !user) return;
    const adminCut = Math.round(selectedPlan.amount * ADMIN_RATE);
    const net = selectedPlan.amount - adminCut;
    try {
      const updated = {
        ...userData,
        balance: (userData.balance || 0) + net,
        depositAmount: selectedPlan.amount,
        adminEarned: (userData.adminEarned || 0) + adminCut,
        tasksToday: 0,
        lastTaskDate: todayStr(),
      };
      await update(ref(db, `users/${user.uid}`), updated);
      await push(ref(db, `transactions/${user.uid}`), {
        type: "deposit", label: `Dépôt ${selectedPlan.label}`,
        amount: selectedPlan.amount, net, admin: adminCut, date: nowStr()
      });
      const adminSnap = await get(ref(db, "admin/totalCommission"));
      const current = adminSnap.exists() ? adminSnap.val() : 0;
      await set(ref(db, "admin/totalCommission"), current + adminCut);
      setUserData(updated);
      setHistory(prev => [{ type: "deposit", label: `Dépôt ${selectedPlan.label}`, amount: selectedPlan.amount, net, date: nowStr() }, ...prev]);
      setShowPayment(false);
      notify(`✅ Dépôt de ${fmt(selectedPlan.amount)} confirmé !`);
      setScreen("dashboard");
    } catch (e) { console.error(e); notify("Erreur lors du dépôt", "error"); }
  };

  /* TASKS */
  const plan = userData ? getPlan(userData.depositAmount) : null;

  const getTasksToday = () => {
    if (!userData) return 0;
    if (userData.lastTaskDate !== todayStr()) return 0;
    return userData.tasksToday || 0;
  };

  const maxTasksToday = plan ? plan.tasks : 0;
  const tasksToday = getTasksToday();
  const canDoTask = tasksToday < maxTasksToday;

  const startTask = (task) => {
    if (!canDoTask) return notify(`Limite de ${maxTasksToday} tâches/jour atteinte !`, "error");
    setActiveTask(task); setTaskState(null); setScreen("task");
  };

  const completeTask = async (success) => {
    if (!success) { setTaskState("fail"); return; }
    const gain = plan.gainUser;
    const adminGain = plan.gainAdmin;
    try {
      const newTasksToday = (userData.lastTaskDate === todayStr() ? (userData.tasksToday || 0) : 0) + 1;
      const updated = {
        ...userData,
        balance: (userData.balance || 0) + gain,
        tasksDone: (userData.tasksDone || 0) + 1,
        totalEarned: (userData.totalEarned || 0) + gain,
        adminEarned: (userData.adminEarned || 0) + adminGain,
        tasksToday: newTasksToday,
        lastTaskDate: todayStr(),
      };
      await update(ref(db, `users/${user.uid}`), updated);
      await push(ref(db, `transactions/${user.uid}`), {
        type: "task", label: activeTask.label,
        gain, admin: adminGain, date: nowStr()
      });
      if (adminGain > 0) {
        const adminSnap = await get(ref(db, "admin/totalCommission"));
        const current = adminSnap.exists() ? adminSnap.val() : 0;
        await set(ref(db, "admin/totalCommission"), current + adminGain);
      }
      setUserData(updated);
      setHistory(prev => [{ type: "task", label: activeTask.label, gain, date: nowStr() }, ...prev]);
      setTaskState("done");
      notify(`+${fmt(gain)} crédités ! 🎉`);
    } catch (e) { console.error(e); notify("Erreur", "error"); }
  };

  /* WITHDRAW */
  const canWithdraw = userData &&
    (userData.balance || 0) >= ((userData.depositAmount || 0) * WITHDRAW_MULTIPLIER) &&
    (userData.depositAmount || 0) >= 1000;

  const doWithdraw = async () => {
    if (!withdrawMethod) return notify("Choisis une méthode", "error");
    if (!withdrawPhone || withdrawPhone.length < 8) return notify("Numéro invalide", "error");
    if (!canWithdraw) return;
    const adminCut = Math.round((userData.balance || 0) * ADMIN_RATE);
    const net = (userData.balance || 0) - adminCut;
    try {
      const updated = { ...userData, balance: 0, depositAmount: 0, adminEarned: (userData.adminEarned || 0) + adminCut };
      await update(ref(db, `users/${user.uid}`), updated);
      await push(ref(db, `transactions/${user.uid}`), {
        type: "withdraw", label: `Retrait ${withdrawMethod}`,
        amount: userData.balance, net, phone: withdrawPhone,
        admin: adminCut, date: nowStr()
      });
      const adminSnap = await get
