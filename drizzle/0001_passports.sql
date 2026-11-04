CREATE TABLE "passports" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"snapshot" jsonb NOT NULL,
	"synced_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passports" ADD CONSTRAINT "passports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;