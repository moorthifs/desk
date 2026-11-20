// Service list — edit here to add/remove services. f = filter group, en/ta = names, d/dt = short description.
const SERVICES = [
  // GST
  {f:"gst", ic:"🧾", en:"GST Registration", ta:"GST பதிவு", d:"New GSTIN for proprietors, partnerships and companies.", dt:"தனிநபர், கூட்டாண்மை, நிறுவனங்களுக்கு புதிய GSTIN.", tag:"Popular"},
  {f:"gst", ic:"📅", en:"GST Return Filing", ta:"GST ரிட்டர்ன் தாக்கல்", d:"GSTR-1, GSTR-3B, CMP-08 — monthly and quarterly.", dt:"GSTR-1, GSTR-3B, CMP-08 — மாதாந்திர & காலாண்டு.", tag:"Popular"},
  {f:"gst", ic:"📊", en:"GST Annual Return", ta:"GST ஆண்டு ரிட்டர்ன்", d:"GSTR-9 and GSTR-9C reconciliation.", dt:"GSTR-9 மற்றும் GSTR-9C சரிபார்ப்பு."},
  {f:"gst", ic:"✉️", en:"GST Notice Reply", ta:"GST நோட்டீஸ் பதில்", d:"Replies to ASMT-10, DRC-01, SCN and mismatch notices.", dt:"ASMT-10, DRC-01, SCN மற்றும் பொருத்தமின்மை நோட்டீஸ்களுக்கு பதில்.", tag:"Expert"},
  {f:"gst", ic:"🔁", en:"GST Revocation", ta:"GST ரத்து திரும்பப்பெறல்", d:"Restore a cancelled GST registration.", dt:"ரத்து செய்யப்பட்ட GST பதிவை மீட்டெடுத்தல்."},
  {f:"gst", ic:"❌", en:"GST Cancellation", ta:"GST பதிவு ரத்து", d:"Close your GSTIN properly with final return.", dt:"இறுதி ரிட்டர்னுடன் GSTIN-ஐ முறையாக மூடுதல்."},
  {f:"gst", ic:"🔧", en:"GST Amendment", ta:"GST திருத்தம்", d:"Change address, partners, business details.", dt:"முகவரி, பங்குதாரர், வணிக விவரங்கள் மாற்றம்."},
  {f:"gst", ic:"🚚", en:"E-Way Bill & E-Invoice", ta:"இ-வே பில் & இ-இன்வாய்ஸ்", d:"Setup and generation support.", dt:"அமைப்பு மற்றும் உருவாக்க உதவி."},
  {f:"gst", ic:"🏛️", en:"GST LUT & Refund", ta:"GST LUT & ரீஃபண்ட்", d:"LUT for exporters and GST refund claims.", dt:"ஏற்றுமதியாளர்களுக்கு LUT மற்றும் GST ரீஃபண்ட்."},
  // Income tax & TDS
  {f:"tax", ic:"💼", en:"Income Tax Return (ITR)", ta:"வருமான வரி ரிட்டர்ன்", d:"ITR for salaried, business and professionals.", dt:"சம்பளதாரர், வணிகம், தொழில்முறையாளர்களுக்கு ITR.", tag:"Popular"},
  {f:"tax", ic:"📤", en:"TDS / TCS Return Filing", ta:"TDS / TCS ரிட்டர்ன்", d:"24Q, 26Q, 27Q, 27EQ preparation and upload.", dt:"24Q, 26Q, 27Q, 27EQ தயாரிப்பு மற்றும் பதிவேற்றம்."},
  {f:"tax", ic:"📮", en:"Income Tax Notice Reply", ta:"வருமான வரி நோட்டீஸ் பதில்", d:"143(1), 139(9), 148 and demand notices.", dt:"143(1), 139(9), 148 மற்றும் கோரிக்கை நோட்டீஸ்கள்."},
  {f:"tax", ic:"🔍", en:"Tax Audit", ta:"வரி தணிக்கை", d:"Tax audit support under Section 44AB.", dt:"பிரிவு 44AB கீழ் வரி தணிக்கை உதவி."},
  {f:"tax", ic:"🪪", en:"PAN & TAN Application", ta:"PAN & TAN விண்ணப்பம்", d:"New PAN/TAN, corrections and reprints.", dt:"புதிய PAN/TAN, திருத்தம், மறுஅச்சு."},
  {f:"tax", ic:"🧮", en:"Tax Planning", ta:"வரி திட்டமிடல்", d:"Old vs new regime and legal tax saving.", dt:"பழைய vs புதிய முறை, சட்டப்படி வரி சேமிப்பு."},
  {f:"tax", ic:"📒", en:"Accounting & Bookkeeping", ta:"கணக்கு பராமரிப்பு", d:"Monthly books, P&L and balance sheet.", dt:"மாதாந்திர கணக்குகள், லாப-நஷ்டம், இருப்புநிலை."},
  {f:"tax", ic:"🏦", en:"Project Report & CMA", ta:"திட்ட அறிக்கை & CMA", d:"For bank loans, MUDRA and subsidies.", dt:"வங்கிக் கடன், முத்ரா, மானியங்களுக்கு."},
  // Business registration
  {f:"reg", ic:"🏢", en:"Private Limited Company", ta:"பிரைவேட் லிமிடெட் நிறுவனம்", d:"Complete company incorporation with MCA.", dt:"MCA-வில் முழுமையான நிறுவனப் பதிவு."},
  {f:"reg", ic:"🤝", en:"LLP Registration", ta:"LLP பதிவு", d:"Limited Liability Partnership setup.", dt:"வரையறுக்கப்பட்ட பொறுப்பு கூட்டாண்மை அமைப்பு."},
  {f:"reg", ic:"👥", en:"Partnership Firm", ta:"கூட்டாண்மை நிறுவனம்", d:"Partnership deed and firm registration.", dt:"கூட்டாண்மை ஒப்பந்தம் மற்றும் பதிவு."},
  {f:"reg", ic:"👤", en:"One Person Company (OPC)", ta:"ஒரு நபர் நிறுவனம் (OPC)", d:"Company structure for a single owner.", dt:"ஒரே உரிமையாளருக்கான நிறுவன அமைப்பு."},
  {f:"reg", ic:"🏪", en:"Proprietorship Setup", ta:"தனி உரிமையாளர் வணிகம்", d:"GST, MSME and bank-account ready.", dt:"GST, MSME மற்றும் வங்கிக் கணக்கு தயார்."},
  {f:"reg", ic:"🏭", en:"MSME / Udyam Registration", ta:"MSME / உத்யம் பதிவு", d:"Udyam certificate for subsidies and loans.", dt:"மானியம் மற்றும் கடனுக்கு உத்யம் சான்றிதழ்.", tag:"Popular"},
  {f:"reg", ic:"🚀", en:"Startup India (DPIIT)", ta:"ஸ்டார்ட்அப் இந்தியா", d:"DPIIT recognition for startups.", dt:"ஸ்டார்ட்அப்களுக்கு DPIIT அங்கீகாரம்."},
  {f:"reg", ic:"🙏", en:"Trust / Society / Section 8", ta:"டிரஸ்ட் / சொசைட்டி / பிரிவு 8", d:"NGO registration, 12A and 80G.", dt:"NGO பதிவு, 12A மற்றும் 80G."},
  // Licences
  {f:"lic", ic:"🍽️", en:"FSSAI Food Licence", ta:"FSSAI உணவு உரிமம்", d:"Basic registration, state and central licence.", dt:"அடிப்படை பதிவு, மாநில & மத்திய உரிமம்."},
  {f:"lic", ic:"🌍", en:"Import Export Code (IEC)", ta:"இறக்குமதி ஏற்றுமதி குறியீடு", d:"IEC from DGFT for import/export business.", dt:"DGFT-யிடமிருந்து IEC."},
  {f:"lic", ic:"🏬", en:"Shop & Establishment", ta:"கடை & நிறுவன பதிவு", d:"Tamil Nadu shops and establishments registration.", dt:"தமிழ்நாடு கடைகள் மற்றும் நிறுவனங்கள் பதிவு."},
  {f:"lic", ic:"🏷️", en:"Trade Licence", ta:"வர்த்தக உரிமம்", d:"Municipality / panchayat trade licence.", dt:"நகராட்சி / ஊராட்சி வர்த்தக உரிமம்."},
  {f:"lic", ic:"🔐", en:"Digital Signature (DSC)", ta:"டிஜிட்டல் கையொப்பம் (DSC)", d:"Class 3 DSC for GST, MCA, tenders.", dt:"GST, MCA, டெண்டர்களுக்கு Class 3 DSC."},
  {f:"lic", ic:"🛒", en:"GeM Registration", ta:"GeM பதிவு", d:"Sell to government on GeM portal.", dt:"GeM போர்டலில் அரசுக்கு விற்பனை."},
  // IP
  {f:"ip", ic:"™️", en:"Trademark Registration", ta:"வர்த்தக முத்திரை பதிவு", d:"Protect your brand name and logo.", dt:"உங்கள் பிராண்ட் பெயர் மற்றும் லோகோவைப் பாதுகாக்கவும்."},
  {f:"ip", ic:"📝", en:"Trademark Objection Reply", ta:"வர்த்தக முத்திரை ஆட்சேபனை பதில்", d:"Reply to examination reports.", dt:"பரிசோதனை அறிக்கைக்கு பதில்."},
  {f:"ip", ic:"♻️", en:"Trademark Renewal", ta:"வர்த்தக முத்திரை புதுப்பித்தல்", d:"Renew every 10 years.", dt:"ஒவ்வொரு 10 ஆண்டுக்கும் புதுப்பித்தல்."},
  {f:"ip", ic:"©️", en:"Copyright Registration", ta:"பதிப்புரிமை பதிவு", d:"For software, artwork, books and content.", dt:"மென்பொருள், கலை, புத்தகங்களுக்கு."},
  // Compliance & payroll
  {f:"comp", ic:"📁", en:"ROC Annual Filing", ta:"ROC ஆண்டு தாக்கல்", d:"AOC-4, MGT-7 and LLP Form 8/11.", dt:"AOC-4, MGT-7, LLP படிவம் 8/11."},
  {f:"comp", ic:"🧑‍💼", en:"Director KYC & Changes", ta:"இயக்குநர் KYC & மாற்றங்கள்", d:"DIR-3 KYC, add/remove directors.", dt:"DIR-3 KYC, இயக்குநர் சேர்த்தல்/நீக்குதல்."},
  {f:"comp", ic:"👷", en:"PF & ESI Registration / Returns", ta:"PF & ESI பதிவு / ரிட்டர்ன்", d:"Employer registration and monthly returns.", dt:"முதலாளி பதிவு மற்றும் மாதாந்திர ரிட்டர்ன்."},
  {f:"comp", ic:"💰", en:"Payroll Processing", ta:"சம்பளப் பட்டியல்", d:"Salary slips, PT and Form 16.", dt:"சம்பளச் சீட்டு, தொழில் வரி, படிவம் 16."},
  {f:"comp", ic:"📄", en:"Professional Tax", ta:"தொழில் வரி", d:"PT registration and payment support.", dt:"தொழில் வரி பதிவு மற்றும் செலுத்தல்."},
  {f:"comp", ic:"📃", en:"Agreements & Deeds", ta:"ஒப்பந்தங்கள் & பத்திரங்கள்", d:"Rent, partnership and service agreements.", dt:"வாடகை, கூட்டாண்மை, சேவை ஒப்பந்தங்கள்."},
];

