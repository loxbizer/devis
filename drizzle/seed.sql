-- ---------------------------------------------------------------------------
-- Données de démonstration locale (mode local sans Stripe/R2 configurés).
-- Utilisateur : demo@devisroom.fr / mot de passe : demo1234demo!
-- Usage : npm run db:seed:local
-- ---------------------------------------------------------------------------

INSERT OR IGNORE INTO users (id, email, password_hash, name, role)
VALUES (
  'seed-user-demo',
  'demo@devisroom.fr',
  'pbkdf2$100000$6465766973726f6f6d64656d6f73616c$0be0ec8ee70ca0edfed940c413acebc3759bc88a93c0b70a54a6cb0fc06757df',
  'Julien Démo',
  'user'
);

INSERT OR IGNORE INTO organizations (
  id, name, profession, email, phone, address, postal_code, city,
  primary_color, onboarding_step
)
VALUES (
  'seed-org-demo',
  'Horizon Toiture (démo)',
  'Couvreur',
  'contact@horizon-toiture.example',
  '01 23 45 67 89',
  '12 rue des Ardoisiers',
  '44000',
  'Nantes',
  '#b45309',
  5
);

INSERT OR IGNORE INTO organization_members (id, organization_id, user_id, role)
VALUES ('seed-member-demo', 'seed-org-demo', 'seed-user-demo', 'owner');

INSERT OR IGNORE INTO subscriptions (id, organization_id, plan, status)
VALUES ('seed-sub-demo', 'seed-org-demo', 'pro', 'active');

INSERT OR IGNORE INTO proposals (
  id, organization_id, created_by_user_id, slug, title, client_name,
  message, summary, terms, total_amount_cents, status, outcome, version,
  published_at, deposit_enabled, deposit_mode, deposit_amount_cents
)
VALUES (
  'seed-proposal-demo',
  'seed-org-demo',
  'seed-user-demo',
  'demo-toiture-martin',
  'Rénovation complète de la toiture de la maison Martin',
  'M. et Mme Martin',
  'Bonjour, suite à notre visite du 3 juillet, voici notre proposition détaillée. N''hésitez pas à poser vos questions directement depuis cette page.',
  'Votre toiture en ardoise de 120 m² présente des ardoises cassées et des solins fatigués. Nous proposons une rénovation assurant une étanchéité durable, en trois niveaux d''intervention.',
  'Devis valable 45 jours. Acompte de 30 % à la commande, solde à réception des travaux.',
  1090000,
  'published',
  'pending',
  1,
  unixepoch() * 1000,
  1,
  'bank_transfer',
  327000
);

INSERT OR IGNORE INTO proposal_sections (id, proposal_id, type, title, content, position)
VALUES
  ('seed-sec-services', 'seed-proposal-demo', 'services', 'Prestations prévues',
   '{"items":[{"name":"Dépose et tri des ardoises","description":"Retrait complet, tri des ardoises réutilisables, évacuation des gravats."},{"name":"Pose de la nouvelle couverture","description":"Ardoise naturelle première qualité, fixation au crochet inox."},{"name":"Zinguerie","description":"Solins, noquets et abergements de cheminée en zinc naturel."}]}', 0),
  ('seed-sec-steps', 'seed-proposal-demo', 'steps', 'Étapes du chantier',
   '{"items":[{"title":"Installation du chantier","description":"Échafaudage et mise en sécurité."},{"title":"Dépose de la couverture","description":"2 jours, maison hors d''eau chaque soir."},{"title":"Pose et finitions","description":"5 à 7 jours selon la météo."}]}', 1),
  ('seed-sec-guarantees', 'seed-proposal-demo', 'guarantees', 'Garanties',
   '{"items":[{"title":"Garantie décennale","description":"Couverture et étanchéité assurées 10 ans."},{"title":"Parfait achèvement","description":"Reprise de tout désordre signalé pendant 1 an."}]}', 3),
  ('seed-sec-faq', 'seed-proposal-demo', 'faq', 'Questions fréquentes',
   '{"items":[{"question":"Devons-nous quitter la maison pendant les travaux ?","answer":"Non, la maison reste habitable et hors d''eau chaque soir."},{"question":"L''acompte est-il remboursable ?","answer":"Oui, intégralement tant que le chantier n''a pas démarré."}]}', 4);

INSERT OR IGNORE INTO proposal_packages (id, proposal_id, name, description, price_cents, features, is_recommended, position)
VALUES
  ('seed-pkg-1', 'seed-proposal-demo', 'Essentielle', 'L''intervention indispensable.', 790000,
   '["Remplacement des éléments endommagés","Nettoyage complet","Étanchéité principale refaite"]', 0, 0),
  ('seed-pkg-2', 'seed-proposal-demo', 'Recommandée', 'Le meilleur équilibre durabilité / budget.', 1090000,
   '["Rénovation complète","Écran sous-toiture HPV","Isolation partielle","Garantie renforcée"]', 1, 1),
  ('seed-pkg-3', 'seed-proposal-demo', 'Sérénité', 'La rénovation la plus complète.', 1390000,
   '["Rénovation complète","Isolation supérieure","Gouttières neuves en zinc","Entretien annuel 3 ans"]', 0, 2);

INSERT OR IGNORE INTO proposal_options (id, proposal_id, name, description, price_cents, position)
VALUES
  ('seed-opt-1', 'seed-proposal-demo', 'Remplacement de la fenêtre de toit', 'Fenêtre 78×98 avec volet.', 185000, 0),
  ('seed-opt-2', 'seed-proposal-demo', 'Traitement anti-mousse longue durée', 'Hydrofuge coloré sur toute la couverture.', 68000, 1);

-- Événements factices pour peupler le tableau de bord.
INSERT OR IGNORE INTO proposal_events (id, proposal_id, type, data, created_at)
VALUES
  ('seed-evt-1', 'seed-proposal-demo', 'published', '{"version":1}', unixepoch() * 1000 - 86400000 * 3),
  ('seed-evt-2', 'seed-proposal-demo', 'first_view', '{"device":"mobile"}', unixepoch() * 1000 - 86400000 * 2),
  ('seed-evt-3', 'seed-proposal-demo', 'package_selected', '{"name":"Recommandée"}', unixepoch() * 1000 - 86400000 * 2 + 300000),
  ('seed-evt-4', 'seed-proposal-demo', 'question_asked', NULL, unixepoch() * 1000 - 86400000);

INSERT OR IGNORE INTO proposal_views (id, proposal_id, visitor_id, device, created_at)
VALUES
  ('seed-view-1', 'seed-proposal-demo', 'seed-visitor-1', 'mobile', unixepoch() * 1000 - 86400000 * 2),
  ('seed-view-2', 'seed-proposal-demo', 'seed-visitor-2', 'desktop', unixepoch() * 1000 - 86400000);

INSERT OR IGNORE INTO proposal_questions (id, proposal_id, name, email, message, created_at)
VALUES (
  'seed-question-1',
  'seed-proposal-demo',
  'M. Martin',
  'martin@example.com',
  'Bonjour, l''échafaudage occupera-t-il le trottoir côté rue ?',
  unixepoch() * 1000 - 86400000
);

INSERT OR IGNORE INTO notifications (id, organization_id, type, title, body, link_to)
VALUES (
  'seed-notif-1',
  'seed-org-demo',
  'question',
  'Nouvelle question : Rénovation toiture Martin',
  'M. Martin : « L''échafaudage occupera-t-il le trottoir côté rue ? »',
  '/app/devis/seed-proposal-demo'
);
