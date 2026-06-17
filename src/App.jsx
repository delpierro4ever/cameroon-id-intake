import { useRef, useState } from "react";

/* ──────────────────────────────────────────────────────────────
   CONFIG — replace with your real WhatsApp number (country code,
   no "+", no spaces). Example for Cameroon: 237671234567
   ────────────────────────────────────────────────────────────── */
const YOUR_WHATSAPP = "237652301400";

/* Reference data */
// Dropdown options are { value, label }: `value` stays English (it is what
// gets copied into the government portal via the WhatsApp message), while
// `label` shows both languages on screen.
const REGIONS = [
  { value: "Adamawa", label: "Adamawa / Adamaoua" },
  { value: "Centre", label: "Centre" },
  { value: "East", label: "East / Est" },
  { value: "Far North", label: "Far North / Extrême-Nord" },
  { value: "Littoral", label: "Littoral" },
  { value: "North", label: "North / Nord" },
  { value: "North-West", label: "North-West / Nord-Ouest" },
  { value: "South", label: "South / Sud" },
  { value: "South-West", label: "South-West / Sud-Ouest" },
  { value: "West", label: "West / Ouest" },
];

const ETHNIC_GROUPS = [
  { value: "BAMILEKE", label: "BAMILEKE" },
  { value: "BASSA", label: "BASSA" },
  { value: "BETI", label: "BETI" },
  { value: "DOUALA", label: "DOUALA" },
  { value: "FULFIDE", label: "FULFIDE" },
  { value: "MBO", label: "MBO" },
  { value: "MAKA", label: "MAKA" },
  { value: "TIKARI", label: "TIKARI" },
  { value: "HAUSA", label: "HAUSA" },
  { value: "OTHER", label: "OTHER / AUTRE" },
];

/* Field definitions, grouped into the three sections.
   `full: true` makes a field span both grid columns. */
const SECTIONS = [
  {
    title: "Personal Data / Données personnelles",
    fields: [
      { name: "givenNames", label: "Given names / Prénoms", type: "text" },
      { name: "surname", label: "Surname(s) / Nom(s)", type: "text" },
      { name: "gender", label: "Gender / Sexe", type: "gender" },
      {
        name: "maritalStatus",
        label: "Marital status / Situation matrimoniale",
        type: "select",
        options: [
          { value: "SINGLE", label: "SINGLE / CÉLIBATAIRE" },
          { value: "MARRIED", label: "MARRIED / MARIÉ(E)" },
          { value: "DIVORCED", label: "DIVORCED / DIVORCÉ(E)" },
          { value: "WIDOWED", label: "WIDOWED / VEUF(VE)" },
        ],
      },
      { name: "height", label: "Height (cm) / Taille (cm)", type: "number" },
      {
        name: "complexion",
        label: "Complexion / Teint",
        type: "select",
        options: [
          { value: "LIGHT", label: "LIGHT / CLAIR" },
          { value: "MEDIUM", label: "MEDIUM / MOYEN" },
          { value: "DARK", label: "DARK / FONCÉ" },
        ],
      },
      {
        name: "specialMarks",
        label: "Special marks / Signes particuliers",
        type: "text",
      },
      {
        name: "cameroonianBy",
        label: "Cameroonian By / Camerounais par",
        type: "select",
        options: [
          { value: "Birth", label: "Birth / Naissance" },
          { value: "Afiliation", label: "Afiliation / Filiation" },
          { value: "Naturalization", label: "Naturalization / Naturalisation" },
        ],
      },
      {
        name: "ethnicGroup",
        label: "Ethnic Group / Groupe ethnique",
        type: "select",
        options: ETHNIC_GROUPS,
      },
      {
        name: "mobilePhone",
        label: "Mobile phone / Téléphone portable",
        type: "tel",
      },
      {
        name: "dateOfBirth",
        label: "Date of birth / Date de naissance",
        type: "date",
      },
      {
        name: "birthCountry",
        label: "Birth Country / Pays de naissance",
        type: "text",
      },
      {
        name: "birthRegion",
        label: "Birth Region / Région de naissance",
        type: "select",
        options: REGIONS,
      },
      {
        name: "birthDepartment",
        label: "Birth Department / Département de naissance",
        type: "text",
      },
      {
        name: "birthLocality",
        label: "Birth locality / Localité de naissance",
        type: "text",
      },
      { name: "occupation", label: "Occupation / Profession", type: "text" },
    ],
  },
  {
    title: "Residential Address / Adresse de résidence",
    fields: [
      { name: "resCountry", label: "Country / Pays", type: "text" },
      {
        name: "resRegion",
        label: "Region / Région",
        type: "select",
        options: REGIONS,
      },
      {
        name: "resDepartment",
        label: "Department / Département",
        type: "text",
      },
      { name: "resLocation", label: "Location / Lieu", type: "text" },
      { name: "resAddress", label: "Address / Adresse", type: "text" },
    ],
  },
  {
    title: "Parent Data / Filiation",
    fields: [
      {
        name: "motherSurname",
        label: "Mother's surname(s) / Nom(s) de la mère",
        type: "text",
      },
      {
        name: "fatherSurname",
        label: "Father's surname(s) / Nom(s) du père",
        type: "text",
      },
    ],
  },
];

