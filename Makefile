SHELL := /bin/sh

MOBILE_DIR ?= apps/mobile
NPM ?= npm

.PHONY: help install start start-clear ios android web build-ios build-android build-web \
	lint format format-check typecheck test workflow-check check

help: ## Show the available development commands
	@awk 'BEGIN {FS = ":.*## "}; /^[a-zA-Z0-9_.-]+:.*## / {printf "  %-18s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: ## Install the locked mobile dependencies
	$(NPM) --prefix $(MOBILE_DIR) ci

start: ## Start Expo Metro with Fast Refresh enabled by default
	$(NPM) --prefix $(MOBILE_DIR) run start

start-clear: ## Start Expo Metro after clearing its local cache
	$(NPM) --prefix $(MOBILE_DIR) run start:clear

ios: ## Open the mobile app through Expo Go on an iOS target
	$(NPM) --prefix $(MOBILE_DIR) run open:ios

android: ## Open the mobile app through Expo Go on an Android target
	$(NPM) --prefix $(MOBILE_DIR) run open:android

web: ## Start the Expo web development server
	$(NPM) --prefix $(MOBILE_DIR) run web

build-ios: ## Generate and build a local iOS development app with Xcode
	$(NPM) --prefix $(MOBILE_DIR) run build:ios

build-android: ## Generate and build a local Android development app
	$(NPM) --prefix $(MOBILE_DIR) run build:android

build-web: ## Export a static web bundle to the ignored dist directory
	$(NPM) --prefix $(MOBILE_DIR) run build:web

lint: ## Run ESLint for the mobile workspace
	$(NPM) --prefix $(MOBILE_DIR) run lint

format: ## Format supported mobile source and configuration files
	$(NPM) --prefix $(MOBILE_DIR) run format

format-check: ## Check mobile formatting without changing files
	$(NPM) --prefix $(MOBILE_DIR) run format:check

typecheck: ## Run the TypeScript compiler without emitting files
	$(NPM) --prefix $(MOBILE_DIR) run typecheck

test: ## Run mobile contract and component tests once
	$(NPM) --prefix $(MOBILE_DIR) run test

workflow-check: ## Parse the GitHub Actions workflow with Ruby's standard YAML parser
	@ruby -e 'require "yaml"; YAML.load_file(".github/workflows/mobile-quality.yml"); puts "Workflow YAML OK"'

check: workflow-check ## Run workflow, format, lint, type, and test checks
	$(NPM) --prefix $(MOBILE_DIR) run check
