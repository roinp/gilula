/* ============================================================
   GILULA SPORT — main script
   1. Mobile menu
   2. Auto slider
   3. Latest news grid
   4. Photo fallback
   5. Footer year
   ============================================================ */

/* ---------- 1. Mobile menu ---------- */
const burger = document.getElementById("burger");
const nav = document.getElementById("nav");

burger.addEventListener("click", () => {
  const isOpen = nav.classList.toggle("is-open");
  burger.classList.toggle("is-open", isOpen);
  burger.setAttribute("aria-expanded", isOpen);
});

// close the menu after a link is clicked (mobile)
nav.querySelectorAll(".nav__link").forEach(link => {
  link.addEventListener("click", () => {
    nav.classList.remove("is-open");
    burger.classList.remove("is-open");
  });
});

/* ---------- 2. Auto slider ---------- */
const track = document.getElementById("sliderTrack");
const slides = track.querySelectorAll(".slide");
const dotsBox = document.getElementById("sliderDots");
const slider = document.getElementById("slider");

let current = 0;
let timer = null;
const DELAY = 5000; // ms

// build one dot per slide
slides.forEach((_, i) => {
  const dot = document.createElement("button");
  dot.className = "dot";
  dot.setAttribute("aria-label", "სლაიდი " + (i + 1));
  dot.addEventListener("click", () => goTo(i));
  dotsBox.appendChild(dot);
});
const dots = dotsBox.querySelectorAll(".dot");

function goTo(index) {
  current = (index + slides.length) % slides.length;
  track.style.transform = `translateX(-${current * 100}%)`;
  dots.forEach((dot, i) => dot.classList.toggle("is-active", i === current));
}

function next() { goTo(current + 1); }
function prev() { goTo(current - 1); }

function startAuto() { timer = setInterval(next, DELAY); }
function stopAuto()  { clearInterval(timer); }
function restartAuto() { stopAuto(); startAuto(); }

document.getElementById("nextBtn").addEventListener("click", () => { next(); restartAuto(); });
document.getElementById("prevBtn").addEventListener("click", () => { prev(); restartAuto(); });

// pause while the mouse is over the slider
slider.addEventListener("mouseenter", stopAuto);
slider.addEventListener("mouseleave", startAuto);

// swipe support on touch devices
let touchStartX = 0;
slider.addEventListener("touchstart", e => { touchStartX = e.touches[0].clientX; }, { passive: true });
slider.addEventListener("touchend", e => {
  const diff = touchStartX - e.changedTouches[0].clientX;
  if (Math.abs(diff) > 50) diff > 0 ? next() : prev();
  restartAuto();
});

goTo(0);
startAuto();