const WA = "918190049996";
let lang = "en";
try { lang = localStorage.getItem("mfs_lang") || "en"; } catch(e) {}

const grid = document.getElementById("serviceGrid");
const select = document.getElementById("serviceSelect");
let filter = "all";

function waLink(text){ return `https://wa.me/${WA}?text=${encodeURIComponent(text)}`; }

function renderServices(){
  const items = SERVICES.filter(s => filter === "all" || s.f === filter);
  grid.innerHTML = items.map(s => `
    <a class="card" target="_blank" rel="noopener" href="${waLink(`Hello Moorthi Financial Services, I need help with: ${s.en}`)}">
      ${s.tag ? `<span class="tag">${s.tag}</span>` : ""}
      <span class="ic">${s.ic}</span>
      <h3>${lang === "ta" ? s.ta : s.en}</h3>
      <p>${lang === "ta" ? s.dt : s.d}</p>
      <span class="go">${lang === "ta" ? "WhatsApp-ல் விசாரிக்க →" : "Enquire on WhatsApp →"}</span>
    </a>`).join("");
}

function renderSelect(){
  const other = lang === "ta" ? "மற்றவை / தெரியவில்லை" : "Other / not sure";
  select.innerHTML = SERVICES.map(s => `<option value="${s.en}">${lang === "ta" ? s.ta : s.en}</option>`).join("")
    + `<option value="TDS upload">TDS upload</option><option value="Insurance">${lang === "ta" ? "காப்பீடு" : "Insurance"}</option><option value="Other">${other}</option>`;
}

