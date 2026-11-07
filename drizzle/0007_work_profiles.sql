CREATE TABLE "work_profiles" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"periods" text[] DEFAULT '{}'::text[] NOT NULL,
	"start" text,
	"grade_goal" text,
	"pace" text,
	"style" text,
	"setting" text,
	"role" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "work_profiles" ADD CONSTRAINT "work_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;