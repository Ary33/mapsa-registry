-- ============================================================================
-- MAPSA — Migration 003: Seed data for MA-BJ-NW-SLAB-02
-- Run in Supabase SQL Editor after 002_overlay_paths.sql
-- ============================================================================
-- IMPORTANT: Replace 'YOUR_ADMIN_UUID' with your actual profile UUID from
-- the profiles table. Run this first to find it:
--   SELECT id FROM profiles WHERE email = 'your-email@montealbanoaxaca.com';
-- ============================================================================

-- Variable for your admin user ID (set this before running)
-- If you can't use DO blocks easily, just find-and-replace YOUR_ADMIN_UUID
-- with your actual UUID string throughout this file.

-- ============================================================================
-- 1. RECORD
-- ============================================================================

INSERT INTO records (
  id, field_id, title, site, area, structure, object_type,
  location_description, date_photographed, photographer,
  record_version, status, description, condition, lighting_notes,
  interpretation_status, segmentation_status,
  background_path, base_overlay_path
) VALUES (
  'MA-BJ-NW-SLAB-02',
  'MA-2026-05-22-001',
  'Conquest slab with toponymic cartouche, inverted figure, and calendrical registers',
  'Monte Albán',
  'Main Plaza / Building J',
  'Building J',
  'carved conquest slab',
  'Northwest face of Building J, embedded in the outer wall. Slab is oriented with the carved face visible to viewers approaching from the north side of the Main Plaza.',
  '2026-05-22',
  'V. Diaz / MAHC',
  '1.0.0',
  ARRAY['IN PROGRESS', 'SEGMENTATION ACTIVE'],
  'A carved conquest slab on the northwest face of Building J at Monte Albán. The composition follows the standard Building J slab format documented by Urcid (2001, Fig. 2.29): a central cartouche containing a toponymic place-name with cross-hatched X panel and dot register, flanked by bilateral scrollwork, surmounted by a headdress or superstructure register, with an inverted human figure in the lower zone. The inverted figure is consistent with the standard "defeated/conquered" reading established by Caso, Marcus, and Urcid. Internal identifier MA-BJ-NW-SLAB-02; external catalogue correspondence (Urcid MA-J-N numbering) not yet confirmed.',
  'Variable preservation across the slab surface. Upper headdress zone and bilateral scrollwork moderately well preserved. Central cartouche shows significant erosion, particularly on the right vertical bar (E20) and several X-panel triangular cells (E27, E28). Lower inverted figure zone has moderate erosion with some carved lines still visible. Several elements require inferred reconstruction from bilateral symmetry and surface discoloration.',
  'Photographed under diffuse natural light. Raking light from the west recommended for future documentation of the lower inverted figure register.',
  'Follows standard Building J conquest slab format. Toponymic identification not yet established. Calendrical registers (dot row E23) require specialist reading.',
  'Active. 28 elements identified. Seven elements (E05, E20, E21, E24, E26, E27, E28) have partial inferred reconstructions based on bilateral symmetry or surface discoloration.',
  'MA-BJ-NW-SLAB-02/MA-BJ-NW-SLAB-02-base.jpg',
  'MA-BJ-NW-SLAB-02/background.png'
);


-- ============================================================================
-- 2. ELEMENTS (28 total, 7 with relief+inferred splits)
-- ============================================================================
-- Overlay paths reference the Supabase Storage bucket 'overlays'.
-- Full URL pattern: https://tqcwiynxzgqmrrwrpgin.supabase.co/storage/v1/object/public/overlays/MA-BJ-NW-SLAB-02/E01.png
-- ============================================================================

-- E01 — Top knob/cap of headdress superstructure
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E01',
  'Small rectangular or trapezoidal form at the apex of the headdress superstructure. Positioned centrally above E19 and E02. Carved in low relief with clear upper and lateral boundaries.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E01.png', 1,
  'Clearly delineated. Top of the vertical compositional axis.'
);

-- E02 — Upper right headdress element
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E02',
  'Curvilinear element on the upper right side of the headdress superstructure. Forms part of the bilateral headdress composition, mirroring elements on the left side.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E02.png', 2,
  'Well preserved. Carved line separating it from E03 below is clearly visible.'
);

