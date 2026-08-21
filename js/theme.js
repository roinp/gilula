/* ============================================================
   GILULA SPORT — მუქი / ღია თემა
   ------------------------------------------------------------
   ნაგულისხმევი მუქია — ზუსტად ისეთი, როგორიც აქამდე იყო.
   ვიზიტორის არჩევანი მის ბრაუზერში ინახება
   (localStorage → "gilula-theme"), ამიტომ ყველა გვერდზე და
   შემდეგ ვიზიტზეც იგივე თემა ჩაირთვება.

   ფაილი <head>-შია ჩართული და თემას მაშინვე აყენებს, სანამ
   გვერდი დაიხატება — ასე ღია თემაზე მუქი ციმციმი არ ჩანს.

   ფერები style.css-შია: :root — მუქი, :root[data-theme="light"] — ღია.
   ============================================================ */

(function () {

  const KEY  = "gilula-theme";
  const root = document.documentElement;

  /* private/incognito რეჟიმში localStorage შეიძლება საერთოდ არ იმუშაოს,
     ამიტომ კითხვაც და ჩაწერაც დაცულია */
  function stored() {
    try { return localStorage.getItem(KEY); } catch (error) { return null; }
  }

  function remember(theme) {
    try { localStorage.setItem(KEY, theme); } catch (error) { /* არ დაიმახსოვრა — არა უშავს */ }
  }

  function apply(theme) {
    root.setAttribute("data-theme", theme);

    const button = document.getElementById("themeBtn");
    if (button) {
      // ღილაკი იმ თემას სთავაზობს, რომელზეც გადავა
      const next = theme === "dark" ? "ღია თემა" : "მუქი თემა";
      button.setAttribute("aria-label", next);
      button.setAttribute("title", next);
    }
  }

  let theme = stored() === "light" ? "light" : "dark";
  apply(theme);

  document.addEventListener("DOMContentLoaded", () => {
    const button = document.getElementById("themeBtn");
    if (!button) return;

    apply(theme);   // ღილაკს ახლა უკვე აქვს სწორი წარწერა

    button.addEventListener("click", () => {
      theme = theme === "dark" ? "light" : "dark";
      apply(theme);
      remember(theme);
    });
  });

})();
