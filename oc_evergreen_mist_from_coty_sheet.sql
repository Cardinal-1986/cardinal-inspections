-- Evergreen Mist, from OC's 2026 Shingle Color of the Year sheet. APPLIED.
--
-- Theo, on the roof crop from that sheet: "That picture of evergreen mist is
-- exactly what it should look like on a sample."
--
-- ⚠️ DIFFERENT PROVENANCE FROM THE OTHER 21, AND A DIFFERENT STATISTIC —
-- recorded rather than hidden, because silently mixing methods is how a
-- catalog rots.
--
--   The other 21 come from FLAT SWATCH ARTWORK photographed close, and use the
--   LIT field (median at or above the 60th percentile of luminance). There the
--   keyway shadows between courses are a large share of the pixels and drag the
--   mean artificially dark.
--
--   This one comes from a PHOTOGRAPH OF AN INSTALLED ROOF at distance. The
--   plane is uniformly sunlit and the keyways barely resolve, so the MEAN is
--   already the perceived colour. The lit statistic here gives #848C8E — the
--   sunlit granules alone — which reads lighter than the picture looks.
--
-- Same crop, four ways:
--   mean    #687172   <- applied
--   median  #666F70
--   lit     #848C8E
--   was     #5D6557   (estimated, markedly greener)
--
-- The shift is large and the direction is instructive: a roof picks up a great
-- deal of blue from the sky, so Evergreen Mist reads GREY-GREEN up there rather
-- than the saturated green of a chip in the hand. For a render that puts colour
-- on a roof at distance, the roof photograph is the better reference. Theo's
-- call, and rightly his — he has seen Evergreen Mist on a roof in Dayton.
--
-- The COTY sheet carries no swatch strip; it is homeowner marketing, not a
-- colour chart, so nothing else could be taken from it.

update public.oc_colors
   set hex = '#687172', hex_verified = true, updated_at = now()
 where lower(name) = 'evergreen mist';
