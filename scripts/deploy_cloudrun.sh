#!/usr/bin/env bash
set -euo pipefail

# Despliegue de Cloud Run.
# Uso (Cloud Shell, desde la raíz del repositorio):
#   export INIT_ADMIN_EMAIL='...'
#   export INIT_ADMIN_PASSWORD='...'
#   export APP_BASE_URL='https://...'
#   export GOOGLE_CLIENT_ID='...'
#   export GOOGLE_CLIENT_SECRET='...'
#   export SMTP_HOST='...'
#   export SMTP_USER='...'
#   export SMTP_PASS='...'
#   export MAIL_FROM='...'
#   bash scripts/deploy_cloudrun.sh
#
# SESSION_SECRET y GOOGLE_REDIRECT_URI son opcionales: si no se definen, el
# script genera un secreto aleatorio y construye la URI de retorno a partir de
# APP_BASE_URL.
#
# El script no contiene credenciales. Los valores sensibles se guardan en
# Secret Manager y se inyectan en Cloud Run como variables de entorno.

PROJECT=${PROJECT:-trabajo-procesos-dpm}
REGION=${REGION:-europe-west1}
SERVICE=${SERVICE:-trabajoprocesosdmp}
IMAGE=${IMAGE:-gcr.io/${PROJECT}/sprint1-saas}
SA=${SA:-run-firestore-sa@${PROJECT}.iam.gserviceaccount.com}
COLLECTION=${COLLECTION:-procesosusuariosdpm}
SESSION_COLLECTION=${SESSION_COLLECTION:-sessions}
SMTP_PORT=${SMTP_PORT:-587}
SMTP_SECURE=${SMTP_SECURE:-false}

required_vars=(
  INIT_ADMIN_EMAIL
  INIT_ADMIN_PASSWORD
  APP_BASE_URL
  GOOGLE_CLIENT_ID
  GOOGLE_CLIENT_SECRET
  SMTP_HOST
  SMTP_USER
  SMTP_PASS
  MAIL_FROM
)

for variable in "${required_vars[@]}"; do
  if [ -z "${!variable:-}" ]; then
    echo "ERROR: falta la variable de entorno ${variable}" >&2
    exit 1
  fi
done

if [ -z "${SESSION_SECRET:-}" ]; then
  SESSION_SECRET=$(openssl rand -hex 32)
  echo "SESSION_SECRET no definido: se genera uno aleatorio."
fi

if [ -z "${GOOGLE_REDIRECT_URI:-}" ]; then
  GOOGLE_REDIRECT_URI="${APP_BASE_URL%/}/api/auth/oauth/google/callback"
  echo "GOOGLE_REDIRECT_URI no definido: se usa ${GOOGLE_REDIRECT_URI}"
fi

echo "Proyecto: ${PROJECT}; región: ${REGION}; servicio: ${SERVICE}"

gcloud config set project "${PROJECT}"

echo "Habilitando APIs necesarias..."
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  firestore.googleapis.com \
  secretmanager.googleapis.com || true

echo "Asegurando service account ${SA}..."
if ! gcloud iam service-accounts list \
  --project="${PROJECT}" \
  --filter="email:${SA}" \
  --format="value(email)" | grep -q "${SA}"; then
  gcloud iam service-accounts create run-firestore-sa \
    --display-name="Cloud Run Firestore SA" \
    --project="${PROJECT}"
else
  echo "La service account ya existe."
fi

echo "Concediendo acceso a Firestore..."
gcloud projects add-iam-policy-binding "${PROJECT}" \
  --member="serviceAccount:${SA}" \
  --role="roles/datastore.user" >/dev/null || true

upsert_secret() {
  local name=$1
  local value=$2

  if gcloud secrets describe "${name}" --project="${PROJECT}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets versions add "${name}" \
      --project="${PROJECT}" \
      --data-file=-
  else
    printf '%s' "${value}" | gcloud secrets create "${name}" \
      --project="${PROJECT}" \
      --replication-policy=automatic \
      --data-file=-
  fi

  gcloud secrets add-iam-policy-binding "${name}" \
    --project="${PROJECT}" \
    --member="serviceAccount:${SA}" \
    --role="roles/secretmanager.secretAccessor" >/dev/null
}

echo "Guardando secretos en Secret Manager..."
upsert_secret session-secret "${SESSION_SECRET}"
upsert_secret init-admin-password "${INIT_ADMIN_PASSWORD}"
upsert_secret google-client-secret "${GOOGLE_CLIENT_SECRET}"
upsert_secret smtp-pass "${SMTP_PASS}"

echo "Construyendo imagen ${IMAGE}..."
gcloud builds submit --tag "${IMAGE}" .

echo "Desplegando en Cloud Run..."
gcloud run deploy "${SERVICE}" \
  --image "${IMAGE}" \
  --platform managed \
  --region "${REGION}" \
  --allow-unauthenticated \
  --service-account="${SA}" \
  --set-env-vars "DB_TYPE=firestore,FIRESTORE_COLLECTION=${COLLECTION},SESSION_COLLECTION=${SESSION_COLLECTION},APP_BASE_URL=${APP_BASE_URL},INIT_ADMIN_EMAIL=${INIT_ADMIN_EMAIL},GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID},GOOGLE_REDIRECT_URI=${GOOGLE_REDIRECT_URI},SMTP_HOST=${SMTP_HOST},SMTP_PORT=${SMTP_PORT},SMTP_SECURE=${SMTP_SECURE},SMTP_USER=${SMTP_USER},MAIL_FROM=${MAIL_FROM}" \
  --set-secrets "SESSION_SECRET=session-secret:latest,INIT_ADMIN_PASSWORD=init-admin-password:latest,GOOGLE_CLIENT_SECRET=google-client-secret:latest,SMTP_PASS=smtp-pass:latest"

echo "Despliegue completado."
gcloud run services describe "${SERVICE}" \
  --region "${REGION}" \
  --project "${PROJECT}" \
  --format="value(status.url)"