/* Flat, ordered list of every field name — used for validation order
   and for scrolling to the first empty field. */
const FIELD_ORDER = SECTIONS.flatMap((s) => s.fields.map((f) => f.name));

const INITIAL_FORM = {
  givenNames: "",
  surname: "",
  gender: "",
  maritalStatus: "",
  height: "",
  complexion: "",
  specialMarks: "NIL",
  cameroonianBy: "",
  ethnicGroup: "",
  mobilePhone: "",
  dateOfBirth: "",
  birthCountry: "CAMEROON",
  birthRegion: "",
  birthDepartment: "",
  birthLocality: "",
  occupation: "",
  resCountry: "CAMEROON",
  resRegion: "",
  resDepartment: "",
  resLocation: "",
  resAddress: "",
  motherSurname: "",
  fatherSurname: "",
};

/* yyyy-mm-dd  ->  dd.mm.yyyy */
function formatDob(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
}

/* Build the exact plain-text WhatsApp message. */
function buildMessage(f) {
  const lines = [
    `🪪 *ID REGISTRATION — ${f.surname.toUpperCase()} ${f.givenNames}*`,
    ``,
    `*── PERSONAL DATA ──*`,
    `Given names: ${f.givenNames}`,
    `Surname(s): ${f.surname}`,
    `Gender: ${f.gender}`,
    `Marital status: ${f.maritalStatus}`,
    `Height (cm): ${f.height}`,
    `Complexion: ${f.complexion}`,
    `Special marks: ${f.specialMarks}`,
    `Cameroonian By: ${f.cameroonianBy}`,
    `Ethnic Group: ${f.ethnicGroup}`,
    `Mobile phone: ${f.mobilePhone}`,
    `Date of birth: ${formatDob(f.dateOfBirth)}`,
    `Birth Country: ${f.birthCountry}`,
    `Birth Region: ${f.birthRegion}`,
    `Birth Department: ${f.birthDepartment}`,
    `Birth locality: ${f.birthLocality}`,
    `Occupation: ${f.occupation}`,
    ``,
    `*── RESIDENTIAL ADDRESS ──*`,
    `Country: ${f.resCountry}`,
    `Region: ${f.resRegion}`,
    `Department: ${f.resDepartment}`,
    `Location: ${f.resLocation}`,
    `Address: ${f.resAddress}`,
    ``,
    `*── PARENT DATA ──*`,
    `Mother's surname(s): ${f.motherSurname}`,
    `Father's surname(s): ${f.fatherSurname}`,
  ];
  return lines.join("\n");
}

function Header() {
  return (
    <header className="mc-header">
      <div className="mc-header-inner">
        <div className="mc-badge">ID</div>
        <div className="mc-brand">
          <span className="mc-brand-title">National ID Registration</span>
          <span className="mc-brand-sub">
            Enregistrement CNI · Douala, Cameroun
          </span>
        </div>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="mc-footer">
      <strong>Douala, Cameroun</strong> · Douala, Cameroon
    </footer>
  );
}

const WhatsAppIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.82 11.82 0 0 1 8.413 3.488 11.82 11.82 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.82 9.82 0 0 0 1.523 5.234l-.999 3.648 3.965-1.581zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
  </svg>
);

