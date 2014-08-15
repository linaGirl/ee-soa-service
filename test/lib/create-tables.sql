

DROP SCHEMA IF EXISTS ee_soa_service_test CASCADE;
CREATE SCHEMA ee_soa_service_test;



CREATE TABLE ee_soa_service_test.language (
      id                serial NOT NULL
    , code              character varying(2)
    , CONSTRAINT "pk_language" PRIMARY KEY (id)
    , CONSTRAINT "unique_language_code" UNIQUE (code)
);

CREATE TABLE ee_soa_service_test.image (
      id                serial NOT NULL
    , url               character varying(300)
    , CONSTRAINT "pk_image" PRIMARY KEY (id)
);




CREATE TABLE ee_soa_service_test.country (
      id                serial NOT NULL
    , code              character varying(2)
    , name              character varying(200)
    , CONSTRAINT "pk_country" PRIMARY KEY (id)
    , CONSTRAINT "unique_country_code" UNIQUE(code)
);

CREATE TABLE ee_soa_service_test.county (
      id                serial NOT NULL
    , id_country        integer NOT NULL
    , code              character varying(2)
    , name              character varying(200)
    , CONSTRAINT "pk_county" PRIMARY KEY (id)
    , CONSTRAINT "unique_county_code" UNIQUE(code)
    , CONSTRAINT "fk_county_country" FOREIGN KEY (id_country) REFERENCES ee_soa_service_test.country(id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_soa_service_test.municipality (
      id                serial NOT NULL
    , id_county         integer NOT NULL
    , name              character varying(200)
    , CONSTRAINT "pk_municipality" PRIMARY KEY (id)
    , CONSTRAINT "fk_municipality_county" FOREIGN KEY (id_county) REFERENCES ee_soa_service_test.county(id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);




CREATE TABLE ee_soa_service_test.venue (
      id                serial NOT NULL
    , id_image          integer NOT NULL
    , id_municipality   integer NOT NULL
    , name              character varying(200)
    , CONSTRAINT "pk_venue" PRIMARY KEY (id)
    , CONSTRAINT "fk_venue_image" FOREIGN KEY (id_image) REFERENCES ee_soa_service_test.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
    , CONSTRAINT "fk_venue_municipality" FOREIGN KEY (id_municipality) REFERENCES ee_soa_service_test.municipality (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_soa_service_test.venue_image (
      id                serial NOT NULL
    , id_venue          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT "pk_venue_image" PRIMARY KEY (id)
    , CONSTRAINT "unique_venue_image_venue_image" UNIQUE (id_venue, id_image)
    , CONSTRAINT "fk_venue_image_venue" FOREIGN KEY (id_venue) REFERENCES ee_soa_service_test.venue (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT "fk_venue_image_image" FOREIGN KEY (id_image) REFERENCES ee_soa_service_test.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
);




CREATE TABLE ee_soa_service_test.event (
      id                serial NOT NULL
    , id_venue          integer NOT NULL
    , title             character varying(200) NOT NULL
    , startdate         timestamp without time zone NOT NULL
    , enddate           timestamp without time zone
    , canceled          boolean
    , created           timestamp without time zone
    , updated           timestamp without time zone
    , deleted           timestamp without time zone
    , CONSTRAINT "pk_event" PRIMARY KEY (id)
    , CONSTRAINT "fk_event_venue" FOREIGN KEY (id_venue) REFERENCES ee_soa_service_test.venue (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_soa_service_test."eventLocale" (
      id_event          integer NOT NULL
    , id_language       integer NOT NULL
    , description       text NOT NULL
    , CONSTRAINT "pk_eventLocale" PRIMARY KEY (id_event, id_language)
    , CONSTRAINT "fk_eventLocale_event" FOREIGN KEY (id_event) REFERENCES ee_soa_service_test.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT "fk_eventLocale_language" FOREIGN KEY (id_language) REFERENCES ee_soa_service_test.language (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE RESTRICT
);

CREATE TABLE ee_soa_service_test.event_image (
      id_event          integer NOT NULL
    , id_image          integer NOT NULL
    , CONSTRAINT "pk_event_image" PRIMARY KEY (id_event, id_image)
    , CONSTRAINT "fk_event_image_event" FOREIGN KEY (id_event) REFERENCES ee_soa_service_test.event (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
    , CONSTRAINT "fk_event_image_image" FOREIGN KEY (id_image) REFERENCES ee_soa_service_test.image (id) MATCH SIMPLE ON UPDATE CASCADE ON DELETE CASCADE
);

CREATE TABLE ee_soa_service_test.tree (
      id                serial NOT NULL
    , name              varchar(100)
    , "left"            integer NOT NULL
    , "right"           integer NOT NULL
    , CONSTRAINT "pk_tree" PRIMARY KEY (id)
);



INSERT INTO "ee_soa_service_test"."country" ("code", "name") 
VALUES ('NL', 'Nederland');
INSERT INTO "ee_soa_service_test"."country" ("code", "name") 
VALUES ('CH', 'Schweiz');


INSERT INTO "ee_soa_service_test"."county" ("id_country", "code", "name") 
VALUES (2, 'BE', 'Bern');
INSERT INTO "ee_soa_service_test"."county" ("id_country", "code", "name") 
VALUES (2, 'ZH', 'Zürich');


INSERT INTO "ee_soa_service_test"."municipality" ("id_county", "name") 
VALUES (1, 'Bern');
INSERT INTO "ee_soa_service_test"."municipality" ("id_county", "name") 
VALUES (1, 'Ittigen');