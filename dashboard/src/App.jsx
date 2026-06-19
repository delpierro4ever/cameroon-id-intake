import { useEffect, useMemo, useState } from "react";

/* ──────────────────────────────────────────────────────────────
   CONFIG
   - APPS_SCRIPT_URL: paste your deployed Apps Script /exec URL.
   - DASHBOARD_PASSWORD: simple shared gate for you + your partner.
     (Client-side only — keeps casual visitors out, not a security
     boundary. The real protection is the Apps Script URL staying private.)
   ────────────────────────────────────────────────────────────── */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGvsKbKtd1nZTPoctQW6Q9H8eophT_OB0PRWLzlbSNl2uKFXh80BVtJy-Ag94epDW0/exec";
const DASHBOARD_PASSWORD = "changeme";

/* ---------- API helper ---------- */
// text/plain keeps requests "simple" so the browser skips the CORS preflight
// that Apps Script can't answer.
async function api(action, params = {}) {
  if (!APPS_SCRIPT_URL) throw new Error("APPS_SCRIPT_URL is not set in src/App.jsx");
  const res = await fetch(APPS_SCRIPT_URL, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action, ...params }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Request failed");
  return json.data;
}

/* ---------- date / money helpers ---------- */
function localISO(d) {
  const t = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return t.toISOString().slice(0, 10);
}
const TODAY = localISO(new Date());
const TOMORROW = localISO(new Date(Date.now() + 86400000));
const THIS_MONTH = TODAY.slice(0, 7);

function fmtDate(iso) {
  if (!iso) return "—";
  const s = String(iso).slice(0, 10);
  if (!s.includes("-")) return s;
  const [y, m, d] = s.split("-");
  return `${d}.${m}.${y}`;
}
function money(n) {
  return "XAF " + (Number(n) || 0).toLocaleString("en-US");
}
function digits(phone) {
  return String(phone || "").replace(/\D/g, "");
}
function matches(query, ...fields) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return fields.some((f) => String(f || "").toLowerCase().includes(q));
}

/* ---------- small UI atoms ---------- */
function Pill({ status }) {
  const cls =
    {
      Scheduled: "pill pill-amber",
      Done: "pill pill-green",
      Cancelled: "pill pill-red",
      Submitted: "pill pill-grey",
      Pending: "pill pill-amber",
      Reminded: "pill pill-grey",
    }[status] || "pill pill-grey";
  return <span className={cls}>{status}</span>;
}

function Spinner({ label }) {
  return <p className="muted center">{label || "Loading…"}</p>;
}

/* ══════════════════════════════════════════════════════════════
   APPOINTMENTS
   ══════════════════════════════════════════════════════════════ */
