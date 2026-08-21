/* ============================================================
   GILULA SPORT — ენის გადამრთველი (ქართული ⇄ English)
   ------------------------------------------------------------
   მთარგმნელი Google Translate-ია, ამიტომ ითარგმნება ყველაფერი:
   მენიუც, სლაიდერიც და ბაზიდან ჩატვირთული სიახლეებიც.

   ბაზაში და ადმინ პანელში არაფერი იცვლება — ტექსტი ქართულად
   ინახება, თარგმანი მხოლოდ ვიზიტორის ბრაუზერში ხდება.

   Google-ის საკუთარი პანელი დამალულია (იხ. style.css) და
   გადართვას ჩვენი დროშის ღილაკები აკეთებენ.
   ============================================================ */

/* ---------- 1. დროშები ---------- */

const FLAGS = {
  ka: `<svg viewBox="0 0 30 20" aria-hidden="true">
         <rect width="30" height="20" fill="#fff"/>
         <rect x="12.5" width="5" height="20" fill="#ff0000"/>
         <rect y="7.5" width="30" height="5" fill="#ff0000"/>
         <g fill="#ff0000">
           <g transform="translate(6.25,3.75)"><path d="M-.8-2.4h1.6v1.6h1.6v1.6H.8v1.6H-.8V.8h-1.6V-.8h1.6z"/></g>
           <g transform="translate(23.75,3.75)"><path d="M-.8-2.4h1.6v1.6h1.6v1.6H.8v1.6H-.8V.8h-1.6V-.8h1.6z"/></g>
           <g transform="translate(6.25,16.25)"><path d="M-.8-2.4h1.6v1.6h1.6v1.6H.8v1.6H-.8V.8h-1.6V-.8h1.6z"/></g>
           <g transform="translate(23.75,16.25)"><path d="M-.8-2.4h1.6v1.6h1.6v1.6H.8v1.6H-.8V.8h-1.6V-.8h1.6z"/></g>
         </g>
       </svg>`,

  en: `<svg viewBox="0 0 30 20" aria-hidden="true">
         <rect width="30" height="20" fill="#012169"/>
         <path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/>
         <path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" stroke-width="2"/>
         <path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6"/>
         <path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="3.5"/>
       </svg>`
};

const LANGS = [
  { code: "ka", label: "ქართული" },
  { code: "en", label: "English" }
];

/* ---------- 2. მიმდინარე ენა ---------- */
/* Google ინახავს არჩევანს "googtrans" ქუქიში: /ka/en ნიშნავს
   „ქართულიდან ინგლისურად“. ქუქის გარეშე გვერდი ორიგინალშია. */

const LANG_COOKIE = "googtrans";

function currentLang() {
  const match = document.cookie.match(/(?:^|;\s*)googtrans=([^;]*)/);
  if (!match) return "ka";
  return decodeURIComponent(match[1]).split("/")[2] || "ka";
}

/* ქუქი ყველა შესაძლო დომენზე იწერება/იშლება, რომ localhost-ზეც
   და ნამდვილ დომენზეც ერთნაირად იმუშაოს. */
function cookieDomains() {
  const host = location.hostname;
  return host && host.includes(".") ? [null, host, "." + host] : [null, host];
}

function setLang(lang) {
  cookieDomains().forEach(domain => {
    const base = `${LANG_COOKIE}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;
    document.cookie = domain ? `${base} domain=${domain};` : base;
  });

  if (lang !== "ka") {
    cookieDomains().forEach(domain => {
      const base = `${LANG_COOKIE}=/ka/${lang}; path=/;`;
      document.cookie = domain ? `${base} domain=${domain};` : base;
    });
  }

  location.reload();
}

/* ---------- 3. ღილაკები ---------- */

function renderLangSwitch() {
  const box = document.getElementById("langSwitch");
  if (!box) return;

  const active = currentLang();

  box.innerHTML = LANGS.map(({ code, label }) => `
    <button type="button" class="lang__btn${code === active ? " is-active" : ""}"
            data-lang="${code}" title="${label}" aria-label="${label}">
      ${FLAGS[code]}
    </button>`).join("");

  box.querySelectorAll(".lang__btn").forEach(button => {
    button.addEventListener("click", () => {
      if (button.dataset.lang !== active) setLang(button.dataset.lang);
    });
  });
}

renderLangSwitch();

/* ---------- 4. Google Translate ---------- */
/* ამ ფუნქციას თვითონ Google-ის სკრიპტი იძახებს ჩატვირთვისას. */

function googleTranslateElementInit() {
  new google.translate.TranslateElement({
    pageLanguage: "ka",
    includedLanguages: "ka,en",
    autoDisplay: false
  }, "google_translate_element");
}
