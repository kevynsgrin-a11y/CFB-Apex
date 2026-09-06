# Visual QA protocol

Accepted captures cover homepage, scores, game preview, portal, playoff, coaching, DFS, and stadium routes at the desktop and mobile in-app Browser viewport caps (1425×990 and 375×811 captured content areas), plus the disclosure dialog. The checked states include Clean Mode, disclosed mode, long names, unavailable weather/broadcast, delayed/postponed fixtures, and unavailable providers.

No horizontal page overflow or sticky collisions were observed across the eight route pairs. All visible controls are linked, functional, or truthfully disabled. The native dialog restores focus to its trigger; reduced-motion and forced-color CSS are present. Automated visual verification requires all 17 artifacts and exact captured dimensions. Full screen-reader, 200% zoom, 400% text, and measured contrast testing remain public-launch follow-ups.

Accepted screenshots are stored in `artifacts/visual-qa/` and validated by `npm run test:visual`.
