# Soft Landing — E2E Tests (Maestro)

## Setup
Install Maestro: curl -Ls "https://get.maestro.mobile.dev" | bash

## Running flows
maestro test app-qa/flows/

## Flow naming convention
- smoke/: Basic app launch and navigation
- check-in/: Core emotion → envelope → message flow
- subscription/: Paywall and entitlement flows

## Flow structure
Each .yaml flow follows Maestro syntax.
See https://maestro.mobile.dev for documentation.

Flows are added in Phase 2 alongside feature implementation.
