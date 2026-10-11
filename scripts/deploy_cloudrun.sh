#!/usr/bin/env bash
set -euo pipefail

# Deployment script for Cloud Run (Cloud Shell)
# Usage: run this in Cloud Shell from the repository root

PROJECT=trabajo-procesos-dpm
REGION=europe-west1
SERVICE=trabajoprocesosdmp
IMAGE=gcr.io/${PROJECT}/sprint1-saas
SA=run-firestore-sa@${PROJECT}.iam.gserviceaccount.com
COLLECTION=procesosusuariosdpm

echo "Using project: ${PROJECT}, region: ${REGION}"

gcloud config set project ${PROJECT}

echo "Enabling required APIs..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com firestore.googleapis.com secretmanager.googleapis.com || true

echo "Ensure service account exists"
if ! gcloud iam service-accounts list --project=${PROJECT} --filter="email:${SA}" --format="value(email)" | grep -q "${SA}"; then
  echo "Creating service account ${SA}"
  gcloud iam service-accounts create run-firestore-sa --display-name="Cloud Run Firestore SA" --project=${PROJECT}
else
  echo "Service account ${SA} already exists"
fi

echo "Granting Firestore role to service account (may be no-op if already granted)"
gcloud projects add-iam-policy-binding ${PROJECT} \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user" || true

echo "Building and submitting image to Cloud Build: ${IMAGE}"
gcloud builds submit --tag ${IMAGE} .

echo "Deploying to Cloud Run service ${SERVICE}"
gcloud run deploy ${SERVICE} \
  --image ${IMAGE} \
  --platform managed \
  --region ${REGION} \
  --allow-unauthenticated \
  --service-account=${SA} \
  --set-env-vars "DB_TYPE=firestore,FIRESTORE_COLLECTION=${COLLECTION},INIT_ADMIN_EMAIL=dpm@gmail.com,INIT_ADMIN_PASSWORD=123456789,SESSION_SECRET=change-me"

echo "Deployment completed. Running reset_admin.js to ensure admin exists"
node ./scripts/reset_admin.js || echo "reset_admin failed; check scripts/reset_admin.js and credentials"

echo "Done. Get service URL with: gcloud run services describe ${SERVICE} --region ${REGION} --project ${PROJECT} --format=\"value(status.url)\""