-- E03 — Right headdress scroll
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E03',
  'Scroll-form element on the right side of the headdress, below E02. Curving carved form with clear boundaries. Part of the bilateral headdress register.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E03.png', 3,
  'Clear carved boundaries on all sides.'
);

-- E04 — Upper right arm/hand
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E04',
  'Small projecting element at the upper right of the figure, at the junction of the right scrollwork and the central composition. Possible hand or terminal element of the right arm.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E04.png', 4,
  'Small element. Relationship to adjacent scrollwork elements requires further study.'
);

-- E05 — Right hooked element (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E05',
  'Hooked or curved element on the right side of the figure, below E04. Two fragments of a single curved form, separated by surface erosion. Intact counterpart on left side of figure (E18 area) confirms continuous original carving.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E05-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E05-INFERRED.png', 5,
  'Physical discontinuity from erosion, not carved separation. Left-side mirror confirms single element. Relief PNG covers surviving fragments; inferred PNG covers reconstructed connection.'
);

-- E06
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E06',
  'Angular stepped form on the right side of the figure, below E05. Part of the right-side body register. Carved lines separate it from E05 above and E07 below.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E06.png', 6,
  'Well-defined carved boundaries.'
);

-- E07
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E07',
  'Rectilinear stepped element on the right side of the figure, forming part of the right torso or arm register. Positioned between E06 above and E08 below.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E07.png', 7,
  'Clear carved separations on all sides.'
);

-- E08
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E08',
  'Small element at the lower right of the figure body, below E07. Part of the lower right body register, possibly a foot or terminal body element in the inverted orientation.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E08.png', 8,
  'Moderately preserved. Small scale relative to adjacent elements.'
);

-- E09
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E09',
  'Element at the lower right of the composition, below E08. Contributes to the lower right side of the figure body or its framing.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E09.png', 9,
  'Carved boundaries visible under good lighting conditions.'
);

-- E10
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E10',
  'Element at the upper boundary of the lower inverted figure zone. Transitional element between the central body composition and the inverted figure panel below.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E10.png', 10,
  'Position at the junction of two compositional registers.'
);

-- E11 — Lower inverted figure panel
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E11',
  'Large compound panel in the lower zone containing an inverted human figure. When viewed with the slab rotated 180°, the figure shows an upper body with recognizable anthropomorphic features. This is consistent with the standard Building J conquest slab convention of depicting a defeated or conquered figure in inverted orientation (Caso 1928; Marcus 1980; Urcid 2001).',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E11.png', 11,
  'Largest single element on the slab. Internal carved detail is complex but treated as one element because the inverted figure is a unified compositional unit. Future sub-segmentation may be warranted for the internal facial features and body parts.'
);

-- E12 — Diagonal bars
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E12',
  'Set of parallel diagonal bars between the central body and the lower inverted figure zone. Carved as distinct linear forms running at an oblique angle. Possibly structural framing or a conventionalized sign element.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E12.png', 12,
  'Four or five parallel diagonal bars. Clear carved boundaries. Treated as one element because bars share continuous carving without intervening stone between them.'
);

-- E13
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E13',
  'Small vertical element at the lower left of the body register, between E14 and E12. Possibly a dividing marker or minor structural element.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E13.png', 13,
  'Small scale. Clear carved separation from adjacent elements.'
);

-- E14
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E14',
  'Rectilinear element at the lower left of the body register. Part of the left-side lower body composition, mirroring elements in the E08/E09 zone on the right.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E14.png', 14,
  'Moderate preservation.'
);

-- E15
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E15',
  'Rectilinear stepped element on the left side of the figure body, mirroring E07 on the right. Part of the left torso or arm register.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E15.png', 15,
  'Well preserved. Clear bilateral correspondence with right side.'
);

-- E16
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E16',
  'Angular stepped form on the left side of the figure, mirroring E06 on the right. Part of the left-side body register.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E16.png', 16,
  'Well-defined carved boundaries. Clear bilateral mirror of E06.'
);

