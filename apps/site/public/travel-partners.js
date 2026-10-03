// Stay22 LetMeAllez loader (lmaID 6aa23f525191d7967c10372e) — monetizes
// accommodation links/maps on gameday travel surfaces. Served same-origin so
// no inline script is needed (same pattern as /ga4.js).
(function (s, t, a, y, twenty, two) {
  s.Stay22 = s.Stay22 || {};
  s.Stay22.params = { lmaID: "6aa23f525191d7967c10372e" };
  twenty = t.createElement(a);
  two = t.getElementsByTagName(a)[0];
  twenty.async = 1;
  twenty.src = y;
  two.parentNode.insertBefore(twenty, two);
})(window, document, "script", "https://scripts.stay22.com/letmeallez.js");
