-- Demo data minimo
insert into workspaces (id, name) values
  ('00000000-0000-0000-0000-000000000001', 'Barbiere Foued');

insert into agents (workspace_id, name, type, channels, goal, status, config) values
  ('00000000-0000-0000-0000-000000000001', 'Foued Receptionist', 'receptionist',
   '{webchat,whatsapp}', 'Prenotare appuntamenti', 'active',
   '{"behavior_rules":["Rispondi in italiano"],"qualifying_questions":["Per quale servizio?"]}');

insert into leads (workspace_id, name, phone, status, tags, source, score) values
  ('00000000-0000-0000-0000-000000000001', 'Marco Rossi', '+393331234567', 'booked', '{taglio,barba}', 'webchat', 80);