function applyLang(){
  document.documentElement.lang = lang;
  document.body.classList.toggle("ta", lang === "ta");
  document.querySelectorAll("[data-en]").forEach(el => {
    const v = el.getAttribute(lang === "ta" ? "data-ta" : "data-en");
    if (v) el.innerHTML = v;
  });
  document.getElementById("langBtn").textContent = lang === "ta" ? "English" : "தமிழ்";
  renderServices(); renderSelect();
}

document.getElementById("langBtn").addEventListener("click", () => {
  lang = lang === "ta" ? "en" : "ta";
  try { localStorage.setItem("mfs_lang", lang); } catch(e) {}
  applyLang();
});

document.getElementById("filters").addEventListener("click", e => {
  const b = e.target.closest(".chip"); if (!b) return;
  document.querySelectorAll(".chip").forEach(c => c.classList.toggle("active", c === b));
  filter = b.dataset.f; renderServices();
});

const nav = document.getElementById("nav");
document.getElementById("menuBtn").addEventListener("click", () => nav.classList.toggle("open"));
nav.addEventListener("click", e => { if (e.target.tagName === "A") nav.classList.remove("open"); });

document.getElementById("enquiry").addEventListener("submit", e => {
  e.preventDefault();
  const f = new FormData(e.target);
  const text = `Hello Moorthi Financial Services,\nName: ${f.get("name")}\nTown: ${f.get("town") || "-"}\nService: ${f.get("service")}\n${f.get("msg") ? "Message: " + f.get("msg") : ""}`;
  window.open(waLink(text.trim()), "_blank", "noopener");
});

document.getElementById("yr").textContent = new Date().getFullYear();
applyLang();