/* ---------- 3. Latest news (12 articles) ---------- */
const articles = [
  {
    category: "ქართული სპორტი",
    image: "images/wrestling.jpg",
    title: "ქართველი მოჭიდავეები ევროპის ჩემპიონატიდან ხუთი მედლით დაბრუნდნენ",
    excerpt: "ნაკრებმა ორი ოქრო, ერთი ვერცხლი და ორი ბრინჯაო მოიპოვა.",
    date: "19 აგვისტო", read: "3 წთ"
  },
  {
    category: "ფეხბურთი",
    image: "images/kvaratskhelia.png",
    title: "ხვიჩა კვარაცხელია სეზონის საუკეთესო მოთამაშის ნომინაციაში მოხვდა",
    excerpt: "ქართველი ნახევარმცველი ევროპის ტოპ ხუთეულშია.",
    date: "19 აგვისტო", read: "2 წთ"
  },
  {
    category: "კალათბურთი",
    image: "images/bitadze.jpg",
    title: "საქართველოს ნაკრებმა საკვალიფიკაციო მატჩი დამაჯერებლად მოიგო",
    excerpt: "თბილისში გამართულ შეხვედრას სრული დარბაზი დაესწრო.",
    date: "18 აგვისტო", read: "4 წთ"
  },
  {
    category: "რაგბი",
    image: "images/rugby.png", fit: "contain",
    title: "ბორჯღალოსნებმა ევროპის ჩემპიონობა კიდევ ერთხელ მოიპოვეს",
    excerpt: "ფინალურ მატჩში მოწინააღმდეგე მინიმალური სხვაობით დამარცხდა.",
    date: "18 აგვისტო", read: "3 წთ"
  },
  {
    category: "MMA",
    image: "images/mma.jpg",
    title: "ქართველი მებრძოლი UFC-ის ოქტაგონში დებიუტს აპირებს",
    excerpt: "ბრძოლა შემოდგომაზე, ლას-ვეგასში გაიმართება.",
    date: "17 აგვისტო", read: "2 წთ"
  },
  {
    category: "ვიდეო",
    image: "images/arveladze.png",
    title: "ტოპ 10 გოლი ეროვნული ლიგის შემოდგომის ნაწილიდან",
    excerpt: "შეარჩიეთ თქვენი ფავორიტი — ვიდეომიმოხილვა.",
    date: "17 აგვისტო", read: "5 წთ"
  },
  {
    category: "ფეხბურთი",
    image: "images/kaladze.png",
    title: "დინამო თბილისმა ევროპული ლიცენზია მიიღო",
    excerpt: "კლუბი ევროპულ ტურნირში მონაწილეობას შეძლებს.",
    date: "16 აგვისტო", read: "3 წთ"
  },
  {
    category: "სხვა",
    image: "images/chess.jpg",
    title: "ქართველი მოჭადრაკე მსოფლიო თასზე ფინალში გავიდა",
    excerpt: "ნახევარფინალში მსოფლიოს მე-3 ნომერი დაამარცხა.",
    date: "16 აგვისტო", read: "4 წთ"
  },
  {
    category: "ფეხბურთი",
    image: "images/mamardashvili.jpg",
    title: "ეროვნულმა ნაკრებმა შესარჩევი ეტაპის კალენდარი გაიგო",
    excerpt: "პირველი მატჩი სექტემბერში, მშობლიურ სტადიონზე იმართება.",
    date: "15 აგვისტო", read: "2 წთ"
  },
  {
    category: "კალათბურთი",
    image: "images/shengelia.jpg",
    title: "თორნიკე შენგელია კარიერის საუკეთესო მაჩვენებელს აუმჯობესებს",
    excerpt: "ბოლო ხუთ მატჩში საშუალოდ 19 ქულას აგროვებს.",
    date: "15 აგვისტო", read: "3 წთ"
  },
  {
    category: "ქართული სპორტი",
    image: "images/judo.png",
    title: "ჯუდოს ნაკრები ახალი ოლიმპიური ციკლისთვის ემზადება",
    excerpt: "სასწავლო-საწვრთნელი შეკრება მთაში დაიწყო.",
    date: "14 აგვისტო", read: "3 წთ"
  },
  {
    category: "სხვა",
    image: "images/stadium.jpg",
    title: "თბილისში თანამედროვე ოლიმპიური ცენტრი გაიხსნება",
    excerpt: "ცენტრი ერთდროულად 12 სპორტის სახეობას მოემსახურება.",
    date: "14 აგვისტო", read: "4 წთ"
  }
];

const newsGrid = document.getElementById("newsGrid");

newsGrid.innerHTML = articles.map(article => `
  <a href="#" class="card">
    <div class="card__thumb">
      <img src="${article.image}" alt="${article.title}"
           class="card__img ${article.fit === "contain" ? "card__img--contain" : ""}" loading="lazy" />
      <span class="card__badge">${article.category}</span>
    </div>
    <div class="card__body">
      <h3 class="card__title">${article.title}</h3>
      <p class="card__excerpt">${article.excerpt}</p>
      <div class="card__meta">
        <span>${article.date}</span>
        <span>${article.read} საკითხავი</span>
      </div>
    </div>
  </a>
`).join("");

/* ---------- 4. Missing photos → keep the green fallback look ---------- */
document.querySelectorAll(".card__img, .slide__photo").forEach(img => {
  const remove = () => {
    if (img.classList.contains("slide__photo")) img.parentElement.classList.add("no-photo");
    img.remove();
  };
  img.addEventListener("error", remove);
  if (img.complete && img.naturalWidth === 0) remove();
});

/* ---------- 5. Footer year ---------- */
document.getElementById("year").textContent = new Date().getFullYear();
