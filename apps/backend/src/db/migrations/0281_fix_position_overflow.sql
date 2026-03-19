-- Fix: position columns used NUMERIC(10,4) which overflows for large Trello positions
ALTER TABLE project_lists ALTER COLUMN position TYPE FLOAT8;
ALTER TABLE project_cards ALTER COLUMN position TYPE FLOAT8;