-- E17
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E17',
  'Large scrollwork element on the left side of the figure, forming the left arm or appendage register. Contains stepped rectilinear sub-forms. Mirrors the right-side scroll composition (E04–E06 area).',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E17.png', 17,
  'Well preserved. One of the larger individual elements. Clear carved boundaries on all sides.'
);

-- E18
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E18',
  'Upper element of the left-side scrollwork, above E17. Includes a projecting terminal form (hand or claw). Mirrors E04/E05 on the right side.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E18.png', 18,
  'Well preserved. The intact state of this element confirms the original continuous form of its eroded right-side counterpart E05.'
);

-- E19 — Left headdress scroll
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E19',
  'Scroll-form element on the left side of the headdress superstructure. Mirrors E03 on the right. Part of the bilateral headdress register above the central cartouche.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E19.png', 19,
  'Well preserved. Clear bilateral mirror of E03.'
);

-- E20 — Right vertical bar (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E20',
  'Vertical bar on the right side of the central cartouche, flanking the X panel. Partial right edge survives; remainder reconstructed from bilateral symmetry with E24 on the left side.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E20-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E20-INFERRED.png', 20,
  'Significant erosion on this element. Inferred reconstruction based on symmetry with E24.'
);

-- E21 — Horizontal band below cartouche (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E21',
  'Horizontal band or bar element below the central cartouche, spanning between the left and right vertical bars. Part of the cartouche framing structure.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E21-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E21-INFERRED.png', 21,
  'Partial preservation. Inferred extent based on compositional symmetry.'
);

-- E22
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E22',
  'Element below E21 on the right side of the cartouche zone. Part of the lower cartouche framing or transitional register between the cartouche and the body composition.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E22.png', 22,
  'Moderately preserved.'
);

-- E23 — Dot row register
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E23',
  'Horizontal register containing a row of circular dot elements below the X panel. The dots are positioned within a horizontal band that forms the lower boundary of the central cartouche. Dot count and spacing require verification under optimal lighting. Potentially related to bar-and-dot numeration conventions documented by Marcus (2006).',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E23.png', 23,
  'Dots are individually carved with clear circular boundaries. Treated as a single element (the dot register) rather than individual dots, as the register band itself is the primary compositional unit. Individual dot identification is a sub-segmentation question.'
);

-- E24 — Left vertical bar (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E24',
  'Vertical bar on the left side of the central cartouche, flanking the X panel. Partial left edge survives; remainder reconstructed from bilateral symmetry with E20 and from surface discoloration.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E24-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E24-INFERRED.png', 24,
  'Partial survival. Serves as reference for reconstructing E20 and vice versa.'
);

-- E25 — Bottom triangle of X
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E25',
  'Triangular cell at the bottom of the cross-hatched X panel within the central cartouche. One of four triangular cells created by the intersecting diagonal lines of the X. Separated from adjacent cells by carved lines.',
  'clear independent element', 'high',
  'MA-BJ-NW-SLAB-02/E25.png', 25,
  'Carved lines clearly separate this cell from E24 (left), E26 (top-left), and adjacent cells. Consistent with methodology: carved lines between shapes = separate elements.'
);

-- E26 — Left triangle of X (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E26',
  'Triangular cell on the left side of the cross-hatched X panel. One of four triangular cells. Partial form survives; remainder inferred from the geometric regularity of the X pattern and from symmetry with E28 on the right.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E26-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E26-INFERRED.png', 26,
  'Erosion on left side. Inferred reconstruction from X-pattern geometry and bilateral symmetry with E28.'
);

-- E27 — Top triangle of X (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E27',
  'Triangular cell at the top of the cross-hatched X panel. One of four triangular cells. Shows erosion; partial form inferred from geometric regularity of the X composition and bilateral symmetry with E25 below.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E27-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E27-INFERRED.png', 27,
  'Upper portion shows weathering. Reconstruction follows X-pattern geometry.'
);