function Appointments() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState({ name: "", phone: "", appointmentDate: "", notes: "" });

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api("listAppointments"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const add = async (e) => {
    e.preventDefault();
    if (!form.name || !form.appointmentDate) return;
    setBusy(true);
    try {
      await api("addAppointment", form);
      setForm({ name: "", phone: "", appointmentDate: "", notes: "" });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const setStatus = async (id, status) => {
    setBusy(true);
    try {
      await api("updateAppointment", { id, status });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this appointment?")) return;
    setBusy(true);
    try {
      await api("deleteAppointment", { id });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remind = (a) => {
    const text =
      `Hello ${a.name}, this is a reminder of your ID registration appointment on ${fmtDate(a.appointmentDate)}. ` +
      `Please bring your documents. Thank you.\n\n` +
      `Bonjour ${a.name}, rappel de votre rendez-vous pour l'enregistrement de la CNI le ${fmtDate(a.appointmentDate)}. ` +
      `Merci d'apporter vos documents.`;
    window.open(`https://wa.me/${digits(a.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const sorted = useMemo(
    () =>
      [...rows]
        .filter((a) => matches(search, a.name, a.phone))
        .sort((a, b) => String(a.appointmentDate).localeCompare(String(b.appointmentDate))),
    [rows, search]
  );

  const dueToday = rows.filter((a) => String(a.appointmentDate).slice(0, 10) === TODAY && a.status === "Scheduled").length;
  const dueTomorrow = rows.filter(
    (a) => String(a.appointmentDate).slice(0, 10) === TOMORROW && a.status === "Scheduled"
  ).length;

  return (
    <div>
      <form className="card" onSubmit={add}>
        <h3 className="card-title">Add Appointment / Ajouter un rendez-vous</h3>
        <div className="grid">
          <input
            className="input"
            placeholder="Name / Nom"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="input"
            placeholder="Phone / Téléphone"
            inputMode="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <input
            className="input"
            type="date"
            value={form.appointmentDate}
            onChange={(e) => setForm({ ...form, appointmentDate: e.target.value })}
          />
          <input
            className="input"
            placeholder="Notes"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button className="btn btn-green" disabled={busy}>
          {busy ? "Saving…" : "Add Appointment"}
        </button>
      </form>

      {(dueToday > 0 || dueTomorrow > 0) && (
        <div className="banner">
          {dueToday > 0 && (
            <span className="banner-chip banner-today">
              {dueToday} due TODAY / aujourd'hui
            </span>
          )}
          {dueTomorrow > 0 && (
            <span className="banner-chip banner-tomorrow">
              {dueTomorrow} due TOMORROW / demain
            </span>
          )}
        </div>
      )}

      <input
        className="input search"
        placeholder="Search name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {err && <p className="error">{err}</p>}
      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <p className="muted center">No appointments.</p>
      ) : (
        sorted.map((a) => {
          const d = String(a.appointmentDate).slice(0, 10);
          const due = a.status === "Scheduled" && d === TODAY ? " due-today" : a.status === "Scheduled" && d === TOMORROW ? " due-tomorrow" : "";
          return (
            <div className={"card item" + due} key={a.id}>
              <div className="item-head">
                <strong>{a.name}</strong>
                <Pill status={a.status} />
              </div>
              <div className="muted small">
                📅 {fmtDate(a.appointmentDate)}
                {a.phone ? ` · 📞 ${a.phone}` : ""}
              </div>
              {a.notes ? <div className="small notes">{a.notes}</div> : null}
              <div className="actions">
                <button className="btn btn-green sm" onClick={() => remind(a)} disabled={!a.phone}>
                  Remind on WhatsApp
                </button>
                {a.status !== "Done" && (
                  <button className="btn btn-outline sm" onClick={() => setStatus(a.id, "Done")} disabled={busy}>
                    Done
                  </button>
                )}
                {a.status !== "Cancelled" && (
                  <button className="btn btn-outline sm" onClick={() => setStatus(a.id, "Cancelled")} disabled={busy}>
                    Cancel
                  </button>
                )}
                <button className="btn btn-red sm" onClick={() => remove(a.id)} disabled={busy}>
                  Delete
                </button>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SUBMISSIONS
   ══════════════════════════════════════════════════════════════ */
function Submissions({ onRegistered }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [openId, setOpenId] = useState(null);
  const [amount, setAmount] = useState("");
  const [paidDate, setPaidDate] = useState(TODAY);

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api("listSubmissions"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const openConfirm = (id) => {
    setOpenId(id);
    setAmount("");
    setPaidDate(TODAY);
  };

  const confirm = async (id) => {
    setBusy(true);
    try {
      await api("confirmRegister", { id, amountPaid: Number(amount) || 0, paidDate });
      setOpenId(null);
      await load();
      onRegistered && onRegistered();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this submission (no-show)?")) return;
    setBusy(true);
    try {
      await api("deleteSubmission", { id });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const list = rows.filter((s) =>
    matches(search, s.givenNames, s.surnames, s.mobilePhone)
  );

  return (
    <div>
      <input
        className="input search"
        placeholder="Search name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {err && <p className="error">{err}</p>}
      {loading ? (
        <Spinner />
      ) : list.length === 0 ? (
        <p className="muted center">No submissions waiting.</p>
      ) : (
        list.map((s) => (
          <div className="card item" key={s.id}>
            <div className="item-head">
              <strong>
                {s.givenNames} {s.surnames}
              </strong>
              <Pill status={s.status} />
            </div>
            <div className="muted small">
              📞 {s.mobilePhone || "—"} · 🕒 {fmtDate(s.timestamp)}
            </div>
            {s.address ? <div className="muted small">📍 {s.address}</div> : null}
            {openId === s.id ? (
              <div className="confirm-box">
                <label className="label">Amount paid (XAF)</label>
                <input
                  className="input"
                  type="number"
                  inputMode="numeric"
                  placeholder="e.g. 5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <label className="label">Paid date</label>
                <input
                  className="input"
                  type="date"
                  value={paidDate}
                  onChange={(e) => setPaidDate(e.target.value)}
                />
                <div className="actions">
                  <button className="btn btn-green sm" onClick={() => confirm(s.id)} disabled={busy}>
                    {busy ? "Saving…" : "Save & Register"}
                  </button>
                  <button className="btn btn-outline sm" onClick={() => setOpenId(null)} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions">
                <button className="btn btn-green sm" onClick={() => openConfirm(s.id)}>
                  Confirm &amp; Register
                </button>
                <button className="btn btn-red sm" onClick={() => remove(s.id)} disabled={busy}>
                  Delete
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   REGISTERED
   ══════════════════════════════════════════════════════════════ */
function Registered({ refreshKey }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [month, setMonth] = useState(THIS_MONTH);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [manual, setManual] = useState({ name: "", phone: "", address: "", amountPaid: "", paidDate: TODAY });
  const [bioOpenId, setBioOpenId] = useState(null);
  const [bio, setBio] = useState({ stationName: "", rdvDate: "" });

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api("listRegistered"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, [refreshKey]);

  const addManual = async (e) => {
    e.preventDefault();
    if (!manual.name) return;
    setBusy(true);
    try {
      await api("addManual", { ...manual, amountPaid: Number(manual.amountPaid) || 0 });
      setManual({ name: "", phone: "", address: "", amountPaid: "", paidDate: TODAY });
      setShowAdd(false);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const openBio = (id) => {
    setBioOpenId(id);
    setBio({ stationName: "", rdvDate: "" });
  };

  const addBio = async (client) => {
    if (!bio.rdvDate) return;
    setBusy(true);
    try {
      await api("addBiometrics", {
        clientId: client.id,
        name: `${client.givenNames || ""} ${client.surnames || ""}`.trim(),
        phone: client.mobilePhone,
        stationName: bio.stationName,
        rdvDate: bio.rdvDate,
      });
      setBioOpenId(null);
      setBio({ stationName: "", rdvDate: "" });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const monthRows = useMemo(
    () => rows.filter((r) => String(r.paidDate).slice(0, 7) === month),
    [rows, month]
  );
  const total = useMemo(
    () => monthRows.reduce((sum, r) => sum + (Number(r.amountPaid) || 0), 0),
    [monthRows]
  );
  const visible = monthRows.filter((r) =>
    matches(search, r.givenNames, r.surnames, r.mobilePhone)
  );

  return (
    <div>
      <div className="card summary">
        <div className="summary-row">
          <label className="label">Month / Mois</label>
          <input
            className="input month"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
          />
        </div>
        <div className="summary-stats">
          <div className="stat">
            <span className="stat-num">{monthRows.length}</span>
            <span className="stat-lbl">clients</span>
          </div>
          <div className="stat">
            <span className="stat-num">{money(total)}</span>
            <span className="stat-lbl">collected</span>
          </div>
        </div>
      </div>

      <button className="btn btn-outline" onClick={() => setShowAdd((v) => !v)}>
        {showAdd ? "Close" : "Add Client Manually"}
      </button>

      {showAdd && (
        <form className="card" onSubmit={addManual}>
          <h3 className="card-title">Back-fill registered client</h3>
          <div className="grid">
            <input
              className="input"
              placeholder="Name / Nom"
              value={manual.name}
              onChange={(e) => setManual({ ...manual, name: e.target.value })}
            />
            <input
              className="input"
              placeholder="Phone / Téléphone"
              inputMode="tel"
              value={manual.phone}
              onChange={(e) => setManual({ ...manual, phone: e.target.value })}
            />
            <input
              className="input"
              placeholder="Address / Adresse"
              value={manual.address}
              onChange={(e) => setManual({ ...manual, address: e.target.value })}
            />
            <input
              className="input"
              type="number"
              inputMode="numeric"
              placeholder="Amount paid (XAF)"
              value={manual.amountPaid}
              onChange={(e) => setManual({ ...manual, amountPaid: e.target.value })}
            />
            <input
              className="input"
              type="date"
              value={manual.paidDate}
              onChange={(e) => setManual({ ...manual, paidDate: e.target.value })}
            />
          </div>
          <button className="btn btn-green" disabled={busy}>
            {busy ? "Saving…" : "Add to Registered"}
          </button>
        </form>
      )}

      <input
        className="input search"
        placeholder="Search name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {err && <p className="error">{err}</p>}
      {loading ? (
        <Spinner />
      ) : visible.length === 0 ? (
        <p className="muted center">No registered clients this month.</p>
      ) : (
        visible.map((r) => (
          <div className="card item" key={r.id}>
            <div className="item-head">
              <strong>
                {r.givenNames} {r.surnames}
              </strong>
              <span className="amount">{money(r.amountPaid)}</span>
            </div>
            <div className="muted small">
              📞 {r.mobilePhone || "—"} · 💰 paid {fmtDate(r.paidDate)}
            </div>
            {r.address ? <div className="muted small">📍 {r.address}</div> : null}
            {bioOpenId === r.id ? (
              <div className="confirm-box">
                <label className="label">Police station / Commissariat</label>
                <input
                  className="input"
                  placeholder="Station name"
                  value={bio.stationName}
                  onChange={(e) => setBio({ ...bio, stationName: e.target.value })}
                />
                <label className="label">Biometrics rendez-vous date</label>
                <input
                  className="input"
                  type="date"
                  value={bio.rdvDate}
                  onChange={(e) => setBio({ ...bio, rdvDate: e.target.value })}
                />
                <div className="actions">
                  <button className="btn btn-green sm" onClick={() => addBio(r)} disabled={busy}>
                    {busy ? "Saving…" : "Save Biometrics Date"}
                  </button>
                  <button className="btn btn-outline sm" onClick={() => setBioOpenId(null)} disabled={busy}>
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="actions">
                <button className="btn btn-outline sm" onClick={() => openBio(r.id)}>
                  Add Biometrics Date
                </button>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   BIOMETRICS — police-station rendez-vous chosen by the client
   ══════════════════════════════════════════════════════════════ */
function Biometrics() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [editId, setEditId] = useState(null);
  const [editDate, setEditDate] = useState("");

  const load = async () => {
    setLoading(true);
    setErr("");
    try {
      setRows(await api("listBiometrics"));
    } catch (e) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  const setStatus = async (id, status) => {
    setBusy(true);
    try {
      await api("updateBiometrics", { id, status });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const saveDate = async (id) => {
    if (!editDate) return;
    setBusy(true);
    try {
      await api("updateBiometrics", { id, rdvDate: editDate });
      setEditId(null);
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    if (!confirm("Delete this biometrics rendez-vous?")) return;
    setBusy(true);
    try {
      await api("deleteBiometrics", { id });
      await load();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  };

  const remind = (b) => {
    const text =
      `Hello ${b.name}, this is a reminder of your biometrics appointment` +
      (b.stationName ? ` at ${b.stationName}` : "") +
      ` on ${fmtDate(b.rdvDate)}. Please attend on time with your documents. Thank you.\n\n` +
      `Bonjour ${b.name}, rappel de votre rendez-vous biométrique` +
      (b.stationName ? ` à ${b.stationName}` : "") +
      ` le ${fmtDate(b.rdvDate)}. Merci d'apporter vos documents.`;
    window.open(`https://wa.me/${digits(b.phone)}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const sorted = useMemo(
    () =>
      [...rows]
        .filter((b) => matches(search, b.name, b.phone))
        .sort((a, b) => String(a.rdvDate).localeCompare(String(b.rdvDate))),
    [rows, search]
  );

  const dueSoon = rows.filter((b) => {
    const d = String(b.rdvDate).slice(0, 10);
    return (d === TODAY || d === TOMORROW) && b.status !== "Done";
  });

  return (
    <div>
      {dueSoon.length > 0 && (
        <div className="card">
          <h3 className="card-title">Reminders Due / Rappels</h3>
          {dueSoon.map((b) => {
            const today = String(b.rdvDate).slice(0, 10) === TODAY;
            return (
              <div className={"item-head due-row" + (today ? " due-today" : " due-tomorrow")} key={"due-" + b.id}>
                <div>
                  <strong>{b.name}</strong>
                  <div className="muted small">
                    {today ? "TODAY" : "TOMORROW"} · {b.stationName || "—"} · {fmtDate(b.rdvDate)}
                  </div>
                </div>
                <button className="btn btn-green sm" onClick={() => remind(b)} disabled={!b.phone}>
                  Remind
                </button>
              </div>
            );
          })}
        </div>
      )}

      <input
        className="input search"
        placeholder="Search name or phone…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {err && <p className="error">{err}</p>}
      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <p className="muted center">No biometrics rendez-vous yet.</p>
      ) : (
        sorted.map((b) => {
          const d = String(b.rdvDate).slice(0, 10);
          const due = b.status !== "Done" && d === TODAY ? " due-today" : b.status !== "Done" && d === TOMORROW ? " due-tomorrow" : "";
          return (
            <div className={"card item" + due} key={b.id}>
              <div className="item-head">
                <strong>{b.name}</strong>
                <Pill status={b.status} />
              </div>
              <div className="muted small">
                🗓️ {fmtDate(b.rdvDate)} · 🏢 {b.stationName || "—"}
              </div>
              <div className="muted small">📞 {b.phone || "—"}</div>
              {editId === b.id ? (
                <div className="confirm-box">
                  <label className="label">New rendez-vous date</label>
                  <input
                    className="input"
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                  <div className="actions">
                    <button className="btn btn-green sm" onClick={() => saveDate(b.id)} disabled={busy}>
                      {busy ? "Saving…" : "Save Date"}
                    </button>
                    <button className="btn btn-outline sm" onClick={() => setEditId(null)} disabled={busy}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="actions">
                  <button className="btn btn-green sm" onClick={() => remind(b)} disabled={!b.phone}>
                    Remind on WhatsApp
                  </button>
                  {b.status !== "Done" && (
                    <button className="btn btn-outline sm" onClick={() => setStatus(b.id, "Done")} disabled={busy}>
                      Done
                    </button>
                  )}
                  {b.status !== "Reminded" && b.status !== "Done" && (
                    <button className="btn btn-outline sm" onClick={() => setStatus(b.id, "Reminded")} disabled={busy}>
                      Mark Reminded
                    </button>
                  )}
                  <button
                    className="btn btn-outline sm"
                    onClick={() => {
                      setEditId(b.id);
                      setEditDate(String(b.rdvDate).slice(0, 10));
                    }}
                    disabled={busy}
                  >
                    Edit Date
                  </button>
                  <button className="btn btn-red sm" onClick={() => remove(b.id)} disabled={busy}>
                    Delete
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   SHELL (auth + tabs)
   ══════════════════════════════════════════════════════════════ */
const TABS = [
  { key: "appointments", label: "Appointments" },
  { key: "submissions", label: "Submissions" },
  { key: "registered", label: "Registered" },
  { key: "biometrics", label: "Biometrics" },
];

export default function App() {
  const [authed, setAuthed] = useState(() => sessionStorage.getItem("dash_ok") === "1");
  const [pw, setPw] = useState("");
  const [tab, setTab] = useState("appointments");
  const [regRefresh, setRegRefresh] = useState(0);

  if (!authed) {
    return (
      <div className="page">
        <Header />
        <main className="login">
          <form
            className="card login-card"
            onSubmit={(e) => {
              e.preventDefault();
              if (pw === DASHBOARD_PASSWORD) {
                sessionStorage.setItem("dash_ok", "1");
                setAuthed(true);
              } else {
                alert("Wrong password.");
              }
            }}
          >
            <h2>Staff sign-in</h2>
            <input
              className="input"
              type="password"
              placeholder="Password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              autoFocus
            />
            <button className="btn btn-green">Enter</button>
          </form>
        </main>
      </div>
    );
  }

  return (
    <div className="page">
      <Header />
      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={"tab" + (tab === t.key ? " active" : "")}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </nav>
      <main className="main">
        {tab === "appointments" && <Appointments />}
        {tab === "submissions" && <Submissions onRegistered={() => setRegRefresh((n) => n + 1)} />}
        {tab === "registered" && <Registered refreshKey={regRefresh} />}
        {tab === "biometrics" && <Biometrics />}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="header">
      <div className="header-inner">
        <div className="badge">ID</div>
        <div className="brand">
          <span className="brand-title">ID Registration Service</span>
          <span className="brand-sub">Client management dashboard</span>
        </div>
      </div>
    </header>
  );
}
