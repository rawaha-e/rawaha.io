/* ============================================================
   main.js — rawaha.io
   Accessibility settings panel · theme switching · UX enhancements
   IIFE to avoid polluting the global scope.
============================================================ */

(function () {
  "use strict";

  /* ----------------------------------------------------------
     Constants
  ---------------------------------------------------------- */
  var STORAGE_KEY = "rawaha_a11y_prefs";

  /* ----------------------------------------------------------
     DOM refs
  ---------------------------------------------------------- */
  var html           = document.documentElement;
  var body           = document.body;
  var settingsBtn    = document.getElementById("settings-btn");
  var settingsDialog = document.getElementById("settings-dialog");
  var settingsClose  = document.getElementById("settings-close");
  var resetBtn       = document.getElementById("btn-reset");
  var announcer      = document.getElementById("a11y-announcer");
  var themeRadios    = document.querySelectorAll('input[name="theme"]');
  var highContrastCb = document.getElementById("pref-high-contrast");
  var reducedMotionCb= document.getElementById("pref-reduced-motion");
  var dyslexiaCb     = document.getElementById("pref-dyslexia");

  /* ----------------------------------------------------------
     Preference defaults
     Read OS preferences at startup so the site respects them
     out of the box, before any user interaction.
  ---------------------------------------------------------- */
  var osReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var DEFAULTS = {
    theme:        "auto",
    highContrast: false,
    reducedMotion: osReducedMotion,
    dyslexiaFont: false,
  };

  /* ----------------------------------------------------------
     Storage helpers — gracefully handle unavailable storage
     (e.g. private browsing, storage quota exceeded).
  ---------------------------------------------------------- */
  function loadPrefs() {
    try {
      var stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (stored && typeof stored === "object") {
        return Object.assign({}, DEFAULTS, stored);
      }
    } catch (_) { /* silent */ }
    return Object.assign({}, DEFAULTS);
  }

  function savePrefs(prefs) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (_) { /* silent — private browsing, quota, etc. */ }
  }

  /* ----------------------------------------------------------
     Apply preferences to the DOM
  ---------------------------------------------------------- */
  function applyPrefs(prefs) {
    /* Theme — high-contrast takes precedence over light/dark */
    if (prefs.highContrast) {
      html.setAttribute("data-theme", "high-contrast");
    } else if (prefs.theme === "auto") {
      html.removeAttribute("data-theme");
    } else {
      html.setAttribute("data-theme", prefs.theme);
    }

    /* Reduced motion — set attribute so CSS kills animations */
    if (prefs.reducedMotion) {
      html.setAttribute("data-reduced-motion", "");
    } else {
      html.removeAttribute("data-reduced-motion");
    }

    /* Dyslexia font */
    body.classList.toggle("dyslexia-font", Boolean(prefs.dyslexiaFont));
  }

  /* ----------------------------------------------------------
     Sync settings panel UI to reflect current prefs
  ---------------------------------------------------------- */
  function syncUI(prefs) {
    themeRadios.forEach(function (radio) {
      radio.checked = radio.value === prefs.theme;
    });
    highContrastCb.checked  = Boolean(prefs.highContrast);
    reducedMotionCb.checked = Boolean(prefs.reducedMotion);
    dyslexiaCb.checked      = Boolean(prefs.dyslexiaFont);
  }

  /* ----------------------------------------------------------
     Announce a message to screen readers via the live region.
     Uses a double rAF to ensure AT picks up the change reliably.
  ---------------------------------------------------------- */
  function announce(msg) {
    announcer.textContent = "";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        announcer.textContent = msg;
      });
    });
  }

  /* ----------------------------------------------------------
     Settings panel: open / close
  ---------------------------------------------------------- */
  function openDialog() {
    settingsDialog.showModal();
    settingsBtn.setAttribute("aria-expanded", "true");
    /* Focus the first interactive element inside the dialog */
    var first = settingsDialog.querySelector(
      "button, input, [href], [tabindex]:not([tabindex='-1'])"
    );
    if (first) first.focus();
  }

  function closeDialog() {
    settingsDialog.close();
    settingsBtn.setAttribute("aria-expanded", "false");
    settingsBtn.focus();
  }

  settingsBtn.addEventListener("click", openDialog);
  settingsClose.addEventListener("click", closeDialog);

  /* Close when clicking the backdrop (outside dialog box) */
  settingsDialog.addEventListener("click", function (e) {
    var rect = settingsDialog.getBoundingClientRect();
    var outsideX = e.clientX < rect.left || e.clientX > rect.right;
    var outsideY = e.clientY < rect.top  || e.clientY > rect.bottom;
    if (outsideX || outsideY) closeDialog();
  });

  /* Keep aria-expanded in sync when dialog is closed natively (Escape) */
  settingsDialog.addEventListener("close", function () {
    settingsBtn.setAttribute("aria-expanded", "false");
  });

  /* ----------------------------------------------------------
     Focus trap inside the dialog
     Native <dialog showModal()> already inerts the background,
     but we reinforce the Tab cycle for maximum compatibility.
  ---------------------------------------------------------- */
  settingsDialog.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;

    var focusable = Array.prototype.slice.call(
      settingsDialog.querySelectorAll(
        "button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex='-1'])"
      )
    );
    if (focusable.length === 0) return;

    var first = focusable[0];
    var last  = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === first) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });

  /* ----------------------------------------------------------
     Theme radio group
  ---------------------------------------------------------- */
  themeRadios.forEach(function (radio) {
    radio.addEventListener("change", function () {
      var prefs = loadPrefs();
      prefs.theme = radio.value;
      savePrefs(prefs);
      applyPrefs(prefs);
      announce("Theme set to " + radio.value + ".");
    });
  });

  /* ----------------------------------------------------------
     High-contrast toggle
  ---------------------------------------------------------- */
  highContrastCb.addEventListener("change", function () {
    var prefs = loadPrefs();
    prefs.highContrast = highContrastCb.checked;
    savePrefs(prefs);
    applyPrefs(prefs);
    announce("High contrast " + (prefs.highContrast ? "enabled" : "disabled") + ".");
  });

  /* ----------------------------------------------------------
     Reduced-motion toggle
  ---------------------------------------------------------- */
  reducedMotionCb.addEventListener("change", function () {
    var prefs = loadPrefs();
    prefs.reducedMotion = reducedMotionCb.checked;
    savePrefs(prefs);
    applyPrefs(prefs);
    announce("Reduce motion " + (prefs.reducedMotion ? "enabled" : "disabled") + ".");
  });

  /* ----------------------------------------------------------
     Dyslexia font toggle
  ---------------------------------------------------------- */
  dyslexiaCb.addEventListener("change", function () {
    var prefs = loadPrefs();
    prefs.dyslexiaFont = dyslexiaCb.checked;
    savePrefs(prefs);
    applyPrefs(prefs);
    announce(
      "Dyslexia-friendly font " + (prefs.dyslexiaFont ? "enabled" : "disabled") + "."
    );
  });

  /* ----------------------------------------------------------
     Reset to defaults
  ---------------------------------------------------------- */
  resetBtn.addEventListener("click", function () {
    var prefs = Object.assign({}, DEFAULTS);
    savePrefs(prefs);
    syncUI(prefs);
    applyPrefs(prefs);
    announce("Accessibility settings reset to defaults.");
  });

  /* ----------------------------------------------------------
     Smooth scroll — honours reduced-motion preference
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener("click", function (e) {
      var targetId = anchor.getAttribute("href");
      var target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();

      var prefs = loadPrefs();
      var reduceMotion =
        prefs.reducedMotion ||
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      target.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "start",
      });

      /* Move focus to the section for screen readers */
      if (!target.hasAttribute("tabindex")) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus({ preventScroll: true });
    });
  });

  /* ----------------------------------------------------------
     Active nav highlight via IntersectionObserver
  ---------------------------------------------------------- */
  var sections  = document.querySelectorAll("main section[id]");
  var navLinks  = document.querySelectorAll(".main-nav a");

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          navLinks.forEach(function (link) {
            var isActive = link.getAttribute("href") === "#" + entry.target.id;
            link.classList.toggle("active", isActive);
            if (isActive) {
              link.setAttribute("aria-current", "true");
            } else {
              link.removeAttribute("aria-current");
            }
          });
        });
      },
      /* trigger when section occupies middle 20% of viewport */
      { rootMargin: "-40% 0px -55% 0px", threshold: 0 }
    );

    sections.forEach(function (section) { observer.observe(section); });
  }

  /* ----------------------------------------------------------
     Initialise — restore saved preferences on every page load
  ---------------------------------------------------------- */
  var prefs = loadPrefs();
  syncUI(prefs);
  applyPrefs(prefs);

}());
