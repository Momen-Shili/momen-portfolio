// Runs before first paint (loaded synchronously from <head>): picks game or plain mode and the
// saved colour theme so there is no flash of the wrong one. External, so the CSP needs no inline script.
(function () {
  var h = document.documentElement;
  h.classList.remove("no-js");
  h.classList.add("js");
  try {
    var t = localStorage.getItem("momen-portfolio:v1:theme");
    if (t !== "light" && t !== "dark") {
      t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    }
    h.dataset.theme = t;
  } catch {
    // storage blocked: keep the defaults
  }
  var plain = /[?&]plain\b/.test(location.search);
  h.classList.add(plain ? "mode-plain" : "mode-game");
  if (!plain) {
    // The game is always dark, whatever the page theme.
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute("content", "#1b1423");
  }
})();
