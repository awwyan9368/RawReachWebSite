const header = document.querySelector("[data-header]");
const navToggle = document.querySelector("[data-nav-toggle]");
const navMenu = document.querySelector("[data-nav-menu]");
const revealItems = document.querySelectorAll(".reveal");
const statNumbers = document.querySelectorAll("[data-count]");
const contactForm = document.querySelector("[data-contact-form]");
const formStatus = document.querySelector("[data-form-status]");
const whatsapp = document.querySelector("[data-whatsapp]");
const whatsappToggle = document.querySelector("[data-whatsapp-toggle]");
const whatsappClose = document.querySelector("[data-whatsapp-close]");
const tickerTrack = document.querySelector(".ticker-track");

if (tickerTrack) {
  tickerTrack.innerHTML += tickerTrack.innerHTML;
}

const setHeaderState = () => {
  header?.classList.toggle("is-scrolled", window.scrollY > 18);
};

setHeaderState();
window.addEventListener("scroll", setHeaderState, { passive: true });

navToggle?.addEventListener("click", () => {
  const isOpen = navMenu.classList.toggle("is-open");
  navToggle.setAttribute("aria-expanded", String(isOpen));
  document.body.classList.toggle("menu-open", isOpen);
});

navMenu?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  });
});

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const formatNumber = (value) => {
  if (Number.isInteger(value)) {
    return new Intl.NumberFormat("en-US").format(value);
  }

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value);
};

const animateStat = (element) => {
  if (element.dataset.animated === "true") return;
  element.dataset.animated = "true";

  const target = Number(element.dataset.count || 0);
  const prefix = element.dataset.prefix || "";
  const suffix = element.dataset.suffix || "";

  if (prefersReducedMotion) {
    element.textContent = `${prefix}${formatNumber(target)}${suffix}`;
    return;
  }

  const duration = 1400;
  const start = performance.now();

  const tick = (now) => {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = target * eased;
    const shown = Number.isInteger(target) ? Math.round(current) : Math.round(current * 10) / 10;

    element.textContent = `${prefix}${formatNumber(shown)}${suffix}`;

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      element.textContent = `${prefix}${formatNumber(target)}${suffix}`;
    }
  };

  requestAnimationFrame(tick);
};

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -60px" }
  );

  revealItems.forEach((item) => revealObserver.observe(item));

  const statObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        animateStat(entry.target);
        statObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.45 }
  );

  statNumbers.forEach((item) => statObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
  statNumbers.forEach(animateStat);
}

const setFormStatus = (message, isError = false) => {
  if (!formStatus) return;
  formStatus.textContent = message;
  formStatus.classList.toggle("error", isError);
};

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = contactForm.querySelector("button[type='submit']");
  const formData = new FormData(contactForm);
  const payload = Object.fromEntries(formData.entries());

  submitButton.disabled = true;
  submitButton.dataset.originalText = submitButton.textContent;
  setFormStatus("Sending your inquiry...");

  try {
    const response = await fetch("/api/contact", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok) {
      throw new Error(result.message || "Something went wrong. Please email Raw Reach directly.");
    }

    contactForm.reset();
    setFormStatus("Received. Raw Reach will reply by email with the next step.");
  } catch (error) {
    setFormStatus(error.message || "Could not send right now. Please try again in a minute.", true);
  } finally {
    submitButton.disabled = false;
  }
});

const openWhatsapp = () => whatsapp?.classList.add("is-open");
const closeWhatsapp = () => {
  whatsapp?.classList.remove("is-open");
  sessionStorage.setItem("rawreach-whatsapp-closed", "true");
};

whatsappToggle?.addEventListener("click", () => {
  whatsapp?.classList.toggle("is-open");
});

whatsappClose?.addEventListener("click", closeWhatsapp);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeWhatsapp();
    navMenu?.classList.remove("is-open");
    navToggle?.setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }
});

window.setTimeout(() => {
  if (sessionStorage.getItem("rawreach-whatsapp-closed") !== "true") {
    openWhatsapp();
  }
}, 3400);
