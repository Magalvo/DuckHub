CREATE TABLE "lobby_entries" (
	"user_id" uuid NOT NULL,
	"project_slug" text NOT NULL,
	"joined_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "lobby_entries_user_id_project_slug_pk" PRIMARY KEY("user_id","project_slug")
);
--> statement-breakpoint
ALTER TABLE "project_xp" ADD COLUMN "solo" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "lobby_entries" ADD CONSTRAINT "lobby_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- ADR 0016: a cache antiga não tem o solo da API; esvazia-se para o próximo pedido a recarregar.
DELETE FROM "project_xp";