-- E28 — Right triangle of X (RELIEF + INFERRED)
INSERT INTO elements (record_id, label, neutral_description, segmentation_status, confidence, overlay_path, inferred_overlay_path, sort_order, notes)
VALUES (
  'MA-BJ-NW-SLAB-02', 'E28',
  'Triangular cell on the right side of the cross-hatched X panel. One of four triangular cells. Shows erosion on the right edge near the cartouche boundary; partial inferred reconstruction from X-pattern geometry and bilateral symmetry with E26.',
  'probable independent element', 'moderate',
  'MA-BJ-NW-SLAB-02/E28-RELIEF.png',
  'MA-BJ-NW-SLAB-02/E28-INFERRED.png', 28,
  'Right edge erosion. Mirrors E26 across the X center.'
);


-- ============================================================================
-- 3. SOURCES
-- ============================================================================

INSERT INTO sources (author, title, year, publication, pages, notes, related_record_ids)
VALUES
(
  'Caso, Alfonso',
  'Las estelas zapotecas',
  '1928',
  'Monografías del Museo Nacional de Arqueología, Historia y Etnografía',
  'pp. 12–45',
  'Foundational catalog of Monte Albán stelae and conquest slabs. Established the inverted-figure convention as signifying defeated/conquered entities.',
  ARRAY['MA-BJ-NW-SLAB-02', 'MA-ST12-Z01']
),
(
  'Marcus, Joyce',
  'Zapotec Writing',
  '1980',
  'Scientific American 242(2)',
  'pp. 46–60',
  'Overview of Zapotec writing systems with discussion of conquest slab conventions, bar-and-dot numeration, and Building J slab formats.',
  ARRAY['MA-BJ-NW-SLAB-02', 'MA-ST12-Z01']
),
(
  'Marcus, Joyce',
  'Mesoamerica: Scripts',
  '2006',
  'Encyclopedia of Language & Linguistics, vol. 8',
  'pp. 16–27',
  'Bar-and-dot numeration system description. Relevant to dot register E23 on NW-SLAB-02.',
  ARRAY['MA-BJ-NW-SLAB-02']
),
(
  'Urcid, Javier',
  'Zapotec Hieroglyphic Writing',
  '2001',
  'Studies in Pre-Columbian Art and Archaeology, No. 34, Dumbarton Oaks',
  NULL,
  'Comprehensive treatment of Zapotec writing. 508 pages. Fig. 2.29 (p. 89) shows Whittaker''s standard format diagram for Building J slabs with labeled positions: Verb, Toponymic name, Trecena/day date, Year date, Monte Albán toponymic glyph, Day date. Structure matches NW-SLAB-02.',
  ARRAY['MA-BJ-NW-SLAB-02', 'MA-ST12-Z01']
),
(
  'León-Portilla, Miguel',
  'Las inscripciones y los códices mesoamericanos: una herencia cultural',
  '2013',
  NULL,
  'pp. 33–34, 46–47',
  'Confirms Building J slabs depict conquered place-names with inverted human faces. Supports standard reading of NW-SLAB-02 inverted figure (E11).',
  ARRAY['MA-BJ-NW-SLAB-02']
);


-- ============================================================================
-- 4. IMAGES (base photographs — add real storage paths as you upload)
-- ============================================================================

INSERT INTO images (record_id, type, label, storage_path, caption, photographer, date_taken, is_primary_evidence, sort_order)
VALUES
(
  'MA-BJ-NW-SLAB-02', 'full_object', 'Full Slab',
  'MA-BJ-NW-SLAB-02/MA-BJ-NW-SLAB-02-base.jpg',
  'Full view of conquest slab MA-BJ-NW-SLAB-02, northwest face of Building J, Monte Albán.',
  'V. Diaz / MAHC', '2026-05-22', true, 1
),
(
  'MA-BJ-NW-SLAB-02', 'drawing_overlay', 'Line Drawing Overlay',
  'MA-BJ-NW-SLAB-02/background.png',
  'MAPSA line drawing overlay v1.0. Traced from site photography in CorelDRAW 2021. Interpretive aid only — not a substitute for primary photographic evidence.',
  'V. Diaz / MAPSA', '2026-05-22', false, 2
);
