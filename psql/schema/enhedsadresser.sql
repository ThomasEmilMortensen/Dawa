DROP TABLE IF EXISTS enhedsadresser;
CREATE TABLE IF NOT EXISTS enhedsadresser (
  id uuid NOT NULL PRIMARY KEY,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  etage VARCHAR(3),
  doer VARCHAR(4),
  tsv tsvector
);
CREATE INDEX ON enhedsadresser(adgangsadresseid);
CREATE INDEX ON enhedsadresser USING gin(tsv);
CREATE INDEX ON enhedsadresser(etage, id);
CREATE INDEX ON enhedsadresser(doer, id);

DROP TABLE IF EXISTS enhedsadresser_history;
CREATE TABLE IF NOT EXISTS enhedsadresser_history (
  valid_from integer,
  valid_to integer,
  id uuid NOT NULL,
  adgangsadresseid UUID NOT NULL,
  oprettet timestamp,
  ikraftfra timestamp,
  aendret timestamp,
  etage VARCHAR(3),
  doer VARCHAR(4)
);

CREATE INDEX ON enhedsadresser_history(valid_to);
CREATE INDEX ON enhedsadresser_history(valid_from);
CREATE INDEX ON enhedsadresser_history(id);

-- Init function
DROP FUNCTION IF EXISTS enhedsadresser_init() CASCADE;
CREATE FUNCTION enhedsadresser_init() RETURNS void
LANGUAGE sql AS
$$
    UPDATE enhedsadresser
    SET tsv = adgangsadresser.tsv ||
              setweight(to_tsvector('adresser',
                                    COALESCE(etage, '') || ' ' ||
                                    COALESCE(doer, '')), 'B')
    FROM
      adgangsadresser
    WHERE
      adgangsadresser.id = adgangsadresseid;
$$;

-- Trigger which maintains the tsv column
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_tsv_update()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.tsv = (SELECT adgangsadresser.tsv ||
                    setweight(to_tsvector('adresser',
                                          COALESCE(NEW.etage, '') || ' ' ||
                                          COALESCE(NEW.doer, '')), 'B')
  FROM
  adgangsadresser
  WHERE
    adgangsadresser.id = NEW.adgangsadresseid);
  RETURN NEW;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_tsv_update BEFORE INSERT OR UPDATE
ON enhedsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_tsv_update();


-- Triggers which maintains the tsv column when adgangs changes
DROP FUNCTION IF EXISTS enhedsadresser_tsv_update_on_adgangsadresse() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_tsv_update_on_adgangsadresse()
  RETURNS TRIGGER AS $$
BEGIN
  UPDATE enhedsadresser
  SET tsv = adgangsadresser.tsv ||
            setweight(to_tsvector('adresser',
                                  COALESCE(etage, '') || ' ' ||
                                  COALESCE(doer, '')), 'B')
  FROM
    adgangsadresser
  WHERE
    adgangsadresseid = NEW.id;
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_tsv_update_on_adgangsadresse AFTER INSERT OR UPDATE
ON adgangsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_tsv_update_on_adgangsadresse();

-- trigger to maintain history
DROP FUNCTION IF EXISTS enhedsadresser_history_update() CASCADE;
CREATE OR REPLACE FUNCTION enhedsadresser_history_update()
  RETURNS TRIGGER AS $$
DECLARE
  seqnum integer;
  optype operation_type;
BEGIN
  seqnum = (SELECT COALESCE((SELECT MAX(sequence_number) FROM transaction_history), 0) + 1);
  optype = lower(TG_OP);
  IF TG_OP = 'DELETE' OR TG_OP = 'UPDATE' THEN
    UPDATE enhedsadresser_history SET valid_to = seqnum WHERE id = OLD.id AND valid_to IS NULL;
  END IF;
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    INSERT INTO enhedsadresser_history(
      valid_from, id, adgangsadresseid, oprettet, ikraftfra, aendret, etage, doer)
    VALUES (
      seqnum, NEW.id, NEW.adgangsadresseid, NEW.oprettet, NEW.ikraftfra, NEW.aendret, NEW.etage, NEW.doer);
  END IF;
  INSERT INTO transaction_history(sequence_number, entity, operation) VALUES(seqnum, 'enhedsadresse', optype);
  RETURN NULL;
END;
$$ LANGUAGE PLPGSQL;

CREATE TRIGGER enhedsadresser_history_update AFTER INSERT OR UPDATE OR DELETE
ON enhedsadresser FOR EACH ROW EXECUTE PROCEDURE
  enhedsadresser_history_update();