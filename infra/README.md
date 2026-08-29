# Infrastructure

This directory reserves the future infrastructure-as-code boundary. V1 makes no
cloud connection and contains no deployable infrastructure.

Terraform will live in [`terraform/`](terraform/README.md) only after the
cloud-transition milestone is explicitly started. Never commit state, plans with
sensitive values, credentials, or generated provider caches.
