CREATE TABLE "analysis_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" serial NOT NULL,
	"transformer_id" varchar(50) NOT NULL,
	"location" text NOT NULL,
	"latitude" double precision,
	"longitude" double precision,
	"inference_date" text NOT NULL,
	"inference_time" text NOT NULL,
	"health_index_score" double precision NOT NULL,
	"params_scores" jsonb NOT NULL,
	"provided_images" jsonb,
	"grad_cam_images" jsonb,
	"status" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "analysis_logs" ADD CONSTRAINT "analysis_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;