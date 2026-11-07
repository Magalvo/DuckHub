CREATE TABLE "rubber_ducks" (
	"event_id" bigint NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "rubber_ducks_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "rubber_ducks" ADD CONSTRAINT "rubber_ducks_event_id_pond_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."pond_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rubber_ducks" ADD CONSTRAINT "rubber_ducks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "rubber_ducks_user_id_idx" ON "rubber_ducks" USING btree ("user_id");