export default function App() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState({});
  const [showSummaryError, setShowSummaryError] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const refs = useRef({});

  const setField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
    // Clear this field's error as the user types.
    setErrors((prev) => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const newErrors = {};
    FIELD_ORDER.forEach((name) => {
      if (!String(form[name]).trim()) {
        newErrors[name] = "Required / Obligatoire";
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setShowSummaryError(true);
      const firstInvalid = FIELD_ORDER.find((n) => newErrors[n]);
      const el = refs.current[firstInvalid];
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        if (typeof el.focus === "function") el.focus({ preventScroll: true });
      }
      return;
    }

    const message = buildMessage(form);
    window.open(
      `https://wa.me/${YOUR_WHATSAPP}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
    setShowSummaryError(false);
    setSubmitted(true);
  };

  const handleReset = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setShowSummaryError(false);
    setSubmitted(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (submitted) {
    return (
      <div className="mc-page">
        <Header />
        <main className="mc-success">
          <div className="mc-success-card">
            <div className="mc-check">✓</div>
            <h2>Sent to WhatsApp / Envoyé sur WhatsApp</h2>
            <p>
              WhatsApp opened with the details for{" "}
              <strong>
                {form.surname.toUpperCase()} {form.givenNames}
              </strong>
              . If it didn't open, allow pop-ups for this site.
              <br />
              Si WhatsApp ne s'est pas ouvert, autorisez les pop-ups.
            </p>
            <button className="mc-submit" type="button" onClick={handleReset}>
              Submit Another / Nouveau formulaire
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const renderField = (field) => {
    const { name, label, type, options, full } = field;
    const hasError = Boolean(errors[name]);
    const inputClass = `mc-input${hasError ? " mc-input-error" : ""}`;

    let control;
    if (type === "select") {
      control = (
        <select
          id={name}
          ref={(el) => (refs.current[name] = el)}
          className={inputClass}
          value={form[name]}
          onChange={(e) => setField(name, e.target.value)}
        >
          <option value="" disabled>
            Select… / Choisir…
          </option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    } else if (type === "gender") {
      control = (
        <div
          className={`mc-toggle${hasError ? " has-error" : ""}`}
          ref={(el) => (refs.current[name] = el)}
          tabIndex={-1}
        >
          {[
            { value: "MALE", label: "MALE / MASCULIN" },
            { value: "FEMALE", label: "FEMALE / FÉMININ" },
          ].map((g) => (
            <button
              key={g.value}
              type="button"
              className={`mc-toggle-btn${
                form[name] === g.value ? " active" : ""
              }`}
              onClick={() => setField(name, g.value)}
            >
              {g.label}
            </button>
          ))}
        </div>
      );
    } else {
      control = (
        <input
          id={name}
          ref={(el) => (refs.current[name] = el)}
          className={inputClass}
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={form[name]}
          onChange={(e) => setField(name, e.target.value)}
        />
      );
    }

    return (
      <div
        className={`mc-field${full ? " mc-field-full" : ""}`}
        key={name}
      >
        <label className="mc-label" htmlFor={name}>
          {label}
          <span className="mc-req" aria-hidden="true">
            *
          </span>
        </label>
        {control}
        {hasError && <span className="mc-error">{errors[name]}</span>}
      </div>
    );
  };

  return (
    <div className="mc-page">
      <Header />
      <main className="mc-main">
        <p className="mc-intro">
          Fill in the applicant's details below. On submit, a pre-formatted
          message opens in <strong>WhatsApp</strong>.
          <br />
          Remplissez les informations ci-dessous. À l'envoi, un message
          pré-formaté s'ouvre dans <strong>WhatsApp</strong>.
          <br />
          <span className="mc-required-note">
            All fields are required. / Tous les champs sont obligatoires.
          </span>
        </p>

        <form onSubmit={handleSubmit} noValidate>
          {showSummaryError && (
            <div className="mc-form-error">
              Please fill in all fields. / Veuillez remplir tous les champs.
            </div>
          )}

          {SECTIONS.map((section) => (
            <section className="mc-card" key={section.title}>
              <h2 className="mc-section-title">{section.title}</h2>
              <div className="mc-grid">
                {section.fields.map(renderField)}
              </div>
            </section>
          ))}

          <button className="mc-submit" type="submit">
            <WhatsAppIcon />
            Send to WhatsApp / Envoyer
          </button>
        </form>
      </main>
      <Footer />
    </div>
  );
}
