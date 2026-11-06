CREATE TABLE "project_xp" (
	"campus_id" integer NOT NULL,
	"slug" text NOT NULL,
	"project_id" integer NOT NULL,
	"name" text NOT NULL,
	"xp" integer NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "project_xp_campus_id_slug_pk" PRIMARY KEY("campus_id","slug")
);
