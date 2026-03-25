# AI Facebook Lead Scraper for Lawyers

## Overview
An automated system that discovers potential legal clients from Facebook groups using scraping and AI filtering.

## Problem
Lawyers spend hours manually searching Facebook groups for people seeking legal help.

## Solution
This system automates the process:
- Scrapes Facebook groups using Apify
- Filters posts using AI to detect high-intent leads
- Stores leads in Airtable for follow-up

## Features
- Automated scraping from multiple Facebook groups
- AI-based lead qualification
- Demo vs Full system (usage limits)
- Airtable integration for lead management

## Tech Stack
- n8n (workflow automation)
- Apify (scraping)
- LLMs (AI filtering)
- Airtable (data storage)

## Workflow
1. User submits groups + niche
2. Scraper extracts posts
3. AI filters relevant leads
4. Leads stored in Airtable

## Future Improvements
- CRM integration
- Email automation
- Multi-platform scraping (Reddit, forums)
